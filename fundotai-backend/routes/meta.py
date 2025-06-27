### `routes/meta.py`

from fastapi import APIRouter
import time

from utils.command_validator import ALLOWED_COMMANDS, COMMAND_DESCRIPTIONS, COMMAND_CATEGORIES

router = APIRouter()

@router.get("/")
def root():
    return {
        "status": "🚀SafeShell Sandbox Terminal API - Safe & Secure",
        "version": "2.0",
        "platform": "render-free-tier",
        "features": [
            "Isolated sessions with temp directories",
            "60+ safe commands allowed",
            "Dangerous commands blocked (rm, sudo, etc.)",
            "30-second command timeout",
            "Output length limits"
        ],
        "endpoints": {
            "POST /create-session": "Create new terminal session",
            "POST /exec": "Execute safe commands",
            "GET /allowed-commands": "List allowed commands",
            "GET /sessions": "List active sessions",
            "DELETE /session/{id}": "Delete session"
        }
    }

@router.get("/allowed-commands")
def allowed_commands():
    grouped = {category: [] for category in COMMAND_CATEGORIES.keys()}
    grouped["other"] = []

    for cmd in sorted(ALLOWED_COMMANDS):
        found = False
        for category, commands in COMMAND_CATEGORIES.items():
            if cmd in commands:
                grouped[category].append({"command": cmd, "description": COMMAND_DESCRIPTIONS.get(cmd, "")})
                found = True
                break
        if not found:
            grouped["other"].append({"command": cmd, "description": COMMAND_DESCRIPTIONS.get(cmd, "")})

    return {"grouped_commands": grouped, "total_count": len(ALLOWED_COMMANDS)}

@router.get("/health")
def health():
    return {"status": "healthy", "timestamp": time.time()}
