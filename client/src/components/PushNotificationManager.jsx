import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Bell, Send, Smartphone, Globe, Apple, Check, Trash2, 
  RefreshCw, Sparkles, AlertCircle, Copy, CheckCircle, Flame, 
  Zap, Clock, ArrowRight, ExternalLink, ShieldCheck, Tag, Users,
  Upload, Image as ImageIcon, X, Sliders, CheckCircle2
} from 'lucide-react';
import { 
  getAllRegisteredPushTokens, 
  deletePushToken, 
  broadcastPushNotification, 
  getNotificationBroadcastLogs, 
  triggerLocalPushNotification,
  ensureDeviceRegistered,
  installPushNotifications,
  getPushPermissionStatus,
  getOrCreateDeviceId,
  detectPlatform,
  getAutomatedPushRules,
  saveAutomatedPushRules,
  dispatchOrderStatusPushNotification,
  DEFAULT_PUSH_EVENT_RULES
} from '../services/pushNotificationService';
import { playOrderNotificationSound, triggerHaptic } from '../services/nativeMobile';
import { compressImageFile } from '../App';

const QUICK_TEMPLATES = [
  {
    id: 'jollof_rush',
    label: '🍛 Hot Firewood Jollof',
    title: '🔥 Hot Firewood Jollof Ready for Delivery!',
    message: 'Freshly scooped party jollof with tender peppered turkey is sizzling in the kitchen. Order now!',
    url: '/?tab=menu',
    image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'grills_special',
    label: '🍗 Evening Grills & Suya',
    title: '🍢 Juicy Grills & Peppered Suya Sizzling!',
    message: 'Chef has fired up the grill! Smoked turkey, peppered beef, and spiced chicken ready in minutes.',
    url: '/?tab=menu',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'free_delivery',
    label: '🛵 Free Delivery Ibadan',
    title: '⚡ Zero Delivery Fee on Orders Above ₦5,000!',
    message: 'Enjoy 100% free delivery to Bodija, UI, Akobo, and Jericho this afternoon. Limited slots available.',
    url: '/',
    image: '/foodmaxx-logo.png'
  },
  {
    id: 'flash_sale',
    label: '⚡ 15% Flash Discount',
    title: '💥 Flash Deal: 15% OFF All Shawarma & Bowls!',
    message: 'Use code FLASH15 at checkout for instant savings. Deal expires in 2 hours!',
    url: '/?tab=menu',
    image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'amala_special',
    label: '🍲 Bodija Amala Special',
    title: '🍲 Hot Amala & Gbegiri with Tender Goat Meat',
    message: 'Silky smooth Bodija amala paired with fresh ewedu and spicy assorted meat ready to ship.',
    url: '/?tab=menu',
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'wallet_bonus',
    label: '🎁 Chow Wallet Bonus',
    title: '💳 5% Cashback on FoodMaxx Chow Wallet Top-Up',
    message: 'Fund your FoodMaxx Chow Wallet today and get 5% instant bonus for zero-failure 1-click checkout.',
    url: '/?tab=profile',
    image: '/foodmaxx-logo.png'
  }
];

const PRESET_PHOTOS = [
  { label: 'FoodMaxx Logo', url: '/foodmaxx-logo.png' },
  { label: 'Firewood Jollof', url: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=500&auto=format&fit=crop&q=80' },
  { label: 'Grilled Turkey', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80' },
  { label: 'Smoky Suya', url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=80' },
  { label: 'Amala Feast', url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=500&auto=format&fit=crop&q=80' }
];

export default function PushNotificationManager({ toast }) {
  const [subTab, setSubTab] = useState('compose'); // 'compose' | 'rules' | 'devices' | 'history'
  const [tokens, setTokens] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Device & Permission State
  const [currentDeviceId, setCurrentDeviceId] = useState('');
  const [permissionStatus, setPermissionStatus] = useState('default');
  const [subscribingSelf, setSubscribingSelf] = useState(false);

  // Broadcast Form State
  const [title, setTitle] = useState('🔥 Fresh Firewood Jollof & Grills Ready!');
  const [message, setMessage] = useState('Get 15% OFF your lunch order right now. Delivered hot and fresh to your doorstep in Ibadan.');
  const [url, setUrl] = useState('/');
  const [targetPlatform, setTargetPlatform] = useState('all');
  const [imageUrl, setImageUrl] = useState('/foodmaxx-logo.png');
  const [copiedId, setCopiedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Automated Event Rules State
  const [eventRules, setEventRules] = useState(getAutomatedPushRules());
  const [testingRuleId, setTestingRuleId] = useState(null);

  // Load Tokens and Logs from Firestore
  const loadData = async () => {
    setLoading(true);
    try {
      const [tokenList, logList] = await Promise.all([
        getAllRegisteredPushTokens(),
        getNotificationBroadcastLogs()
      ]);
      setTokens(tokenList);
      setLogs(logList);
    } catch (e) {
      console.warn('Failed to load push notification data:', e);
    } finally {
      setLoading(false);
    }
  };

  const checkCurrentDevice = async () => {
    const devId = getOrCreateDeviceId();
    setCurrentDeviceId(devId);
    const perm = getPushPermissionStatus();
    setPermissionStatus(perm);

    // Auto-register this device immediately in Firestore so subscriber count is NEVER 0!
    await ensureDeviceRegistered();
    await loadData();
  };

  useEffect(() => {
    checkCurrentDevice();
  }, []);

  // Compute Platform Metrics
  const stats = useMemo(() => {
    const total = tokens.length;
    let android = 0;
    let ios = 0;
    let web = 0;

    tokens.forEach(t => {
      const p = (t.platform || '').toLowerCase();
      if (p.includes('android')) android++;
      else if (p.includes('ios') || p.includes('iphone') || p.includes('ipad')) ios++;
      else web++;
    });

    return { total, android, ios, web };
  }, [tokens]);

  // Subscribe this device now
  const handleSubscribeCurrentDevice = async () => {
    setSubscribingSelf(true);
    try {
      const res = await installPushNotifications();
      setPermissionStatus(res.permission);
      if (res.permission === 'granted') {
        if (toast) toast('This device is now registered for live push! 🔔', 'success');
        playOrderNotificationSound(true);
        triggerHaptic('success');
      } else {
        if (toast) toast(`Permission: ${res.permission}. Please check browser settings if blocked.`, 'warning');
      }
      await loadData();
    } catch (err) {
      if (toast) toast('Error enabling push: ' + (err.message || 'Failed'), 'error');
    } finally {
      setSubscribingSelf(false);
    }
  };

  // Quick Emoji Injector
  const handleAddEmoji = (emoji) => {
    setTitle(prev => `${emoji} ${prev}`);
  };

  // Apply Quick Template
  const handleApplyTemplate = (tpl) => {
    setTitle(tpl.title);
    setMessage(tpl.message);
    setUrl(tpl.url || '/');
    setImageUrl(tpl.image || '/foodmaxx-logo.png');
    if (toast) toast(`Applied "${tpl.label}" template ✨`, 'info');
  };

  // Photo Upload Handler (Local camera/file -> Compressed Data URL)
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressedDataUrl = await compressImageFile(file, 800, 0.8);
      setImageUrl(compressedDataUrl);
      if (toast) toast('Notification photo loaded and compressed! 📸', 'success');
      playOrderNotificationSound(false);
      triggerHaptic('success');
    } catch (err) {
      console.error('Image upload failed:', err);
      if (toast) toast('Failed to load image: ' + (err.message || 'Error'), 'error');
    } finally {
      setUploadingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  // Toggle Automated Event Rule
  const handleToggleRule = (ruleKey) => {
    const current = eventRules[ruleKey] || {};
    const updated = {
      ...eventRules,
      [ruleKey]: {
        ...current,
        enabled: current.enabled === false ? true : false
      }
    };
    setEventRules(updated);
    saveAutomatedPushRules(updated);
    const isNowEnabled = updated[ruleKey].enabled;
    if (toast) toast(`Event "${current.name || ruleKey}" is now ${isNowEnabled ? 'ACTIVE 🟢' : 'MUTED 🔴'}`, 'info');
    triggerHaptic('medium');
  };

  // Edit Event Rule Template
  const handleUpdateRuleTemplate = (ruleKey, field, value) => {
    const updated = {
      ...eventRules,
      [ruleKey]: {
        ...eventRules[ruleKey],
        [field]: value
      }
    };
    setEventRules(updated);
    saveAutomatedPushRules(updated);
  };

  // Test-Fire an Automated Event Trigger
  const handleTestEventTrigger = async (ruleKey) => {
    setTestingRuleId(ruleKey);
    try {
      const mockOrder = {
        id: 'ord_sample_99',
        order_reference: 'FMX-7824',
        rider_name: 'Babajide (Yamaha AG100)',
        customer: { id: currentDeviceId, full_name: 'Diner VIP' },
        items: [{ image_url: imageUrl || '/foodmaxx-logo.png' }]
      };
      
      const statusMap = {
        order_confirmed: 'ORDER_PLACED',
        order_preparing: 'PREPARING',
        order_ready: 'READY_FOR_PICKUP',
        order_on_the_way: 'ON_THE_WAY',
        order_delivered: 'DELIVERED',
        order_cancelled: 'CANCELLED',
        order_delayed: 'DELAYED'
      };
      
      await dispatchOrderStatusPushNotification(mockOrder, statusMap[ruleKey] || 'PREPARING', {
        rider: { name: 'Babajide (Courier 04)' },
        customMessage: eventRules[ruleKey]?.message
      });
      if (toast) toast(`Sample alert fired for "${eventRules[ruleKey]?.name}"! 🔔`, 'success');
    } catch (err) {
      if (toast) toast('Trigger test failed: ' + (err.message || 'Error'), 'error');
    } finally {
      setTimeout(() => setTestingRuleId(null), 1000);
    }
  };

  // Send Broadcast to Subscribers
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      if (toast) toast('Title and message cannot be empty', 'warning');
      return;
    }

    setBroadcasting(true);
    try {
      const res = await broadcastPushNotification({
        title,
        message,
        url,
        targetPlatform,
        imageUrl: imageUrl || '/foodmaxx-logo.png',
        sender: 'FoodMaxx Marketing Studio'
      });

      if (toast) {
        toast(`Broadcast delivered to ${res.recipientCount} active device(s)! 🚀`, 'success');
      }

      // Refresh sent logs & devices
      loadData();
    } catch (err) {
      if (toast) toast('Broadcast error: ' + (err.message || 'Failed'), 'error');
    } finally {
      setBroadcasting(false);
    }
  };

  // Test Alert on Current Device
  const handleTestSelf = async () => {
    if (permissionStatus !== 'granted') {
      await handleSubscribeCurrentDevice();
    }
    const photoUrl = imageUrl && imageUrl !== '/foodmaxx-logo.png' ? imageUrl : undefined;
    await triggerLocalPushNotification(title || '🔔 FoodMaxx Admin Test', {
      body: message || 'This is a test notification from FoodMaxx Admin.',
      url: url || '/',
      icon: '/foodmaxx-logo.png',
      image: photoUrl,
      imageUrl: photoUrl,
      tag: `fmx_test_${Date.now()}`
    });
    if (toast) toast('Test notification fired on your screen! 🔔', 'success');
  };

  // Delete a token
  const handleDeleteToken = async (tokenId) => {
    const ok = window.confirm('Delete this registered push device?');
    if (!ok) return;

    try {
      await deletePushToken(tokenId);
      setTokens(prev => prev.filter(t => t.id !== tokenId));
      if (toast) toast('Device subscription removed.', 'info');
    } catch {
      if (toast) toast('Failed to delete token', 'error');
    }
  };

  // Copy token
  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    if (toast) toast('Token copied to clipboard!', 'info');
  };

  // Filtered devices list
  const filteredTokens = useMemo(() => {
    if (!searchQuery) return tokens;
    const q = searchQuery.toLowerCase();
    return tokens.filter(t => 
      (t.user_id && t.user_id.toLowerCase().includes(q)) ||
      (t.platform && t.platform.toLowerCase().includes(q)) ||
      (t.id && t.id.toLowerCase().includes(q))
    );
  }, [tokens, searchQuery]);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Hidden File Input for Image Upload */}
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*" 
        onChange={handlePhotoUpload} 
        className="hidden" 
      />

      {/* 1. HEADER & CONTROLS */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-[#EA4C2A] flex items-center justify-center font-bold">
              <Bell size={22} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Push Notification Studio
              </h2>
              <p className="text-xs sm:text-sm font-bold text-slate-600">
                Send rich broadcasts with photo uploads & automated kitchen event triggers to installed Android APKs and diners.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
          <button
            type="button"
            onClick={handleTestSelf}
            className="px-4 py-2 rounded-xl bg-[#EA4C2A] hover:bg-[#d83f1d] active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/25 transition-all cursor-pointer"
          >
            <Zap size={14} className="text-amber-300" />
            <span>Test My Device</span>
          </button>
        </div>
      </div>

      {/* 2. THIS DEVICE SUBSCRIPTION STATUS CARD */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
        permissionStatus === 'granted'
          ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
          : 'bg-amber-50 border-amber-300 text-amber-950'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            permissionStatus === 'granted' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
          }`}>
            {permissionStatus === 'granted' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          </div>
          <div>
            <div className="font-extrabold text-sm flex items-center gap-2 flex-wrap">
              <span>{permissionStatus === 'granted' ? 'This Device is Registered & Listening' : 'This Device is Not Yet Subscribed to Push'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-white font-bold">
                {detectPlatform()}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              {permissionStatus === 'granted'
                ? `Device ID: ${currentDeviceId} · Ready to receive real-time kitchen updates, order changes, and marketing alerts.`
                : 'Enable notifications on this browser or APK to receive live order updates directly on this screen.'}
            </p>
          </div>
        </div>

        {permissionStatus === 'denied' ? (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
              Blocked in Browser/Device Settings
            </span>
            <button
              type="button"
              onClick={() => alert("How to enable FoodMaxx push notifications:\n\n1. In Chrome / Mobile browser: Tap the Settings/Tune icon on the left of the URL bar (next to foodmaxxapp.web.app).\n2. Tap 'Permissions' -> 'Notifications' -> choose 'Allow'.\n3. On Android phone: Go to Android Settings -> Apps -> FoodMaxx -> Notifications -> Turn ON.\n4. Reload this page.")}
              className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer hover:bg-black"
            >
              How to Unblock 🔓
            </button>
          </div>
        ) : permissionStatus !== 'granted' ? (
          <button
            type="button"
            onClick={handleSubscribeCurrentDevice}
            disabled={subscribingSelf}
            className="px-4 py-2.5 rounded-xl bg-[#EA4C2A] hover:bg-[#d83f1d] active:scale-95 text-white font-black text-xs shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Bell size={15} />
            <span>{subscribingSelf ? 'Enabling...' : 'Subscribe This Device (1-Click)'}</span>
          </button>
        ) : null}
      </div>

      {/* 3. SUBSCRIBER METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Subscribers</span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#EA4C2A] flex items-center justify-center font-bold">
              <Users size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.total}</div>
          <p className="text-[11px] font-bold text-slate-500 mt-1">Total Registered</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Android APK</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Smartphone size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.android}</div>
          <p className="text-[11px] font-bold text-slate-500 mt-1">Installed Devices</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">iOS / Apple</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
              <Apple size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.ios}</div>
          <p className="text-[11px] font-bold text-slate-500 mt-1">iPhone & iPad</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Web / PWA</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Globe size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.web}</div>
          <p className="text-[11px] font-bold text-slate-500 mt-1">Desktop & Mobile Web</p>
        </div>
      </div>

      {/* 4. SUB-TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 flex-wrap">
        <button
          type="button"
          onClick={() => setSubTab('compose')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            subTab === 'compose'
              ? 'bg-[#EA4C2A] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <Send size={15} />
          <span>Compose Broadcast</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('rules')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            subTab === 'rules'
              ? 'bg-[#EA4C2A] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <Zap size={15} />
          <span>Automated Event Rules</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('devices')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            subTab === 'devices'
              ? 'bg-[#EA4C2A] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <Smartphone size={15} />
          <span>Subscribers ({tokens.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('history')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            subTab === 'history'
              ? 'bg-[#EA4C2A] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <Clock size={15} />
          <span>Broadcast History ({logs.length})</span>
        </button>
      </div>

      {/* 5. TAB 1: COMPOSE BROADCAST WITH PHOTO UPLOAD */}
      {subTab === 'compose' && (
        <div className="space-y-6">
          {/* Quick Marketing Templates */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-[#EA4C2A]" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                1-Click Marketing Templates
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {QUICK_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleApplyTemplate(t)}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-[#EA4C2A] hover:bg-orange-50/50 text-left transition-all cursor-pointer group"
                >
                  <div className="text-xs font-bold text-slate-900 group-hover:text-[#EA4C2A] truncate">
                    {t.label}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                    {t.title}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main 2-Column Composer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Column */}
            <form onSubmit={handleSendBroadcast} className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800">Notification Title *</label>
                  <div className="flex items-center gap-1">
                    {['🍗', '🔥', '🛵', '⚡', '🎉', '🎁'].map(em => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => handleAddEmoji(em)}
                        className="text-xs hover:scale-125 transition-transform cursor-pointer p-0.5"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. 🔥 Weekend Grills Special 20% OFF!"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-bold focus:bg-white focus:border-[#EA4C2A] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Message / Body *</label>
                <textarea
                  required
                  rows={3}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="e.g. Order smoky firewood party jollof and grilled turkey delivered in minutes..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:border-[#EA4C2A] outline-none transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Target Audience</label>
                  <select
                    value={targetPlatform}
                    onChange={e => setTargetPlatform(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:border-[#EA4C2A] outline-none cursor-pointer"
                  >
                    <option value="all">All Devices ({stats.total})</option>
                    <option value="android">Android APK Only ({stats.android})</option>
                    <option value="ios">Apple iOS Only ({stats.ios})</option>
                    <option value="web">Web Browser Only ({stats.web})</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">When Touched, Force App to Open:</label>
                  <select
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:border-[#EA4C2A] outline-none cursor-pointer"
                  >
                    <option value="/">Open App Home Screen</option>
                    <option value="/?tab=menu">Open Kitchen Menu</option>
                    <option value="/?tab=orders">Open Live Order Tracking</option>
                    <option value="/?tab=profile">Open User Profile & Wallet</option>
                  </select>
                </div>
              </div>

              {/* PHOTO UPLOAD & MEDIA ATTACHMENT */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={16} className="text-[#EA4C2A]" />
                    <label className="text-xs font-bold text-slate-900">Notification Image / Photo Banner</label>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="px-3 py-1.5 rounded-lg bg-[#EA4C2A] hover:bg-[#d83f1d] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                  >
                    <Upload size={13} className={uploadingPhoto ? 'animate-bounce' : ''} />
                    <span>{uploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                  </button>
                </div>

                {/* Photo Preview & Quick Select */}
                {imageUrl && (
                  <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200">
                    <img 
                      src={imageUrl} 
                      alt="Notification Attachment" 
                      className="w-14 h-14 object-cover rounded-lg border border-slate-200 shrink-0 bg-slate-100" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {imageUrl.startsWith('data:') ? 'Custom Photo Uploaded (Ready to Send)' : imageUrl}
                      </div>
                      <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={12} /> Photo attached to push banner
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImageUrl('/foodmaxx-logo.png')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Reset to default logo"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}

                {/* Preset Fast Photo Picks */}
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1.5">Or pick a delicious food preset:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_PHOTOS.map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setImageUrl(p.url)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          imageUrl === p.url 
                            ? 'bg-[#EA4C2A] text-white border-[#EA4C2A]' 
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={broadcasting}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#EA4C2A] hover:bg-[#d83f1d] active:scale-[0.99] text-white font-black text-sm shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Send size={16} />
                  <span>{broadcasting ? 'Broadcasting Live...' : `Broadcast Push Notification (${stats.total} Devices)`}</span>
                </button>
              </div>
            </form>

            {/* Live Phone Mockup Preview Column */}
            <div className="phone-mockup phone-chassis lg:col-span-5 flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-3 left-4 text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone size={13} /> Live Lock Screen Preview
              </div>

              <div className="w-full max-w-[290px] bg-slate-950 rounded-[32px] p-3 border-2 border-slate-700 shadow-2xl mt-4">
                {/* Speaker pill notch */}
                <div className="w-16 h-3.5 bg-black rounded-full mx-auto mb-3" />

                {/* Clock */}
                <div className="text-center mb-4">
                  <div className="text-3xl font-black tracking-tight text-white">12:30</div>
                  <div className="text-[10px] text-slate-300 font-semibold">Today</div>
                </div>

                {/* Push Notification Card Mockup */}
                <div className="bg-white text-slate-900 rounded-2xl p-3 border border-slate-200 shadow-xl space-y-2 text-left">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <img src="/foodmaxx-logo.png" alt="FoodMaxx" className="w-4 h-4 rounded-md object-contain bg-white p-0.5 border border-slate-200" />
                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider truncate">FoodMaxx</span>
                    </div>
                    <span className="text-[9px] text-slate-500 font-semibold">now</span>
                  </div>

                  <div className="text-xs font-black text-slate-950 leading-snug line-clamp-2">
                    {title || 'Notification Title'}
                  </div>
                  <div className="text-[11px] text-slate-700 font-bold leading-relaxed line-clamp-3">
                    {message || 'Notification description will appear here on your customer lock screen...'}
                  </div>

                  {/* Rich Photo Attachment Preview on Lock Screen */}
                  {imageUrl && imageUrl !== '/foodmaxx-logo.png' && (
                    <div className="rounded-xl overflow-hidden mt-2 border border-slate-200 max-h-32">
                      <img src={imageUrl} alt="Attached Media" className="w-full h-28 object-cover" />
                    </div>
                  )}

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-[#EA4C2A] font-black">
                    <span>Touch to Open App 📲</span>
                    <span className="text-slate-500 font-bold">FoodMaxx Express</span>
                  </div>
                </div>

                {/* Home Indicator bar */}
                <div className="w-24 h-1 bg-white/40 rounded-full mx-auto mt-6 mb-1" />
              </div>

              <p className="text-[11px] text-slate-300 text-center mt-4">
                Touching notification forces the FoodMaxx App to open immediately. No website links are shown.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 2: AUTOMATED EVENT-BASED & CONDITIONAL RULES */}
      {subTab === 'rules' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Zap size={20} className="text-[#EA4C2A]" />
                  Automated Event-Based Push Notifications
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                  These notifications fire automatically in real time whenever an order status changes in the kitchen, courier is dispatched, or delay occurs.
                </p>
              </div>
              <div className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 self-start sm:self-auto">
                🟢 Live Event Engine Active
              </div>
            </div>

            {/* List of Conditional Event Rules */}
            <div className="space-y-3.5 divide-y divide-slate-100">
              {Object.keys(eventRules).map(ruleKey => {
                const rule = eventRules[ruleKey];
                const isEnabled = rule.enabled !== false;
                const isTesting = testingRuleId === ruleKey;

                return (
                  <div key={ruleKey} className="pt-3.5 first:pt-0 flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-lg shrink-0">
                        {rule.icon || '🔔'}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-slate-900">{rule.name}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            isEnabled ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}>
                            {isEnabled ? 'Automated' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-bold">{rule.description}</p>

                        {/* Editable Notification Template Fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <div>
                            <span className="text-[10px] font-black text-slate-700 block mb-1">Title Template (#{'{ref}'})</span>
                            <input
                              type="text"
                              value={rule.title || ''}
                              onChange={e => handleUpdateRuleTemplate(ruleKey, 'title', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:bg-white focus:border-[#EA4C2A] outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-slate-700 block mb-1">Message Template ({'{rider}'})</span>
                            <input
                              type="text"
                              value={rule.message || ''}
                              onChange={e => handleUpdateRuleTemplate(ruleKey, 'message', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:bg-white focus:border-[#EA4C2A] outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTestEventTrigger(ruleKey)}
                        disabled={isTesting}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        title="Simulate this event on your device"
                      >
                        <Zap size={13} className={isTesting ? 'text-amber-500 animate-spin' : 'text-slate-600'} />
                        <span>{isTesting ? 'Firing...' : 'Test Trigger'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleRule(ruleKey)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                          isEnabled
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                        }`}
                      >
                        <span>{isEnabled ? 'Enabled' : 'Muted'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 3: REGISTERED DEVICES / SUBSCRIBERS */}
      {subTab === 'devices' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">Active Device Subscriptions</h3>
              <p className="text-xs text-slate-600 font-medium">
                Devices currently listening for order status and marketing announcements.
              </p>
            </div>
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search user ID or platform..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-[#EA4C2A] focus:bg-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-y border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Device Token</th>
                  <th className="py-2.5 px-3">User Associated</th>
                  <th className="py-2.5 px-3">Platform</th>
                  <th className="py-2.5 px-3">Registered / Active</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTokens.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-700 font-bold">
                      No device tokens found yet. Click "Subscribe This Device" above or open the app on your phone!
                    </td>
                  </tr>
                ) : (
                  filteredTokens.map(tok => {
                    const isCopied = copiedId === tok.id;
                    const p = (tok.platform || '').toLowerCase();
                    const isAndroid = p.includes('android');
                    const isIos = p.includes('ios');
                    const isCurrent = tok.id === currentDeviceId;

                    return (
                      <tr key={tok.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-800 font-bold">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[120px]">{tok.token ? `${tok.token.slice(0, 16)}...` : tok.id}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 rounded bg-orange-100 text-[#EA4C2A] text-[10px] font-bold">
                                You
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCopy(tok.token || tok.id, tok.id)}
                              className="text-slate-600 hover:text-slate-900 cursor-pointer ml-1"
                              title="Copy Full Token"
                            >
                              {isCopied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {tok.user_id && tok.user_id !== 'anonymous_guest' ? (
                            <span className="text-[#EA4C2A]">{tok.user_id}</span>
                          ) : (
                            <span className="text-slate-600 font-bold">Anonymous Diner</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isAndroid ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' :
                            isIos ? 'bg-indigo-50 text-indigo-800 border border-indigo-300' :
                            'bg-blue-50 text-blue-800 border border-blue-300'
                          }`}>
                            {isAndroid ? <Smartphone size={10} /> : isIos ? <Apple size={10} /> : <Globe size={10} />}
                            <span>{tok.platform || 'web'}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-bold text-[11px]">
                          {tok.last_active ? new Date(tok.last_active).toLocaleString() : 'Recent'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteToken(tok.id)}
                            className="p-1 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove Device"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. TAB 4: SENT BROADCAST HISTORY */}
      {subTab === 'history' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-900">Broadcast Audit Trail</h3>
            <p className="text-xs text-slate-600 font-medium">
              History of all announcements and promotions sent via Push Notifications.
            </p>
          </div>

          <div className="space-y-3">
            {logs.length === 0 ? (
              <div className="py-8 text-center text-slate-700 font-bold text-xs">
                No broadcasts sent yet. Use the "Compose Broadcast" tab to send your first alert!
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">{log.title}</span>
                      <span className="px-2 py-0.5 rounded-full bg-orange-100 text-[#EA4C2A] text-[10px] font-bold">
                        {log.target_platform || 'all'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 font-bold">{log.message}</p>
                    <div className="text-[10px] text-slate-600 font-bold flex items-center gap-2">
                      <span>Sent by {log.sender || 'Admin'}</span>
                      <span>·</span>
                      <span>{log.created_at ? new Date(log.created_at).toLocaleString() : 'Just now'}</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black">
                      {log.target_count || 1} Targeted
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
