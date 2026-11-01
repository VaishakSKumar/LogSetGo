/** The 11-character video id from any common YouTube link, or null when it isn't one. */
export function parseYouTubeId(url: string): string | null {
  const m = /^(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})(?:[?&#/].*)?$/i.exec(url.trim());
  return m ? m[1] : null;
}

/** Muted, looping playback. YouTube only loops a single video when it is also its own playlist. */
export const youTubeEmbedUrl = (id: string) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&playsinline=1&rel=0`;
