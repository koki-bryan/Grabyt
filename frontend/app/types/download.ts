export type DownloadStatus =
  | "queued"
  | "downloading"
  | "ready"
  | "expired"
  | "failed";

export type DownloadFormat = "audio" | "video";

export interface Download {
  id: string;
  url: string;
  title: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  format: DownloadFormat;
  quality: string | null;
  status: DownloadStatus;
  error_message: string | null;
  file_path: string | null;
  created_at: string;
  completed_at: string | null;
  expires_at: string | null;
}

export interface CreateDownloadRequest {
  url: string;
  format: DownloadFormat;
  quality?: string;
}
