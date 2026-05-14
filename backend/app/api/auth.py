"""
Auth API Router.
Handles: registration, login (JWT), current user info.
Admin account is auto-seeded on first startup via init_admin().
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

from app.core.database import get_mongo_db
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    require_admin,
)
from app.core.config import get_settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


# --- Request Models ---

class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    password: str = Field(min_length=4)


class LoginRequest(BaseModel):
    username: str
    password: str


# --- Seed Admin on startup ---

async def init_admin():
    """
    Creates the admin account if it doesn't exist.
    Called once during app lifespan startup.
    """
    settings = get_settings()
    db = await get_mongo_db()
    existing = await db.users.find_one({"username": "admin"})
    if not existing:
        admin_user = {
            "user_id": str(uuid.uuid4()),
            "username": "admin",
            "hashed_password": get_password_hash(settings.admin_password),
            "role": "admin",
            "created_at": datetime.utcnow(),
        }
        await db.users.insert_one(admin_user)
        print("[AUTH] Admin account created.")
    else:
        # Update admin password if it changed in .env
        if not verify_password(settings.admin_password, existing["hashed_password"]):
            await db.users.update_one(
                {"username": "admin"},
                {"$set": {"hashed_password": get_password_hash(settings.admin_password)}}
            )
            print("[AUTH] Admin password updated from .env.")
        print("[AUTH] Admin account already exists.")


# --- Routes ---

@router.post("/register")
async def register(req: RegisterRequest):
    db = await get_mongo_db()

    # Check username uniqueness
    if await db.users.find_one({"username": req.username}):
        raise HTTPException(status_code=409, detail="Username already taken")

    user = {
        "user_id": str(uuid.uuid4()),
        "username": req.username,
        "hashed_password": get_password_hash(req.password),
        "role": "user",
        "created_at": datetime.utcnow(),
    }
    await db.users.insert_one(user)

    token = create_access_token({"sub": user["user_id"], "role": "user"})
    return {
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "username": user["username"],
            "role": user["role"],
        }
    }


@router.post("/login")
async def login(req: LoginRequest):
    db = await get_mongo_db()
    user = await db.users.find_one({"username": req.username})

    if not user or not verify_password(req.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token({"sub": user["user_id"], "role": user.get("role", "user")})
    return {
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "username": user["username"],
            "role": user.get("role", "user"),
        }
    }


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Returns current authenticated user info."""
    return {
        "user_id": user["user_id"],
        "username": user["username"],
        "role": user.get("role", "user"),
        "created_at": str(user.get("created_at", "")),
    }
