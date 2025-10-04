# 🏎️ ONBOARD F1 Dashboard - Quick Start Guide

## ✅ Setup Complete!

Your ONBOARD F1 Dashboard is ready to run with full live timing features!

## 🚀 Starting the Application

### 1. Start the Python Backend (Terminal 1)

```bash
cd backend
eval "$(/opt/homebrew/bin/conda shell.zsh hook)"
conda activate onboard-f1
python main.py
```

The backend will start on **http://localhost:8000**

**Backend Features:**
- ✅ Live F1 session data
- ✅ Driver standings and profiles
- ✅ Team information
- ✅ Constructor standings
- ✅ Session statistics
- ✅ WebSocket support for real-time updates
- ✅ OpenF1 API integration

### 2. Start the Next.js Frontend (Terminal 2)

```bash
pnpm dev
```

The frontend will start on **http://localhost:3000**

**Frontend Features:**
- ✅ Live timing section with real-time race data
- ✅ F1 Calendar with all 2025 races
- ✅ Driver profiles with team information
- ✅ Constructor standings
- ✅ Session statistics
- ✅ Responsive dark theme design

## 📡 API Endpoints

### Health Check
```bash
curl http://localhost:8000/health
```

### Live Session Data
```bash
curl http://localhost:8000/api/live/session
curl http://localhost:8000/api/live/positions
curl http://localhost:8000/api/live/weather
```

### Drivers & Teams
```bash
curl http://localhost:8000/api/drivers
curl http://localhost:8000/api/teams
curl http://localhost:8000/api/standings/drivers
curl http://localhost:8000/api/standings/constructors
```

### Sessions & Statistics
```bash
curl http://localhost:8000/api/sessions/latest
curl http://localhost:8000/api/statistics/session/1234
```

### WebSocket (Live Updates)
Connect to: `ws://localhost:8000/ws/live`

## 🔧 Configuration

### Backend (.env in /backend)
- `API_VERSION=v1`
- `API_PORT=8000`
- `API_HOST=0.0.0.0`
- `CORS_ORIGINS=http://localhost:3000`
- `OPENF1_API_URL=https://api.openf1.org/v1`

### Frontend (.env.local in root)
- `NEXT_PUBLIC_API_URL=http://localhost:8000`
- `NEXT_PUBLIC_API_VERSION=v1`
- `NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws`

## 📚 Documentation

- **API Documentation**: http://localhost:8000/docs (when backend is running)
- **Backend README**: `backend/README.md`
- **Implementation Summary**: `IMPLEMENTATION_SUMMARY.md`
- **Live Features README**: `LIVE_FEATURES_README.md`

## 🐛 Troubleshooting

### Backend won't start
```bash
# Make sure conda environment is activated
conda activate onboard-f1

# Reinstall dependencies if needed
pip install -r requirements.txt
```

### Frontend API errors
- Check that backend is running on port 8000
- Verify NEXT_PUBLIC_API_URL in .env.local
- Check browser console for CORS errors

### Port already in use
```bash
# Find and kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Or change port in backend/.env
API_PORT=8001
```

## 🎯 Navigation

1. **Dashboard** - Overview of all F1 data
2. **Live** - Real-time race timing and positions (requires active session)
3. **Calendar** - All 2025 F1 races with session details
4. **Drivers** - Driver profiles and standings
5. **Teams** - Constructor standings and team info
6. **Standings** - Championship points and rankings
7. **Statistics** - Detailed session and race statistics

## 🔄 Live Data Updates

- **Polling**: Frontend polls backend every 5 seconds for live data
- **WebSocket**: Real-time streaming available via WebSocket connection
- **Cache**: Backend caches live data to reduce API calls
- **OpenF1 API**: Backend fetches data from official OpenF1 API

## 📝 Notes

- **2025 Data**: The OpenF1 API may not have 2025 data yet, so you might see "No Live Session" messages
- **401 Errors**: Normal if OpenF1 doesn't have current season data
- **Development Mode**: Backend runs with hot-reload enabled
- **Auto-refresh**: Frontend automatically refreshes live data

## 🎉 Enjoy your F1 Dashboard!

Access the dashboard at: **http://localhost:3000**

---

*For more details, see the comprehensive documentation in the `/backend` directory.*
