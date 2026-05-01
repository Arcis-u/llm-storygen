"""
FastAPI Application Entry Point.
Configures CORS, lifespan events, and mounts all routers.
"""

# Fix Windows cp1252 encoding: force UTF-8 for all print() output
import sys
import io
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
import time
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import init_databases, close_databases
from app.api.story import router as story_router
from app.api.system import router as system_router
from app.api.analytics import router as analytics_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages startup and shutdown lifecycle.
    - On startup: initialize database connections, create indexes/collections.
    - On shutdown: gracefully close all connections.
    """
    print("=" * 60)
    print("  Interactive Story AI - Starting up...")
    print("=" * 60)
    await init_databases()
    yield
    await close_databases()
    print("  Interactive Story AI - Shut down complete.")


settings = get_settings()

app = FastAPI(
    title="Interactive Story AI",
    description="Multi-Agent LLM system for creating immersive interactive fiction with RPG elements.",
    version="0.1.0",
    lifespan=lifespan,
)

# --- CORS Middleware ---
# Allow the Next.js frontend to communicate with this backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Telemetry Middleware ---
from app.api.system import TELEMETRY, TRAFFIC_LOG
@app.middleware("http")
async def add_telemetry(request: Request, call_next):
    start_time = time.perf_counter()
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    except Exception as e:
        TELEMETRY["failed_requests"] += 1
        raise e
    finally:
        process_time_ms = (time.perf_counter() - start_time) * 1000
        TELEMETRY["total_requests"] += 1
        TELEMETRY["total_latency_ms"] += process_time_ms
        if status_code >= 400:
            TELEMETRY["failed_requests"] += 1
        
        # Don't log the spammy /status route itself to keep the log clean
        if request.url.path != "/api/system/status":
            log_entry = f"[{time.strftime('%H:%M:%S')}] [{request.method}] {request.url.path} -> {status_code} ({process_time_ms:.1f}ms)"
            TRAFFIC_LOG.append(log_entry)

# --- Mount Routers ---
app.include_router(story_router)
app.include_router(system_router)
app.include_router(analytics_router)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    import json
    with open("422_error.log", "w", encoding="utf-8") as f:
        f.write(f"URL: {request.url}\n")
        f.write(f"Errors: {json.dumps(exc.errors(), indent=2)}\n")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "online",
        "app": "Interactive Story AI",
        "version": "0.1.0",
    }


@app.get("/health")
async def health_check():
    """Detailed health check with database connectivity status."""
    from app.core.database import get_mongo_db, get_qdrant

    health = {"api": "healthy", "mongodb": "unknown", "qdrant": "unknown"}

    try:
        db = await get_mongo_db()
        await db.command("ping")
        health["mongodb"] = "healthy"
    except Exception as e:
        health["mongodb"] = f"unhealthy: {str(e)}"

    try:
        qdrant = get_qdrant()
        qdrant.get_collections()
        health["qdrant"] = "healthy"
    except Exception as e:
        health["qdrant"] = f"unhealthy: {str(e)}"

    return health
