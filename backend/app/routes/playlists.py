import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_session
from app.models import Download, Playlist, PlaylistTrack
from app.schemas import (
    DownloadResponse,
    PlaylistCreate,
    PlaylistDetail,
    PlaylistSummary,
    PlaylistTrackCreate,
    PlaylistTrackOrder,
    PlaylistUpdate,
)

router = APIRouter(prefix="/api/playlists", tags=["playlists"])


_playlist_options = (
    selectinload(Playlist.tracks).selectinload(PlaylistTrack.download),
)


def _summary(playlist: Playlist) -> PlaylistSummary:
    ordered_tracks = sorted(playlist.tracks, key=lambda track: track.position)
    artwork_urls = [
        track.download.thumbnail_url
        for track in ordered_tracks
        if track.download.thumbnail_url
    ][:4]
    return PlaylistSummary(
        id=playlist.id,
        name=playlist.name,
        created_at=playlist.created_at,
        updated_at=playlist.updated_at,
        track_count=len(ordered_tracks),
        artwork_urls=artwork_urls,
    )


def _detail(playlist: Playlist) -> PlaylistDetail:
    summary = _summary(playlist)
    return PlaylistDetail(
        **summary.model_dump(),
        tracks=[
            DownloadResponse.model_validate(track.download)
            for track in sorted(playlist.tracks, key=lambda track: track.position)
        ],
    )


async def _get_playlist(session: AsyncSession, playlist_id: uuid.UUID) -> Playlist:
    result = await session.execute(
        select(Playlist)
        .where(Playlist.id == playlist_id)
        .options(*_playlist_options)
        .execution_options(populate_existing=True)
    )
    playlist = result.scalar_one_or_none()
    if playlist is None:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return playlist


@router.get("", response_model=list[PlaylistSummary])
async def list_playlists(
    session: AsyncSession = Depends(get_session),
) -> list[PlaylistSummary]:
    result = await session.execute(
        select(Playlist).options(*_playlist_options).order_by(Playlist.updated_at.desc())
    )
    return [_summary(playlist) for playlist in result.scalars().unique().all()]


@router.post("", response_model=PlaylistDetail, status_code=status.HTTP_201_CREATED)
async def create_playlist(
    payload: PlaylistCreate,
    session: AsyncSession = Depends(get_session),
) -> PlaylistDetail:
    playlist = Playlist(name=payload.name)
    session.add(playlist)
    await session.commit()
    return _detail(await _get_playlist(session, playlist.id))


@router.get("/{playlist_id}", response_model=PlaylistDetail)
async def get_playlist(
    playlist_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> PlaylistDetail:
    return _detail(await _get_playlist(session, playlist_id))


@router.patch("/{playlist_id}", response_model=PlaylistDetail)
async def update_playlist(
    playlist_id: uuid.UUID,
    payload: PlaylistUpdate,
    session: AsyncSession = Depends(get_session),
) -> PlaylistDetail:
    playlist = await _get_playlist(session, playlist_id)
    playlist.name = payload.name
    await session.commit()
    return _detail(await _get_playlist(session, playlist_id))


@router.delete("/{playlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_playlist(
    playlist_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    playlist = await _get_playlist(session, playlist_id)
    await session.delete(playlist)
    await session.commit()


@router.post("/{playlist_id}/tracks", response_model=PlaylistDetail)
async def add_playlist_track(
    playlist_id: uuid.UUID,
    payload: PlaylistTrackCreate,
    session: AsyncSession = Depends(get_session),
) -> PlaylistDetail:
    playlist = await _get_playlist(session, playlist_id)
    download = await session.get(Download, payload.download_id)
    if download is None:
        raise HTTPException(status_code=404, detail="Download not found")
    if download.format != "audio" or download.status != "ready":
        raise HTTPException(status_code=422, detail="Only ready audio tracks can be added")
    if any(track.download_id == download.id for track in playlist.tracks):
        raise HTTPException(status_code=409, detail="Track is already in this playlist")

    max_position = await session.scalar(
        select(func.coalesce(func.max(PlaylistTrack.position), -1)).where(
            PlaylistTrack.playlist_id == playlist.id
        )
    )
    playlist.tracks.append(
        PlaylistTrack(download=download, position=int(max_position) + 1)
    )
    playlist.updated_at = func.now()
    await session.commit()
    return _detail(await _get_playlist(session, playlist_id))


@router.delete("/{playlist_id}/tracks/{download_id}", response_model=PlaylistDetail)
async def remove_playlist_track(
    playlist_id: uuid.UUID,
    download_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> PlaylistDetail:
    playlist = await _get_playlist(session, playlist_id)
    track = next((item for item in playlist.tracks if item.download_id == download_id), None)
    if track is None:
        raise HTTPException(status_code=404, detail="Track is not in this playlist")
    remaining = sorted(
        (item for item in playlist.tracks if item is not track),
        key=lambda item: item.position,
    )
    await session.delete(track)
    await session.flush()
    for position, item in enumerate(remaining):
        item.position = position
    playlist.updated_at = func.now()
    await session.commit()
    return _detail(await _get_playlist(session, playlist_id))


@router.put("/{playlist_id}/tracks/order", response_model=PlaylistDetail)
async def reorder_playlist_tracks(
    playlist_id: uuid.UUID,
    payload: PlaylistTrackOrder,
    session: AsyncSession = Depends(get_session),
) -> PlaylistDetail:
    playlist = await _get_playlist(session, playlist_id)
    current_ids = [track.download_id for track in playlist.tracks]
    requested_ids = payload.download_ids
    if len(requested_ids) != len(set(requested_ids)) or set(requested_ids) != set(current_ids):
        raise HTTPException(status_code=422, detail="Track order must contain every playlist track exactly once")

    # Move all current positions out of the way before assigning consecutive values.
    # This keeps the unique playlist/position constraint valid on PostgreSQL.
    for index, track in enumerate(playlist.tracks):
        track.position = -(index + 1)
    await session.flush()
    tracks_by_download_id = {track.download_id: track for track in playlist.tracks}
    for position, download_id in enumerate(requested_ids):
        tracks_by_download_id[download_id].position = position
    playlist.updated_at = func.now()
    await session.commit()
    return _detail(await _get_playlist(session, playlist_id))
