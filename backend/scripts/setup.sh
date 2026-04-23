#!/bin/bash
# Setup script for ONBOARD F1 Backend using Miniconda

echo "🏎️  Setting up ONBOARD F1 Backend with Miniconda..."

# Initialize conda for this shell
eval "$(/opt/homebrew/bin/conda shell.bash hook)"

# Create conda environment
echo "📦 Creating conda environment 'onboard-f1' with Python 3.11..."
conda create -n onboard-f1 python=3.11 -y

# Activate environment
echo "✅ Activating environment..."
conda activate onboard-f1

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ Created .env file. Please update it with your settings."
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the backend:"
echo "  conda activate onboard-f1"
echo "  python main.py"
echo ""
echo "Or run directly:"
echo "  conda run -n onboard-f1 python main.py"
echo ""
echo "API will be available at: http://localhost:8000"
echo "API Documentation: http://localhost:8000/docs"
