# ⚡ NZ Electricity Dashboard

> **End-to-end data engineering pipeline** ingesting live New Zealand electricity market data via em6 API, orchestrated through GitHub Actions, warehoused in Neon Postgres with dbt transforms, and visualised in a real-time dashboard.

[![Live Dashboard](https://img.shields.io/badge/Live%20Dashboard-Visit-14b8a6?style=for-the-badge&logo=netlify)](https://newzealand-electricity-dashboard.netlify.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![dbt](https://img.shields.io/badge/dbt-FF694B?style=for-the-badge&logo=dbt&logoColor=white)](https://www.getdbt.com/)

---

## 📸 Preview

![NZ Electricity Dashboard](./frontend/static/preview.png)

---

## 🗺️ Architecture Overview

```
em6 Free API
     │
     ▼
GitHub Actions (cron: every 30 min)
     │  ETL: extract → transform → load
     ▼
Neon Postgres (ap-southeast-2)
     │  raw schema → staging views → mart tables
     ▼
dbt (82 data quality tests)
     │
     ▼
FastAPI Backend (REST endpoints)
     │
     ▼
HTML / CSS / JS Frontend  ──→  Netlify (static hosting)
     +
Streamlit Dashboard       ──→  Render (free tier)
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Data Source** | [em6 API](https://www.em6.co.nz/) | Live NZ electricity market data (free tier) |
| **Orchestration** | GitHub Actions | Cron scheduler — ETL trigger every 30 min |
| **Backend** | FastAPI + Python 3.10 | REST API serving transformed data |
| **Database** | Neon Postgres (ap-southeast-2) | Cloud-hosted Postgres, always-free tier |
| **Transformation** | dbt | Staging views, mart tables, 82 data tests |
| **Frontend** | HTML · CSS · JS · Plotly | Real-time interactive dashboard |
| **Alt Frontend** | Streamlit | Rapid-prototype dashboard |
| **Hosting** | Netlify + Render | Zero-cost production deployment |

---

## 📊 Dashboard Features

- **Regional Price Overview** — Plotly Scattergeo map of all 14 NZ grid zones with live $/MWh pricing
- **Carbon Emissions Gauge** — Animated SVG gauge showing real-time grid carbon intensity (g/kWh)
- **Price Last 24 Hours** — Multi-node price chart (Auckland, Wellington, Benmore, Waikato, Kikiwhenua, Islington)
- **Daily Market Summary** — 30-day rolling avg price, carbon intensity, and renewable % trend
- **Carbon & Renewable Trend** — 7-day hourly dual-axis chart
- **NI/SI Price Spread** — Auckland vs Benmore spread with bar overlay
- **KPI Cards** — Renewable generation %, carbon intensity, grid spread, and reserve status

---

## 🗂️ Project Structure

```
nz-electricity-dashboard/
├── .github/
│   └── workflows/          # GitHub Actions ETL pipeline
├── api/                    # FastAPI application
│   ├── main.py
│   ├── routes/
│   └── models/
├── database/               # Schema definitions & migrations
├── frontend/               # Static dashboard
│   ├── assets/             # GeoJSON, SVG map files
│   ├── css/                # Modular CSS (tokens, layout, components)
│   ├── js/                 # Chart builders, dashboard logic
│   ├── static/             # Icons and images
│   └── index.html
├── notebooks/              # EDA and data exploration
├── nz_energy_dbt/          # dbt project
│   ├── models/
│   │   ├── staging/        # Raw → cleaned views
│   │   └── marts/          # Business-ready tables
│   └── tests/              # 82 data quality tests
├── nz-grid-streamlit/      # Streamlit alternative dashboard
│   └── app.py
├── pipeline/               # ETL scripts
├── tests/                  # API and pipeline tests
├── docker-compose.yml      # Local Postgres for development
├── netlify.toml            # Netlify deployment config
└── render.yaml             # Render deployment config
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10 (`pyenv local 3.10.0`)
- Docker & Docker Compose (for local DB)
- A [Neon](https://neon.tech/) account (free tier)

### 1. Clone the repository

```bash
git clone https://github.com/DarioDang/nz-electricity-dashboard.git
cd nz-electricity-dashboard
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
DATABASE_URL=postgresql://user:password@host/dbname
EM6_API_KEY=your_em6_api_key
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Start local database (optional)

```bash
docker-compose up -d
```

### 5. Run dbt transforms

```bash
cd nz_energy_dbt
dbt deps
dbt run
dbt test
```

### 6. Start the API

```bash
cd api
uvicorn main:app --reload --port 8000
```

### 7. Open the dashboard

Serve `frontend/` with any static server:

```bash
# Using VS Code Live Server, or:
python -m http.server 5500 --directory frontend
```

Then open `http://localhost:5500`.

---

## ⚙️ GitHub Actions Pipeline

The ETL pipeline runs automatically every 30 minutes via cron:

```yaml
# .github/workflows/etl.yml
on:
  schedule:
    - cron: '7,37 * * * *'
```

**Pipeline steps:**
1. Fetch latest data from em6 API (prices, carbon, reserves, spread)
2. Load raw records into Neon Postgres
3. Run dbt to refresh staging views and mart tables
4. Purge data older than 7 days

---

## 📡 API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/carbon/latest` | Latest carbon intensity & grid status |
| `GET /api/carbon/trend?hours=192` | Carbon trend (last N hours) |
| `GET /api/prices/nodes?hours=48` | Node prices (last N hours) |
| `GET /api/prices/regions` | Current regional prices (14 zones) |
| `GET /api/prices/summary?days=30` | Daily market summary |
| `GET /api/spread/latest` | Current NI/SI price spread |
| `GET /api/spread/trend?hours=48` | Spread trend |
| `GET /api/reserves/latest` | Grid reserve status |

---

## 🧪 Data Quality

dbt runs **82 automated data tests** on every pipeline execution:

- Not-null constraints on all key fields
- Accepted value ranges for prices and carbon intensity
- Referential integrity across staging and mart models
- Uniqueness checks on primary keys

---

## 🌐 Deployment

### Frontend → Netlify

```toml
# netlify.toml
[build]
  publish = "frontend"
```

Push to `main` → Netlify auto-deploys.

### API → Render

```yaml
# render.yaml
services:
  - type: web
    name: nz-electricity-api
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn api.main:app --host 0.0.0.0 --port $PORT
```

---

## 📄 License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

---

## 👤 Author

**Dario Dang** — Data Engineering Portfolio Project

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0a66c2?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/dario-dang-89049020a/)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=flat-square&logo=github)](https://github.com/DarioDang)
[![Portfolio](https://img.shields.io/badge/Portfolio-Visit-14b8a6?style=flat-square)](https://dariodang.github.io/)

---

*Built entirely on free-tier infrastructure — no paid compute required.*