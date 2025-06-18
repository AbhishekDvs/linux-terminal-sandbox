from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import uuid
import httpx
import docker
import threading
import time
import logging
from logging.handlers import RotatingFileHandler

# Setup logger
log_formatter = logging.Formatter('%(asctime)s | %(levelname)s | %(message)s')

log_handler = RotatingFileHandler("logs/server.log", maxBytes=1_000_000, backupCount=3)
log_handler.setFormatter(log_formatter)
log_handler.setLevel(logging.INFO)

logger = logging.getLogger("sandbox_logger")
logger.setLevel(logging.INFO)
logger.addHandler(log_handler)

app = FastAPI()

# Allow all origins for now (during development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_ip_address(request: Request, call_next):
    x_forwarded_for = request.headers.get('x-forwarded-for')
    client_ip = x_forwarded_for.split(',')[0] if x_forwarded_for else request.client.host
    logger.info(f"Client IP: {client_ip}")
    response = await call_next(request)
    return response

client = docker.from_env()

# Map user-readable distros to Docker images
DISTROS = {
    "debian": "debian:bullseye-slim",
    "arch": "archlinux:base"
}
# In-memory session mapping (session_id: container)
sessions = {}
session_lock = threading.Lock()
SESSION_TIMEOUT = 120  # seconds

class ExecRequest(BaseModel):
    session_id: str
    command: str

class CreateSessionRequest(BaseModel):
    distro: str  # "debian" or "arch"

ALLOWED_COMMANDS = {"ls", "cat", "echo", "whoami", "pwd", "uname"}


def cleanup_sessions():
    while True:
        time.sleep(10)
        now = time.time()
        with session_lock:
            expired = [sid for sid, sess in sessions.items() if now - sess['last_used'] > SESSION_TIMEOUT]
            for sid in expired:
                try:
                    sessions[sid]['container'].kill()
                except Exception:
                    pass
                del sessions[sid]

threading.Thread(target=cleanup_sessions, daemon=True).start()


@app.get("/distros")
def list_distros():
    return list(DISTROS.keys())

# @app.post("/create-session")
# def create_session(req: CreateSessionRequest):
#     if req.distro not in ["debian", "arch"]:
#         raise HTTPException(status_code=400, detail="Unsupported distro")

#     image = "debian:bullseye-slim" if req.distro == "debian" else "archlinux:latest"
#     container = client.containers.run(
#         image,
#         command="/bin/sh",
#         tty=True,
#         stdin_open=True,
#         detach=True,
#         network_mode="none",
#         mem_limit="256m",
#         cpu_quota=50000,  # 50% of CPU
#         cpu_period=100000
#     )

#     session_id = str(uuid.uuid4())
#     with session_lock:
#         sessions[session_id] = {"container": container, "last_used": time.time()}
#     # Log the session creation with IP
#     client_ip = req.__dict__.get("client", {}).get("host", "unknown")  # fallback-safe
#     logger.info(f"New session {session_id} created from IP {client_ip} using distro '{req.distro}'")
#     return {"session_id": session_id}

@app.post("/create-session")
def create_session(req: CreateSessionRequest, request: Request):
    if req.distro not in ["debian", "arch"]:
        raise HTTPException(status_code=400, detail="Unsupported distro")

    # Get IP
    x_forwarded_for = request.headers.get("x-forwarded-for")
    client_ip = x_forwarded_for.split(',')[0] if x_forwarded_for else request.client.host

    # VPN/Datacenter Check (using ip-api.com)
    try:
        response = httpx.get(f"http://ip-api.com/json/{client_ip}?fields=hosting,proxy,status,message")
        data = response.json()
        if data.get("status") != "success":
            logger.warning(f"VPN check failed for {client_ip}: {data.get('message')}")
        elif data.get("proxy") or data.get("hosting"):
            logger.warning(f"Blocked VPN/Hosting IP: {client_ip}")
            raise HTTPException(status_code=403, detail="VPNs or hosting services are not allowed.")
    except Exception as e:
        logger.error(f"VPN check error for {client_ip}: {e}")
        raise HTTPException(status_code=500, detail="Could not verify IP reputation.")

    # Continue session creation
    image = "debian:bullseye-slim" if req.distro == "debian" else "archlinux:latest"
    container = client.containers.run(
        image,
        command="/bin/sh",
        tty=True,
        stdin_open=True,
        detach=True,
        network_mode="none",
        mem_limit="256m",
        cpu_quota=50000,
        cpu_period=100000
    )

    session_id = str(uuid.uuid4())
    with session_lock:
        sessions[session_id] = {"container": container, "last_used": time.time()}

    logger.info(f"New session {session_id} created from IP {client_ip} using distro '{req.distro}'")
    return {"session_id": session_id}

@app.post("/exec")
def execute_command(req: ExecRequest):
    with session_lock:
        if req.session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        container = sessions[req.session_id]['container']
        sessions[req.session_id]['last_used'] = time.time()

    # Simple allowlist check
    base_cmd = req.command.strip().split()[0]
    if base_cmd not in ALLOWED_COMMANDS:
        return JSONResponse(content={"output": f"Command '{base_cmd}' not allowed."}, status_code=403)

    try:
        exec_log = container.exec_run(req.command, demux=True, tty=True, stdin=False)
        stdout, stderr = exec_log.output
        output = (stdout or b"").decode() + (stderr or b"").decode()
        return {"output": output}
    except Exception as e:
        return JSONResponse(content={"output": str(e)}, status_code=500)


@app.get("/")
def root():
    return {"status": "Sandbox Terminal API running."}
