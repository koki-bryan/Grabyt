import re
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import Download
from app.schemas import DownloadCreate, DownloadResponse
from app.services.task_manager import spawn_download_task

router = APIRouter(prefix="/api/downloads", tags=["downloads"])


def _sanitize_filename(name: str, max_length: int = 100) -> str:
    """Remove special characters and limit filename length."""
    # Keep alphanumeric, spaces, hyphens, underscores
    sanitized = re.sub(r"[^\w\s\-]", "", name)
    # Collapse whitespace
    sanitized = re.sub(r"\s+", " ", sanitized).strip()
    # Truncate
    return sanitized[:max_length] if sanitized else "download"


def _media_type(file_path: Path) -> str:
    """Return the MIME type served for a completed download."""
    ext = file_path.suffix.lstrip(".").lower()
    if ext == "mp3":
        return "audio/mpeg"
    if ext == "mp4":
        return "video/mp4"
    return "application/octet-stream"


@router.post("", response_model=DownloadResponse, status_code=201)
async def create_download(
    payload: DownloadCreate,
    session: AsyncSession = Depends(get_session),
) -> Download:
    download = Download(
        url=payload.url,
        format=payload.format,
        quality=payload.quality,
        status="queued",
    )
    session.add(download)
    await session.commit()
    await session.refresh(download)

    # Spawn background download task (fire-and-forget)
    spawn_download_task(str(download.id))

    return download


@router.get("", response_model=list[DownloadResponse])
async def list_downloads(
    session: AsyncSession = Depends(get_session),
) -> list[Download]:
    result = await session.execute(
        select(Download).order_by(Download.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/{download_id}", response_model=DownloadResponse)
async def get_download(
    download_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> Download:
    download = await session.get(Download, download_id)
    if download is None:
        raise HTTPException(status_code=404, detail="Download not found")
    return download


@router.delete("/{download_id}", status_code=204)
async def delete_download(
    download_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    download = await session.get(Download, download_id)
    if download is None:
        raise HTTPException(status_code=404, detail="Download not found")

    # Delete file from disk if it exists
    if download.file_path:
        file_path = Path(download.file_path)
        if file_path.exists():
            file_path.unlink()

    # Delete the DB record
    await session.delete(download)
    await session.commit()


@router.get("/{download_id}/file")
async def get_download_file(
    download_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> FileResponse:
    download = await session.get(Download, download_id)
    if download is None:
        raise HTTPException(status_code=404, detail="Download not found")

    if download.status != "ready":
        raise HTTPException(
            status_code=404,
            detail=f"File not available (status: {download.status})",
        )

    if not download.file_path or not Path(download.file_path).exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    file_path = Path(download.file_path)
    media_type = _media_type(file_path)

    # Build a clean download filename
    title = _sanitize_filename(download.title or "download")
    filename = f"{title}.{file_path.suffix.lstrip('.')}"

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=filename,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )


@router.get("/{download_id}/stream")
async def stream_audio_download(
    download_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> FileResponse:
    """Serve a ready audio item inline for the browser's media player."""
    download = await session.get(Download, download_id)
    if download is None:
        raise HTTPException(status_code=404, detail="Download not found")
    if download.status != "ready":
        raise HTTPException(
            status_code=404,
            detail=f"File not available (status: {download.status})",
        )
    if download.format != "audio":
        raise HTTPException(status_code=415, detail="Only audio downloads can be streamed")
    if not download.file_path or not Path(download.file_path).exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    file_path = Path(download.file_path)
    title = _sanitize_filename(download.title or "download")
    filename = f"{title}.{file_path.suffix.lstrip('.')}"
    return FileResponse(
        path=file_path,
        media_type=_media_type(file_path),
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )
