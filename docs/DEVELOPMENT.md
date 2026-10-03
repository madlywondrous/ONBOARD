# Development Guide

This repository contains a **Polyglot Monorepo** composed of a Next.js (TypeScript) Frontend and a FastAPI (Python) Backend.

## Prerequisites
- Node.js 18+ and `npm`
- Python 3.11+ with `pip`
- `make` utility (comes pre-installed on macOS/Linux)

## Quick Start (Recommended)

We use a root `Makefile` to orchestrate both the frontend and backend simultaneously.

### 1. Install Dependencies
Run the following command from the root of the project to automatically create the Python virtual environment and install both backend and frontend dependencies:
```bash
make install
```

### 2. Start the Application
To boot up both the Next.js frontend and the FastAPI backend concurrently in the same terminal, run:
```bash
make dev
```
- Frontend runs on `http://localhost:3000`
- Backend API runs on `http://localhost:8000`

### 3. Clean Environment
If you run into dependency issues or cache corruption, you can wipe all build caches, `node_modules`, and Python virtual environments safely:
```bash
make clean
```

---

## Manual Execution

If you prefer to run the services in separate terminal tabs manually:

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
