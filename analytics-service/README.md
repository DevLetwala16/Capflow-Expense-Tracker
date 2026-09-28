# CapFlow Analytics Service

Stateless FastAPI microservice that performs advanced analytics (z-score anomaly detection,
linear regression trend overlay, ±1 std-dev bands) on expense transaction data.

## Setup

```bash
cd analytics-service
pip install -r requirements.txt
cp .env.example .env
# Edit .env if needed
```

## Run (development)

```bash
uvicorn main:app --reload --port 8000
```

The service will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

## Endpoints

| Method | Path       | Description                            |
|--------|------------|----------------------------------------|
| POST   | `/analyze` | Compute donut, stackedBar, lineTrend, insights |
| GET    | `/health`  | Health check                           |

## Deploy

### Render
1. Create a new **Web Service** pointing to this directory.
2. Set **Build Command**: `pip install -r requirements.txt`
3. Set **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variable `FRONTEND_ORIGIN` → your Vercel production URL (e.g. `https://capflow.vercel.app`).

### Fly.io
```bash
fly launch
fly secrets set FRONTEND_ORIGIN=https://capflow.vercel.app
fly deploy
```

## Environment Variables

| Variable          | Default                  | Description                          |
|-------------------|--------------------------|--------------------------------------|
| `FRONTEND_ORIGIN` | `*` (dev — allow all)    | Allowed CORS origin for the frontend |
| `PORT`            | `8000`                   | Port the server listens on           |
