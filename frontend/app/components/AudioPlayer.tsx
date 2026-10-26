import { useCallback, useEffect, useRef, useState } from "react";
import type { Download } from "~/types/download";
import { getDownloadStreamUrl } from "~/services/api";

interface AudioPlayerProps {
  track: Download;
  queue: Download[];
  sourceLabel: string;
  onSelect: (track: Download) => void;
  onClose: () => void;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

export function AudioPlayer({ track, queue, sourceLabel, onSelect, onClose }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(track.duration_seconds ?? 0);
  const [volume, setVolume] = useState(0.85);
  const index = queue.findIndex((item) => item.id === track.id);
  const canGoBack = index > 0;
  const canGoForward = index >= 0 && index < queue.length - 1;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(0);
    setDuration(track.duration_seconds ?? 0);
    audio.volume = volume;
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    return () => audio.pause();
  }, [track.id]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    else { audio.pause(); setIsPlaying(false); }
  }, []);

  const changeTrack = useCallback((offset: number) => {
    const nextTrack = queue[index + offset];
    if (nextTrack) onSelect(nextTrack);
  }, [index, onSelect, queue]);

  const updateVolume = useCallback((value: number) => {
    setVolume(value);
    if (audioRef.current) audioRef.current.volume = value;
  }, []);

  const progress = duration ? Math.min((currentTime / duration) * 100, 100) : 0;
  return <aside className="fixed inset-x-0 bottom-14 z-50 border-t border-white/10 bg-player-dock/95 px-4 py-3 shadow-[0_-16px_45px_rgba(0,0,0,.26)] backdrop-blur-xl lg:bottom-0 lg:left-60">
    <audio ref={audioRef} src={getDownloadStreamUrl(track.id)} onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)} onLoadedMetadata={() => setDuration(audioRef.current?.duration || track.duration_seconds || 0)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => canGoForward ? changeTrack(1) : setIsPlaying(false)} preload="metadata" />
    <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 lg:grid-cols-[minmax(190px,1fr)_minmax(280px,1.4fr)_minmax(190px,1fr)]">
      <div className="flex min-w-0 items-center gap-3">
        {track.thumbnail_url ? <img src={track.thumbnail_url} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" /> : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-player-raised text-player-muted"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>}
        <div className="min-w-0"><p className="truncate text-sm font-semibold text-player-text">{track.title ?? "Unknown track"}</p><p className="mt-0.5 truncate text-xs text-player-muted">Playing from {sourceLabel}</p></div>
      </div>
      <div className="hidden min-w-0 lg:block">
        <div className="mb-2 flex items-center justify-center gap-4"><button onClick={() => changeTrack(-1)} disabled={!canGoBack} className="text-player-muted transition hover:text-player-text disabled:cursor-not-allowed disabled:opacity-30" aria-label="Previous track"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M6 6v12h2V6H6Zm3 6 9 6V6l-9 6Z"/></svg></button><button onClick={togglePlay} className="flex h-9 w-9 items-center justify-center rounded-full bg-player-text text-player-base transition hover:scale-105 hover:bg-player-accent" aria-label={isPlaying ? "Pause" : "Play"}>{isPlaying ? <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M7 5h3v14H7zm7 0h3v14h-3z"/></svg> : <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor"><path d="m8 5 11 7-11 7V5Z"/></svg>}</button><button onClick={() => changeTrack(1)} disabled={!canGoForward} className="text-player-muted transition hover:text-player-text disabled:cursor-not-allowed disabled:opacity-30" aria-label="Next track"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M16 6v12h2V6h-2Zm-10 6 9 6V6l-9 6Z"/></svg></button></div>
        <div className="flex items-center gap-2 text-[10px] tabular-nums text-player-muted"><span>{formatTime(currentTime)}</span><input type="range" min="0" max={duration || 0} step="0.1" value={currentTime} onChange={(event) => { const value = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = value; setCurrentTime(value); }} className="player-range h-1.5 flex-1" aria-label="Seek track" style={{ "--progress": `${progress}%` } as React.CSSProperties}/><span>{formatTime(duration)}</span></div>
      </div>
      <div className="flex items-center justify-end gap-3"><div className="hidden items-center gap-2 lg:flex"><svg viewBox="0 0 24 24" className="h-4 w-4 text-player-muted" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5Z"/><path d="M17 9a4 4 0 0 1 0 6"/></svg><input type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => updateVolume(Number(event.target.value))} className="player-range h-1.5 w-20" aria-label="Volume" style={{ "--progress": `${volume * 100}%` } as React.CSSProperties}/></div><button onClick={togglePlay} className="flex h-9 w-9 items-center justify-center rounded-full bg-player-text text-player-base lg:hidden" aria-label={isPlaying ? "Pause" : "Play"}>{isPlaying ? "Ⅱ" : "▶"}</button><button onClick={onClose} className="rounded-lg p-2 text-player-muted transition hover:bg-white/8 hover:text-player-text" aria-label="Close player"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>
    </div>
  </aside>;
}
