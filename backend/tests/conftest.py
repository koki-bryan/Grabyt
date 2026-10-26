import asyncio
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models import Base, Download

# Use the same DATABASE_URL for tests
TEST_DATABASE_URL = os.environ.get("DATABASE_URL", settings.database_url)


def _create_test_app():
    """Create a test app without the cleanup loop to avoid interference."""
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from app.routes.downloads import router as downloads_router
    from app.routes.playlists import router as playlists_router

    @asynccontextmanager
    async def test_lifespan(app: FastAPI):
        os.makedirs(settings.download_dir, exist_ok=True)
        yield

    test_app = FastAPI(title="Music Download Service (Test)", lifespan=test_lifespan)
    test_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    test_app.include_router(downloads_router)
    test_app.include_router(playlists_router)

    @test_app.get("/api/health")
    async def health_check() -> dict:
        return {"status": "ok"}

    return test_app


@pytest_asyncio.fixture
async def async_client():
    """Create an async test client with background task spawning mocked out."""
    test_app = _create_test_app()

    with patch("app.routes.downloads.spawn_download_task"):
        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client


@pytest_asyncio.fixture
async def async_client_with_tasks():
    """Create an async test client that allows background tasks to run."""
    test_app = _create_test_app()

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture
async def db_session():
    """Create a database session for direct DB access in tests."""
    engine = create_async_engine(TEST_DATABASE_URL)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def ready_download(db_session: AsyncSession):
    """Create a ready download with a dummy file for testing file serving."""
    download_id = uuid.uuid4()
    file_path = Path(settings.download_dir) / f"{download_id}.mp3"
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text("fake mp3 data for testing")

    download = Download(
        id=download_id,
        url="https://www.youtube.com/watch?v=testready11",
        title="Test Ready Song",
        format="audio",
        status="ready",
        file_path=str(file_path),
        created_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
    )
    db_session.add(download)
    await db_session.commit()
    await db_session.refresh(download)

    yield download

    # Cleanup
    if file_path.exists():
        file_path.unlink()
    await db_session.delete(download)
    await db_session.commit()


@pytest_asyncio.fixture
async def expired_download(db_session: AsyncSession):
    """Create an expired download with a file for cleanup testing."""
    download_id = uuid.uuid4()
    file_path = Path(settings.download_dir) / f"{download_id}.mp3"
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text("expired mp3 data")

    download = Download(
        id=download_id,
        url="https://www.youtube.com/watch?v=testexpire1",
        title="Expired Song",
        format="audio",
        status="ready",
        file_path=str(file_path),
        created_at=datetime.now(timezone.utc) - timedelta(hours=1),
        completed_at=datetime.now(timezone.utc) - timedelta(hours=1),
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=5),
    )
    db_session.add(download)
    await db_session.commit()
    await db_session.refresh(download)

    yield download

    # Cleanup
    if file_path.exists():
        file_path.unlink()
    await db_session.refresh(download)
    await db_session.delete(download)
    await db_session.commit()
