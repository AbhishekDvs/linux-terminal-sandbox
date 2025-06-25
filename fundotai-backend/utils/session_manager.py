# utils/session_manager.py
import tempfile
import threading
import time
import os
import shutil
from .logger import logger

SESSION_TIMEOUT = 120
sessions = {}
session_lock = threading.Lock()

def create_session(session_id: str, distro: str):
    temp_dir = tempfile.mkdtemp(prefix=f"session_{session_id[:8]}_")
    now = time.time()
    with session_lock:
        sessions[session_id] = {
            "temp_dir": temp_dir,
            "last_used": now,
            "created": now,
            "distro": distro,
            "last_command_at": 0
        }
    return sessions[session_id]

def delete_session(session_id: str):
    with session_lock:
        if session_id in sessions:
            try:
                if os.path.exists(sessions[session_id]['temp_dir']):
                    shutil.rmtree(sessions[session_id]['temp_dir'])
            except Exception as e:
                logger.error(f"Error cleaning up session {session_id}: {e}")
            del sessions[session_id]

def list_sessions():
    now = time.time()
    with session_lock:
        return {
            sid: {
                "created": sess['created'],
                "last_used": sess['last_used'],
                "distro": sess['distro'],
                "expires_at": sess['last_used'] + SESSION_TIMEOUT,
                "time_remaining": max(0, round(sess['last_used'] + SESSION_TIMEOUT - now)),
                "is_expired": now > sess['last_used'] + SESSION_TIMEOUT
            }
            for sid, sess in sessions.items()
        }

def get_session(session_id: str):
    with session_lock:
        return sessions.get(session_id)

def update_session_usage(session_id: str):
    with session_lock:
        if session_id in sessions:
            now = time.time()
            sessions[session_id]["last_used"] = now
            sessions[session_id]["last_command_at"] = now

def can_execute(session_id: str) -> tuple[bool, str]:
    with session_lock:
        if session_id not in sessions:
            return False, "Session not found"

        now = time.time()
        last_cmd = sessions[session_id].get("last_command_at", 0)
        if now - last_cmd < 2:
            return False, "Too many requests. Please wait before running another command."
        return True, "OK"

def cleanup_sessions():
    while True:
        time.sleep(30)
        now = time.time()
        with session_lock:
            expired = [sid for sid, sess in sessions.items() if now - sess['last_used'] > SESSION_TIMEOUT]
            for sid in expired:
                try:
                    if os.path.exists(sessions[sid]['temp_dir']):
                        shutil.rmtree(sessions[sid]['temp_dir'])
                except Exception as e:
                    logger.error(f"Error cleaning up session {sid}: {e}")
                del sessions[sid]
            if expired:
                logger.info(f"Cleaned up {len(expired)} expired sessions")

# Start background thread
threading.Thread(target=cleanup_sessions, daemon=True).start()
