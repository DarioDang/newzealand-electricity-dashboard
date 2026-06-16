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
        # On Render, files are at /opt/render/project/src/
        # __file__ is api/routers/trigger.py
        # so project root is 2 levels up
        this_file    = os.path.abspath(__file__)
        routers_dir  = os.path.dirname(this_file)   # api/routers/
        api_dir      = os.path.dirname(routers_dir)  # api/
        project_root = os.path.dirname(api_dir)      # project root

        script_path = os.path.join(
            project_root, "pipeline", "flows", "ingest_regional_fast.py"
        )

        logger.info(f"🔍 Script path: {script_path}")
        logger.info(f"🔍 Script exists: {os.path.exists(script_path)}")
        logger.info(f"🔍 Python: {sys.executable}")

        if not os.path.exists(script_path):
            logger.error(f"❌ Script not found at: {script_path}")
            # List what's actually in the project root for debugging
            logger.error(f"📁 Project root contents: {os.listdir(project_root)}")
            return

        # Use venv Python if available, fallback to sys.executable
        venv_python = os.path.join(project_root, ".venv", "bin", "python")
        python_bin  = venv_python if os.path.exists(venv_python) else sys.executable

        logger.info(f"🐍 Using Python: {python_bin}")

        result = subprocess.run(
            [python_bin, script_path],
            capture_output=True,
            text=True,
            timeout=180,
            cwd=project_root,
            env={
                **os.environ,
                "PYTHONPATH": f"{project_root}:{os.path.join(project_root, 'pipeline')}",
            }
        )

        if result.returncode != 0:
            logger.error(f"❌ Ingest failed (code {result.returncode})")
            logger.error(f"STDERR: {result.stderr[-1000:]}")
            logger.error(f"STDOUT: {result.stdout[-500:]}")
        else:
            logger.info("✅ Background ingest completed successfully")
            logger.info(f"STDOUT: {result.stdout[-500:]}")

    except subprocess.TimeoutExpired:
        logger.error("❌ Ingest timed out after 180 seconds")
    except Exception as e:
        logger.error(f"❌ Background ingest exception: {type(e).__name__}: {e}")


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

@router.get("/trigger/debug")
def trigger_debug(x_cron_secret: Optional[str] = Header(None)):
    """Temporary debug endpoint to check file paths on Render."""
    expected = os.getenv("CRON_SECRET")
    if x_cron_secret != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")

    this_file    = os.path.abspath(__file__)
    routers_dir  = os.path.dirname(this_file)
    api_dir      = os.path.dirname(routers_dir)
    project_root = os.path.dirname(api_dir)
    script_path  = os.path.join(project_root, "pipeline", "flows", "ingest_regional_fast.py")

    return {
        "this_file":       this_file,
        "project_root":    project_root,
        "script_path":     script_path,
        "script_exists":   os.path.exists(script_path),
        "project_contents": os.listdir(project_root),
    }