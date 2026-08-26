import type { Download, DownloadStatus, DownloadFormat } from "~/types/download";
import { getDownloadFileUrl } from "~/services/api";

interface DownloadHistoryProps {
  downloads: Download[];
  isLoading: boolean;
  onPlay?: (download: Download) => void;
}

function StatusBadge({ status }: { status: DownloadStatus }) {
  const styles: Record<DownloadStatus, string> = {
    queued: "bg-yellow-100 text-yellow-700",
    downloading: "bg-blue-100 text-blue-700",
    ready: "bg-green-100 text-green-700",
    expired: "bg-gray-100 text-gray-500",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <span
      role="status"
      aria-label={`Status: ${status}`}
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function FormatBadge({ format }: { format: DownloadFormat }) {
  const styles: Record<DownloadFormat, string> = {
    audio: "bg-purple-100 text-purple-700",
    video: "bg-blue-100 text-blue-700",
  };

  return (
    <span
      aria-label={`Format: ${format}`}
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[format]}`}
    >
      {format === "audio" ? "Audio" : "Video"}
    </span>
  );
}

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin text-beige-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function PlayButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Play audio"
      className="inline-flex items-center justify-center rounded-full bg-beige-700 h-8 w-8 text-white transition hover:bg-beige-800 hover:scale-105"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    </button>
  );
}

function DownloadAction({
  download,
  onPlay,
}: {
  download: Download;
  onPlay?: (download: Download) => void;
}) {
  if (download.status === "ready") {
    return (
      <div className="flex items-center gap-2">
        {/* Play button for audio */}
        {download.format === "audio" && onPlay && (
          <PlayButton onClick={() => onPlay(download)} />
        )}
        {/* Download link */}
        <a
          href={getDownloadFileUrl(download.id)}
          download
          aria-label={`Download ${download.title}`}
          className="inline-flex items-center rounded-md bg-beige-100 px-3 py-1.5 text-xs font-medium text-beige-700 transition hover:bg-beige-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Save
        </a>
      </div>
    );
  }

  if (download.status === "downloading" || download.status === "queued") {
    return (
      <span aria-label="Download in progress">
        <Spinner />
      </span>
    );
  }

  return null;
}

function LoadingSkeleton() {
  return (
    <div
      className="space-y-3"
      aria-busy="true"
      aria-label="Loading download history"
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-lg border border-beige-200 bg-white p-4"
        >
          <div className="h-12 w-20 animate-pulse rounded bg-beige-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-beige-200" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-beige-100" />
          </div>
          <div className="h-6 w-16 animate-pulse rounded-full bg-beige-200" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-4xl" aria-hidden="true">
        📭
      </span>
      <p className="mt-3 text-sm text-beige-600">
        No downloads yet. Switch to the Download tab to get started!
      </p>
    </div>
  );
}

function DesktopTable({
  downloads,
  onPlay,
}: {
  downloads: Download[];
  onPlay?: (download: Download) => void;
}) {
  return (
    <div className="hidden overflow-hidden rounded-lg border border-beige-200 md:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-beige-200 bg-beige-100 text-xs uppercase text-beige-600">
          <tr>
            <th className="px-4 py-3">Thumbnail</th>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Duration</th>
            <th className="px-4 py-3">Format</th>
            <th className="px-4 py-3">Quality</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-beige-100">
          {downloads.map((download) => (
            <tr
              key={download.id}
              className="animate-fade-in transition hover:bg-beige-50"
            >
              <td className="px-4 py-3">
                {download.thumbnail ? (
                  <img
                    src={download.thumbnail}
                    alt={download.title}
                    className="h-auto w-20 rounded bg-beige-200 object-cover"
                  />
                ) : (
                  <div
                    className="h-12 w-20 rounded bg-beige-200"
                    aria-hidden="true"
                  />
                )}
              </td>
              <td className="px-4 py-3">
                <span className="block max-w-[200px] truncate font-medium text-gray-900">
                  {download.title}
                </span>
              </td>
              <td className="px-4 py-3 text-beige-600">{download.duration}</td>
              <td className="px-4 py-3">
                <FormatBadge format={download.format} />
              </td>
              <td className="px-4 py-3 text-beige-600">{download.quality}</td>
              <td className="px-4 py-3">
                <StatusBadge status={download.status} />
              </td>
              <td className="px-4 py-3">
                <DownloadAction download={download} onPlay={onPlay} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileCards({
  downloads,
  onPlay,
}: {
  downloads: Download[];
  onPlay?: (download: Download) => void;
}) {
  return (
    <div className="space-y-3 md:hidden">
      {downloads.map((download) => (
        <div
          key={download.id}
          className="animate-fade-in rounded-lg border border-beige-200 bg-white p-4"
        >
          <div className="flex gap-3">
            {download.thumbnail ? (
              <img
                src={download.thumbnail}
                alt={download.title}
                className="h-16 w-20 flex-shrink-0 rounded bg-beige-200 object-cover"
              />
            ) : (
              <div
                className="h-16 w-20 flex-shrink-0 rounded bg-beige-200"
                aria-hidden="true"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {download.title}
              </p>
              <p className="mt-0.5 text-xs text-beige-600">
                {download.duration}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <FormatBadge format={download.format} />
                <StatusBadge status={download.status} />
                <span className="text-xs text-beige-500">
                  {download.quality}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <DownloadAction download={download} onPlay={onPlay} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DownloadHistory({
  downloads,
  isLoading,
  onPlay,
}: DownloadHistoryProps) {
  if (isLoading && downloads.length === 0) {
    return <LoadingSkeleton />;
  }

  if (!isLoading && downloads.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      <DesktopTable downloads={downloads} onPlay={onPlay} />
      <MobileCards downloads={downloads} onPlay={onPlay} />
    </div>
  );
}
