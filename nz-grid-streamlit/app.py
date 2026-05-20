"""
NZ Grid Intelligence — Streamlit Dashboard
"""

import streamlit as st
import pandas as pd
import requests
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from datetime import timezone, timedelta
from zoneinfo import ZoneInfo
import os
import base64

# ============================================================
# Config
# ============================================================

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

st.set_page_config(
    page_title="NZ Grid Intelligence",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ============================================================
# Helpers
# ============================================================

NZT = timezone(timedelta(hours=12))

def to_nzt(utc_str: str) -> str:
    try:
        dt = pd.to_datetime(utc_str, utc=True).to_pydatetime()
        dt_nz = dt.astimezone(ZoneInfo("Pacific/Auckland"))
        return dt_nz.strftime("%H:%M %Z %d/%m/%Y")
    except Exception:
        return str(utc_str)

def safe_float(value, default=0.0) -> float:
    try:
        return float(value) if value is not None else default
    except (TypeError, ValueError):
        return default

def icon_to_base64(filename: str) -> str:
    path = os.path.join(STATIC_DIR, filename)
    try:
        with open(path, "rb") as f:
            ext = filename.split(".")[-1].lower()
            mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"
            data = base64.b64encode(f.read()).decode()
            return f"data:{mime};base64,{data}"
    except FileNotFoundError:
        svg = (
            '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">'
            '<rect width="64" height="64" rx="12" fill="#1e3448"/>'
            '<text x="32" y="40" text-anchor="middle" font-size="24" fill="#14b8a6">?</text>'
            '</svg>'
        )
        return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()

@st.cache_data(ttl=60)
def api_get(endpoint: str):
    r = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
    r.raise_for_status()
    return r.json()

def panel_header(icon: str, title: str, subtitle: str, image_icon: bool = False):
    if image_icon:
        icon_html = f'<img src="{icon_to_base64(icon)}" class="panel-icon-img" />'
    else:
        icon_html = icon

    st.markdown(f"""
    <div class="panel-hdr">
        <div class="panel-icon">{icon_html}</div>
        <div class="panel-title">{title}</div>
        <div class="panel-sub">{subtitle}</div>
    </div>
    """, unsafe_allow_html=True)

# ============================================================
# CSS + Animations
# ============================================================

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');

html, body, .stApp {
    background: #060d18 !important;
    color: #e8f0f8 !important;
    font-family: 'DM Sans', sans-serif !important;
}
.block-container { padding: 0 !important; max-width: 100% !important; }
#MainMenu, footer, header        { visibility: hidden; }
[data-testid="stToolbar"]        { display: none; }
[data-testid="stDecoration"]     { display: none; }
[data-testid="stDivider"]        { display: none; }
section[data-testid="stSidebar"] { display: none; }

/* ── Animations ──────────────────────────── */
@keyframes pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(20,184,166,0.4); }
    50%     { box-shadow: 0 0 0 5px rgba(20,184,166,0); }
}

@keyframes fadeInDown {
    from { opacity: 0; transform: translateY(-16px); }
    to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInLeft {
    from { opacity: 0; transform: translateX(-20px); }
    to   { opacity: 1; transform: translateX(0); }
}

@keyframes countUp {
    from { opacity: 0; transform: scale(0.85); }
    to   { opacity: 1; transform: scale(1); }
}

@keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
}

@keyframes borderGlow {
    0%,100% { border-color: #1e3448; }
    50%     { border-color: #14b8a6; box-shadow: 0 0 16px rgba(20,184,166,0.15); }
}

@keyframes arrow-pulse {
    0%,100% { opacity: 0.3; transform: translateX(0); }
    50%     { opacity: 1.0; transform: translateX(6px); }
}

@keyframes barFill {
    from { width: 0%; }
    to   { width: var(--bar-width); }
}

/* ── Header ─────────────────────────────── */
.dash-header {
    background: #0a0f1a;
    border-bottom: 1px solid #1e3448;
    padding: 14px 28px;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    animation: fadeInDown 0.6s ease both;
}

.header-left {
    justify-self: start;
    display: flex;
    align-items: center;
}

.header-center {
    justify-self: center;
    text-align: center;
}

.header-right {
    justify-self: end;
    display: flex;
    align-items: center;
    gap: 12px;
}

.header-logo {
    font-family: 'Space Mono', monospace;
    font-size: 18px;
    font-weight: 700;
    color: #14b8a6;
    letter-spacing: 0.5px;
    background: linear-gradient(90deg, #14b8a6, #10b981, #14b8a6);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmer 4s linear infinite;
}

.header-sub {
    font-size: 11px;
    color: #3d5a75;
    font-family: 'Space Mono', monospace;
    margin-top: 3px;
    text-align: center;
}

/* NZ live clock */
.nz-clock-card {
    position: relative;
    overflow: hidden;
    min-width: 230px;
    padding: 8px 14px;
    border-radius: 16px;
    background: rgba(20,184,166,0.08);
    border: 1px solid rgba(20,184,166,0.45);
    box-shadow: 0 0 14px rgba(20,184,166,0.08);
    animation: clockBreath 3.6s ease-in-out infinite;
}

.nz-clock-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: -60%;
    width: 45%;
    height: 100%;
    background: linear-gradient(
        90deg,
        transparent,
        rgba(255,255,255,0.10),
        transparent
    );
    animation: clockShine 4s ease-in-out infinite;
}

.nz-clock-label {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    color: #3d5a75;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    margin-bottom: 4px;
}

.nz-clock-time {
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    font-weight: 700;
    color: #14b8a6;
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
}

.nz-clock-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #14b8a6;
    display: inline-block;
    box-shadow: 0 0 10px rgba(20,184,166,0.8);
    animation: pulse 2s infinite;
}

@keyframes clockBreath {
    0%, 100% {
        box-shadow: 0 0 12px rgba(20,184,166,0.06);
        border-color: rgba(20,184,166,0.35);
    }
    50% {
        box-shadow: 0 0 22px rgba(20,184,166,0.18);
        border-color: rgba(20,184,166,0.75);
    }
}

@keyframes clockShine {
    0% {
        left: -60%;
        opacity: 0;
    }
    20% {
        opacity: 1;
    }
    100% {
        left: 120%;
        opacity: 0;
    }
}

.live-badge {
    background: rgba(20,184,166,0.1);
    border: 1px solid #14b8a6;
    border-radius: 20px;
    padding: 5px 12px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: #14b8a6;
    display: flex;
    align-items: center;
    gap: 6px;
}

.pulse {
    width: 7px;
    height: 7px;
    background: #14b8a6;
    border-radius: 50%;
    display: inline-block;
    animation: pulse 2s infinite;
}
            
.status-chip {
    font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 1px; padding: 5px 14px; border-radius: 20px;
    border: 1px solid #14b8a6; color: #14b8a6; background: rgba(20,184,166,0.08);
    animation: fadeInLeft 0.5s ease both;
}
.status-chip.dirty    { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,0.08); }
.status-chip.moderate { border-color: #f59e0b; color: #f59e0b; background: rgba(245,158,11,0.08); }

/* ── KPI Row ─────────────────────────────── */
.kpi-wrap { padding: 16px 28px; display: flex; gap: 14px; align-items: stretch; }

.kpi-card {
    flex: 1; background: #111d2e; border: 1px solid #1e3448; border-radius: 14px;
    padding: 18px 20px; position: relative; overflow: hidden;
    display: flex; flex-direction: column; min-height: 140px;
    transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.2s ease;
    animation: fadeInUp 0.5s ease both;
}
.kpi-card:nth-child(1) { animation-delay: 0.1s; }
.kpi-card:nth-child(2) { animation-delay: 0.2s; }
.kpi-card:nth-child(3) { animation-delay: 0.3s; }
.kpi-card:nth-child(4) { animation-delay: 0.4s; }

.kpi-card:hover {
    border-color: #14b8a6;
    box-shadow: 0 0 20px rgba(20,184,166,0.12);
    transform: translateY(-2px);
}
.kpi-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, #14b8a6, transparent);
}

.kpi-label { font-size: 10px; font-weight: 600; color: #3d5a75; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 10px; font-family: 'Space Mono', monospace; }
.kpi-value {
    font-family: 'Space Mono', monospace; font-size: 28px; font-weight: 700;
    color: #14b8a6; line-height: 1; margin-bottom: 8px;
    animation: countUp 0.6s ease both;
}
.kpi-value.green { color: #10b981; }
.kpi-value.amber { color: #f59e0b; }
.kpi-value.red   { color: #ef4444; }
.kpi-sub     { font-size: 11px; color: #7a9bb5; margin-bottom: 3px; }
.kpi-context { font-family: 'Space Mono', monospace; font-size: 10px; color: #3d5a75; margin-top: 4px; }
.kpi-spacer  { flex: 1; }
.kpi-bar-track { margin-top: 10px; height: 3px; background: #1e3448; border-radius: 2px; overflow: hidden; }
.kpi-bar-fill  {
    height: 100%;
    background: linear-gradient(90deg, #0d9488, #14b8a6);
    border-radius: 2px;
    animation: barFill 1.2s cubic-bezier(0.4,0,0.2,1) both;
    animation-delay: 0.5s;
}

/* ── Sections ────────────────────────────── */
.section-pad { padding: 0 28px 28px 28px; }

/* ── Panel header — centered ─────────────── */
.panel-hdr { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; margin-bottom: 12px; }
.panel-icon {
    width: 34px; height: 34px; border-radius: 50%;
    background: #0d1b2a; border: 1px solid #1e3448;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-family: 'Space Mono', monospace; color: #14b8a6; font-weight: 700;
    transition: border-color 0.3s, box-shadow 0.3s;
}
.panel-icon-img {
    width: 22px;
    height: 22px;
    background: #0d1b2a;
    object-fit: contain;
    display: block;
}
.panel-title { font-family: 'Space Mono', monospace; font-size: 14px; font-weight: 700; color: #e8f0f8; line-height: 1.2; }
.panel-sub   { font-size: 10px; color: #3d5a75; font-family: 'Space Mono', monospace; }

/* ── Charts ──────────────────────────────── */
div[data-testid="stPlotlyChart"] > div {
    background: #0d1520 !important;
    border: 1px solid #1e3448 !important;
    border-radius: 12px !important;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
    animation: fadeInUp 0.6s ease both;
}
div[data-testid="stPlotlyChart"] > div:hover {
    border-color: #254059 !important;
    box-shadow: 0 4px 24px rgba(0,0,0,0.3) !important;
}

/* ── Pipeline ────────────────────────────── */
.pipe-arrow-line {
    display: flex; align-items: center;
    animation: arrow-pulse 1.5s ease-in-out infinite;
}
.pipe-arrow-dash { width: 18px; height: 2px; background: #14b8a6; border-radius: 1px; }
.pipe-arrow-gap  { width: 4px; }
.pipe-arrow-head { width: 0; height: 0; border-top: 7px solid transparent; border-bottom: 7px solid transparent; border-left: 12px solid #14b8a6; }

.pipe-step {
    text-align: center; padding: 12px 8px 8px;
    background: transparent; border: none; border-radius: 0;
    animation: fadeInUp 0.5s ease both;
}
.pipe-step:nth-child(1) { animation-delay: 0.1s; }
.pipe-step:nth-child(2) { animation-delay: 0.2s; }
.pipe-step:nth-child(3) { animation-delay: 0.3s; }
.pipe-step:nth-child(4) { animation-delay: 0.4s; }
.pipe-step:nth-child(5) { animation-delay: 0.5s; }

.pipe-step img {
    display: block; margin: 0 auto 14px auto;
    width: 64px; height: 64px; object-fit: contain;
    filter: none;
    transition: transform 0.3s ease;
}
.pipe-step img:hover { transform: scale(1.08); }
.pipe-step-name { font-family: 'Space Mono', monospace; font-size: 13px; font-weight: 700; color: #e8f0f8; margin-bottom: 8px; }
.pipe-step-desc { font-family: 'DM Sans', sans-serif; font-size: 11px; color: #7a9bb5; line-height: 1.7; }

.pipe-info-bar {
    display: flex; justify-content: center; gap: 24px; flex-wrap: wrap;
    padding: 13px 24px; background: transparent;
    border: none; border-radius: 0; margin-top: 20px;
    animation: fadeInUp 0.6s ease 0.5s both;
}
.pipe-info-item { font-family: 'Space Mono', monospace; font-size: 10px; color: #3d5a75; display: flex; align-items: center; gap: 7px; }
.pipe-info-dot  { width: 6px; height: 6px; border-radius: 50%; background: #14b8a6; flex-shrink: 0; animation: pulse 2s infinite; }

/* ── Chart section entrance ─────────────── */
.section-pad {
    animation: fadeInUp 0.5s ease 0.2s both;
}

/* Panel header hover ────────────────────── */
.panel-hdr {
    transition: transform 0.2s ease;
}
.panel-hdr:hover {
    transform: translateY(-2px);
}
.panel-hdr:hover .panel-icon {
    border-color: #14b8a6;
    box-shadow: 0 0 12px rgba(20,184,166,0.25);
    background: rgba(20,184,166,0.08);
}
.panel-hdr:hover .panel-title {
    color: #14b8a6;
}

/* ── Footer ──────────────────────────────── */
.dash-footer {
    padding: 14px 28px; border-top: 1px solid #1e3448;
    display: flex; justify-content: center;
    font-family: 'Space Mono', monospace; font-size: 10px; color: #3d5a75; margin-top: 8px;
}
div[data-testid="stAlert"] {
    background: rgba(239,68,68,0.08) !important; border: 1px solid #ef4444 !important;
    border-radius: 10px !important; color: #ef4444 !important;
}
            
/* ── Responsive layout ───────────────────────────── */

/* Tablet and smaller screens */
@media (max-width: 1100px) {
    .dash-header {
        grid-template-columns: 1fr;
        gap: 14px;
        text-align: center;
    }

    .header-left,
    .header-center,
    .header-right {
        justify-self: center;
    }

    .header-right {
        flex-wrap: wrap;
        justify-content: center;
    }

    .kpi-wrap {
        flex-wrap: wrap;
    }

    .kpi-card {
        flex: 1 1 calc(50% - 14px);
        min-width: 260px;
    }

    .pipe-info-bar {
        gap: 14px;
        padding: 8px 14px;
    }
}

/* Mobile screens */
@media (max-width: 700px) {
    .dash-header {
        padding: 14px 16px;
    }

    .header-logo {
        font-size: 15px;
    }

    .header-sub {
        font-size: 9px;
    }

    .nz-clock-card {
        min-width: 180px;
        padding: 7px 12px;
    }

    .nz-clock-time {
        font-size: 11px;
    }

    .live-badge,
    .status-chip {
        font-size: 8px;
        padding: 4px 9px;
    }

    .kpi-wrap {
        padding: 12px 16px;
        flex-direction: column;
    }

    .kpi-card {
        width: 100%;
        min-width: unset;
    }

    .section-pad {
        padding: 0 16px 20px 16px;
    }

    .panel-title {
        font-size: 12px;
    }

    .panel-sub {
        font-size: 8px;
    }

    .pipe-step-name {
        font-size: 11px;
    }

    .pipe-step-desc {
        font-size: 9px;
    }

    .pipe-info-bar {
        flex-direction: column;
        align-items: center;
        gap: 8px;
    }

    .profile-wrap {
        max-width: 100%;
        padding: 20px 14px;
    }

    .profile-links {
        gap: 12px;
    }
}          
</style>

<script>
// Intersection Observer for scroll-triggered fade-in
document.addEventListener('DOMContentLoaded', function() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.kpi-card, .pipe-step').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });
});
</script>
""", unsafe_allow_html=True)

# ============================================================
# Chart layout constants
# ============================================================

COMMON_LAYOUT = dict(
    paper_bgcolor="#0d1520",
    plot_bgcolor="#0d1520",
    font=dict(color="#e8f0f8", family="'Space Mono', monospace", size=10),
    hovermode="x unified",
    legend_title_text="",
    hoverlabel=dict(bgcolor="#0a0f1a", bordercolor="#1e3448",
                    font=dict(family="'Space Mono', monospace", size=10)),
)
GRID = dict(gridcolor="#152338", zerolinecolor="#152338")

ZONE_NAMES = {
    1:"Northland", 2:"Auckland", 3:"Hamilton", 4:"Edgecumbe",
    5:"Rotorua", 6:"Hawkes Bay", 7:"Bunnythorpe", 8:"Wellington",
    9:"Nelson", 10:"Christchurch", 11:"Canterbury", 12:"Waitaki",
    13:"Otago", 14:"Invercargill",
}

ZONE_COORDS = {
    "Northland": (-35.73, 174.32),
    "Auckland": (-36.86, 174.76),
    "Hamilton": (-37.78, 175.28),
    "Edgecumbe":    (-37.98, 176.83),
    "Rotorua":      (-38.13, 176.25),
    "Hawkes Bay":   (-39.49, 176.91),
    "Bunnythorpe":  (-40.28, 175.61),
    "Wellington":   (-41.28, 174.77),
    "Nelson":       (-41.27, 173.28),
    "Christchurch": (-43.53, 172.62),
    "Canterbury":   (-43.90, 171.60),
    "Waitaki":      (-44.75, 170.97),
    "Otago":        (-45.87, 170.50),
    "Invercargill": (-46.41, 168.35),

}

NODE_COLORS = {
    "OTA2201":"#14b8a6","HAY2201":"#10b981","BEN2201":"#3b82f6",
    "WKM2201":"#f59e0b","KIK2201":"#8b5cf6","ISL2201":"#ef4444",
}
NODE_NAMES = {
    "OTA2201":"Auckland","HAY2201":"Wellington","BEN2201":"Benmore",
    "WKM2201":"Waikato","KIK2201":"Kikiwhenua","ISL2201":"Islington",
}

# ============================================================
# Chart builders
# ============================================================
def make_nz_price_map(regional_df, ni_res, si_res):
    if regional_df.empty:
        fig = go.Figure()
        fig.update_layout(
            **COMMON_LAYOUT, height=560,
            margin=dict(l=0, r=0, t=0, b=0)
        )
        return fig
 
    df = regional_df.copy()
    df["zone_name"] = df["grid_zone_id"].map(ZONE_NAMES).fillna(
        df["grid_zone_id"].astype(str)
    )
    df["lat"] = df["zone_name"].map(lambda z: ZONE_COORDS.get(z, (0,0))[0])
    df["lon"] = df["zone_name"].map(lambda z: ZONE_COORDS.get(z, (0,0))[1])
    df = df[df["lat"] != 0].copy()
 
    price_min = df["price_nzd_mwh"].min()
    price_max = df["price_nzd_mwh"].max()
 
    def price_color(price):
        t = 0.5 if price_max == price_min else (price - price_min) / (price_max - price_min)
        if t < 0.33:  return "#10b981"
        elif t < 0.60: return "#f59e0b"
        elif t < 0.80: return "#f97316"
        else:          return "#ef4444"
 
    df["dot_color"] = df["price_nzd_mwh"].apply(price_color)
 
    LABEL_OFFSET = {
        "Northland":    ( 0.45,  1.30), "Auckland":     ( 0.10, -1.55),
        "Hamilton":     (-0.45, -1.45), "Edgecumbe":    ( 1.40,  1.45),
        "Rotorua":      ( 2.95,  1.55), "Hawkes Bay":   (-0.55,  1.55),
        "Bunnythorpe":  ( 0.35, -1.65), "Wellington":   (-0.80,  1.35),
        "Nelson":       ( 0.45, -1.65), "Christchurch": ( 0.70,  1.55),
        "Canterbury":   (-0.60,  1.55), "Waitaki":      (-0.65,  2.35),
        "Otago":        (-0.55,  2.25), "Invercargill": (-0.95,  1.95),
    }
    LAT_STEP, LON_STEP = 0.85, 1.45
 
    df["label_lat"] = df.apply(lambda r: r["lat"] + LABEL_OFFSET.get(r["zone_name"],(0,-1))[0]*LAT_STEP, axis=1)
    df["label_lon"] = df.apply(lambda r: r["lon"] + LABEL_OFFSET.get(r["zone_name"],(0,-1))[1]*LON_STEP, axis=1)
 
    dot_colors = df["dot_color"].tolist()
    lats = df["lat"].tolist()
    lons = df["lon"].tolist()
    n    = len(lats)
 
    fig = go.Figure()
 
    # ── Connector lines ───────────────────────────────────
    for _, row in df.iterrows():
        fig.add_trace(go.Scattergeo(
            lat=[row["lat"], row["label_lat"]],
            lon=[row["lon"], row["label_lon"]],
            mode="lines",
            line=dict(color="rgba(210,245,245,0.45)", width=1.2),
            hoverinfo="skip", showlegend=False,
        ))
 
    # ── Label text ────────────────────────────────────────
    for _, row in df.iterrows():
        fig.add_trace(go.Scattergeo(
            lat=[row["label_lat"]], lon=[row["label_lon"]],
            mode="text",
            text=[f"<b>{row['zone_name']}</b><br><span style='color:#d7f5f2'>${row['price_nzd_mwh']:.2f}</span>"],
            textfont=dict(color="#f2fbff", size=9, family="Space Mono"),
            textposition="middle center",
            hoverinfo="skip", showlegend=False,
        ))
 
    # ── Dot markers — size starts at 0 for JS entrance anim
    fig.add_trace(go.Scattergeo(
        lat=lats, lon=lons,
        mode="markers",
        marker=dict(
            size=0,                      # JS will animate to 10
            color=dot_colors,
            line=dict(color="#e8f0f8", width=1.3),
            opacity=0.96,
        ),
        customdata=df[["zone_name","price_nzd_mwh","island"]].values,
        hovertemplate=(
            "<b>%{customdata[0]}</b><br>"
            "$%{customdata[1]:.2f}/MWh<br>"
            "Island: %{customdata[2]}<extra></extra>"
        ),
        showlegend=False,
    ))
    dot_trace_idx = len(fig.data) - 1
 
    # ── Pulse ring — outer glow ring, JS controls size/opacity
    fig.add_trace(go.Scattergeo(
        lat=lats, lon=lons,
        mode="markers",
        marker=dict(
            size=10,
            color=["rgba(0,0,0,0)"] * n,     # transparent fill
            line=dict(color=dot_colors, width=2),
            opacity=0.0,                       # JS will pulse this
        ),
        hoverinfo="skip", showlegend=False,
    ))
    pulse_trace_idx = len(fig.data) - 1
 
    # ── Reserves (unchanged) ─────────────────────────────
    ni_fir = safe_float(ni_res.get("fir_price"))
    ni_sir = safe_float(ni_res.get("sir_price"))
    si_fir = safe_float(si_res.get("fir_price"))
    si_sir = safe_float(si_res.get("sir_price"))
 
    for y, ni_si, fir, sir in [
        (0.86, "North Island", ni_fir, ni_sir),
        (0.52, "South Island", si_fir, si_sir),
    ]:
        fig.add_annotation(
            x=0.18, y=y, xref="paper", yref="paper",
            xanchor="left", yanchor="top",
            text=f"<b>{ni_si}<br>Reserves</b><br>SIR <b>${sir:.2f}</b><br>FIR <b>${fir:.2f}</b>",
            showarrow=False,
            bgcolor="rgba(124,58,237,0.78)", bordercolor="rgba(180,150,255,0.9)",
            borderwidth=1, borderpad=8,
            font=dict(color="#ffffff", size=9, family="Space Mono"), align="left",
        )
 
    # ── Legend (unchanged) ────────────────────────────────
    fig.add_annotation(x=0.035, y=0.42, xref="paper", yref="paper",
        xanchor="left", yanchor="bottom", text="<b>Price Range</b>", showarrow=False,
        font=dict(color="#d7f5f2", size=9, family="Space Mono"),
        bgcolor="rgba(0,0,0,0)", align="left")
    for i,(label,color) in enumerate([
        ("< $100","#10b981"),("$100-$200","#84cc16"),("$200-$300","#f59e0b"),
        ("$300-$400","#f97316"),("$400-$500","#ef4444"),("> $500","#7c3aed"),
    ]):
        fig.add_annotation(x=0.035, y=0.40-i*0.048, xref="paper", yref="paper",
            xanchor="left", yanchor="middle",
            text=f"<span style='color:{color};font-size:12px;'>■</span>  {label}",
            showarrow=False,
            font=dict(color="#c7d7e8", size=8, family="Space Mono"),
            bgcolor="rgba(0,0,0,0)", align="left")
 
    # ── ALL ORIGINAL GEO PARAMS UNCHANGED ────────────────
    fig.update_geos(
        visible=True, resolution=50,
        lonaxis_range=[164.8, 180.4],
        lataxis_range=[-48.9, -32.9],
        projection_type="mercator",
        center=dict(lat=-41.0, lon=172.6),
        showland=True, landcolor="#9be8e4",
        showocean=False, oceancolor="rgba(0,0,0,0)",
        showlakes=False, showrivers=False,
        showcoastlines=True, coastlinecolor="#1f8f8a", coastlinewidth=0.8,
        showframe=False, bgcolor="rgba(0,0,0,0)", showsubunits=False,
        domain=dict(x=[0.03, 0.97], y=[0.04, 0.98]),
    )
    fig.update_layout(
        paper_bgcolor="#0d1520", geo_bgcolor="#0d1520",
        height=590, margin=dict(l=8, r=8, t=0, b=4),
        font=dict(color="#e8f0f8", family="Space Mono"),
        showlegend=False,
        dragmode=False,
        hoverlabel=dict(bgcolor="#0a0f1a", bordercolor="#1e3448",
                        font=dict(family="Space Mono", size=10, color="#e8f0f8")),
        # Store trace indices in meta so JS can find them
        meta=dict(dot_idx=dot_trace_idx, pulse_idx=pulse_trace_idx, n_dots=n),
    )
    return fig

def inject_map_animations():
    """
    Injects JS into the parent Streamlit page to animate the NZ map:
      1. Entrance: dots grow from 0→10 over 900ms (eased)
      2. Stagger:  connector lines fade in one by one (80ms apart)
      3. Pulse:    ring expands + fades every 3s continuously
    """
    st.components.v1.html("""
    <script>
    (function() {
        // Wait for Plotly to finish rendering the map
        function waitForMap(cb, attempts) {
            attempts = attempts || 0;
            if (attempts > 40) return;
 
            const root   = window.parent.document;
            const plots  = root.querySelectorAll('.js-plotly-plot');
 
            // Find the map plot (has a geo layer)
            let mapPlot = null;
            plots.forEach(p => {
                if (p.querySelector('.geo') || p.querySelector('[class*="geo"]')) {
                    mapPlot = p;
                }
            });
 
            if (!mapPlot || !window.parent.Plotly) {
                setTimeout(() => waitForMap(cb, attempts + 1), 150);
                return;
            }
            cb(mapPlot, window.parent.Plotly);
        }
 
        waitForMap(function(plot, Plotly) {
            const data  = plot.data;
            const nData = data.length;
 
            // ── 1. Find trace indices ─────────────────────────
            // Dots trace: markers with size=0 and non-transparent color
            let dotIdx   = -1;
            let pulseIdx = -1;
            for (let i = nData - 1; i >= 0; i--) {
                const tr = data[i];
                if (tr.type !== 'scattergeo') continue;
                if (tr.mode !== 'markers') continue;
                const mc = tr.marker;
                if (!mc) continue;
                // pulse ring: transparent fill, has line.color array
                if (Array.isArray(mc.color) &&
                    typeof mc.color[0] === 'string' &&
                    mc.color[0].includes('rgba(0,0,0,0)')) {
                    pulseIdx = i;
                } else if (mc.size === 0) {
                    dotIdx = i;
                }
            }
 
            if (dotIdx < 0) return; // safety
 
            const nDots = data[dotIdx].lat ? data[dotIdx].lat.length : 14;
 
            // ── 2. Entrance animation: dots grow 0→10 ─────────
            const FINAL_SIZE = 10;
            const DURATION   = 900;   // ms
            const start      = performance.now();
 
            function easeOutBack(t) {
                // slightly overshoots then settles — professional feel
                const c1 = 1.70158, c3 = c1 + 1;
                return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
            }
 
            function animateDots(now) {
                const t    = Math.min((now - start) / DURATION, 1);
                const size = FINAL_SIZE * easeOutBack(t);
                Plotly.restyle(plot, { 'marker.size': size }, [dotIdx]);
                if (t < 1) requestAnimationFrame(animateDots);
            }
            requestAnimationFrame(animateDots);
 
            // ── 3. Stagger connector lines opacity 0→1 ────────
            // Lines are all scattergeo with mode="lines"
            const lineIdxs = [];
            data.forEach((tr, i) => {
                if (tr.type === 'scattergeo' && tr.mode === 'lines') {
                    lineIdxs.push(i);
                }
            });
 
            // Set all lines to opacity 0 first
            if (lineIdxs.length) {
                Plotly.restyle(plot, { opacity: 0 }, lineIdxs);
                lineIdxs.forEach((idx, i) => {
                    setTimeout(() => {
                        Plotly.restyle(plot, { opacity: 1 }, [idx]);
                    }, 400 + i * 60);   // stagger 60ms each, start after 400ms
                });
            }
 
            // ── 4. Continuous pulse ring ──────────────────────
            if (pulseIdx < 0) return;
 
            let pulsing = false;
 
            function doPulse() {
                if (pulsing) return;
                pulsing = true;
 
                const PULSE_DURATION = 1200;   // ms for one expand cycle
                const MAX_SIZE       = 22;
                const pStart         = performance.now();
 
                function animatePulse(now) {
                    const t = Math.min((now - pStart) / PULSE_DURATION, 1);
                    // size: 10 → 22, opacity: 0.7 → 0
                    const size    = FINAL_SIZE + (MAX_SIZE - FINAL_SIZE) * t;
                    const opacity = 0.65 * (1 - t);
                    Plotly.restyle(plot,
                        { 'marker.size': size, 'marker.opacity': opacity },
                        [pulseIdx]
                    );
                    if (t < 1) {
                        requestAnimationFrame(animatePulse);
                    } else {
                        pulsing = false;
                    }
                }
                requestAnimationFrame(animatePulse);
            }
 
            // First pulse after dots finish landing
            setTimeout(doPulse, DURATION + 200);
            // Repeat every 3.5s
            setInterval(doPulse, 3500);
        });
    })();
    </script>
    """, height=0, scrolling=False)

def make_regional_price_chart(regional_df, ni_res, si_res):
    if regional_df.empty:
        fig = go.Figure()
        fig.update_layout(**COMMON_LAYOUT, height=430, margin=dict(l=12,r=12,t=12,b=40))
        return fig

    df = regional_df.copy()
    df["zone_name"] = df["grid_zone_id"].map(ZONE_NAMES).fillna(df["grid_zone_id"].astype(str))
    df = df.sort_values("price_nzd_mwh", ascending=True)

    ni_avg    = df[df["island"]=="NI"]["price_nzd_mwh"].mean()
    si_avg    = df[df["island"]=="SI"]["price_nzd_mwh"].mean()
    max_price = df["price_nzd_mwh"].max()
    x_max     = max_price * 1.28

    fig = go.Figure()

    for island, color, label in [("NI","#14b8a6","North Island"),("SI","#3b82f6","South Island")]:
        sub = df[df["island"]==island]
        if sub.empty:
            continue
        fig.add_trace(go.Bar(
            y=sub["zone_name"], x=sub["price_nzd_mwh"],
            orientation="h", name=label,
            marker=dict(color=color, opacity=0.72, line=dict(color=color, width=1)),
            text=sub["price_nzd_mwh"].apply(lambda v: f"${v:.2f}"),
            textposition="inside", insidetextanchor="end",
            textfont=dict(color="white", size=10, family="Space Mono"),
            hovertemplate="%{y}: $%{x:.2f}/MWh<extra></extra>",
        ))

    all_zones = df["zone_name"].tolist()
    n_zones   = len(all_zones)

    for avg_val, color, zones_key in [(ni_avg,"#14b8a6","NI"),(si_avg,"#3b82f6","SI")]:
        zones = df[df["island"]==zones_key]["zone_name"].tolist()
        if not zones or not avg_val:
            continue
        idxs    = [all_zones.index(z) for z in zones]
        mid_idx = (min(idxs) + max(idxs)) / 2
        fig.add_shape(type="line",
            x0=avg_val, x1=avg_val,
            y0=min(idxs)-0.5, y1=max(idxs)+0.5,
            line=dict(color=color, width=1.5, dash="dot"), opacity=0.5)
        y_paper = (mid_idx + 0.5) / n_zones if n_zones else 0.5
        fig.add_annotation(
            x=max_price * 1.02, y=y_paper, xref="x", yref="paper",
            text=f"avg ${avg_val:.2f}", showarrow=False,
            font=dict(size=8, color=color, family="Space Mono"),
            xanchor="left", bgcolor="rgba(6,13,24,0.0)", borderwidth=0)

    fig.update_layout(
        **{k: v for k, v in COMMON_LAYOUT.items() if k != "hovermode"},
        hovermode="y unified", height=430,
        margin=dict(l=12, r=8, t=8, b=55),
        barmode="stack", showlegend=True,
        transition=dict(duration=900, easing="cubic-in-out"),
        legend=dict(orientation="h", x=0.5, y=-0.10, xanchor="center",
                    font=dict(size=10), bgcolor="rgba(0,0,0,0)"),
        xaxis=dict(range=[0, x_max], **GRID, tickprefix="$",
                   tickfont=dict(color="#7a9bb5", size=9),
                   tickvals=[i*25 for i in range(0, int(max_price/25)+1)],
                   title=dict(text="$/MWh", font=dict(size=10, color="#7a9bb5"))),
        yaxis=dict(**GRID, tickfont=dict(color="#e8f0f8", size=10), automargin=True),
    )
    return fig


def make_carbon_gauge(carbon_val, month_avg, year_avg, renewable_pct):
    fig = go.Figure()
    fig.add_trace(go.Indicator(
        mode="gauge+number",
        value=carbon_val,
        domain={"x":[0.05,0.95], "y":[0.25,0.90]},
        number={"suffix":" g/kWh","font":{"size":24,"color":"#e8f0f8","family":"Space Mono"}},
        title={"text":""},
        gauge={
            "axis":{"range":[0,150],"tickcolor":"#3d5a75",
                    "tickfont":{"size":9,"color":"#7a9bb5","family":"Space Mono"},"nticks":6},
            "bar":{"color":"#14b8a6","thickness":0.14},
            "bgcolor":"#0d1520","borderwidth":0,
            "steps":[
                {"range":[0,  50],"color":"#10b981"},
                {"range":[50, 80],"color":"#84cc16"},
                {"range":[80,110],"color":"#f59e0b"},
                {"range":[110,130],"color":"#f97316"},
                {"range":[130,150],"color":"#ef4444"},
            ],
            "threshold":{"line":{"color":"white","width":3},"thickness":0.8,"value":carbon_val},
        },
    ))
    fig.add_annotation(x=0.5, y=0.22, xref="paper", yref="paper",
        text="Current CO₂", showarrow=False,
        font=dict(size=11, color="#7a9bb5", family="Space Mono"), xanchor="center")
    for x, val, label, color in [
        (0.15, f"{year_avg:.0f} g/kWh",  "2026 Average", "#e8f0f8"),
        (0.50, f"{month_avg:.0f} g/kWh", "May Average",  "#e8f0f8"),
        (0.85, f"{renewable_pct:.0f}%",  "Renewable",    "#10b981"),
    ]:
        fig.add_annotation(x=x, y=0.12, xref="paper", yref="paper",
            text=f"<b>{val}</b>", showarrow=False,
            font=dict(size=13, color=color, family="Space Mono"), xanchor="center")
        fig.add_annotation(x=x, y=0.02, xref="paper", yref="paper",
            text=label, showarrow=False,
            font=dict(size=9, color="#7a9bb5", family="Space Mono"), xanchor="center")
    fig.update_layout(paper_bgcolor="#0d1520", plot_bgcolor="#0d1520",
                      font_color="#e8f0f8", height=430, margin=dict(l=16,r=16,t=12,b=8))
    return fig


def make_price_chart(price_df):
    fig = go.Figure()
    for node_id, grp in price_df.groupby("node_id"):
        grp = grp.sort_values("timestamp_nzt")
        fig.add_trace(go.Scatter(
            x=grp["timestamp_nzt"], y=grp["price_nzd_mwh"],
            name=NODE_NAMES.get(node_id, node_id), mode="lines",
            line=dict(width=2, color=NODE_COLORS.get(node_id,"#14b8a6")),
        ))
    fig.update_layout(**COMMON_LAYOUT, height=590,
                      margin=dict(l=52,r=60,t=12,b=64), showlegend=True,
                      legend=dict(orientation="h", yanchor="top", y=-0.20,
                                  xanchor="center", x=0.5, font=dict(size=9)),
                      # Animate lines drawing left to right on load
                      transition=dict(duration=800, easing="cubic-in-out"),
                      )
    fig.update_xaxes(**GRID, tickfont=dict(color="#7a9bb5",size=9),
                     title_text="Time (NZT)", automargin=True, 
                     range=[
                        price_df["timestamp_nzt"].min(),
                        price_df["timestamp_nzt"].max() + pd.Timedelta(hours=1)
                    ])
    fig.update_yaxes(**GRID, tickfont=dict(color="#7a9bb5",size=9), title_text="$/MWh")
    # Add frame animation — lines grow from left
    fig.update_traces(line_shape="spline")
    return fig


def _dual_style(fig, y1_title, y2_title, y2_range=None):
    fig.update_layout(**COMMON_LAYOUT, height=310,
                      margin=dict(l=52,r=52,t=12,b=68), showlegend=True,
                      legend=dict(orientation="h", yanchor="top", y=-0.28,
                                  xanchor="center", x=0.5, font=dict(size=9)))
    fig.update_xaxes(**GRID, tickfont=dict(color="#7a9bb5",size=8))
    fig.update_yaxes(title_text=y1_title, secondary_y=False,
                     **GRID, tickfont=dict(color="#7a9bb5",size=8))
    kw = dict(title_text=y2_title, secondary_y=True,
              **GRID, tickfont=dict(color="#7a9bb5",size=8))
    if y2_range:
        kw["range"] = y2_range
    fig.update_yaxes(**kw)


def make_summary_chart(summary_df):
    fig = make_subplots(specs=[[{"secondary_y":True}]])
    if summary_df.empty:
        fig.update_layout(**COMMON_LAYOUT, height=310, margin=dict(l=52,r=52,t=12,b=68))
        return fig
    fig.add_trace(go.Scatter(x=summary_df["date_nzt"], y=summary_df["avg_price_ota"],
        name="Avg Price OTA", mode="lines+markers",
        line=dict(width=2.5,color="#14b8a6"), marker=dict(size=4)), secondary_y=False)
    fig.add_trace(go.Scatter(x=summary_df["date_nzt"], y=summary_df["avg_renewable_pct"],
        name="Renewable %", mode="lines+markers",
        line=dict(width=2,color="#10b981",dash="dot"), marker=dict(size=4)), secondary_y=True)
    fig.add_trace(go.Scatter(x=summary_df["date_nzt"], y=summary_df["avg_carbon_gkwh"],
        name="Carbon g/kWh", mode="lines",
        line=dict(width=2,color="#f59e0b",dash="dash")), secondary_y=False)
    _dual_style(fig, "$/MWh · g/kWh", "Renewable %")
    return fig


def make_carbon_trend_chart(carbon_df):
    fig = make_subplots(specs=[[{"secondary_y":True}]])
    if carbon_df.empty:
        fig.update_layout(**COMMON_LAYOUT, height=310, margin=dict(l=52,r=52,t=12,b=68))
        return fig
    fig.add_trace(go.Scatter(x=carbon_df["timestamp_nzt"], y=carbon_df["nz_carbon_gkwh"],
        name="Carbon g/kWh", mode="lines", line=dict(width=2.5,color="#f59e0b"),
        fill="tozeroy", fillcolor="rgba(245,158,11,0.08)"), secondary_y=False)
    fig.add_trace(go.Scatter(x=carbon_df["timestamp_nzt"], y=carbon_df["renewable_pct"],
        name="Renewable %", mode="lines", line=dict(width=2.5,color="#14b8a6"),
        fill="tozeroy", fillcolor="rgba(20,184,166,0.06)"), secondary_y=True)
    _dual_style(fig, "Carbon g/kWh", "Renewable %", y2_range=[0,100])
    return fig


def make_spread_chart(spread_list):
    fig = go.Figure()
    if not spread_list:
        fig.update_layout(**COMMON_LAYOUT, height=310, margin=dict(l=52,r=52,t=12,b=68))
        return fig
    df = pd.DataFrame(spread_list)
    df["timestamp_nzt"] = pd.to_datetime(df["timestamp_nzt"])
    df = df.sort_values("timestamp_nzt")
    fig.add_trace(go.Scatter(x=df["timestamp_nzt"], y=df["ota_price"],
        name="Auckland (OTA)", mode="lines", line=dict(width=2,color="#14b8a6")))
    fig.add_trace(go.Scatter(x=df["timestamp_nzt"], y=df["ben_price"],
        name="Benmore (BEN)", mode="lines", line=dict(width=2,color="#3b82f6")))
    fig.add_trace(go.Bar(x=df["timestamp_nzt"], y=df["ni_si_spread"],
        name="NI/SI Spread", marker_color="rgba(139,92,246,0.4)", yaxis="y2"))
    fig.update_layout(**COMMON_LAYOUT, height=310,
                      margin=dict(l=52,r=52,t=12,b=68), showlegend=True,
                      legend=dict(orientation="h", yanchor="top", y=-0.28,
                                  xanchor="center", x=0.5, font=dict(size=9)),
                      yaxis2=dict(overlaying="y", side="right", **GRID,
                                  tickfont=dict(color="#7a9bb5",size=8)))
    fig.update_xaxes(**GRID, tickfont=dict(color="#7a9bb5",size=8))
    fig.update_yaxes(title_text="$/MWh", **GRID, tickfont=dict(color="#7a9bb5",size=8))
    return fig

# ============================================================
# Pipeline section
# ============================================================

def render_pipeline_section():
    STEPS = [
        ("em6-icon.png",           "Energy Market Service",        "Free API<br>5 endpoints<br>30 min intervals"),
        ("github-action-icon.png",  "GitHub Actions", "Cron scheduler<br>ETL trigger<br>Free tier"),
        ("fast-api-icon.png",       "FastAPI",        "Python backend<br>REST endpoints<br>Pydantic models"),
        ("neon-postgres-icon.png",  "Neon Postgres",  "Cloud database<br>ap-southeast-2<br>Always free"),
        ("dbt-icon.png",            "dbt",            "Staging views<br>Mart tables<br>82 data tests"),
    ]

    icon_srcs = [icon_to_base64(fname) for fname, _, _ in STEPS]

    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown('<div class="section-pad">', unsafe_allow_html=True)

    st.markdown("""
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
        <div style="height:1px;flex:1;background:linear-gradient(to right,transparent,#1e3448);"></div>
        <div style="font-family:'Space Mono',monospace;font-size:11px;font-weight:700;
                    color:#3d5a75;letter-spacing:2px;text-transform:uppercase;">
            Data Pipeline Architecture
        </div>
        <div style="height:1px;flex:1;background:linear-gradient(to left,transparent,#1e3448);"></div>
    </div>
    """, unsafe_allow_html=True)

    col1, arr1, col2, arr2, col3, arr3, col4, arr4, col5 = st.columns([3,1,3,1,3,1,3,1,3])
    step_cols  = [col1, col2, col3, col4, col5]
    arrow_cols = [arr1, arr2, arr3, arr4]

    ARROW_HTML = """
    <div style="display:flex;align-items:center;justify-content:center;height:110px;">
        <div class="pipe-arrow-line">
            <div class="pipe-arrow-dash"></div>
            <div class="pipe-arrow-gap"></div>
            <div class="pipe-arrow-dash"></div>
            <div class="pipe-arrow-gap"></div>
            <div class="pipe-arrow-head"></div>
        </div>
    </div>
    """

    for col, (fname, name, desc), src in zip(step_cols, STEPS, icon_srcs):
        with col:
            st.markdown(f"""
            <div class="pipe-step">
                <img src="{src}" alt="{name}" />
                <div class="pipe-step-name">{name}</div>
                <div class="pipe-step-desc">{desc}</div>
            </div>
            """, unsafe_allow_html=True)

    for col in arrow_cols:
        with col:
            st.markdown(ARROW_HTML, unsafe_allow_html=True)

    st.markdown("""
    <div class="pipe-info-bar">
        <div class="pipe-info-item">
            <div class="pipe-info-dot"></div>Every 30 min · em6 API → Neon raw tables
        </div>
        <div class="pipe-info-item">
            <div class="pipe-info-dot"></div>Nightly · dbt run → mart refresh → 7-day purge
        </div>
        <div class="pipe-info-item">
            <div class="pipe-info-dot"></div>82 data quality tests on every run
        </div>
        <div class="pipe-info-item">
            <div class="pipe-info-dot"></div>Neon Postgres Database · cloud free tier
        </div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown('</div>', unsafe_allow_html=True)

def render_profile_section():
    PROFILE_LINKS = [
        {
            "icon": "linkedin-icon.png",
            "label": "LinkedIn",
            "url": "https://www.linkedin.com/in/dario-dang-89049020a/"
        },
        {
            "icon": "github-icon.png",
            "label": "GitHub",
            "url": "https://github.com/DarioDang"
        },
        {
            "icon": "portfolio-icon.png",
            "label": "Portfolio",
            "url": "https://dariodang.github.io/"
        },
    ]

    st.markdown("""
    <style>
    .profile-section {
        padding: 8px 28px 28px 28px;
        animation: fadeInUp 0.6s ease both;
    }

    .profile-wrap {
        max-width: 760px;
        margin: 0 auto;
        border: 1px solid #1e3448;
        border-radius: 18px;
        padding: 24px 28px;
        background: linear-gradient(
            135deg,
            rgba(17,29,46,0.45),
            rgba(10,15,26,0.75)
        );
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        position: relative;
        overflow: hidden;
    }
    
    .profile-wrap::before {
        content: '';
        position: absolute;
        top: 0;
        left: -60%;
        width: 40%;
        height: 100%;
        background: linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,0.05),
            transparent
        );
        animation: profileShine 4.5s ease-in-out infinite;
    }

    .profile-title {
        font-family: 'Space Mono', monospace;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 2.5px;
        text-transform: uppercase;
        color: #14b8a6;
    }
                
    .profile-subtitle {
        font-family: 'Space Mono', monospace;
        font-size: 13px;
        font-weight: 700;
        color: #e8f0f8;
        text-align: center;
    }
                
    .profile-note {
        font-family: 'Space Mono', monospace;
        font-size: 10px;
        color: #3d5a75;
        text-align: center;
    }

    .profile-links {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 26px;
        flex-wrap: wrap;
        margin-top: 6px;
    }

    .profile-link-card {
        position: relative;
        width: 96px;
        height: 76px;
        background: transparent;
        border: none;
        box-shadow: none;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 8px;
        text-decoration: none !important;
        transition: transform 0.25s ease, filter 0.25s ease;
        word-break: normal;
        white-space: nowrap;
    }

    .profile-link-card::before {
        display: none;
    }

    .profile-link-card:hover {
        transform: translateY(-4px);
        filter: drop-shadow(0 0 12px rgba(20,184,166,0.35));
    }

   .profile-link-card img {
        width: 28px;
        height: 28px;
        object-fit: contain;
        transition: transform 0.25s ease;
    }

    .profile-link-card:hover img {
        transform: scale(1.15);
    }

    .profile-link-card span {
        font-family: 'Space Mono', monospace;
        font-size: 10px;
        font-weight: 700;
        color: #e8f0f8;
        letter-spacing: 0.5px;
    }

    @keyframes profileShine {
        0%   { left: -80%; opacity: 0; }
        20%  { opacity: 1; }
        100% { left: 120%; opacity: 0; }
    }
    </style>
    """, unsafe_allow_html=True)

    cards_html = ""

    for item in PROFILE_LINKS:
        icon_src = icon_to_base64(item["icon"])
        label = item["label"]
        url = item["url"]

        cards_html += (
            f'<a class="profile-link-card" href="{url}" target="_blank" rel="noopener noreferrer">'
            f'<img src="{icon_src}" alt="{label}" />'
            f'<span>{label}</span>'
            f'</a>'
        )


    st.markdown("""
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
        <div style="height:1px;flex:1;background:linear-gradient(to right,transparent,#1e3448);"></div>
        <div style="font-family:'Space Mono',monospace;font-size:11px;font-weight:700;
                    color:#3d5a75;letter-spacing:2px;text-transform:uppercase;">
            Connect With Me
        </div>
        <div style="height:1px;flex:1;background:linear-gradient(to left,transparent,#1e3448);"></div>
    </div>
    """, unsafe_allow_html=True)

    profile_html = (
    '<div class="profile-section">'
    '<div class="profile-wrap">'
    '<div class="profile-subtitle">Built by Dario Dang · Data Engineering Portfolio</div>'
    f'<div class="profile-links">{cards_html}</div>'
    '<div class="profile-note">Explore my technical projects, source code, and professional profile.</div>'
    '</div>'
    '</div>'
)

    st.markdown(profile_html, unsafe_allow_html=True)

# ============================================================
# Main App
# ============================================================

try:
    carbon      = api_get("/api/carbon/latest")
    spread      = api_get("/api/spread/latest")
    reserves    = api_get("/api/reserves/latest")
    price_df    = pd.DataFrame(api_get("/api/prices/nodes?hours=48"))
    regional_df = pd.DataFrame(api_get("/api/prices/regions"))
    carbon_df   = pd.DataFrame(api_get("/api/carbon/trend?hours=192"))
    summary_df  = pd.DataFrame(api_get("/api/prices/summary?days=30"))
    spread_list = api_get("/api/spread/trend?hours=48")

    ni_res = next((r for r in reserves if r.get("region")=="NI"), {})
    si_res = next((r for r in reserves if r.get("region")=="SI"), {})

    for df, col in [(price_df,"timestamp_nzt"),(carbon_df,"timestamp_nzt"),(summary_df,"date_nzt")]:
        if not df.empty and col in df.columns:
            df[col] = pd.to_datetime(df[col])

    grid_status   = carbon.get("grid_status","—")
    ts_nzt        = to_nzt(carbon.get("timestamp_utc",""))
    renewable_pct = safe_float(carbon.get("renewable_pct"))
    carbon_val    = safe_float(carbon.get("nz_carbon_gkwh"))
    spread_val    = safe_float(spread.get("ni_si_spread"))
    stress        = ni_res.get("grid_stress", si_res.get("grid_stress","—"))
    status_cls    = "dirty" if "Dirty" in grid_status else "moderate" if "Moderate" in grid_status else ""
    kpi_color     = "green" if renewable_pct>=80 else "amber" if renewable_pct>=50 else "red"

    # ── Header ────────────────────────────────────────────
    st.markdown(f"""
        <div class="dash-header">
        <div class="header-left">
        <div class="nz-clock-card">
        <div class="nz-clock-label">Current NZ Time</div>
        <div class="nz-clock-time">
        <span class="nz-clock-dot"></span>
        <span id="nz-live-clock">--:--:-- NZT</span>
        </div>
        </div>
        </div>

        <div class="header-center">
        <div class="header-logo">⚡ New Zealand Electricity Dashboard</div>
        <div class="header-sub">Live Electricity Market Dashboard</div>
        </div>

        <div class="header-right">
        <div class="live-badge"><span class="pulse"></span>Updated {ts_nzt}</div>
        <div class="status-chip {status_cls}">{grid_status}</div>
        </div>
        </div>
        """, unsafe_allow_html=True)
    

    st.components.v1.html("""
        <script>
        (function () {
            function updateNZClock() {
                const root = window.parent.document;
                const el = root.getElementById("nz-live-clock");
                if (!el) return;

                const now = new Date();

                const timeStr = new Intl.DateTimeFormat("en-NZ", {
                    timeZone: "Pacific/Auckland",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false
                }).format(now);

                const dateStr = new Intl.DateTimeFormat("en-NZ", {
                    timeZone: "Pacific/Auckland",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                }).format(now);

                const tzName = new Intl.DateTimeFormat("en-NZ", {
                    timeZone: "Pacific/Auckland",
                    timeZoneName: "short"
                })
                .formatToParts(now)
                .find(part => part.type === "timeZoneName")?.value || "NZT";

                el.textContent = `${timeStr} ${tzName} ${dateStr}`;
            }

            updateNZClock();
            setInterval(updateNZClock, 1000);
        })();
        </script>
        """, height=0, scrolling=False)

    # ── KPI Row ───────────────────────────────────────────
    carbon_trend_val = carbon.get("carbon_trend", "Stable")
    trend_icon  = "&#8595;" if carbon_trend_val == "Improving" else "&#8593;" if carbon_trend_val == "Worsening" else "&#8594;"
    trend_color = "#10b981" if carbon_trend_val == "Improving" else "#ef4444" if carbon_trend_val == "Worsening" else "#f59e0b"
    spread_color = "#ef4444" if spread_val > 0 else "#10b981" if spread_val < 0 else "#7a9bb5"
    spread_icon  = "&#9650;" if spread_val > 0 else "&#9660;" if spread_val < 0 else "&#8212;"
    stress_color = "#ef4444" if stress == "High" else "#f59e0b" if stress == "Medium" else "#14b8a6"
    bar_pct      = min(renewable_pct, 100)
    ring_offset  = round(100 - bar_pct, 1)
    ni_fir_bar   = min(safe_float(ni_res.get("fir_price")) / 20 * 100, 100)
    si_fir_bar   = min(safe_float(si_res.get("fir_price")) / 20 * 100, 100)

    # Inject card-specific CSS separately so Streamlit renders it cleanly
    st.markdown("""
    <style>
    @keyframes scanLine {
        0%   { top: -2px; opacity: 0.06; }
        100% { top: 100%; opacity: 0.06; }
    }
    @keyframes numberReveal {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes blinkDot {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.15; }
    }
    .scan-line {
        position: absolute; left: 0; right: 0; height: 2px;
        background: linear-gradient(90deg, transparent, rgba(20,184,166,0.25), transparent);
        animation: scanLine 12s linear infinite;
        pointer-events: none; z-index: 0;
    }
    .kpi-ring-wrap {
        position: absolute; top: 12px; right: 14px; z-index: 1;
    }
    .kpi-trend-badge {
        display: inline-flex; align-items: center; gap: 4px;
        font-family: "Space Mono", monospace; font-size: 10px; font-weight: 700;
        padding: 3px 9px; border-radius: 20px; margin-top: 6px;
    }
    .kpi-number { animation: numberReveal 0.7s cubic-bezier(0.4,0,0.2,1) both; }
    </style>
    """, unsafe_allow_html=True)

    kpi_html = f"""
    <div class="kpi-wrap">

      <div class="kpi-card">
        <div class="scan-line"></div>
        <div class="kpi-ring-wrap">
          <svg width="44" height="44" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="16" fill="none" stroke="#1e3448" stroke-width="4"/>
            <circle cx="22" cy="22" r="16" fill="none" stroke="#14b8a6" stroke-width="4"
              stroke-linecap="round" stroke-dasharray="100" stroke-dashoffset="{ring_offset}"
              transform="rotate(-90 22 22)"/>
            <text x="22" y="26" text-anchor="middle" font-size="8"
              fill="#14b8a6" font-family="Space Mono,monospace" font-weight="700">{bar_pct:.0f}</text>
          </svg>
        </div>
        <div class="kpi-label">Renewable Generation</div>
        <div class="kpi-value {kpi_color} kpi-number">{renewable_pct:.1f}%</div>
        <div class="kpi-sub">{grid_status}</div>
        <div class="kpi-spacer"></div>
        <div class="kpi-bar-track">
          <div class="kpi-bar-fill" style="width:{bar_pct:.1f}%"></div>
        </div>
      </div>

      <div class="kpi-card">
        <div class="scan-line" style="animation-delay:1.1s"></div>
        <div class="kpi-label">Carbon Intensity</div>
        <div class="kpi-value kpi-number">{carbon_val:.1f}<span style="font-size:14px;color:#3d5a75"> gCO&#8322;/kWh</span></div>
        <div class="kpi-sub">{carbon.get("carbon_status","&#8212;")}</div>
        <div class="kpi-trend-badge" style="color:{trend_color};border:1px solid {trend_color}40;background:{trend_color}15;">
          {trend_icon}&nbsp;{carbon_trend_val}
        </div>
        <div class="kpi-spacer"></div>
        <div class="kpi-context">{safe_float(carbon.get("vs_month_avg_pct")):+.1f}% vs month avg</div>
      </div>

      <div class="kpi-card">
        <div class="scan-line" style="animation-delay:2.2s"></div>
        <div class="kpi-label">NI / SI Price Spread</div>
        <div class="kpi-value kpi-number" style="color:{spread_color}">
          {spread_icon} ${abs(spread_val):.2f}<span style="font-size:14px;color:#3d5a75"> /MWh</span>
        </div>
        <div class="kpi-sub">{spread.get("spread_direction","&#8212;")}</div>
        <div class="kpi-trend-badge" style="color:{spread_color};border:1px solid {spread_color}40;background:{spread_color}15;">
          {spread.get("spread_status","&#8212;")}
        </div>
        <div class="kpi-spacer"></div>
        <div class="kpi-context" style="font-size:9px;">
          OTA ${safe_float(spread.get("ota_price")):.2f} &nbsp;&#183;&nbsp; BEN ${safe_float(spread.get("ben_price")):.2f}
        </div>
      </div>

      <div class="kpi-card">
        <div class="scan-line" style="animation-delay:0.5s"></div>
        <div style="position:absolute;top:14px;right:14px;display:flex;align-items:center;gap:5px;z-index:1;">
          <div style="width:7px;height:7px;border-radius:50%;background:{stress_color};animation:blinkDot 1.8s ease-in-out infinite;"></div>
          <span style="font-family:Space Mono,monospace;font-size:9px;color:{stress_color};">{stress}</span>
        </div>
        <div class="kpi-label">Grid Reserves</div>
        <div class="kpi-value kpi-number" style="color:{stress_color};font-size:22px;">{stress}</div>
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:5px;">
          <div style="display:flex;justify-content:space-between;">
            <span style="font-size:10px;color:#3d5a75;font-family:Space Mono,monospace;">NI</span>
            <span style="font-size:10px;color:#7a9bb5;font-family:Space Mono,monospace;">
              FIR <b style="color:#e8f0f8">${safe_float(ni_res.get("fir_price")):.2f}</b>
              &nbsp; SIR <b style="color:#e8f0f8">${safe_float(ni_res.get("sir_price")):.2f}</b>
            </span>
          </div>
          <div style="height:2px;background:#1e3448;border-radius:1px;">
            <div style="height:100%;width:{ni_fir_bar:.0f}%;background:#14b8a6;border-radius:1px;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:3px;">
            <span style="font-size:10px;color:#3d5a75;font-family:Space Mono,monospace;">SI</span>
            <span style="font-size:10px;color:#7a9bb5;font-family:Space Mono,monospace;">
              FIR <b style="color:#e8f0f8">${safe_float(si_res.get("fir_price")):.2f}</b>
              &nbsp; SIR <b style="color:#e8f0f8">${safe_float(si_res.get("sir_price")):.2f}</b>
            </span>
          </div>
          <div style="height:2px;background:#1e3448;border-radius:1px;">
            <div style="height:100%;width:{si_fir_bar:.0f}%;background:#3b82f6;border-radius:1px;"></div>
          </div>
        </div>
      </div>

    </div>
    """
    st.markdown(kpi_html, unsafe_allow_html=True)
    # ── Row 1 ─────────────────────────────────────────────
    st.markdown('<div class="section-pad">', unsafe_allow_html=True)
    r1c1, r1c2, r1c3 = st.columns(3, gap="medium")

    with r1c1:
        panel_header("regional-price-overview-icon.png",
                    "Regional Price Overview ($/MWh)",
                    "14 grid zones · current trading period",
                    image_icon=True)
        if not regional_df.empty:
            st.plotly_chart(
                make_nz_price_map(regional_df, ni_res, si_res),
                use_container_width=True,
                config={"scrollZoom": False,
                        "displayModeBar": False,
                        "responsive": True}
            )
            inject_map_animations()
        else:
            st.warning("No regional price data")

    with r1c2:
        panel_header("carbon-emission-icon.png", 
                     "Carbon Emissions (g/kWh)", 
                     f"Last updated {ts_nzt}",
                     image_icon=True)
        month_avg = safe_float(carbon.get("current_month_avg_gkwh"))
        year_avg  = safe_float(carbon.get("current_year_avg_gkwh"))

        carbon_status_txt = carbon.get("carbon_status", "")
        gauge_color = "#10b981" if carbon_val < 50 else "#84cc16" if carbon_val < 80 else "#f59e0b" if carbon_val < 110 else "#f97316" if carbon_val < 130 else "#ef4444"

        # ============================================================
        # Carbon gauge calibration
        # ============================================================

        GAUGE_VALUE_MIN = 0
        GAUGE_VALUE_MAX = 150

        # SVG arc length for path: M 32 230 A 168 168 0 0 1 368 230
        GAUGE_ARC_LENGTH = 527.8

        # Visual calibration:
        # 0.54 keeps the current visual alignment that you said is the best.
        # It is equivalent to the previous formula: (carbon_val / 50) * 0.18
        GAUGE_VISUAL_SCALE = 0.54

        # Convert carbon value to 0–1 progress
        raw_progress = (carbon_val - GAUGE_VALUE_MIN) / (GAUGE_VALUE_MAX - GAUGE_VALUE_MIN)

        # Clamp progress to prevent overflow if API returns abnormal values
        raw_progress = min(max(raw_progress, 0), 1)

        # Apply visual calibration
        gauge_progress = raw_progress * GAUGE_VISUAL_SCALE

        # Final values used by SVG
        arc_offset = round(GAUGE_ARC_LENGTH * (1 - gauge_progress), 1)
        needle_angle = round(-90 + gauge_progress * 180, 1)

        st.components.v1.html(f"""
            <!DOCTYPE html>
            <html>
            <head>
            <style>
            * {{ margin:0; padding:0; box-sizing:border-box; }}
            body {{ background:#0d1520; font-family:"Space Mono",monospace; overflow:hidden; height:100%; }}
            .gauge-wrap {{ width:100%; height:100%; display:flex; flex-direction:column; padding:12px 8px 0; }}

            @keyframes needleSpin {{
                from {{ transform: rotate(-90deg); }}
                to   {{ transform: rotate(var(--needle-angle)); }}
            }}
            .needle-group {{
                transform-origin: 200px 230px;
                transform-box: view-box;
                transform: rotate(-90deg);
                animation: needleSpin 1.8s cubic-bezier(0.34,1.56,0.64,1) 0.3s forwards;
            }}
            @keyframes arcFill {{
                from {{ stroke-dashoffset: 527.8; }}
                to   {{ stroke-dashoffset: var(--arc-offset); }}
            }}
            .arc-fill {{
                stroke-dasharray: 527.8;
                stroke-dashoffset: 527.8;
                animation: arcFill 1.6s cubic-bezier(0.4,0,0.2,1) 0.3s forwards;
            }}
            
            @keyframes arcShimmer {{
                0% {{
                    stroke-dashoffset: 527.8;
                    opacity: 0;
                }}
                15% {{
                    opacity: 0.75;
                }}
                85% {{
                    opacity: 0.75;
                }}
                100% {{
                    stroke-dashoffset: 0;
                    opacity: 0;
                }}
            }}
            .arc-shimmer {{
                stroke-dasharray: 150 377.8;
                stroke-dashoffset: 527.8;
                animation: arcShimmer 8s ease-in-out infinite;
                opacity: 0.85;
            }}                
            
            @keyframes fadeUp {{
                from {{ opacity:0; transform:translateY(10px); }}
                to   {{ opacity:1; transform:translateY(0); }}
            }}
            .stat-item {{ animation: fadeUp 0.5s ease both; }}
            .stat-item:nth-child(1) {{ animation-delay:1.2s; }}
            .stat-item:nth-child(2) {{ animation-delay:1.4s; }}
            .stat-item:nth-child(3) {{ animation-delay:1.6s; }}
            @keyframes tickPulse {{
                0%,100% {{ opacity:0.2; }}
                50%     {{ opacity:0.6; }}
            }}
            @keyframes valueCount {{
                from {{ opacity:0; }}
                to   {{ opacity:1; }}
            }}
            .val-group {{ animation: valueCount 0.4s ease 0.5s both; }}
            </style>
            </head>
            <body>
            <div class="gauge-wrap">
            <svg viewBox="0 0 400 250" style="width:100%;flex:1;">
                <defs>
                <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"   stop-color="#10b981"/>
                    <stop offset="35%"  stop-color="#84cc16"/>
                    <stop offset="60%"  stop-color="#f59e0b"/>
                    <stop offset="80%"  stop-color="#f97316"/>
                    <stop offset="100%" stop-color="#ef4444"/>
                </linearGradient>
                <linearGradient id="arcShimmerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="white" stop-opacity="0" />
                    <stop offset="35%" stop-color="white" stop-opacity="0.10" />
                    <stop offset="50%" stop-color="white" stop-opacity="0.55" />
                    <stop offset="65%" stop-color="white" stop-opacity="0.10" />
                    <stop offset="100%" stop-color="white" stop-opacity="0" />
                </linearGradient>

                <filter id="shineGlow">
                    <feGaussianBlur stdDeviation="2.2" result="blur"/>
                    <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>

                <mask id="arcFillMask">
                    <path
                        d="M 32 230 A 168 168 0 0 1 368 230"
                        fill="none"
                        stroke="white"
                        stroke-width="30"
                        stroke-linecap="round"
                        stroke-dasharray="527.8"
                        stroke-dashoffset="{arc_offset}" />
                </mask>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <filter id="needleGlow">
                    <feGaussianBlur stdDeviation="2.5" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                </defs>

                <!-- VALUE + STATUS — sits at top ABOVE the gauge arc, never overlaps -->
                <g class="val-group">
                <text x="200" y="20" text-anchor="middle"
                    font-size="18" font-weight="700" fill="white"
                    font-family="Space Mono,monospace" id="gauge-num">{carbon_val:.1f}</text>
                <text x="200" y="34" text-anchor="middle"
                    font-size="10" fill="#7a9bb5"
                    font-family="Space Mono,monospace">g/kWh &nbsp; {carbon_status_txt}</text>
                </g>

                <!-- Background arc — starts at y=105 so it sits below the text -->
                <path d="M 32 230 A 168 168 0 0 1 368 230"
                fill="none" stroke="#1e3448" stroke-width="22" stroke-linecap="round"/>

                <!-- Coloured arc fill — uses correct arc length 527.8 -->
                <path class="arc-fill"
                d="M 32 230 A 168 168 0 0 1 368 230"
                fill="none" stroke="url(#arcGrad)" stroke-width="22" stroke-linecap="round"
                style="--arc-offset:{arc_offset};"
                filter="url(#glow)"/>

                <path class="arc-shimmer"
                    d="M 32 230 A 168 168 0 0 1 368 230"
                    fill="none"
                    stroke="url(#arcShimmerGrad)"
                    stroke-width="26"
                    stroke-linecap="round"
                    mask="url(#arcFillMask)"
                    filter="url(#shineGlow)" />

                <!-- Tick marks -->
                {"".join([
                f'<line x1="200" y1="68" x2="200" y2="84" stroke="#1e3448" stroke-width="2" '
                f'stroke-linecap="round" transform="rotate({-90 + i*(180/10)} 200 230)" '
                f'style="animation:tickPulse 2s ease {i*0.1:.1f}s infinite"/>'
                for i in range(11)
                ])}

                <!-- Tick labels -->
                <text x="26"  y="248" fill="#3d5a75" font-size="11" font-family="Space Mono,monospace" text-anchor="middle">0</text>
                <text x="86"  y="148" fill="#3d5a75" font-size="11" font-family="Space Mono,monospace" text-anchor="middle">50</text>
                <text x="200" y="70"  fill="#3d5a75" font-size="11" font-family="Space Mono,monospace" text-anchor="middle">100</text>
                <text x="314" y="148" fill="#3d5a75" font-size="11" font-family="Space Mono,monospace" text-anchor="middle">150</text>

                <!-- Needle — pivot at arc centre (200,230) -->
                <g class="needle-group" style="--needle-angle:{needle_angle}deg;">
                <line x1="200" y1="238" x2="200" y2="98"
                    stroke="rgba(239,68,68,0.2)" stroke-width="5" stroke-linecap="round"/>
                <line x1="200" y1="238" x2="200" y2="98"
                    stroke="#ef4444" stroke-width="3" stroke-linecap="round"
                    filter="url(#needleGlow)"/>
                <circle cx="200" cy="230" r="12" fill="#111d2e" stroke="#ef4444" stroke-width="2.5"/>
                <circle cx="200" cy="230" r="5"  fill="#ef4444"/>
                </g>
            </svg>

            <!-- Stats row -->
            <div style="display:flex;justify-content:space-around;
                        padding:10px 8px 14px;border-top:1px solid #1e3448;margin-top:2px;">
                <div class="stat-item" style="text-align:center;">
                <div style="font-size:15px;font-weight:700;color:#e8f0f8;font-family:Space Mono,monospace;">{year_avg:.0f} g/kWh</div>
                <div style="font-size:9px;color:#3d5a75;margin-top:3px;font-family:Space Mono,monospace;letter-spacing:0.8px;">2026 AVERAGE</div>
                </div>
                <div class="stat-item" style="text-align:center;border-left:1px solid #1e3448;border-right:1px solid #1e3448;padding:0 20px;">
                <div style="font-size:15px;font-weight:700;color:#e8f0f8;font-family:Space Mono,monospace;">{month_avg:.0f} g/kWh</div>
                <div style="font-size:9px;color:#3d5a75;margin-top:3px;font-family:Space Mono,monospace;letter-spacing:0.8px;">MAY AVERAGE</div>
                </div>
                <div class="stat-item" style="text-align:center;">
                <div style="font-size:15px;font-weight:700;color:#10b981;font-family:Space Mono,monospace;">{renewable_pct:.0f}%</div>
                <div style="font-size:9px;color:#3d5a75;margin-top:3px;font-family:Space Mono,monospace;letter-spacing:0.8px;">RENEWABLE</div>
                </div>
            </div>
            </div>

            <script>
            (function() {{
            const target = {carbon_val};
            const el = document.getElementById("gauge-num");
            const dur = 1600;
            const t0  = performance.now();
            function tick(now) {{
                const t    = Math.min((now - t0) / dur, 1);
                const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
                if (el) el.textContent = (target * ease).toFixed(1);
                if (t < 1) requestAnimationFrame(tick);
                else if (el) el.textContent = target.toFixed(1);
            }}
            setTimeout(() => requestAnimationFrame(tick), 300);
            }})();
            </script>
            </body>
            </html>
                    """, height=590, scrolling=False)

    with r1c3:
        panel_header("price-last-24hrs-icon.png", 
                     "Price Last 24 Hours ($/MWh)", 
                     f"Last updated {ts_nzt}",
                     image_icon=True)
        if not price_df.empty:
            st.plotly_chart(make_price_chart(price_df), use_container_width=True, config={"responsive": True})
        else:
            st.info("⏳ No data yet — pipeline hasn't run recently")

    # ── Row 2 ─────────────────────────────────────────────
    st.markdown("<br>", unsafe_allow_html=True)
    r2c1, r2c2, r2c3 = st.columns(3, gap="medium")

    with r2c1:
        panel_header("daily-market-summary-icon.png", 
                     "Daily Market Summary", 
                     "30-day price · carbon · renewable trend",
                     image_icon=True)
        st.plotly_chart(make_summary_chart(summary_df), use_container_width=True, config={"responsive": True})

    with r2c2:
        panel_header("carbon-renewable-trend-icon.png", 
                     "Carbon & Renewable Trend", 
                     "Last 7 days hourly",
                     image_icon=True)
        st.plotly_chart(make_carbon_trend_chart(carbon_df), use_container_width=True, config={"responsive": True})

    with r2c3:
        panel_header("price-spread-icon.png", 
                     "NI / SI Price Spread", 
                     "Auckland vs Benmore · last 48 hrs",
                     image_icon=True)
        st.plotly_chart(make_spread_chart(spread_list), use_container_width=True, config={"responsive": True})

    st.markdown('</div>', unsafe_allow_html=True)

    # ── Chart card animations via JS ─────────────────────
    st.components.v1.html("""
    <script>
    (function() {
        function applyAnimations() {
            // Target Streamlit's plotly chart wrappers and panel headers
            const styleId = 'nz-card-anim-style';
            if (!document.getElementById(styleId)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.textContent = `
                    @keyframes cardSlideUp {
                        from { opacity: 0; transform: translateY(28px); }
                        to   { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes cardSlideLeft {
                        from { opacity: 0; transform: translateX(-24px); }
                        to   { opacity: 1; transform: translateX(0); }
                    }
                    @keyframes cardGlow {
                        0%,100% { box-shadow: 0 0 0 0 rgba(20,184,166,0); }
                        50%     { box-shadow: 0 0 18px 2px rgba(20,184,166,0.10); }
                    }
                    .nz-card-animated {
                        opacity: 0;
                        transform: translateY(28px);
                        transition: opacity 0.55s cubic-bezier(0.4,0,0.2,1),
                                    transform 0.55s cubic-bezier(0.4,0,0.2,1),
                                    border-color 0.3s ease,
                                    box-shadow 0.3s ease;
                    }
                    .nz-card-animated.visible {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    .nz-card-animated:hover {
                        border-color: rgba(20,184,166,0.55) !important;
                        box-shadow: 0 0 22px rgba(20,184,166,0.12),
                                    0 8px 32px rgba(0,0,0,0.35) !important;
                        transform: translateY(-3px) !important;
                    }
                `;
                document.head.appendChild(style);
            }

            // Find all plotly chart containers inside the Streamlit iframe parent
            const root = window.parent.document;
            const charts = root.querySelectorAll(
                '[data-testid="stPlotlyChart"] > div:not(.nz-card-animated)'
            );

            charts.forEach((el, i) => {
                el.classList.add('nz-card-animated');
                el.style.transitionDelay = (i * 0.08) + 's';
            });

            // IntersectionObserver to trigger on scroll into view
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

            root.querySelectorAll('.nz-card-animated').forEach(el => {
                observer.observe(el);
            });
        }

        // Run after Streamlit finishes rendering
        // Use MutationObserver to wait for charts to appear
        const parentDoc = window.parent.document;
        const mutObs = new MutationObserver(() => {
            const charts = parentDoc.querySelectorAll('[data-testid="stPlotlyChart"] > div');
            if (charts.length > 0) {
                applyAnimations();
            }
        });
        mutObs.observe(parentDoc.body, { childList: true, subtree: true });

        // Also run immediately in case charts already exist
        setTimeout(applyAnimations, 400);
        setTimeout(applyAnimations, 1200);
    })();
    </script>
    """, height=0, scrolling=False)

    # Force Plotly to resize when change size screen
    st.components.v1.html("""
        <script>
        (function () {
            function resizePlotlyCharts() {
                const root = window.parent.document;

                const plotlyCharts = root.querySelectorAll('.js-plotly-plot');

                plotlyCharts.forEach(chart => {
                    if (window.parent.Plotly) {
                        window.parent.Plotly.Plots.resize(chart);
                    }
                });
            }

            let resizeTimer;

            window.parent.addEventListener('resize', function () {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(resizePlotlyCharts, 250);
            });

            const observer = new ResizeObserver(() => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(resizePlotlyCharts, 250);
            });

            const root = window.parent.document;
            const app = root.querySelector('.stApp');

            if (app) {
                observer.observe(app);
            }

            setTimeout(resizePlotlyCharts, 500);
            setTimeout(resizePlotlyCharts, 1500);
        })();
        </script>
        """, height=0, scrolling=False)

    # ── Pipeline ──────────────────────────────────────────
    render_pipeline_section()

    # ── Profile Links ─────────────────────────────────────
    render_profile_section()


    # ── Footer ────────────────────────────────────────────
    st.markdown("""
    <div class="dash-footer">
        <span>© 2026 NZ Electricity Dashboard</span>
    </div>
    """, unsafe_allow_html=True)

except requests.exceptions.ConnectionError:
    st.error("⚡ Cannot connect to FastAPI at http://localhost:8000")
except requests.exceptions.Timeout:
    st.error("⏱ FastAPI request timed out.")
except Exception as e:
    st.error(f"Dashboard error: {e}")
    st.exception(e)