#!/bin/bash
# Test script for ONBOARD F1 Backend

echo "🏎️  Testing ONBOARD F1 Backend..."
echo ""

# Check if backend is running
echo "1️⃣  Testing health endpoint..."
HEALTH=$(curl -s http://localhost:8000/health)
if [ $? -eq 0 ]; then
    echo "✅ Backend is running!"
    echo "   Response: $HEALTH"
else
    echo "❌ Backend is not running. Please start it first:"
    echo "   cd backend && conda activate onboard-f1 && python main.py"
    exit 1
fi

echo ""
echo "2️⃣  Testing API root..."
curl -s http://localhost:8000/ | head -5
echo ""

echo ""
echo "3️⃣  Testing drivers endpoint..."
DRIVERS=$(curl -s http://localhost:8000/api/drivers)
if [ $? -eq 0 ]; then
    echo "✅ Drivers endpoint working!"
    echo "$DRIVERS" | head -10
else
    echo "❌ Drivers endpoint failed"
fi

echo ""
echo "4️⃣  Testing teams endpoint..."
TEAMS=$(curl -s http://localhost:8000/api/teams)
if [ $? -eq 0 ]; then
    echo "✅ Teams endpoint working!"
    echo "$TEAMS" | head -10
else
    echo "❌ Teams endpoint failed"
fi

echo ""
echo "5️⃣  Testing live session endpoint..."
LIVE=$(curl -s http://localhost:8000/api/live/session)
if [ $? -eq 0 ]; then
    echo "✅ Live session endpoint working!"
    echo "$LIVE" | head -5
else
    echo "❌ Live session endpoint failed"
fi

echo ""
echo "6️⃣  Testing standings endpoints..."
curl -s http://localhost:8000/api/standings/drivers | head -5
echo ""

echo ""
echo "✅ All tests complete!"
echo ""
echo "📚 API Documentation: http://localhost:8000/docs"
echo "🎯 Frontend: http://localhost:3000"
