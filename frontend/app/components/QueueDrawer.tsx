import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Download } from "~/types/download";

interface QueueDrawerProps {
  queue: Download[];
  currentTrack: Download | null;
  sourceLabel: string;
  onClose: () => void;
  onSelect: (track: Download) => void;
  onReorder: (queue: Download[]) => void;
}

export function QueueDrawer({ queue, currentTrack, sourceLabel, onClose, onSelect, onReorder }: QueueDrawerProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const reorder = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const next = [...queue];
    const from = next.findIndex((track) => track.id === sourceId);
    const to = next.findIndex((track) => track.id === targetId);
    if (from < 0 || to < 0) return;
    next.splice(to, 0, next.splice(from, 1)[0]);
    onReorder(next);
  };
  const move = (index: number, offset: number) => {
    const target = queue[index + offset];
    if (target) reorder(queue[index].id, target.id);
  };

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={shouldReduceMotion ? undefined : { opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="fixed inset-0 z-[45] bg-black/45 backdrop-blur-[1px]"
      role="presentation"
    >
      <motion.aside
        initial={shouldReduceMotion ? false : { x: 28 }}
        animate={{ x: 0 }}
        exit={shouldReduceMotion ? undefined : { x: 28 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-white/10 bg-player-sidebar shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="queue-title"
      >
        <header className="flex items-start justify-between border-b border-white/8 px-5 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-player-accent">Now queued</p>
            <h2 id="queue-title" className="mt-1 text-xl font-black text-player-text">Play queue</h2>
            <p className="mt-1 text-xs text-player-muted">{queue.length} tracks · {sourceLabel}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-player-muted transition hover:bg-white/8 hover:text-player-text" aria-label="Close queue">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-3">
          {queue.length ? (
            <motion.ol layout transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: "easeOut" }}>
              {queue.map((track, index) => (
                <motion.li
                  layout
                  transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: "easeOut" }}
                  key={track.id}
                  draggable
                  onDragStart={() => setDraggedId(track.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => { if (draggedId) reorder(draggedId, track.id); setDraggedId(null); }}
                  className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-2 py-2.5 ${currentTrack?.id === track.id ? "bg-player-accent/10" : "hover:bg-white/[.04]"}`}
                >
                  <span className="cursor-grab select-none text-xs text-player-muted" aria-label="Drag to reorder">⠿</span>
                  {track.thumbnail_url ? (
                    <div className="flex min-w-0 items-center gap-3"><img src={track.thumbnail_url} alt="" className="h-10 w-10 rounded-lg object-cover" /><div className="min-w-0"><button onClick={() => onSelect(track)} className={`block w-full truncate text-left text-sm font-semibold ${currentTrack?.id === track.id ? "text-player-accent" : "text-player-text"}`}>{track.title ?? "Unknown track"}</button><p className="mt-0.5 text-xs text-player-muted">{currentTrack?.id === track.id ? "Playing now" : `${index + 1} in queue`}</p></div></div>
                  ) : (
                    <div className="flex min-w-0 items-center gap-3"><div className="h-10 w-10 rounded-lg bg-player-raised" /><div className="min-w-0"><button onClick={() => onSelect(track)} className="block w-full truncate text-left text-sm font-semibold text-player-text">{track.title ?? "Unknown track"}</button><p className="mt-0.5 text-xs text-player-muted">{index + 1} in queue</p></div></div>
                  )}
                  <div className="flex items-center"><button onClick={() => move(index, -1)} disabled={index === 0} className="rounded p-1.5 text-player-muted hover:bg-white/8 disabled:opacity-30" aria-label="Move up">↑</button><button onClick={() => move(index, 1)} disabled={index === queue.length - 1} className="rounded p-1.5 text-player-muted hover:bg-white/8 disabled:opacity-30" aria-label="Move down">↓</button></div>
                </motion.li>
              ))}
            </motion.ol>
          ) : <p className="px-4 py-12 text-center text-sm text-player-muted">Start a track or shuffle your library to fill the queue.</p>}
        </div>
      </motion.aside>
    </motion.div>
  );
}
