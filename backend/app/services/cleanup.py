"""Periodic cleanup of expired downloads.

Runs every 5 minutes, finds downloads where expires_at < now() and status is "ready",
deletes their files from disk, and updates their status to "expired".
"""

import asyncio
import logging
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select, and_

from app.database import async_session
from app.models import Download

logger = logging.getLogger(__name__)


async def cleanup_expired_downloads() -> int:
    """Clean up expired downloads. Returns number of cleaned records."""
    now = datetime.now(timezone.utc)
    cleaned = 0

    async with async_session() as session:
        result = await session.execute(
            select(Download).where(
                and_(
                    Download.status == "ready",
                    Download.expires_at < now,
                )
            )
        )
        expired_downloads = result.scalars().all()

        for download in expired_downloads:
            # Delete file from disk
            if download.file_path:
                file_path = Path(download.file_path)
                if file_path.exists():
                    try:
                        file_path.unlink()
                        logger.info("Deleted expired file: %s", file_path)
                    except OSError as e:
                        logger.warning(
                            "Failed to delete file %s: %s", file_path, e
                        )

            # Update status
            download.status = "expired"
            cleaned += 1

        if cleaned:
            await session.commit()
            logger.info("Cleaned up %d expired download(s)", cleaned)

    return cleaned


async def cleanup_loop(interval_seconds: int = 300) -> None:
    """Run cleanup every interval_seconds (default: 5 minutes)."""
    logger.info(
        "Cleanup loop started (interval: %ds)", interval_seconds
    )
    while True:
        try:
            await cleanup_expired_downloads()
        except Exception:
            logger.exception("Error in cleanup loop")
        await asyncio.sleep(interval_seconds)
