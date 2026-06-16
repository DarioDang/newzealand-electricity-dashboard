# ============================================================
# api/routers/trigger.py
# Secure trigger endpoint for cron-job.org
# Returns immediately — pipeline runs in background thread
# Protected by secret token in header
# ============================================================
import os
import sys
import logging
import threading
import subprocess
from fastapi import APIRouter, HTTPException, Header
from typing import Optional

router = APIRouter()
logger = logging.getLogger(__name__)


def _run_pipeline():
    """Runs fast ingest in background thread."""
    try:
        project_root = os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )
        script_path = os.path.join(
            project_root, "pipeline", "flows", "ingest_regional_fast.py"
        )
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=True,
            text=True,
            timeout=180
        )
        if result.returncode != 0:
            logger.error(f"❌ Ingest failed: {result.stderr}")
        else:
            logger.info("✅ Background ingest completed")
            logger.info(result.stdout[-500:])
    except Exception as e:
        logger.error(f"❌ Background ingest exception: {e}")


@router.get("/trigger/ingest")
def trigger_ingest(x_cron_secret: Optional[str] = Header(None)):
    """
    Triggered by cron-job.org every 30 minutes.
    Returns 200 immediately — pipeline runs in background.
    Protected by X-Cron-Secret header.
    """

    # ── Validate secret token ────────────────────────────
    expected = os.getenv("CRON_SECRET")
    if not expected:
        logger.error("CRON_SECRET env var not set")
        raise HTTPException(status_code=500, detail="Server misconfigured")

    if x_cron_secret != expected:
        logger.warning("Unauthorized trigger attempt")
        raise HTTPException(status_code=401, detail="Unauthorized")

    # ── Fire and forget — returns before pipeline finishes ──
    thread = threading.Thread(target=_run_pipeline, daemon=True)
    thread.start()

    logger.info("Fast ingest triggered in background")
    return {
        "status":  "accepted",
        "message": "Ingest started in background"
    }