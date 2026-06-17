# ============================================================
# api/routers/trigger.py
# Secure trigger endpoint for cron-job.org
# Runs pipeline directly in FastAPI process
# Protected by secret token in header
# ============================================================
import os
import sys
import logging
import threading
from fastapi import APIRouter, HTTPException, Header
from typing import Optional

router = APIRouter()
logger = logging.getLogger(__name__)


def _setup_pipeline_path():
    """Add pipeline directories to sys.path."""
    this_file    = os.path.abspath(__file__)
    routers_dir  = os.path.dirname(this_file)
    api_dir      = os.path.dirname(routers_dir)
    project_root = os.path.dirname(api_dir)

    pipeline_root  = os.path.join(project_root, "pipeline")
    pipeline_flows = os.path.join(project_root, "pipeline", "flows")

    for path in [pipeline_root, pipeline_flows]:
        if path not in sys.path:
            sys.path.insert(0, path)

    return project_root


def _run_pipeline():
    """Runs fast ingest directly in background thread."""
    try:
        _setup_pipeline_path()

        # Import here after path is set up
        from ingest_regional_fast import run_fast_ingest  # type: ignore
        run_fast_ingest()
        logger.info("✅ Background ingest completed successfully")

    except ImportError as e:
        logger.error(f"❌ Import error: {e}")
        logger.error(f"❌ sys.path: {sys.path}")
    except Exception as e:
        logger.error(f"❌ Background ingest failed: {type(e).__name__}: {e}")
        import traceback
        logger.error(traceback.format_exc())


@router.get("/trigger/ingest")
def trigger_ingest(x_cron_secret: Optional[str] = Header(None)):
    """
    Triggered by cron-job.org every 30 minutes.
    Returns 200 immediately — pipeline runs in background.
    Protected by X-Cron-Secret header.
    """
    expected = os.getenv("CRON_SECRET")
    if not expected:
        logger.error("CRON_SECRET env var not set")
        raise HTTPException(status_code=500, detail="Server misconfigured")

    if x_cron_secret != expected:
        logger.warning("Unauthorized trigger attempt")
        raise HTTPException(status_code=401, detail="Unauthorized")

    thread = threading.Thread(target=_run_pipeline, daemon=True)
    thread.start()

    logger.info("🚀 Fast ingest triggered in background")
    return {
        "status":  "accepted",
        "message": "Ingest started in background"
    }