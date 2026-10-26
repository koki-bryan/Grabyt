import type { Download } from "~/types/download";
import type { PlaylistSummary } from "~/types/playlist";

interface AddTrackToPlaylistDialogProps {
  track: Download;
  playlists: PlaylistSummary[];
  onClose: () => void;
  onChoose: (playlistId: string) => Promise<void>;
}

export function AddTrackToPlaylistDialog({ track, playlists, onClose, onChoose }: AddTrackToPlaylistDialogProps) {
  return <div className="fixed inset-0 z-[60] flex items-end bg-black/70 p-4 backdrop-blur-sm sm:items-center sm:justify-center"><section role="dialog" aria-modal="true" aria-labelledby="playlist-picker-title" className="w-full max-w-md rounded-3xl border border-white/10 bg-player-panel p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 id="playlist-picker-title" className="text-lg font-bold text-player-text">Add to playlist</h2><p className="mt-1 truncate text-sm text-player-muted">{track.title ?? "Selected track"}</p></div><button onClick={onClose} aria-label="Close" className="text-xl leading-none text-player-muted hover:text-player-text">×</button></div>{playlists.length ? <div className="mt-5 max-h-72 overflow-y-auto rounded-xl border border-white/8">{playlists.map((playlist) => <button key={playlist.id} onClick={() => onChoose(playlist.id)} className="flex w-full items-center gap-3 border-b border-white/6 px-4 py-3 text-left last:border-0 hover:bg-white/[.04]"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-player-raised text-player-accent">♫</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-player-text">{playlist.name}</span><span className="mt-0.5 block text-xs text-player-muted">{playlist.track_count} tracks</span></span><span className="text-player-accent">+</span></button>)}</div> : <p className="mt-6 rounded-xl bg-player-raised p-4 text-sm leading-6 text-player-muted">Create a playlist first, then add tracks from your library or playlist detail.</p>}</section></div>;
}
