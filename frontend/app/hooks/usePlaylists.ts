import { useCallback, useEffect, useState } from "react";
import type { Playlist, PlaylistSummary } from "~/types/playlist";
import {
  addPlaylistTrack, createPlaylist as apiCreatePlaylist, deletePlaylist as apiDeletePlaylist,
  getPlaylist, getPlaylists, removePlaylistTrack, reorderPlaylistTracks, updatePlaylist as apiUpdatePlaylist,
} from "~/services/api";

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await getPlaylists();
    setPlaylists(data);
    return data;
  }, []);

  useEffect(() => { refresh().catch(() => {}).finally(() => setIsLoading(false)); }, [refresh]);

  const replacePlaylist = useCallback((playlist: Playlist) => {
    setPlaylists((current) => {
      const summary: PlaylistSummary = { id: playlist.id, name: playlist.name, created_at: playlist.created_at, updated_at: playlist.updated_at, track_count: playlist.track_count, artwork_urls: playlist.artwork_urls };
      const exists = current.some((item) => item.id === playlist.id);
      return exists ? current.map((item) => item.id === playlist.id ? summary : item) : [summary, ...current];
    });
    return playlist;
  }, []);

  const create = useCallback(async (name: string) => replacePlaylist(await apiCreatePlaylist({ name })), [replacePlaylist]);
  const update = useCallback(async (id: string, name: string) => replacePlaylist(await apiUpdatePlaylist(id, name)), [replacePlaylist]);
  const addTrack = useCallback(async (id: string, downloadId: string) => replacePlaylist(await addPlaylistTrack(id, downloadId)), [replacePlaylist]);
  const removeTrack = useCallback(async (id: string, downloadId: string) => replacePlaylist(await removePlaylistTrack(id, downloadId)), [replacePlaylist]);
  const reorderTracks = useCallback(async (id: string, downloadIds: string[]) => replacePlaylist(await reorderPlaylistTracks(id, downloadIds)), [replacePlaylist]);
  const get = useCallback((id: string) => getPlaylist(id), []);
  const remove = useCallback(async (id: string) => { await apiDeletePlaylist(id); setPlaylists((current) => current.filter((item) => item.id !== id)); }, []);

  return { playlists, isLoading, refresh, get, create, update, remove, addTrack, removeTrack, reorderTracks };
}
