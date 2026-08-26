import { useState, useCallback, useRef } from "react";
import type { Route } from "./+types/home";
import { useDownloads } from "~/hooks/useDownloads";
import { DownloadForm } from "~/components/DownloadForm";
import DownloadHistory from "~/components/DownloadHistory";
import { Toast } from "~/components/Toast";
import { AudioPlayer } from "~/components/AudioPlayer";
import type { Download } from "~/types/download";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "YT Grab - YouTube Downloader" },
    { name: "description", content: "Download YouTube videos and audio" },
  ];
}

type Tab = "download" | "history";

export default function Home() {
  const { downloads, isLoading, isSubmitting, error, submitDownload, clearError } =
    useDownloads();

  const [activeTab, setActiveTab] = useState<Tab>("download");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [playingTrack, setPlayingTrack] = useState<Download | null>(null);

  const handleSubmit = useCallback(
    async (req: Parameters<typeof submitDownload>[0]) => {
      try {
        await submitDownload(req);
        setToast({ message: "Download started!", type: "success" });
        // Switch to history tab so user can see progress
        setActiveTab("history");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Download failed. Please try again.";
        setToast({ message, type: "error" });
      }
    },
    [submitDownload]
  );

  const handlePlay = useCallback((download: Download) => {
    setPlayingTrack(download);
  }, []);

  const handleClosePlayer = useCallback(() => {
    setPlayingTrack(null);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  return (
    <div className="flex min-h-screen bg-beige-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-beige-200 bg-white">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-beige-200 px-5">
          <span className="text-xl font-bold text-beige-800">🎬 YT Grab</span>
        </div>

        {/* Nav tabs */}
        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setActiveTab("download")}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "download"
                    ? "bg-beige-100 text-beige-900"
                    : "text-beige-600 hover:bg-beige-50 hover:text-beige-800"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "history"
                    ? "bg-beige-100 text-beige-900"
                    : "text-beige-600 hover:bg-beige-50 hover:text-beige-800"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                History
                {downloads.length > 0 && (
                  <span className="ml-auto rounded-full bg-beige-200 px-2 py-0.5 text-xs text-beige-700">
                    {downloads.length}
                  </span>
                )}
              </button>
            </li>
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-beige-200 px-5 py-3">
          <p className="text-xs text-beige-400">YouTube Downloader</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center border-b border-beige-200 bg-white/80 px-8 backdrop-blur-sm">
          <h1 className="text-lg font-semibold text-beige-800">
            {activeTab === "download" ? "New Download" : "Download History"}
          </h1>
        </header>

        {/* Content */}
        <div className="flex-1 p-8">
          {error && (
            <div
              role="alert"
              className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between"
            >
              <span>{error}</span>
              <button
                onClick={clearError}
                aria-label="Dismiss error"
                className="text-red-500 hover:text-red-700 font-medium text-sm"
              >
                Dismiss
              </button>
            </div>
          )}

          {activeTab === "download" && (
            <div className="max-w-xl">
              <DownloadForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
            </div>
          )}

          {activeTab === "history" && (
            <DownloadHistory
              downloads={downloads}
              isLoading={isLoading}
              onPlay={handlePlay}
            />
          )}
        </div>

        {/* Audio player bar (sticky at bottom) */}
        {playingTrack && (
          <AudioPlayer track={playingTrack} onClose={handleClosePlayer} />
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-beige-200 bg-white md:hidden">
        <button
          onClick={() => setActiveTab("download")}
          className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
            activeTab === "download" ? "text-beige-800" : "text-beige-400"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
            activeTab === "history" ? "text-beige-800" : "text-beige-400"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          History
        </button>
      </nav>

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={dismissToast} />
      )}
    </div>
  );
}
