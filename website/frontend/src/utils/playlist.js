// Simple localStorage-backed playlist store, keyed by media id.
// Swap this out for real API calls once there's a backend.

const KEY = 'pv-playlist-ids'

export function getPlaylistIds() {
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveIds(ids) {
  window.localStorage.setItem(KEY, JSON.stringify(ids))
}

export function isInPlaylist(id) {
  return getPlaylistIds().includes(id)
}

export function addToPlaylist(id) {
  const ids = getPlaylistIds()
  if (!ids.includes(id)) saveIds([...ids, id])
}

export function removeFromPlaylist(id) {
  saveIds(getPlaylistIds().filter((existing) => existing !== id))
}

export function togglePlaylist(id) {
  const inPlaylist = isInPlaylist(id)
  if (inPlaylist) {
    removeFromPlaylist(id)
  } else {
    addToPlaylist(id)
  }
  return !inPlaylist
}