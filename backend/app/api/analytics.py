import time
from fastapi import APIRouter, Request, Header, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime
from app.core.config import get_settings

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

# In-memory storage for active sessions
# Format: {session_id: {"ip": "...", "agent": "...", "last_seen": timestamp, "joined": timestamp}}
ACTIVE_SESSIONS: Dict[str, Dict[str, Any]] = {}

# Time before a session is considered offline (in seconds)
SESSION_TIMEOUT = 60

class HeartbeatRequest(BaseModel):
    session_id: str
    user_agent: Optional[str] = None
    path: Optional[str] = None

@router.post("/heartbeat")
async def heartbeat(req: HeartbeatRequest, request: Request):
    """
    Receives a heartbeat from the frontend to track active online users.
    Called every 30 seconds by active clients.
    """
    client_ip = request.client.host if request.client else "unknown"
    # Try to get real IP if behind a proxy like Cloudflare/Render
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        client_ip = x_forwarded_for.split(",")[0]
        
    now = time.time()
    
    # Clean up stale sessions
    stale_keys = [sid for sid, data in ACTIVE_SESSIONS.items() if now - data["last_seen"] > SESSION_TIMEOUT]
    for k in stale_keys:
        del ACTIVE_SESSIONS[k]

    # Update or create session
    if req.session_id in ACTIVE_SESSIONS:
        ACTIVE_SESSIONS[req.session_id]["last_seen"] = now
        if req.path:
            ACTIVE_SESSIONS[req.session_id]["path"] = req.path
    else:
        ACTIVE_SESSIONS[req.session_id] = {
            "ip": client_ip,
            "agent": req.user_agent or request.headers.get("user-agent", "Unknown"),
            "last_seen": now,
            "joined": now,
            "path": req.path or "/"
        }
    
    return {"status": "ok", "active_users": len(ACTIVE_SESSIONS)}

@router.get("/admin/live")
async def admin_get_live_traffic(x_admin_password: str = Header(...)):
    """
    Protected endpoint to get detailed live traffic and active users.
    Requires matching x-admin-password.
    """
    settings = get_settings()
    if x_admin_password != settings.admin_password:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid Admin Password")
        
    now = time.time()
    
    # Clean up stale sessions
    stale_keys = [sid for sid, data in ACTIVE_SESSIONS.items() if now - data["last_seen"] > SESSION_TIMEOUT]
    for k in stale_keys:
        del ACTIVE_SESSIONS[k]
        
    return {
        "active_users_count": len(ACTIVE_SESSIONS),
        "sessions": list(ACTIVE_SESSIONS.values()),
        "timestamp": datetime.utcnow().isoformat()
    }
