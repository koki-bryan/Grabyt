"""yt-dlp subprocess download service.

Provides async functions to extract metadata and download media files
using yt-dlp as a subprocess. Downloads and metadata extraction happen
in a single pass to avoid redundant YouTube requests.
"""

import asyncio
import json
import logging
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

# Common yt-dlp args to fix YouTube 403 errors
_YT_DLP_COMMON = [
    "--js-runtimes", "node",
    "--remote-components", "ejs:github",
    "--extractor-args", "youtube:player_client=mweb",
    "--no-playlist",
    "--no-warnings",
]


@dataclass
class MediaMetadata:
    title: str
    thumbnail_url: str | None
    duration_seconds: int | None


@dataclass
class DownloadResult:
    file_path: str
    metadata: MediaMetadata


async def download_with_metadata(
    download_id: str,
    url: str,
    format: str,
    quality: str | None,
    download_dir: str,
) -> DownloadResult:
    """Download media and extract metadata in a single yt-dlp pass.

    Uses --write-info-json to dump metadata alongside the downloaded file,
    eliminating the need for a separate metadata extraction call.

    Args:
        download_id: UUID string used as the output filename stem.
        url: YouTube URL to download.
        format: "audio" or "video".
        quality: For video, the max height (e.g. "720", "1080"). Ignored for audio.
        download_dir: Directory to save the file.

    Returns:
        DownloadResult containing file path and metadata.
    """
    Path(download_dir).mkdir(parents=True, exist_ok=True)
    output_template = f"{download_dir}/{download_id}.%(ext)s"

    if format == "audio":
        cmd = [
            "yt-dlp",
            "-x",
            "--audio-format", "mp3",
            "--write-info-json",
            "-o", output_template,
            *_YT_DLP_COMMON,
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
            "--write-info-json",
            "-o", output_template,
            *_YT_DLP_COMMON,
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

    # Find the actual output file
    file_path = Path(download_dir) / f"{download_id}.{expected_ext}"
    if not file_path.exists():
        # Fallback: search for any file matching the download_id prefix
        for f in Path(download_dir).iterdir():
            if f.stem == download_id and f.suffix != ".json":
                file_path = f
                break
        else:
            raise RuntimeError(
                f"Download completed but output file not found. "
                f"Expected: {file_path}"
            )

    # Parse metadata from the info.json file
    info_json_path = Path(download_dir) / f"{download_id}.info.json"
    metadata = MediaMetadata(title="Unknown", thumbnail_url=None, duration_seconds=None)

    if info_json_path.exists():
        try:
            info = json.loads(info_json_path.read_text())
            metadata = MediaMetadata(
                title=info.get("title", "Unknown"),
                thumbnail_url=info.get("thumbnail"),
                duration_seconds=info.get("duration"),
            )
        except (json.JSONDecodeError, OSError) as e:
            logger.warning("Failed to parse info.json: %s", e)
        finally:
            # Clean up the info.json file — we don't need it anymore
            try:
                info_json_path.unlink()
            except OSError:
                pass

    return DownloadResult(file_path=str(file_path), metadata=metadata)
