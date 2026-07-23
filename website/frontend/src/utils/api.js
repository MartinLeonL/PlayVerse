const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(path) {
  const response = await fetch(`${API_URL}${path}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

export function fetchMovies({ page = 1, genre, sort } = {}) {
  const params = new URLSearchParams({ page: String(page) });
  if (genre && genre !== "All") params.set("genre", genre);
  if (sort) params.set("sort", sort);

  return request(`/api/media/movies?${params.toString()}`);
}

export function fetchShows({ page = 1, genre, sort } = {}) {
  const params = new URLSearchParams({ page: String(page) });
  if (genre && genre !== "All") params.set("genre", genre);
  if (sort) params.set("sort", sort);

  return request(`/api/media/shows?${params.toString()}`);
}

export function fetchGames({ page = 1, genre, sort } = {}) {
  const params = new URLSearchParams({ page: String(page) });
  if (genre && genre !== "All") params.set("genre", genre);
  if (sort) params.set("sort", sort);

  return request(`/api/media/games?${params.toString()}`);
}

export function fetchMusic({ page = 1, genre, sort } = {}) {
  const params = new URLSearchParams({ page: String(page) });
  if (genre && genre !== "All") params.set("genre", genre);
  if (sort) params.set("sort", sort);

  return request(`/api/media/music?${params.toString()}`);
}

// Maps a nav key ("movies" | "shows" | "music" | "games") to its fetcher,
// so pages that work generically across categories don't need a switch.
export const CATEGORY_FETCHERS = {
  movies: fetchMovies,
  shows: fetchShows,
  music: fetchMusic,
  games: fetchGames,
};

export function fetchGenres(type) {
  return request(`/api/media/genres/${type}`);
}

export function searchMedia({ type, query, page = 1 }) {
  const params = new URLSearchParams({ type, query, page: String(page) });
  return request(`/api/media/search?${params.toString()}`);
}

export function fetchHero() {
  return request(`/api/media/hero`);
}

export function fetchMediaItem(type, id) {
  return request(`/api/media/item/${type}/${id}`);
}

export function fetchReviews(mediaId, mediaType) {
  const params = new URLSearchParams({ mediaType });
  return request(`/api/media/reviews/${encodeURIComponent(mediaId)}?${params.toString()}`);
}

// Our normalized IDs look like "movie-27205", "show-1399", "music-3135556",
// "game-3498". Splits that back into { type, sourceId }.
export function parseMediaId(id) {
  const [type, ...rest] = String(id).split("-");
  return { type, sourceId: rest.join("-") };
}

// Maps a singular media type ("movie") to the playlist category key
// ("movies") used by the backend's /api/auth/playlists endpoints.
export const PLAYLIST_CATEGORY_BY_TYPE = {
  movie: "movies",
  show: "shows",
  music: "music",
  game: "games",
};