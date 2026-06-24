# Using TPI Locally — Without Cloud / Internet Hosting

TPI is designed to run **on a district laptop or office LAN** — no AWS, Azure, or public server required. Internet is only needed for initial `npm install` (once).

---

## What “without hosting to a server” means here

| Mode | Description | Internet needed? |
|------|-------------|------------------|
| **A. DC laptop only** | Everything on one machine | No (after setup) |
| **B. District LAN** | One office PC runs DB + API; DC/HoDs open browser on LAN | No (after setup) |
| **C. Cloud hosting** | Not required — optional for remote access | Yes |

This document covers **A** and **B**.

---

## Architecture (local)

```
┌──────────────────────────────────────────────────────────┐
│  District laptop OR office PC (192.168.x.x)                │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │ SQL Server  │  │ Node API    │  │ React (browser)  │  │
│  │ Express     │  │ port 3001   │  │ port 3000        │  │
│  │ DistrictDB  │  │             │  │ or static build  │  │
│  └─────────────┘  └─────────────┘  └──────────────────┘  │
└──────────────────────────────────────────────────────────┘
         ▲                    ▲
         │                    │
    DC browser          HoD browsers (same Wi‑Fi/LAN)
```

---

## Mode A — Single laptop (DC conference / demo)

**Best for:** DC review on own laptop, no HoD access from other machines.

### One-time setup

1. Install **Node.js 18+** from [nodejs.org](https://nodejs.org)  
2. Install **SQL Server Express** (include TCP/IP, named instance `SQLEXPRESS`)  
3. Copy project folder to laptop (USB / shared drive)  
4. Open PowerShell:

```powershell
cd D:\DistrictD\backend
npm install
copy .env.example .env
# Edit .env with your SQL password

npm run db:reset
npm run db:migrate
npm run seed
npm run seed:demo
```

```powershell
cd D:\DistrictD\frontend
npm install
```

### Every time you use it

**Terminal 1:**

```powershell
cd D:\DistrictD\backend
node server.js
```

Wait for: `DB connected` and `TPI API running on port 3001`

**Terminal 2:**

```powershell
cd D:\DistrictD\frontend
npm start
```

Browser opens: `http://localhost:3000/admindashboard`  
Login: `admin` / `admin123`

### Offline use

- After `npm install`, **no internet** required  
- SQL Server and Node run entirely local  
- Data stays on laptop hard disk  

### Auto-start shortcut (optional)

Create `Start-TPI.bat` on Desktop:

```bat
@echo off
start "TPI API" cmd /k "cd /d D:\DistrictD\backend && node server.js"
timeout /t 5
start "TPI UI" cmd /k "cd /d D:\DistrictD\frontend && npm start"
start http://localhost:3000/admindashboard
```

Double-click before meetings.

---

## Mode B — District office LAN (recommended for 14 HoDs)

**Best for:** HoDs enter data from their desks; DC reviews from chamber — same building Wi‑Fi/LAN.

### Server PC (one designated machine)

Use a stable office desktop — not a laptop that sleeps.

1. Install SQL Server Express + Node.js (same as Mode A)  
2. Complete database setup (`db:reset`, `migrate`, `seed`)  
3. Note server **LAN IP**:  

```powershell
ipconfig
# Example: IPv4 Address . . . : 192.168.1.50
```

4. Allow Windows Firewall inbound for ports **3000** and **3001** (private network only):

```powershell
netsh advfirewall firewall add rule name="TPI API" dir=in action=allow protocol=TCP localport=3001
netsh advfirewall firewall add rule name="TPI UI" dir=in action=allow protocol=TCP localport=3000
```

### Configure for LAN access

**`backend/.env`:**

```env
CORS_ORIGIN=http://192.168.1.50:3000
```

**`frontend/src/utils/api.js`** — change API base (or use env):

```javascript
export const API_BASE = "http://192.168.1.50:3001";
```

Or create `frontend/.env`:

```env
REACT_APP_API_BASE=http://192.168.1.50:3001
```

(and read it in `api.js` if you add that variable — currently hardcoded to localhost; for LAN, update `API_BASE` to server IP.)

### Start on server PC

```powershell
cd D:\DistrictD\backend
node server.js

cd D:\DistrictD\frontend
npm start
# Or production build:
npm run build
npx serve -s build -l 3000
```

### Access from other PCs on LAN

| User | URL |
|------|-----|
| DC | `http://192.168.1.50:3000/admindashboard` |
| Health HoD | `http://192.168.1.50:3000/deptdashboard` |
| Police HoD | same URL, different login |

**No internet** — only machines on same network can connect.

---

## Mode B — Production static UI (faster, no dev server)

On server PC after one-time build:

```powershell
cd D:\DistrictD\frontend
npm run build
npm install -g serve
serve -s build -l 3000
```

Backend still: `node server.js` on port 3001.

Benefits: lighter, suitable for always-on office PC.

---

## Mode C — USB portable copy (no install on DC laptop)

If DC laptop cannot install SQL Server:

1. Use **office PC as server** (Mode B)  
2. DC laptop only needs a **browser** → `http://192.168.1.50:3000`  
3. No software install on DC laptop  

---

## Data backup (local)

```sql
-- SQL Server Management Studio
BACKUP DATABASE DistrictDB4
TO DISK = 'D:\Backups\TPI_backup.bak'
WITH FORMAT;
```

Schedule monthly before review meetings.

---

## Troubleshooting (local)

| Problem | Fix |
|---------|-----|
| `Server error` on login | Start SQL Server service; wait 30s; restart `node server.js` |
| `DB failed, retrying` | Check `DB_PASSWORD`, instance `SQLEXPRESS` running |
| Blank page on `/admindashboard/history` | Refresh; ensure backend running |
| HoD cannot connect | Check firewall, use server IP not `localhost` |
| CORS error from LAN | Set `CORS_ORIGIN` to exact frontend URL with IP |

---

## Security on local LAN

- Do not port-forward 3000/3001 to the **internet** without VPN + HTTPS  
- Change default passwords before HoDs use system  
- Office LAN only = acceptable for government intranet style use  
- For field/off-site DC access: use **VPN into district network**, not public exposure  

---

## Summary — quickest path for tomorrow’s DC demo

```powershell
# 1. Start SQL Server (Windows Services → SQL Server (SQLEXPRESS))

# 2. Backend
cd D:\DistrictD\backend
node server.js

# 3. Frontend
cd D:\DistrictD\frontend
npm start

# 4. Browser
http://localhost:3000/admindashboard
admin / admin123
```

No cloud. No external hosting. All data on district machine.
