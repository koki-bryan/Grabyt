import type { CreateDownloadRequest, Download } from "~/types/download";
import type { CreatePlaylistRequest, Playlist, PlaylistSummary } from "~/types/playlist";

const API_BASE =
  (typeof window !== "undefined" && (window as any).__API_BASE__) || "/api";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message: string;
    try {
      const body = await response.json();
      message = body.message || body.error || response.statusText;
    } catch {
      message = response.statusText;
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function createDownload(
  req: CreateDownloadRequest
): Promise<Download> {
  const response = await fetch(`${API_BASE}/downloads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return handleResponse<Download>(response);
}

export async function getDownloads(): Promise<Download[]> {
  const response = await fetch(`${API_BASE}/downloads`);
  return handleResponse<Download[]>(response);
}

export async function deleteDownload(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/downloads/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete download');
  }
}

export function getDownloadFileUrl(id: string): string {
  return `${API_BASE}/downloads/${id}/file`;
}

export function getDownloadStreamUrl(id: string): string {
  return `${API_BASE}/downloads/${id}/stream`;
}

export async function getPlaylists(): Promise<PlaylistSummary[]> {
  return handleResponse<PlaylistSummary[]>(await fetch(`${API_BASE}/playlists`));
}

export async function getPlaylist(id: string): Promise<Playlist> {
  return handleResponse<Playlist>(await fetch(`${API_BASE}/playlists/${id}`));
}

export async function createPlaylist(req: CreatePlaylistRequest): Promise<Playlist> {
  return handleResponse<Playlist>(await fetch(`${API_BASE}/playlists`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req),
  }));
}

export async function updatePlaylist(id: string, name: string): Promise<Playlist> {
  return handleResponse<Playlist>(await fetch(`${API_BASE}/playlists/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
  }));
}

export async function deletePlaylist(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/playlists/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete playlist");
}

export async function addPlaylistTrack(playlistId: string, downloadId: string): Promise<Playlist> {
  return handleResponse<Playlist>(await fetch(`${API_BASE}/playlists/${playlistId}/tracks`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ download_id: downloadId }),
  }));
}

export async function removePlaylistTrack(playlistId: string, downloadId: string): Promise<Playlist> {
  return handleResponse<Playlist>(await fetch(`${API_BASE}/playlists/${playlistId}/tracks/${downloadId}`, { method: "DELETE" }));
}

export async function reorderPlaylistTracks(playlistId: string, downloadIds: string[]): Promise<Playlist> {
  return handleResponse<Playlist>(await fetch(`${API_BASE}/playlists/${playlistId}/tracks/order`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ download_ids: downloadIds }),
  }));
}
