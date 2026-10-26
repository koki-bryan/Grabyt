import type { Download } from "~/types/download";

export interface PlaylistSummary {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  track_count: number;
  artwork_urls: string[];
}

export interface Playlist extends PlaylistSummary {
  tracks: Download[];
}

export interface CreatePlaylistRequest {
  name: string;
}
