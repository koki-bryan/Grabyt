import type { Download, DownloadStatus } from "~/types/download";
import { getDownloadFileUrl } from "~/services/api";

export type LibraryFilter = "all" | "ready" | "active" | "issues";
export type LibrarySort = "newest" | "title" | "longest";

interface DownloadHistoryProps {
  downloads: Download[];
  isLoading: boolean;
  query: string;
  filter: LibraryFilter;
  sort: LibrarySort;
  onQueryChange: (value: string) => void;
  onFilterChange: (value: LibraryFilter) => void;
  onSortChange: (value: LibrarySort) => void;
  onPlay?: (download: Download) => void;
  onDelete?: (download: Download) => void;
  onAddToPlaylist?: (download: Download) => void;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function StatusBadge({ status }: { status: DownloadStatus }) {
  const labels: Record<DownloadStatus, string> = { queued: "Queued", downloading: "Preparing", ready: "Ready", expired: "Expired", failed: "Failed" };
  const styles: Record<DownloadStatus, string> = { queued: "bg-player-accent/15 text-player-accent", downloading: "bg-sky-400/15 text-sky-300", ready: "bg-emerald-400/15 text-emerald-300", expired: "bg-white/8 text-player-muted", failed: "bg-red-400/15 text-red-300" };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${styles[status]}`}>{labels[status]}</span>;
}

function TrackArt({ download }: { download: Download }) {
  return download.thumbnail_url ? <img src={download.thumbnail_url} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" /> : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-player-raised text-player-muted" aria-hidden="true"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>;
}

function Actions({ download, onPlay, onDelete, onAddToPlaylist }: Pick<DownloadHistoryProps, "onPlay" | "onDelete" | "onAddToPlaylist"> & { download: Download }) {
  const label = download.title ?? "download";
  return <div className="flex items-center justify-end gap-1.5">
    {download.format === "audio" && download.status === "ready" && onPlay && <button onClick={() => onPlay(download)} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-player-text text-player-base transition hover:scale-105 hover:bg-player-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-player-accent" aria-label={`Play ${label}`}><svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z" /></svg></button>}
    {download.format === "audio" && download.status === "ready" && onAddToPlaylist && <button onClick={() => onAddToPlaylist(download)} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-player-muted transition hover:bg-player-accent/15 hover:text-player-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-player-accent" aria-label={`Add ${label} to a playlist`}><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 5v14M5 12h14"/><path d="M5 19h14"/></svg></button>}
    {download.status === "ready" && <a href={getDownloadFileUrl(download.id)} download className="inline-flex h-10 w-10 items-center justify-center rounded-full text-player-muted transition hover:bg-white/8 hover:text-player-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-player-accent" aria-label={`Save ${label}`}><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14"/></svg></a>}
    {onDelete && <button onClick={() => onDelete(download)} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-player-muted transition hover:bg-red-400/10 hover:text-red-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-player-accent" aria-label={`Delete ${label}`}><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"/></svg></button>}
  </div>;
}

function LibraryRow({ download, onPlay, onDelete, onAddToPlaylist }: Pick<DownloadHistoryProps, "onPlay" | "onDelete" | "onAddToPlaylist"> & { download: Download }) {
  return <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-white/6 px-3 py-3.5 transition hover:bg-white/[0.035] sm:grid-cols-[minmax(0,1fr)_92px_100px_156px] sm:gap-5 sm:px-5">
    <div className="flex min-w-0 items-center gap-3.5"><TrackArt download={download} /><div className="min-w-0"><p className="truncate text-sm font-semibold text-player-text">{download.title ?? "Fetching track details…"}</p><p className="mt-1 truncate text-xs text-player-muted">{download.format === "audio" ? "Music" : "Video archive"} · {formatDuration(download.duration_seconds)} · Added {formatDate(download.created_at)}</p></div></div>
    <div className="hidden sm:block"><StatusBadge status={download.status} /></div><p className="hidden text-xs text-player-muted sm:block">{download.format === "audio" ? "MP3 audio" : "MP4 video"}</p><Actions download={download} onPlay={onPlay} onDelete={onDelete} onAddToPlaylist={onAddToPlaylist} /><div className="col-span-2 flex items-center gap-2 sm:hidden"><StatusBadge status={download.status} /></div>
  </li>;
}

function LoadingState() {
  return <div className="space-y-3 rounded-3xl border border-white/8 bg-player-panel p-5" aria-busy="true" aria-label="Loading library">{[1, 2, 3, 4].map((item) => <div key={item} className="flex items-center gap-3"><div className="h-11 w-11 animate-pulse rounded-xl bg-white/8"/><div className="flex-1 space-y-2"><div className="h-3.5 w-1/3 animate-pulse rounded bg-white/8"/><div className="h-3 w-1/4 animate-pulse rounded bg-white/5"/></div></div>)}</div>;
}

export default function DownloadHistory(props: DownloadHistoryProps) {
  const { downloads, isLoading, query, filter, sort, onQueryChange, onFilterChange, onSortChange, onPlay, onDelete, onAddToPlaylist } = props;
  const readyCount = downloads.filter((item) => item.status === "ready" && item.format === "audio").length;
  if (isLoading && downloads.length === 0) return <LoadingState />;
  return <section aria-label="Music library">
    <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><p className="text-sm font-semibold text-player-text">{readyCount} ready {readyCount === 1 ? "track" : "tracks"}</p><p className="mt-1 text-sm text-player-muted">Everything you have saved, in one place.</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative block"><span className="sr-only">Search library</span><svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-player-muted" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search your library" className="w-full rounded-xl border border-white/10 bg-player-panel py-2.5 pl-9 pr-3 text-sm text-player-text outline-none placeholder:text-player-muted focus:border-player-accent sm:w-56" /></label><label className="sr-only" htmlFor="library-sort">Sort library</label><select id="library-sort" value={sort} onChange={(event) => onSortChange(event.target.value as LibrarySort)} className="rounded-xl border border-white/10 bg-player-panel px-3 py-2.5 text-sm text-player-text outline-none focus:border-player-accent"><option value="newest">Recently added</option><option value="title">Title A–Z</option><option value="longest">Longest first</option></select></div></div>
    <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Library filters">{([ ["all", "All"], ["ready", "Ready"], ["active", "In progress"], ["issues", "Needs attention"] ] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => onFilterChange(value)} className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-bold transition ${filter === value ? "bg-player-text text-player-base" : "bg-white/6 text-player-muted hover:bg-white/10 hover:text-player-text"}`}>{label}</button>)}</div>
    {downloads.length === 0 ? <div className="rounded-3xl border border-dashed border-white/15 bg-player-panel px-6 py-16 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-player-raised text-player-accent"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></span><h2 className="mt-4 text-base font-semibold text-player-text">Your library is waiting</h2><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-player-muted">Paste a YouTube link to add your first track. It will appear here as soon as it is ready.</p></div> : <div className="overflow-hidden rounded-3xl border border-white/8 bg-player-panel"><div className="hidden grid-cols-[minmax(0,1fr)_92px_100px_200px] gap-5 border-b border-white/8 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-player-muted sm:grid"><span>Track</span><span>Status</span><span>Format</span><span className="text-right">Actions</span></div><ul>{downloads.map((download) => <LibraryRow key={download.id} download={download} onPlay={onPlay} onDelete={onDelete} onAddToPlaylist={onAddToPlaylist} />)}</ul></div>}
  </section>;
}
