# ONBOARD - Formula 1 Live Dashboard

A modern, real-time Formula 1 dashboard with live timing, driver standings, and race calendar. Built with Next.js 15, TypeScript, and Server-Sent Events (SSE) for real-time updates.

## Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- Python 3.11+ with pip

### 1. Install Backend Dependencies
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Start the Backend
```bash
cd backend
python main.py
# Server runs on http://localhost:8000
```

### 3. Install Frontend Dependencies
```bash
# In a new terminal
cd frontend
pnpm install
```

### 4. Start the Frontend
```bash
cd frontend
pnpm dev
# App runs on http://localhost:3000
```

## Architecture
- Frontend: Next.js 15.5.2 (App Router), Tailwind CSS, shadcn/ui
- Backend: FastAPI, Python 3.11+, SSE Broadcaster
- Data Source: F1 Official Live Timing API (SignalR).