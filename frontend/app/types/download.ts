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
  title: string;
  thumbnail: string;
  duration: string;
  format: DownloadFormat;
  quality: string;
  status: DownloadStatus;
  createdAt: string;
  filename?: string;
}

export interface CreateDownloadRequest {
  url: string;
  format: DownloadFormat;
  quality?: string;
}
