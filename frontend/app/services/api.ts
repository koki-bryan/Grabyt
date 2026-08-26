import type { CreateDownloadRequest, Download } from "~/types/download";

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

export function getDownloadFileUrl(id: string): string {
  return `${API_BASE}/downloads/${id}/file`;
}
