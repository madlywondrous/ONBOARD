# 🏁 ONBOARD F1 Dashboard - Setup Complete!

## ✅ Installation Summary

Your ONBOARD F1 Dashboard has been successfully set up with **full live timing features** and a **Python FastAPI backend**!

---

## 📦 What Was Installed

### Python Environment (Miniconda)
- **Environment Name**: `onboard-f1`
- **Python Version**: 3.11.13
- **Location**: `/opt/homebrew/Caskroom/miniconda/base/envs/onboard-f1`

### Backend Dependencies (15 packages)
```
✅ fastapi==0.115.0          - Web framework
✅ uvicorn==0.32.0           - ASGI server
✅ httpx==0.27.2             - HTTP client
✅ python-dotenv==1.0.1      - Environment config
✅ pydantic==2.9.2           - Data validation
✅ pydantic-settings==2.6.0  - Settings management
✅ pandas==2.3.3             - Data analysis
✅ numpy==2.3.3              - Numerical computing
✅ python-multipart==0.0.12  - File uploads
✅ aiofiles==24.1.0          - Async file operations
✅ websockets==13.1          - WebSocket support
```

Plus dependencies: starlette, typing-extensions, anyio, httpcore, click, h11, httptools, uvloop, watchfiles, pyyaml, etc.

---

## 🚀 How to Start the Application

### Option 1: Quick Start (Recommended)

Open **two terminals**:

**Terminal 1 - Backend:**
```bash
cd "/Users/ayushh/Developer/Project - ONBOARD/ONBOARD/backend"
eval "$(/opt/homebrew/bin/conda shell.zsh hook)"
conda activate onboard-f1
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd "/Users/ayushh/Developer/Project - ONBOARD/ONBOARD"
pnpm dev
```

### Option 2: Using Setup Script

**Backend:**
```bash
cd backend
./setup.sh
```

Then start:
```bash
conda activate onboard-f1
python main.py
```

**Frontend:**
```bash
pnpm dev
```

---

## 🌐 Access URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main dashboard |
| **Backend API** | http://localhost:8000 | REST API |
| **API Docs** | http://localhost:8000/docs | Interactive API documentation |
| **WebSocket** | ws://localhost:8000/ws/live | Real-time updates |

---

## 🎯 Features Implemented

### Live Timing Section
- ✅ Real-time race positions
- ✅ Driver timing tower with team colors
- ✅ Session information (track, type, status)
- ✅ Weather conditions
- ✅ Automatic 5-second polling
- ✅ "No Live Session" graceful handling

### Enhanced Drivers Section
- ✅ All 2025 F1 drivers
- ✅ Search functionality
- ✅ Team grouping with colors
- ✅ Driver profiles
- ✅ Points and standings

### Enhanced Teams Section
- ✅ Constructor championship standings
- ✅ Team cards with branding
- ✅ Driver lineups per team
- ✅ Team statistics

### Backend API (15+ Endpoints)
- ✅ `/health` - Health check
- ✅ `/` - API information
- ✅ `/api/live/session` - Current session
- ✅ `/api/live/positions` - Live positions
- ✅ `/api/live/weather` - Live weather
- ✅ `/api/drivers` - All drivers
- ✅ `/api/drivers/{id}` - Driver details
- ✅ `/api/teams` - All teams
- ✅ `/api/teams/{id}` - Team details
- ✅ `/api/standings/drivers` - Driver standings
- ✅ `/api/standings/constructors` - Constructor standings
- ✅ `/api/sessions/latest` - Latest session
- ✅ `/api/sessions/upcoming` - Upcoming sessions
- ✅ `/api/statistics/session/{id}` - Session stats
- ✅ `/ws/live` - WebSocket for real-time updates

---

## 📁 Project Structure

```
ONBOARD/
├── backend/                    # Python FastAPI Backend
│   ├── main.py                # Main API server (410 lines)
│   ├── requirements.txt       # Python dependencies
│   ├── setup.sh              # Conda setup script
│   ├── setup.bat             # Windows setup script
│   ├── test-api.sh           # API test script
│   └── README.md             # Backend documentation
│
├── components/
│   └── dashboard/
│       ├── live-section.tsx      # NEW: Live timing component
│       ├── drivers-section.tsx   # ENHANCED: Driver profiles
│       └── teams-section.tsx     # ENHANCED: Team standings
│
├── lib/
│   └── utils/
│       └── navigation.ts         # UPDATED: Added "Live" section
│
├── .env.local                 # UPDATED: Backend API URL
├── package.json              # CLEANED: 43 deps (was 69)
├── QUICKSTART.md             # NEW: Quick start guide
├── IMPLEMENTATION_SUMMARY.md  # Backend implementation details
├── LIVE_FEATURES_README.md   # Live features documentation
└── OPTIMIZATION_SUMMARY.md   # Cleanup summary
```

---

## 🧪 Testing the Setup

### Test Backend
```bash
cd backend
./test-api.sh
```

Or manually:
```bash
# Health check
curl http://localhost:8000/health

# Get drivers
curl http://localhost:8000/api/drivers

# Get teams
curl http://localhost:8000/api/teams

# Live session
curl http://localhost:8000/api/live/session
```

### Test Frontend
1. Open http://localhost:3000
2. Click "Live" in the sidebar (first item)
3. You should see the live timing section
4. Click "Drivers" to see enhanced driver profiles
5. Click "Teams" to see constructor standings

---

## 🔧 Configuration Files

### Backend (.env in /backend) - Optional
The backend works with defaults, but you can create a `.env`:
```bash
API_VERSION=v1
API_PORT=8000
API_HOST=0.0.0.0
CORS_ORIGINS=http://localhost:3000
OPENF1_API_URL=https://api.openf1.org/v1
```

### Frontend (.env.local in root) - Configured ✅
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_VERSION=v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

---

## 📝 Important Notes

### OpenF1 API & 2025 Data
- The backend fetches data from **OpenF1 API** (https://api.openf1.org/v1)
- You may see **401 Unauthorized** errors - this is normal
- OpenF1 may not have 2025 season data yet
- The "No Live Session" message is expected when no race is active
- Historical data (2024 and earlier) should work fine

### Live Data Behavior
- **Frontend** polls backend every **5 seconds**
- **Backend** caches data to reduce API calls
- **WebSocket** support available for real-time streaming
- Graceful degradation when no live session exists

### Development Mode
- Backend runs with **hot-reload** (auto-restart on file changes)
- Frontend runs with **Next.js fast refresh**
- Console errors about 401 from OpenF1 are expected

---

## 🎉 Next Steps

1. **Start both servers** (backend + frontend)
2. **Open** http://localhost:3000
3. **Navigate** to the "Live" section
4. **Explore** all the enhanced features
5. **Check** API docs at http://localhost:8000/docs

---

## 🆘 Troubleshooting

### Backend won't start
```bash
# Activate environment
conda activate onboard-f1

# Check Python version
python --version  # Should be 3.11.x

# Reinstall if needed
pip install -r requirements.txt
```

### Port 8000 already in use
```bash
# Find and kill process
lsof -ti:8000 | xargs kill -9
```

### Frontend can't connect to backend
1. Verify backend is running on http://localhost:8000
2. Check `.env.local` has correct `NEXT_PUBLIC_API_URL`
3. Restart frontend: `pnpm dev`

### Conda command not found
```bash
# Initialize conda in your shell
/opt/homebrew/bin/conda init zsh
source ~/.zshrc
```

---

## 📚 Documentation

- **QUICKSTART.md** - Quick start guide (this file)
- **backend/README.md** - Comprehensive backend documentation
- **IMPLEMENTATION_SUMMARY.md** - Implementation details
- **LIVE_FEATURES_README.md** - Live features documentation
- **OPTIMIZATION_SUMMARY.md** - Project cleanup summary
- **API Docs** - http://localhost:8000/docs (interactive)

---

## 🏎️ Enjoy Your F1 Dashboard!

Everything is ready to go. Start the servers and enjoy real-time F1 data!

**Questions?** Check the documentation or the comprehensive READMEs.

**Issues?** Make sure both servers are running and the ports are correct.

---

*Last Updated: January 2025*
*Python Environment: onboard-f1 (Python 3.11.13)*
*Backend: FastAPI 0.115.0*
*Frontend: Next.js 15.5.2*
