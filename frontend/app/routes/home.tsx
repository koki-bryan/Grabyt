import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Route } from "./+types/home";
import { useDownloads } from "~/hooks/useDownloads";
import { DownloadForm } from "~/components/DownloadForm";
import DownloadHistory, { type LibraryFilter, type LibrarySort } from "~/components/DownloadHistory";
import { Toast } from "~/components/Toast";
import { AudioPlayer } from "~/components/AudioPlayer";
import Playlists from "~/components/Playlists";
import { AddTrackToPlaylistDialog } from "~/components/AddTrackToPlaylistDialog";
import { QueueDrawer } from "~/components/QueueDrawer";
import type { Download } from "~/types/download";
import { usePlaylists } from "~/hooks/usePlaylists";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Grabyt — Personal music library" }, { name: "description", content: "Download music and play it from your personal library" }];
}

type View = "add" | "library" | "playlists";

function NavIcon({ name }: { name: View }) {
  if (name === "add") return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>;
  if (name === "playlists") return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/><circle cx="19" cy="18" r="1.5" fill="currentColor"/></svg>;
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
}

function DeleteDialog({ track, onCancel, onConfirm }: { track: Download; onCancel: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-[60] flex items-end bg-black/70 p-4 backdrop-blur-sm sm:items-center sm:justify-center" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-md rounded-3xl border border-white/10 bg-player-panel p-6 shadow-2xl">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-400/12 text-red-300"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"/></svg></span>
      <h2 id="delete-title" className="mt-4 text-lg font-bold text-player-text">Remove from library?</h2><p className="mt-2 text-sm leading-6 text-player-muted"><span className="font-semibold text-player-text">{track.title ?? "This item"}</span> and its downloaded file will be permanently removed.</p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={onCancel} className="rounded-xl px-4 py-2.5 text-sm font-bold text-player-text transition hover:bg-white/8">Keep track</button><button onClick={onConfirm} className="rounded-xl bg-red-400 px-4 py-2.5 text-sm font-bold text-player-base transition hover:bg-red-300">Remove track</button></div>
    </section>
  </div>;
}

export default function Home() {
  const { downloads, isLoading, isSubmitting, error, submitDownload, removeDownload, clearError } = useDownloads();
  const playlistApi = usePlaylists();
  const [activeView, setActiveView] = useState<View>("add");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [sort, setSort] = useState<LibrarySort>("newest");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [playingTrack, setPlayingTrack] = useState<Download | null>(null);
  const [playbackQueue, setPlaybackQueue] = useState<Download[]>([]);
  const [playbackSource, setPlaybackSource] = useState("your library");
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Download | null>(null);
  const [trackForPlaylist, setTrackForPlaylist] = useState<Download | null>(null);

  const library = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = downloads.filter((item) => {
      const matchesQuery = !normalizedQuery || (item.title ?? "").toLowerCase().includes(normalizedQuery);
      const matchesFilter = filter === "all" || (filter === "ready" && item.status === "ready") || (filter === "active" && (item.status === "queued" || item.status === "downloading")) || (filter === "issues" && (item.status === "failed" || item.status === "expired"));
      return matchesQuery && matchesFilter;
    });
    return [...filtered].sort((a, b) => {
      if (sort === "title") return (a.title ?? "").localeCompare(b.title ?? "");
      if (sort === "longest") return (b.duration_seconds ?? 0) - (a.duration_seconds ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [downloads, filter, query, sort]);

  const queue = useMemo(() => library.filter((item) => item.format === "audio" && item.status === "ready"), [library]);
  const readyAudioCount = downloads.filter((item) => item.format === "audio" && item.status === "ready").length;

  const handleSubmit = useCallback(async (request: Parameters<typeof submitDownload>[0]) => {
    try { await submitDownload(request); setToast({ message: "Track added to your queue", type: "success" }); setActiveView("library"); }
    catch (err) { setToast({ message: err instanceof Error ? err.message : "Couldn’t add that track. Try again.", type: "error" }); }
  }, [submitDownload]);

  const playFromLibrary = useCallback((track: Download) => {
    setPlaybackQueue(queue);
    setPlaybackSource("your library");
    setPlayingTrack(track);
  }, [queue]);

  const playFromPlaylist = useCallback((track: Download, playlistQueue: Download[], playlistName: string) => {
    setPlaybackQueue(playlistQueue);
    setPlaybackSource(playlistName);
    setPlayingTrack(track);
  }, []);

  const shuffleLibrary = useCallback(() => {
    const shuffled = [...queue];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const replacement = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[replacement]] = [shuffled[replacement], shuffled[index]];
    }
    if (!shuffled.length) return;
    setPlaybackQueue(shuffled);
    setPlaybackSource("shuffled library");
    setPlayingTrack(shuffled[0]);
    setIsQueueOpen(true);
  }, [queue]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    try {
      await removeDownload(pendingDelete.id);
      if (playingTrack?.id === pendingDelete.id) setPlayingTrack(null);
      setPlaybackQueue((current) => current.filter((track) => track.id !== pendingDelete.id));
      playlistApi.refresh().catch(() => {});
      setToast({ message: "Removed from your library", type: "success" });
    } catch { setToast({ message: "Couldn’t remove that track", type: "error" }); }
    finally { setPendingDelete(null); }
  }, [pendingDelete, playingTrack?.id, playlistApi, removeDownload]);
  const shouldReduceMotion = useReducedMotion();

  return <div className="min-h-screen bg-player-base text-player-text">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/8 bg-player-sidebar px-3 py-5 lg:flex">
      <div className="flex items-center gap-3 px-3"><img src="/icon/grabyt.jpeg" alt="Grabyt logo" className="h-9 w-9 rounded-xl object-cover"/><div><p className="text-sm font-black tracking-tight text-player-text">GRABYT</p><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-player-muted">Personal library</p></div></div>
      <nav className="mt-10 space-y-1" aria-label="Main navigation">{([ ["add", "Add music"], ["library", "Library"], ["playlists", "Playlists"] ] as const).map(([view, label]) => <button key={view} onClick={() => setActiveView(view)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${activeView === view ? "bg-white/10 text-player-text" : "text-player-muted hover:bg-white/5 hover:text-player-text"}`}><NavIcon name={view}/><span>{label}</span>{view === "library" && readyAudioCount > 0 && <span className="ml-auto rounded-full bg-player-accent/15 px-2 py-0.5 text-[10px] font-bold text-player-accent">{readyAudioCount}</span>}</button>)}</nav>
      <div className="mt-auto rounded-2xl border border-white/8 bg-white/[0.035] p-4"><p className="text-xs font-semibold text-player-text">Your space, your music.</p><p className="mt-1 text-xs leading-5 text-player-muted">Nothing to sign in to. Grabyt keeps the flow simple.</p></div>
    </aside>
    <main className={`min-h-screen pb-24 lg:ml-60 ${playingTrack ? "lg:pb-28" : ""}`}>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/8 bg-player-base/85 px-5 backdrop-blur-xl sm:px-8"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-player-muted">Grabyt</p><h1 className="mt-0.5 text-base font-bold text-player-text">{activeView === "add" ? "Add music" : activeView === "library" ? "Your library" : "Playlists"}</h1></div><span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-semibold text-player-muted">{readyAudioCount} ready</span></header>
      <AnimatePresence initial={false} mode="wait"><motion.div key={activeView} initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }} className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        {error && <div role="alert" className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"><span>{error}</span><button onClick={clearError} className="shrink-0 font-bold text-red-100 hover:text-white">Dismiss</button></div>}
        {activeView === "add" ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,.9fr)] lg:items-center"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-player-accent">A calmer way to collect music</p><h2 className="mt-4 max-w-xl text-4xl font-black leading-[1.02] tracking-[-0.04em] text-player-text sm:text-6xl">Build the library you actually listen to.</h2><p className="mt-5 max-w-lg text-base leading-7 text-player-muted">Paste a YouTube link and Grabyt turns it into a ready-to-play MP3. No account, no clutter, no detours.</p><div className="mt-8 flex gap-7"><div><p className="text-2xl font-black text-player-text">MP3</p><p className="mt-1 text-xs text-player-muted">Audio-first downloads</p></div><div className="border-l border-white/10 pl-7"><p className="text-2xl font-black text-player-text">{readyAudioCount}</p><p className="mt-1 text-xs text-player-muted">Ready in your library</p></div></div></div><DownloadForm onSubmit={handleSubmit} isSubmitting={isSubmitting}/></div>
        ) : activeView === "library" ? (
          <DownloadHistory downloads={library} isLoading={isLoading} query={query} filter={filter} sort={sort} onQueryChange={setQuery} onFilterChange={setFilter} onSortChange={setSort} onPlay={playFromLibrary} onDelete={setPendingDelete} onAddToPlaylist={setTrackForPlaylist} onShuffle={shuffleLibrary}/>
        ) : (
          <Playlists playlists={playlistApi.playlists} isLoading={playlistApi.isLoading} availableTracks={downloads.filter((track) => track.format === "audio" && track.status === "ready")} onGet={playlistApi.get} onCreate={playlistApi.create} onRename={playlistApi.update} onDelete={playlistApi.remove} onAddTrack={playlistApi.addTrack} onRemoveTrack={playlistApi.removeTrack} onReorder={playlistApi.reorderTracks} onPlay={playFromPlaylist} onNotice={(message, type = "success") => setToast({ message, type })}/>
        )}
      </motion.div></AnimatePresence>
    </main>
    <AnimatePresence>{playingTrack && <AudioPlayer track={playingTrack} queue={playbackQueue} sourceLabel={playbackSource} onSelect={setPlayingTrack} onOpenQueue={() => setIsQueueOpen(true)} onClose={() => { setPlayingTrack(null); setIsQueueOpen(false); }} />}</AnimatePresence>
    <AnimatePresence>{isQueueOpen && <QueueDrawer queue={playbackQueue} currentTrack={playingTrack} sourceLabel={playbackSource} onClose={() => setIsQueueOpen(false)} onSelect={setPlayingTrack} onReorder={setPlaybackQueue} />}</AnimatePresence>
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/10 bg-player-sidebar/95 px-2 py-2 backdrop-blur-xl lg:hidden" aria-label="Mobile navigation">{([ ["add", "Add"], ["library", "Library"], ["playlists", "Playlists"] ] as const).map(([view, label]) => <button key={view} onClick={() => setActiveView(view)} className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-bold ${activeView === view ? "text-player-accent" : "text-player-muted"}`}><NavIcon name={view}/>{label}</button>)}</nav>
    {pendingDelete && <DeleteDialog track={pendingDelete} onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete}/>} {trackForPlaylist && <AddTrackToPlaylistDialog track={trackForPlaylist} playlists={playlistApi.playlists} onClose={() => setTrackForPlaylist(null)} onChoose={async (playlistId) => { try { await playlistApi.addTrack(playlistId, trackForPlaylist.id); setToast({ message: "Added to playlist", type: "success" }); setTrackForPlaylist(null); } catch (err) { setToast({ message: err instanceof Error ? err.message : "Couldn’t add track", type: "error" }); } }} />} <AnimatePresence>{toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}</AnimatePresence>
  </div>;
}
