### `routes/session.py`

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import time
import uuid
import tempfile

from utils.logger import logger
from utils.session_manager import create_session, delete_session_by_id, list_sessions

router = APIRouter()

@router.post("/create-session")
def create_session_route(req: dict, request: Request):
    try:
        x_forwarded_for = request.headers.get("x-forwarded-for")
        client_ip = x_forwarded_for.split(',')[0] if x_forwarded_for else request.client.host

        session_id = str(uuid.uuid4())
        temp_dir = tempfile.mkdtemp(prefix=f"session_{session_id[:8]}_")

        create_session(session_id, req.get("distro"), temp_dir)

        logger.info(f"✅ New session {session_id} created from {client_ip}")
        return {
            "status": "success",
            "message": "Session created successfully",
            "data": {
                "session_id": session_id,
                "created_at": time.time()
            }
        }

    except Exception as e:
        logger.error(f"❌ Session creation failed: {e}")
        return JSONResponse(status_code=500, content={"status": "error", "message": "Failed to create session", "details": str(e)})


@router.delete("/session/{session_id}")
def delete_session_route(session_id: str):
    return delete_session_by_id(session_id)


@router.get("/sessions")
def get_all_sessions():
    return list_sessions()
