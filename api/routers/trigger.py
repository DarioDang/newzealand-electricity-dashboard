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
    print("🚀 Background pipeline starting...", flush=True)
    try:
        _setup_pipeline_path()

        # Import here, AFTER path is set up — must stay inside this function
        from ingest_regional_fast import run_fast_ingest  # type: ignore
        print("📦 Imported run_fast_ingest successfully", flush=True)
        run_fast_ingest()
        print("✅ Background ingest completed successfully", flush=True)

    except ImportError as e:
        print(f"❌ Import error: {e}", flush=True)
    except Exception as e:
        print(f"❌ Background ingest failed: {type(e).__name__}: {e}", flush=True)
        import traceback
        print(traceback.format_exc(), flush=True)


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