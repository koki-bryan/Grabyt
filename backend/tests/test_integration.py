"""Integration tests for the music download backend."""

import asyncio
from pathlib import Path

import pytest
from httpx import AsyncClient

from app.models import Download
from app.services.cleanup import cleanup_expired_downloads


pytestmark = pytest.mark.asyncio


class TestHealthEndpoint:
    async def test_health_check(self, async_client: AsyncClient):
        response = await async_client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestDownloadCRUD:
    async def test_create_download_valid_url(self, async_client: AsyncClient):
        response = await async_client.post(
            "/api/downloads",
            json={
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "format": "audio",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["url"] == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        assert data["format"] == "audio"
        assert data["status"] == "queued"
        assert data["id"] is not None

    async def test_create_download_invalid_url(self, async_client: AsyncClient):
        response = await async_client.post(
            "/api/downloads",
            json={
                "url": "https://example.com/not-youtube",
                "format": "audio",
            },
        )
        assert response.status_code == 422

    async def test_create_download_invalid_format(self, async_client: AsyncClient):
        response = await async_client.post(
            "/api/downloads",
            json={
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "format": "flac",
            },
        )
        assert response.status_code == 422

    async def test_create_download_video_with_quality(self, async_client: AsyncClient):
        response = await async_client.post(
            "/api/downloads",
            json={
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "format": "video",
                "quality": "720",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["format"] == "video"
        assert data["quality"] == "720"

    async def test_list_downloads(self, async_client: AsyncClient):
        response = await async_client.get("/api/downloads")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_get_download_by_id(self, async_client: AsyncClient):
        # Create one first
        create_resp = await async_client.post(
            "/api/downloads",
            json={
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "format": "audio",
            },
        )
        download_id = create_resp.json()["id"]

        # Get by ID
        response = await async_client.get(f"/api/downloads/{download_id}")
        assert response.status_code == 200
        assert response.json()["id"] == download_id

    async def test_get_download_not_found(self, async_client: AsyncClient):
        response = await async_client.get(
            "/api/downloads/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404


class TestFileServing:
    async def test_get_file_ready_download(
        self, async_client: AsyncClient, ready_download: Download
    ):
        response = await async_client.get(
            f"/api/downloads/{ready_download.id}/file"
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "audio/mpeg"
        assert "attachment" in response.headers["content-disposition"]
        assert "Test Ready Song.mp3" in response.headers["content-disposition"]

    async def test_get_file_not_found(self, async_client: AsyncClient):
        response = await async_client.get(
            "/api/downloads/00000000-0000-0000-0000-000000000000/file"
        )
        assert response.status_code == 404

    async def test_get_file_queued_download(self, async_client: AsyncClient):
        # Create a download (task spawning is mocked, so it stays "queued")
        create_resp = await async_client.post(
            "/api/downloads",
            json={
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "format": "audio",
            },
        )
        download_id = create_resp.json()["id"]

        # Try to get file (status is queued, not ready)
        response = await async_client.get(f"/api/downloads/{download_id}/file")
        assert response.status_code == 404
        assert "not available" in response.json()["detail"]


class TestCleanup:
    async def test_cleanup_expired_downloads(self, expired_download: Download):
        """Test that cleanup deletes expired files and updates status."""
        file_path = Path(expired_download.file_path)
        assert file_path.exists()

        cleaned = await cleanup_expired_downloads()
        assert cleaned >= 1

        # File should be deleted
        assert not file_path.exists()

    async def test_cleanup_does_not_touch_active(self, ready_download: Download):
        """Test that cleanup does not affect non-expired downloads."""
        file_path = Path(ready_download.file_path)
        assert file_path.exists()

        await cleanup_expired_downloads()

        # File should still exist
        assert file_path.exists()


class TestBackgroundTaskSpawning:
    async def test_post_triggers_background_task(
        self, async_client_with_tasks: AsyncClient
    ):
        """Test that POST spawns a background task that updates metadata."""
        response = await async_client_with_tasks.post(
            "/api/downloads",
            json={
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "format": "audio",
            },
        )
        assert response.status_code == 201
        download_id = response.json()["id"]

        # Wait for background task to process (metadata extraction)
        await asyncio.sleep(8)

        # Check that metadata was populated
        get_resp = await async_client_with_tasks.get(f"/api/downloads/{download_id}")
        data = get_resp.json()

        # Title should be populated (metadata was extracted)
        assert data["title"] is not None
        assert len(data["title"]) > 0
        # Status should be failed (since yt-dlp can't download in this env)
        # but metadata should still be there
        assert data["status"] in ("downloading", "failed", "ready")
