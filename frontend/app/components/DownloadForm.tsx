import { useState } from "react";
import type { CreateDownloadRequest, DownloadFormat } from "~/types/download";

interface DownloadFormProps {
  onSubmit: (req: CreateDownloadRequest) => Promise<void>;
  isSubmitting: boolean;
}

const YOUTUBE_URL_REGEX =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)/;

export function DownloadForm({ onSubmit, isSubmitting }: DownloadFormProps) {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<DownloadFormat>("audio");
  const [quality, setQuality] = useState("720p");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!YOUTUBE_URL_REGEX.test(url)) {
      setError("Please enter a valid YouTube URL");
      return;
    }

    setError("");
    await onSubmit({
      url,
      format,
      quality: format === "video" ? quality : undefined,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm border border-beige-200 p-6"
    >
      {/* URL Input */}
      <div className="mb-4">
        <label htmlFor="youtube-url" className="sr-only">
          YouTube URL
        </label>
        <input
          id="youtube-url"
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError("");
          }}
          placeholder="Paste YouTube URL here..."
          className="w-full rounded-lg border border-beige-300 px-4 py-3 text-gray-900 placeholder:text-beige-400 focus:outline-none focus:ring-2 focus:ring-beige-400 focus:border-beige-400"
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? "url-error" : undefined}
        />
        {error && (
          <p id="url-error" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      {/* Format Toggle */}
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setFormat("audio")}
          className={`flex-1 rounded-lg py-2 px-4 font-medium transition-colors ${
            format === "audio"
              ? "bg-beige-700 text-white"
              : "bg-beige-100 text-beige-700"
          }`}
        >
          Audio
        </button>
        <button
          type="button"
          onClick={() => setFormat("video")}
          className={`flex-1 rounded-lg py-2 px-4 font-medium transition-colors ${
            format === "video"
              ? "bg-beige-700 text-white"
              : "bg-beige-100 text-beige-700"
          }`}
        >
          Video
        </button>
      </div>

      {/* Quality Selector */}
      {format === "video" && (
        <div className="mb-4">
          <label htmlFor="quality" className="sr-only">
            Video Quality
          </label>
          <select
            id="quality"
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            className="w-full rounded-lg border border-beige-300 px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-beige-400 focus:border-beige-400"
          >
            <option value="360p">360p</option>
            <option value="480p">480p</option>
            <option value="720p">720p</option>
            <option value="1080p">1080p</option>
          </select>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-beige-700 py-3 font-medium text-white hover:bg-beige-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Downloading..." : "Download"}
      </button>
    </form>
  );
}
