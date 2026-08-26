import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.config import settings
from app.routes.downloads import router as downloads_router
from app.services.cleanup import cleanup_loop

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        client_host = request.client.host if request.client else "unknown"
        logger.info("%s %s (from %s)", request.method, request.url.path, client_host)
        response = await call_next(request)
        elapsed = (time.perf_counter() - start) * 1000
        logger.info(
            "%s %s → %d (%.1fms)",
            request.method,
            request.url.path,
            response.status_code,
            elapsed,
        )
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    os.makedirs(settings.download_dir, exist_ok=True)
    logger.info("Downloads directory: %s", os.path.abspath(settings.download_dir))

    # Start periodic cleanup task
    cleanup_task = asyncio.create_task(cleanup_loop(interval_seconds=300))
    logger.info("Cleanup loop started")

    yield

    # Shutdown: cancel cleanup task
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass
    logger.info("Shutdown complete")


app = FastAPI(title="Music Download Service", lifespan=lifespan)

# CORS
origins = [o.strip() for o in settings.allowed_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging
app.add_middleware(RequestLoggingMiddleware)

# Routers
app.include_router(downloads_router)


@app.get("/api/health")
async def health_check() -> dict:
    return {"status": "ok"}
