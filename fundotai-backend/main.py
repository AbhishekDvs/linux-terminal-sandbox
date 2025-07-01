from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from utils.logger import logger
from routes.exec import router as exec_router
from routes.session import router as session_router
from routes.meta import router as meta_router
import os

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Rate limiter config
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="SafeShell API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Middleware (optional: restrict in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://terminalsandbox.pages.dev/","http://localhost:10000","http://localhost:3000"],  # ✅ restrict to your deployed frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🛡️ Middleware: Origin-based protection
@app.middleware("http")
async def block_unknown_origins(request: Request, call_next):
    allowed_origins = ["https://terminalsandbox.pages.dev/","http://localhost:10000","http://localhost:3000"]
    origin = request.headers.get("origin") or request.headers.get("referer")

    if origin and not any(origin.startswith(allowed) for allowed in allowed_origins):
        return JSONResponse(status_code=403, content={"error": "Unauthorized origin"})
    
    return await call_next(request)

# 🧾 Middleware: Log client IPs
@app.middleware("http")
async def log_ip_address(request: Request, call_next):
    x_forwarded_for = request.headers.get('x-forwarded-for')
    client_ip = x_forwarded_for.split(',')[0] if x_forwarded_for else request.client.host
    logger.info(f"Client IP: {client_ip}")
    response = await call_next(request)
    return response

# Mount routers
app.include_router(exec_router, prefix="")
app.include_router(session_router, prefix="")
app.include_router(meta_router, prefix="")

# Root
@app.get("/")
def root():
    return {
        "status": "🚀 SafeShell API - Secure Command Sandbox",
        "version": "2.0",
        "platform": "render-free-tier",
        "features": [
            "Isolated sessions with temp directories",
            "60+ safe commands allowed",
            "Dangerous commands blocked (rm, sudo, etc.)",
            "30-second command timeout",
            "Output length limits",
        ],
        "endpoints": {
            "POST /create-session": "Create new terminal session",
            "POST /exec": "Execute safe commands",
            "GET /allowed-commands": "List allowed commands",
            "GET /sessions": "List active sessions",
            "DELETE /session/{id}": "Delete session"
        }
    }

# Health check
@app.get("/health")
def health_check():
    import time
    return {"status": "healthy", "timestamp": time.time()}
