"""yt-dlp subprocess download service.

Provides async functions to extract metadata and download media files
using yt-dlp as a subprocess.
"""

import asyncio
import json
import logging
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class MediaMetadata:
    title: str
    thumbnail_url: str | None
    duration_seconds: int | None


@dataclass
class DownloadResult:
    file_path: str
    metadata: MediaMetadata


async def extract_metadata(url: str) -> MediaMetadata:
    """Extract video metadata using yt-dlp --dump-json."""
    proc = await asyncio.create_subprocess_exec(
        "yt-dlp",
        "--dump-json",
        "--no-download",
        "--no-warnings",
        url,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()

    if proc.returncode != 0:
        error_msg = stderr.decode().strip()
        raise RuntimeError(f"yt-dlp metadata extraction failed: {error_msg}")

    info = json.loads(stdout.decode())
    return MediaMetadata(
        title=info.get("title", "Unknown"),
        thumbnail_url=info.get("thumbnail"),
        duration_seconds=info.get("duration"),
    )


async def download_media(
    download_id: str,
    url: str,
    format: str,
    quality: str | None,
    download_dir: str,
) -> str:
    """Download media using yt-dlp subprocess.

    Args:
        download_id: UUID string used as the output filename stem.
        url: YouTube URL to download.
        format: "audio" or "video".
        quality: For video, the max height (e.g. "720", "1080"). Ignored for audio.
        download_dir: Directory to save the file.

    Returns:
        The path to the downloaded file.
    """
    Path(download_dir).mkdir(parents=True, exist_ok=True)
    output_template = f"{download_dir}/{download_id}.%(ext)s"

    if format == "audio":
        cmd = [
            "yt-dlp",
            "-x",
            "--audio-format", "mp3",
            "-o", output_template,
            "--no-playlist",
            "--no-warnings",
            url,
        ]
        expected_ext = "mp3"
    else:
        # Video download with quality cap
        format_str = (
            f"bv*[height<={quality}]+ba/b[height<={quality}]"
            if quality
            else "bv*+ba/b"
        )
        cmd = [
            "yt-dlp",
            "-f", format_str,
            "--merge-output-format", "mp4",
            "-o", output_template,
            "--no-playlist",
            "--no-warnings",
            url,
        ]
        expected_ext = "mp4"

    logger.info("Running yt-dlp: %s", " ".join(cmd))

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()

    if proc.returncode != 0:
        error_msg = stderr.decode().strip() or stdout.decode().strip()
        raise RuntimeError(f"yt-dlp download failed: {error_msg}")

    # Find the actual output file (yt-dlp may have changed the extension)
    file_path = Path(download_dir) / f"{download_id}.{expected_ext}"
    if file_path.exists():
        return str(file_path)

    # Fallback: search for any file matching the download_id prefix
    for f in Path(download_dir).iterdir():
        if f.stem == download_id:
            return str(f)

    raise RuntimeError(
        f"Download completed but output file not found. "
        f"Expected: {file_path}"
    )
