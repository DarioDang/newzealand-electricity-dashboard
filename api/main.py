# ============================================================
# api/main.py
# FastAPI application entry point
# Registers all routers and configures CORS
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from api.routers import carbon, health, prices, reserves, spread, dashboard

# ============================================================
# App setup
# ============================================================
app = FastAPI(
    title="NZ Electricity Dashboard API",
    description="Live NZ electricity market data from em6 free API",
    version="1.0.0",
    docs_url="/docs",       # Swagger UI at /docs
    redoc_url="/redoc"      # ReDoc at /redoc
)

# ============================================================
# CORS — allows frontend HTML to call this API
# In production Vercel handles this, in dev we allow all
# ============================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://[::1]:3000",
        "https://newzealand-electricity-dashboard.netlify.app",
    ],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ============================================================
# Register routers — each file handles one domain
# ============================================================
app.include_router(health.router,   prefix="/api", tags=["Health"])
app.include_router(carbon.router,   prefix="/api", tags=["Carbon"])
app.include_router(prices.router,   prefix="/api", tags=["Prices"])
app.include_router(reserves.router, prefix="/api", tags=["Reserves"])
app.include_router(spread.router,   prefix="/api", tags=["Spread"])
app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])

# ============================================================
# Root redirect to docs
# ============================================================
@app.get("/")
def root():
    return {
        "message": "NZ Electricity Dashboard API",
        "docs": "/docs",
        "health": "/api/health"
    }