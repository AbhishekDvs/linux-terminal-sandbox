### `routes/exec.py`

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import subprocess
import time
import shlex
from slowapi import Limiter
from slowapi.util import get_remote_address
from utils.logger import logger
from utils.command_validator import is_command_safe
from utils.session_manager import get_session, update_session_usage, can_execute

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

@router.post("/exec")
@limiter.limit("5/minute")
def execute_command(req: dict, request: Request):
    start_time = time.time()
    session_id = req.get("session_id")
    command = req.get("command")

    try:
        session = get_session(session_id)
        if not session:
            return JSONResponse(status_code=404, content={"status": "error", "message": "Session not found"})

        if not can_execute(session_id):
            return JSONResponse(status_code=429, content={"status": "error", "message": "Too many requests"})

        update_session_usage(session_id)
        temp_dir = session["temp_dir"]

        is_safe, safety_msg = is_command_safe(command)
        if not is_safe:
            logger.warning(f"🚫 BLOCKED: {safety_msg} | Command: {command}")
            return JSONResponse(status_code=403, content={"status": "error", "message": "Command blocked", "details": safety_msg})

        command_parts = shlex.split(command.strip())
        base_cmd = command_parts[0]

        env = {
            'HOME': temp_dir,
            'TMP': temp_dir,
            'TMPDIR': temp_dir,
            'TEMP': temp_dir,
            'USER': 'sandbox',
            'USERNAME': 'sandbox',
            'PATH': '/usr/local/bin:/usr/bin:/bin',
            'LANG': 'en_US.UTF-8',
            'TERM': 'xterm'
        }

        result = subprocess.run(
            command_parts,
            cwd=temp_dir,
            capture_output=True,
            text=True,
            timeout=30,
            env=env,
            shell=False
        )

        output = result.stdout or ''
        if result.stderr:
            output += ("\n" if output else "") + result.stderr

        if not output.strip():
            output = f"✅ Command completed (exit code: {result.returncode})"

        if len(output) > 10000:
            output = output[:10000] + "\n... (output truncated)"

        end_time = time.time()
        logger.info(f"✅ Executed: {command} | Time: {end_time - start_time:.2f}s")

        return {
            "status": "success",
            "message": "Command executed",
            "data": {
                "command": command,
                "output": output,
                "exit_code": result.returncode,
                "started_at": start_time,
                "ended_at": end_time,
                "duration": round(end_time - start_time, 2)
            }
        }

    except subprocess.TimeoutExpired:
        return JSONResponse(status_code=408, content={"status": "error", "message": "Command timed out", "details": "Max 30s allowed"})
    except FileNotFoundError:
        return JSONResponse(status_code=404, content={"status": "error", "message": f"Command not found: '{command}'"})
    except Exception as e:
        logger.error(f"❌ Execution error: {e}")
        return JSONResponse(status_code=500, content={"status": "error", "message": "Execution error", "details": str(e)})