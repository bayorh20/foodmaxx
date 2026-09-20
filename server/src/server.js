const http = require('http');
const WebSocket = require('ws');
const app = require('./app');
const { seedDatabase } = require('./seed/seedData');
const db = require('./config/database');

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server });

// Attach wss globally so controllers can broadcast
global.wss = wss;

wss.on('connection', (ws, req) => {
  console.log('New WebSocket client connected');

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      // Client registers itself with role/userId for targeted broadcasting
      if (msg.type === 'REGISTER') {
        ws.userId = msg.userId;
        ws.userRole = msg.userRole;
        ws.restaurantId = msg.restaurantId || null;
        ws.riderId = msg.riderId || null;
        console.log(`WS registered: ${msg.userRole} / ${msg.userId}`);
      }
    } catch (e) {}
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });

  // Send initial welcome ping
  ws.send(JSON.stringify({ type: 'CONNECTED', platform: 'FoodMaxx', ts: Date.now() }));
});

// Global broadcast helper
global.broadcast = function(payload, filterFn = null) {
  const msg = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      if (!filterFn || filterFn(client)) {
        client.send(msg);
      }
    }
  });
};

// Initialize baseline production catalog if empty
const restaurants = db.table('restaurants');
if (restaurants.length === 0) {
  seedDatabase();
  console.log('[FoodMaxx] Production database initialized with official catalog.');
} else {
  console.log(`[FoodMaxx] Production database loaded: ${restaurants.length} restaurant entity configured.`);
}

server.listen(PORT, () => {
  console.log(`\n🍔 FoodMaxx Production Backend Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server active on ws://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}\n`);
});
