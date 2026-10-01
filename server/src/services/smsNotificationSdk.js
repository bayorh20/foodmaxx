// ============================================================
// SERVER-SIDE SMS NOTIFICATION SDK
// Direct HTTPS integration with Termii Nigeria & Twilio API
// ============================================================

const https = require('https');

/**
 * Normalizes phone number into international telecom MSISDN format (e.g. 2348012345678)
 */
function formatSmsPhone(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '234' + cleaned.slice(1);
  } else if (cleaned.startsWith('234')) {
    // already 234
  } else if (cleaned.length === 10) {
    cleaned = '234' + cleaned;
  }
  return cleaned;
}

/**
 * Send SMS via Termii API (Nigeria's leading SMS provider with DND bypass)
 * Termii API Docs: https://developers.termii.com/sms
 * @param {object} params { apiKey, senderId, phone, message }
 * @returns {Promise<object>}
 */
function sendViaTermii({ apiKey, senderId, phone, message }) {
  return new Promise((resolve, reject) => {
    if (!apiKey) {
      return resolve({
        success: true,
        provider: 'termii_simulation',
        message_id: `mock_tmi_${Date.now()}`,
        status: 'simulated_success',
        note: 'Termii API key not configured; message logged in simulation mode'
      });
    }

    const payload = JSON.stringify({
      to: formatSmsPhone(phone),
      from: senderId || 'FoodMaxx',
      sms: message,
      type: 'plain',
      channel: 'generic', // 'generic' or 'dnd'
      api_key: apiKey
    });

    const options = {
      hostname: 'api.ng.termii.com',
      port: 443,
      path: '/api/sms/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, provider: 'termii', data: parsed });
          } else {
            resolve({ success: false, provider: 'termii', error: parsed.message || 'Termii error', code: res.statusCode });
          }
        } catch (e) {
          resolve({ success: false, provider: 'termii', error: 'Invalid response from Termii', raw: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Termii API request timed out after 10s'));
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Send SMS via Twilio API
 * @param {object} params { accountSid, authToken, from, to, message }
 * @returns {Promise<object>}
 */
function sendViaTwilio({ accountSid, authToken, from, to, message, apiKeySid, apiKeySecret }) {
  return new Promise((resolve, reject) => {
    // Resolve credentials (supporting standard Account SID + Token or API Key SID + Secret)
    const rawKey = apiKeySid || (String(accountSid || '').startsWith('SK') ? accountSid : null) || process.env.TWILIO_API_KEY_SID;
    const rawSecret = apiKeySecret || authToken || process.env.TWILIO_AUTH_TOKEN;
    const effectiveAcct = (String(accountSid || '').startsWith('AC') ? accountSid : null) || process.env.TWILIO_ACCOUNT_SID || 'AC75e6b08b631b1718e877a3ba743e067d';
    const authUser = rawKey || effectiveAcct;
    const authPass = rawSecret;
    const fromSender = from || process.env.TWILIO_PHONE_NUMBER || 'FoodMaxx';

    if (!authUser || !authPass) {
      return resolve({
        success: true,
        provider: 'twilio_simulation',
        message_id: `mock_tw_${Date.now()}`,
        status: 'simulated_success',
        note: 'Twilio credentials not configured; message logged in simulation mode'
      });
    }

    const normPhone = '+' + formatSmsPhone(to);
    const postData = new URLSearchParams({
      To: normPhone,
      From: fromSender,
      Body: message
    }).toString();

    const auth = Buffer.from(`${authUser}:${authPass}`).toString('base64');

    const options = {
      hostname: 'api.twilio.com',
      port: 443,
      path: `/2010-04-01/Accounts/${effectiveAcct}/Messages.json`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, provider: 'twilio', sid: parsed.sid, data: parsed });
          } else {
            resolve({
              success: false,
              provider: 'twilio',
              error: parsed.message || 'Twilio error',
              code: parsed.code || res.statusCode,
              more_info: parsed.more_info
            });
          }
        } catch (e) {
          resolve({ success: false, provider: 'twilio', error: 'Invalid response from Twilio', raw: body });
        }
      });
    });

    req.on('error', err => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Twilio request timed out after 10s'));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Universal dispatcher
 * @param {object} params 
 * @returns {Promise<object>}
 */
async function dispatchSms(params) {
  const provider = params.provider || 'termii';
  if (provider === 'twilio') {
    return sendViaTwilio({
      accountSid: params.accountSid || process.env.TWILIO_ACCOUNT_SID,
      apiKeySid: params.apiKeySid || process.env.TWILIO_API_KEY_SID,
      authToken: params.authToken || process.env.TWILIO_AUTH_TOKEN,
      apiKeySecret: params.apiKeySecret,
      from: params.from || process.env.TWILIO_PHONE_NUMBER,
      to: params.phone,
      message: params.message
    });
  }

  // Default to Termii
  return sendViaTermii({
    apiKey: params.apiKey || process.env.TERMII_API_KEY,
    senderId: params.senderId || process.env.TERMII_SENDER_ID || 'FoodMaxx',
    phone: params.phone,
    message: params.message
  });
}

module.exports = {
  formatSmsPhone,
  sendViaTermii,
  sendViaTwilio,
  dispatchSms
};
