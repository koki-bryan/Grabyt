import re
import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator

YOUTUBE_URL_RE = re.compile(
    r"^(https?://)?(www\.)?"
    r"(youtube\.com/(watch\?v=|shorts/|embed/)|youtu\.be/)"
    r"[\w\-]{11}"
)


class DownloadCreate(BaseModel):
    url: str
    format: str  # "audio" or "video"
    quality: str | None = None  # e.g. "720", "1080" for video; ignored for audio

    @field_validator("url")
    @classmethod
    def validate_youtube_url(cls, v: str) -> str:
        if not YOUTUBE_URL_RE.match(v):
            raise ValueError("Invalid YouTube URL")
        return v

    @field_validator("format")
    @classmethod
    def validate_format(cls, v: str) -> str:
        if v not in ("audio", "video"):
            raise ValueError("Format must be 'audio' or 'video'")
        return v


class DownloadResponse(BaseModel):
    id: uuid.UUID
    url: str
    title: str | None = None
    thumbnail_url: str | None = None
    duration_seconds: int | None = None
    format: str
    quality: str | None = None
    status: str
    error_message: str | None = None
    file_path: str | None = None
    created_at: datetime
    completed_at: datetime | None = None
    expires_at: datetime | None = None

    model_config = {"from_attributes": True}
