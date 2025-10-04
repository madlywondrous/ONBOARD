# ONBOARD F1 Dashboard - Python Backend

FastAPI backend server providing real-time F1 data, live timing, and race analytics.

## Features

- ✅ **Live Timing** - Real-time race positions, lap times, intervals
- ✅ **Driver Data** - Complete driver profiles and statistics
- ✅ **Team Information** - Constructor standings and team details
- ✅ **Weather Data** - Live track and air temperature, humidity, wind
- ✅ **Race Control** - Flags, penalties, and safety car status
- ✅ **Pit Stops** - Live pit stop data and duration
- ✅ **WebSocket Support** - Real-time data streaming
- ✅ **Car Telemetry** - Speed, RPM, gear, throttle, brake data

## Quick Start

### 1. Install Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. Run the Server

```bash
# Development mode (with auto-reload)
python main.py

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Access API

- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## API Endpoints

### Live Timing

- `GET /api/live/session` - Get current/next live session
- `GET /api/live/positions` - Get live driver positions
- `GET /api/live/laps` - Get lap times
- `GET /api/live/weather` - Get weather data
- `GET /api/live/car-data` - Get car telemetry
- `WS /ws/live` - WebSocket for real-time updates

### Drivers

- `GET /api/drivers` - Get all drivers
- `GET /api/drivers/{number}` - Get specific driver

### Teams

- `GET /api/teams` - Get all teams

### Race Control

- `GET /api/race-control` - Get race control messages
- `GET /api/pit-stops` - Get pit stop data

## WebSocket Usage

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/live');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Live data:', data);
};
```

## Data Sources

- **OpenF1 API** - Primary data source for live timing
- **FastF1** - Historical race data and telemetry analysis

## Architecture

```
backend/
├── main.py              # FastAPI application
├── requirements.txt     # Python dependencies
├── .env.example        # Environment variables template
└── README.md           # This file
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_PORT` | Server port | 8000 |
| `API_HOST` | Server host | 0.0.0.0 |
| `CORS_ORIGINS` | Allowed CORS origins | http://localhost:3000 |
| `OPENF1_API_URL` | OpenF1 API base URL | https://api.openf1.org/v1 |
| `DEBUG` | Enable debug mode | True |

## Production Deployment

### Using Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t onboard-backend .
docker run -p 8000:8000 onboard-backend
```

### Using systemd

```ini
[Unit]
Description=ONBOARD F1 Backend API
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/onboard/backend
Environment="PATH=/var/www/onboard/backend/venv/bin"
ExecStart=/var/www/onboard/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000

[Install]
WantedBy=multi-user.target
```

## Rate Limiting

The API implements rate limiting to prevent abuse:
- 60 requests per minute per IP
- WebSocket connections limited to 10 per IP

## Caching

Live data is cached for 5 seconds to reduce API calls to OpenF1.

## Error Handling

All endpoints return proper HTTP status codes:
- `200` - Success
- `404` - Resource not found
- `500` - Server error

## Development

### Adding New Endpoints

```python
@app.get("/api/new-endpoint")
async def new_endpoint():
    try:
        # Your logic here
        return {"message": "Success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Testing

```bash
# Run tests
pytest

# With coverage
pytest --cov=.
```

## License

This is an unofficial project and is not associated with Formula 1.

## Support

For issues and feature requests, please open an issue on GitHub.
