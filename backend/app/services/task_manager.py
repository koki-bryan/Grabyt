"""Background task manager with concurrency control.

Uses an asyncio.Semaphore to limit concurrent downloads to 3.
Tasks are spawned as fire-and-forget via asyncio.create_task and
references are held to prevent garbage collection.
"""

import asyncio
import logging
from datetime import datetime, timezone

from app.config import settings
from app.database import async_session
from app.models import Download
from app.services.downloader import download_with_metadata

logger = logging.getLogger(__name__)

# Concurrency control: max 3 simultaneous downloads
_semaphore = asyncio.Semaphore(3)

# Store task references to prevent GC
_active_tasks: set[asyncio.Task] = set()


async def process_download(download_id: str) -> None:
    """Process a single download: download file + extract metadata in one pass."""
    async with _semaphore:
        async with async_session() as session:
            download = await session.get(Download, download_id)
            if download is None:
                logger.error("Download %s not found in DB", download_id)
                return

            try:
                # Update status to downloading
                download.status = "downloading"
                await session.commit()

                # Single-pass download + metadata extraction
                logger.info(
                    "Downloading %s (%s, quality=%s)",
                    download.url,
                    download.format,
                    download.quality,
                )
                result = await download_with_metadata(
                    download_id=str(download.id),
                    url=download.url,
                    format=download.format,
                    quality=download.quality,
                    download_dir=settings.download_dir,
                )

                # Update record with metadata and file info
                now = datetime.now(timezone.utc)
                download.title = result.metadata.title
                download.thumbnail_url = result.metadata.thumbnail_url
                download.duration_seconds = result.metadata.duration_seconds
                download.file_path = result.file_path
                download.status = "ready"
                download.completed_at = now
                await session.commit()
                logger.info("Download %s complete: %s", download_id, result.file_path)

            except Exception as e:
                logger.exception("Download %s failed", download_id)
                download.status = "failed"
                download.error_message = str(e)[:1000]
                await session.commit()


def spawn_download_task(download_id: str) -> asyncio.Task:
    """Spawn a fire-and-forget download task.

    The task reference is stored in _active_tasks to prevent GC.
    """
    task = asyncio.create_task(
        process_download(download_id), name=f"download-{download_id}"
    )
    _active_tasks.add(task)
    task.add_done_callback(_active_tasks.discard)
    return task
