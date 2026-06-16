# ============================================================
# api/routers/trigger.py
# Secure trigger endpoint for cron-job.org
# Called every 30 min to run fast ingest pipeline
# Protected by secret token in header
# ============================================================
import os
import sys
import subprocess
import logging
from fastapi import APIRouter, HTTPException, Header
from typing import Optional

router = APIRouter()

logger = logging.getLogger(__name__)

@router.get("/trigger/ingest")
def trigger_ingest(x_cron_secret: Optional[str] = Header(None)):
    """
    Trigger by cron - job every 30 mins 
    Runs fast ingest pipeline - regional price + carbon
    Protected by X-cron secret header token
    """

    # Validate secret token
    expected = os.getenv("CRON_SECRET")
    if not expected:
        logger.error("CRON_SECRET env var not set")
        raise HTTPException(status_code=500, detail="Server misconfiguration")

    if x_cron_secret != expected:
        logger.warning("Unauthorized trigger attempt")
        raise HTTPException(status_code = 401, detail = "Unauthorized")
    
    # Run pipeline
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
            timeout=120
        )

        if result.returncode != 0:
            logger.error(f"❌ Ingest failed: {result.stderr}")
            raise HTTPException(
                status_code=500,
                detail=f"Ingest failed: {result.stderr[-200:]}"
            )

        logger.info("✅ Fast ingest triggered successfully")
        logger.info(result.stdout[-500:])
        return {
            "status":  "ok",
            "message": "Fast ingest completed successfully",
            "log":     result.stdout[-500:]
        }
    except Exception as e:
        logger.error(f"❌ Fast ingest failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Ingest failed: {str(e)}"
        )