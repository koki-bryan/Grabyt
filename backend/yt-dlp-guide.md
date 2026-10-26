# yt-dlp Guide

## Flags Used in This Project

| Flag                                            | Purpose                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `-x`                                            | Extract audio only (discards video stream)                                      |
| `--audio-format mp3`                            | Convert extracted audio to MP3                                                  |
| `-f "format_string"`                            | Select specific video/audio quality (see below)                                 |
| `--merge-output-format mp4`                     | Merge video+audio streams into an MP4 container                                 |
| `--write-info-json`                             | Save video metadata (title, thumbnail, duration) as a `.info.json` sidecar file |
| `-o "template"`                                 | Output filename template (`%(ext)s` = auto file extension)                      |
| `--js-runtimes node`                            | Use Node.js to solve YouTube's JS challenges (required for valid download URLs) |
| `--remote-components ejs:github`                | Download the JS challenge solver script from GitHub                             |
| `--extractor-args "youtube:player_client=mweb"` | Use the mobile web player API (avoids 403 errors with current YouTube anti-bot) |
| `--no-playlist`                                 | Download only the single video, not the entire playlist                         |
| `--no-warnings`                                 | Suppress non-critical warning messages                                          |

## Common Commands

### Download audio only (MP3)

```bash
yt-dlp -x --audio-format mp3 \
  --js-runtimes node \
  --remote-components ejs:github \
  --extractor-args "youtube:player_client=mweb" \
  --no-playlist \
  -o "%(title)s.%(ext)s" \
  "https://www.youtube.com/watch?v=VIDEO_ID"
```

Downloads the audio stream → converts to MP3 → saves as `<video title>.mp3`.

### Download video (highest quality)

```bash
yt-dlp -f "bv*+ba/b" \
  --merge-output-format mp4 \
  --js-runtimes node \
  --remote-components ejs:github \
  --extractor-args "youtube:player_client=mweb" \
  --no-playlist \
  -o "%(title)s.%(ext)s" \
  "https://www.youtube.com/watch?v=VIDEO_ID"
```

`bv*+ba/b` means: best video (any codec) + best audio, merged. Falls back to best single file if merging isn't possible.

### Download video (custom quality)

```bash
yt-dlp -f "bv*[height<=720]+ba/b[height<=720]" \
  --merge-output-format mp4 \
  --js-runtimes node \
  --remote-components ejs:github \
  --extractor-args "youtube:player_client=mweb" \
  --no-playlist \
  -o "%(title)s.%(ext)s" \
  "https://www.youtube.com/watch?v=VIDEO_ID"
```

Replace `720` with your desired max height: `480`, `1080`, `1440`, `2160` (4K).

## Format String Cheat Sheet

| Format                 | Meaning                                              |
| ---------------------- | ---------------------------------------------------- |
| `bv*+ba/b`             | Best video + best audio (highest available)          |
| `bv*[height<=1080]+ba` | Best video up to 1080p + best audio                  |
| `bv*[height<=720]+ba`  | Best video up to 720p + best audio                   |
| `ba`                   | Best audio only (native format, no conversion)       |
| `b`                    | Best single file (pre-merged, usually lower quality) |

## Tips

- **List available formats first:** `yt-dlp -F "URL"` shows all streams with their resolution, codec, and file size.
- **Keep original audio format** (faster, no transcode): replace `-x --audio-format mp3` with `-x` alone. You'll get `.webm` or `.m4a`.
- **Add metadata to MP3:** add `--embed-thumbnail --add-metadata` to embed cover art and tags.
- **Cookies for age-restricted content:** `--cookies-from-browser chrome` passes your browser login session.
