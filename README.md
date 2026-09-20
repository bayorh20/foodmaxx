# 🍔 FoodMaxx — Food Delivery Platform

FoodMaxx is a modern Nigerian food ordering and delivery platform built with a 4-in-1 multi-portal architecture:
- 📱 **Customer App** (Mobile viewport optimized)
- 🏪 **Vendor Dashboard** (Restaurant order, menu & status management)
- 🛵 **Rider App** (Dispatch acceptance, GPS status, OTP delivery verification)
- ⚙️ **Admin Dashboard** (Platform oversight, revenue analytics, moderation & zones)

---

## 🚀 Opening in Antigravity IDE

### Method 1: Open Folder (Recommended)
1. In Antigravity IDE, select **File → Open Folder...**
2. Choose:
   ```
   C:\Users\HP\.gemini\antigravity\scratch\foodmaxx
   ```
3. Set this folder as your **Active Workspace**.

### Method 2: Open Workspace File
1. In Antigravity IDE, select **File → Open Workspace from File...**
2. Choose:
   ```
   C:\Users\HP\.gemini\antigravity\scratch\foodmaxx\foodmaxx.code-workspace
   ```
This automatically mounts:
- `🍔 FoodMaxx (Root)`
- `📱 Client (React + Vite)`
- `🔌 Server (Express + WebSocket)`

---

## 🏃‍♂️ Running the Platform

Both servers are currently running:
- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001/api](http://localhost:3001/api)
- **WebSocket Feed**: `ws://localhost:3001`

### Running from Antigravity IDE
Press `Ctrl+Shift+P` → type **Tasks: Run Task** → select:
- **Run Full FoodMaxx Platform** (starts both concurrently)
- Or **Start Backend Server** / **Start Frontend Client** individually

### Running from Terminal
```powershell
# Terminal 1 — Backend (Express + WS + JSON DB)
cd server
node src/server.js

# Terminal 2 — Frontend (React 19 + Tailwind v4 + Vite)
cd client
npm.cmd run dev
```

---

## 👥 Demo Accounts (Quick Demo Login)

Click **⚡ Quick Demo Login** in the top switcher bar to instantly switch between:

| Role | Name | Email | Password |
|---|---|---|---|
| 👩🏾 **Customer** | Adaobi Okafor | `adaobi@foodmaxx.ng` | `password123` |
| 🍽️ **Vendor** | Bukka Hut Bodija | `manager@bukkahut.ng` | `password123` |
| 🍽️ **Vendor** | Amala Skylolo | `manager@skylolo.ng` | `password123` |
| 🛵 **Rider** | Tunde Balogun | `tunde@foodmaxx.ng` | `password123` |
| 🛵 **Rider** | Ibrahim Danjuma | `ibrahim@foodmaxx.ng` | `password123` |
| ⚙️ **Super Admin**| Platform Ops | `admin@foodmaxx.ng` | `admin123` |

---

## 🎟️ Active Promo Codes
- `FOODMAXX20` (20% off meals)
- `WELCOME500` (₦500 off first order)
- `FREEDELIVERY` (₦0 delivery fee)

---

## 📁 Architecture Overview
```
foodmaxx/
├── foodmaxx.code-workspace   # Antigravity IDE workspace descriptor
├── .vscode/
│   ├── settings.json         # Workspace settings
│   ├── tasks.json            # One-click start tasks
│   └── launch.json           # Node debugger configurations
├── client/                   # React 19 + Tailwind CSS v4 + Vite
│   ├── src/
│   │   ├── App.jsx           # Full 4-portal responsive application
│   │   ├── index.css         # Custom animations & responsive utilities
│   │   └── services/api.js   # HTTP & WebSocket API client
│   └── package.json
└── server/                   # Node.js + Express + WebSocket
    ├── src/
    │   ├── config/database.js # Persistent JSON file DB with 30 tables
    │   ├── seed/seedData.js   # Nigerian demo restaurants & menus
    │   ├── routes/            # REST API endpoints (auth, orders, etc.)
    │   └── server.js          # HTTP + WS server entrypoint
    └── data/
        └── foodmaxx.db.json   # Live persistent database
```
