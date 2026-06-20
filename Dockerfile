# ============================================================
# Dockerfile for Railway deployment
# Lean image — API + pipeline trigger only, no dbt/streamlit
# ============================================================
FROM python:3.10-slim

WORKDIR /app

# Install only what the API + trigger pipeline need
COPY api/requirements-api.txt .
RUN pip install --no-cache-dir -r requirements-api.txt

# Copy application code
COPY api/ ./api/
COPY pipeline/ ./pipeline/

# Railway provides $PORT dynamically
EXPOSE 8000

CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]