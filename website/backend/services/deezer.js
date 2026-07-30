const { badge } = require("./providers");
const { findMusicVideo } = require("./youtube");

const DEEZER_BASE = "https://api.deezer.com";

async function deezerFetch(path, params = {}) {
  const url = new URL(`${DEEZER_BASE}${path}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Deezer request failed (${response.status}): ${body}`);
  }

  return response.json();
}

function formatDuration(seconds) {
  if (seconds === undefined || seconds === null) return "N/A";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

function normalizeTrack(track) {
  return {
    id: `music-${track.id}`,
    type: "music",
    tag: "Song",
    title: track.title,
    artist: track.artist?.name || "Unknown Artist",
    posterImage:
      track.album?.cover_big ||
      track.album?.cover_medium ||
      "/mockImages/placeholder-poster.png",
    backdropImage: track.album?.cover_xl || track.album?.cover_big || null,
    genres: [],
    genre: track.album?.title || "Single",
    date: track.release_date || "Unknown",
    duration: formatDuration(track.duration),
    durationLabel: "Duration",
    language: "N/A",
    source: "Deezer",
    description: `"${track.title}" by ${
      track.artist?.name || "Unknown Artist"
    }, from the album ${track.album?.title || "Unknown Album"}.`,
    previewUrl: track.preview || null,
    externalUrl: track.link || null,
    youtubeVideoKey: null,
    providers: [badge("deezer")],
  };
}

function normalizeArtist(artist) {
  return {
    id: `artist-${artist.id}`,
    type: "artist",
    tag: "Artist",
    title: artist.name,
    posterImage:
      artist.picture_big ||
      artist.picture_medium ||
      "/mockImages/placeholder-poster.png",
    backdropImage: artist.picture_xl || artist.picture_big || null,
    genres: [],
    genre: artist.nb_album
      ? `${artist.nb_album} album${artist.nb_album === 1 ? "" : "s"}`
      : "Artist",
    date: "Unknown",
    duration: "N/A",
    durationLabel: "Duration",
    language: "N/A",
    source: "Deezer",
    description: `${artist.name} has ${(artist.nb_fan || 0).toLocaleString()} fans on Deezer.`,
    externalUrl: artist.link || null,
    providers: [badge("deezer")],
  };
}

async function searchArtists(query, limit = 25) {
  const data = await deezerFetch("/search/artist", { q: query, limit });

  return {
    items: data.data.map(normalizeArtist),
    page: 1,
    totalPages: 1,
  };
}

// A plain track/search result only ever carries its album's title, not
// a real genre — Deezer attaches genre info to the album, not the
// track. Only worth the extra round trip for a single-item detail
// lookup, not for a whole page of search/chart results.
async function getAlbumGenre(albumId) {
  if (!albumId) return null;
  const album = await deezerFetch(`/album/${albumId}`);
  return album.genres?.data?.[0]?.name || null;
}

async function getGenres() {
  const data = await deezerFetch("/genre");

  return data.data
    .filter((g) => g.id !== 0) // Deezer genre 0 is "All"
    .map((g) => ({ id: g.id, name: g.name }));
}

async function getChartTracks(limit = 30, index = 0) {
  const data = await deezerFetch("/chart/0/tracks", { limit, index });

  return {
    items: data.data.map(normalizeTrack),
    page: 1,
    totalPages: 1,
  };
}

async function getTracksByGenre(genreId, limit = 30, index = 0) {
  const data = await deezerFetch(`/chart/${genreId}/tracks`, { limit, index });

  return {
    items: data.data.map(normalizeTrack),
    page: 1,
    totalPages: 1,
  };
}

async function searchTracks(query, limit = 25) {
  const data = await deezerFetch("/search", { q: query, limit });

  return {
    items: data.data.map(normalizeTrack),
    page: 1,
    totalPages: 1,
  };
}

async function getTrackDetails(id) {
  const track = await deezerFetch(`/track/${id}`);

  const normalized = normalizeTrack(track);

  try {
    const realGenre = await getAlbumGenre(track.album?.id);
    if (realGenre) normalized.genre = realGenre;
  } catch (error) {
    console.warn(`Unable to load genre for track ${id}:`, error.message);
  }

  if (!normalized.previewUrl) {
    try {
      normalized.youtubeVideoKey = await findMusicVideo(
        track.title_short || track.title,
        track.artist?.name || "",
      );
    } catch (error) {
      console.warn(
        `Unable to find music video for ${track.title}:`,
        error.message,
      );
    }
  }

  return normalized;
}

module.exports = {
  getGenres,
  getChartTracks,
  getTracksByGenre,
  searchTracks,
  searchArtists,
  getTrackDetails,
};