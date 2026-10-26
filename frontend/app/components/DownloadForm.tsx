import { useState } from "react";
import type { CreateDownloadRequest } from "~/types/download";

interface DownloadFormProps {
  onSubmit: (req: CreateDownloadRequest) => Promise<void>;
  isSubmitting: boolean;
}

const YOUTUBE_URL_REGEX =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)/;

export function DownloadForm({ onSubmit, isSubmitting }: DownloadFormProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!YOUTUBE_URL_REGEX.test(url)) {
      setError("Please enter a valid YouTube URL");
      return;
    }

    setError("");
    await onSubmit({ url, format: "audio" });
    setUrl("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-white/10 bg-player-panel p-5 shadow-2xl shadow-black/20 sm:p-7"
    >
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-player-accent/15 text-player-accent">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        </span>
        <div>
          <p className="text-sm font-semibold text-player-text">Add to your library</p>
          <p className="text-xs text-player-muted">MP3 audio from YouTube</p>
        </div>
      </div>
      <label htmlFor="youtube-url" className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-player-muted">YouTube link</label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="youtube-url"
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError("");
          }}
          placeholder="Paste a video or Shorts link"
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-player-raised px-4 py-3.5 text-sm text-player-text placeholder:text-player-muted outline-none transition focus:border-player-accent focus:ring-2 focus:ring-player-accent/25"
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? "url-error" : undefined}
        />
        <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-player-accent px-5 py-3.5 text-sm font-bold text-player-base transition hover:bg-player-accent-bright disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? "Adding…" : "Add music"}
          {!isSubmitting && <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>}
        </button>
      </div>
      {error && <p id="url-error" className="mt-3 text-sm text-red-300">{error}</p>}
      <p className="mt-4 text-xs leading-5 text-player-muted">Your link is queued immediately. You can keep browsing while Grabyt prepares the track.</p>
    </form>
  );
}
