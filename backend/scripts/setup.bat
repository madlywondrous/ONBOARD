@echo off
REM Setup script for ONBOARD F1 Backend using Miniconda (Windows)

echo 🏎️  Setting up ONBOARD F1 Backend with Miniconda...

REM Create conda environment
echo 📦 Creating conda environment 'onboard-f1'...
call conda create -n onboard-f1 python=3.11 -y

REM Activate environment
echo ✅ Activating environment...
call conda activate onboard-f1

REM Install dependencies
echo 📥 Installing dependencies...
pip install -r requirements.txt

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file...
    copy .env.example .env
    echo ✅ Created .env file. Please update it with your settings.
)

echo.
echo ✅ Setup complete!
echo.
echo To start the backend:
echo   conda activate onboard-f1
echo   python main.py
echo.
echo API will be available at: http://localhost:8000
echo API Documentation: http://localhost:8000/docs
