const { mapProviders } = require("./providers");

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

async function tmdbFetch(path, params = {}, retries = 2) {
  const url = new URL(`${TMDB_BASE}${path}`);

  url.searchParams.set("api_key", process.env.TMDB_API_KEY);
  url.searchParams.set("language", "en-US");

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`TMDB request failed (${response.status}): ${body}`);
      }

      return await response.json();
    } catch (error) {
      // Node's fetch throws a TypeError (not a plain Error) for
      // network-level failures like a connection reset — genuine HTTP
      // error responses (thrown above as a plain Error) aren't worth
      // retrying, but a stale reused connection usually succeeds on a
      // fresh attempt.
      const isNetworkError = error instanceof TypeError;
      const isLastAttempt = attempt === retries;

      if (!isNetworkError || isLastAttempt) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
}

function posterUrl(path) {
  return path
    ? `${TMDB_IMAGE_BASE}/w500${path}`
    : "/mockImages/placeholder-poster.png";
}

function backdropUrl(path, fallbackPosterPath) {
  if (path) return `${TMDB_IMAGE_BASE}/w1280${path}`;
  return posterUrl(fallbackPosterPath);
}

function selectYouTubeTrailer(videos = []) {
  const youtubeVideos = videos.filter(
    (video) =>
      video.site === "YouTube" &&
      typeof video.key === "string" &&
      video.key.trim(),
  );

  const selectedVideo =
    youtubeVideos.find(
      (video) => video.type === "Trailer" && video.official === true,
    ) ||
    youtubeVideos.find((video) => video.type === "Trailer") ||
    youtubeVideos.find(
      (video) => video.type === "Teaser" && video.official === true,
    ) ||
    youtubeVideos.find((video) => video.type === "Teaser") ||
    youtubeVideos[0];

  return selectedVideo?.key || "";
}

async function getTrailerKey(mediaType, id) {
  try {
    const data = await tmdbFetch(`/${mediaType}/${id}/videos`);

    return selectYouTubeTrailer(data.results || []);
  } catch (error) {
    console.error(`Unable to load TMDB ${mediaType} trailer:`, error.message);

    return "";
  }
}

// --- Genres (cached in memory, they basically never change) ---

let movieGenreCache = null;
let tvGenreCache = null;

async function getMovieGenreMap() {
  if (movieGenreCache) return movieGenreCache;

  const data = await tmdbFetch("/genre/movie/list");
  movieGenreCache = new Map(data.genres.map((g) => [g.id, g.name]));

  return movieGenreCache;
}

async function getTvGenreMap() {
  if (tvGenreCache) return tvGenreCache;

  const data = await tmdbFetch("/genre/tv/list");
  tvGenreCache = new Map(data.genres.map((g) => [g.id, g.name]));

  return tvGenreCache;
}

async function getMovieGenres() {
  const map = await getMovieGenreMap();
  return [...map.entries()].map(([id, name]) => ({ id, name }));
}

async function getTvGenres() {
  const map = await getTvGenreMap();
  return [...map.entries()].map(([id, name]) => ({ id, name }));
}

// --- Normalization ---

function normalizeMovie(movie, genreMap) {
  const genreNames = movie.genres
    ? movie.genres.map((g) => g.name)
    : (movie.genre_ids || []).map((id) => genreMap.get(id)).filter(Boolean);

  return {
    id: `movie-${movie.id}`,
    type: "movie",
    tag: "Movie",
    title: movie.title,
    posterImage: posterUrl(movie.poster_path),
    backdropImage: backdropUrl(movie.backdrop_path, movie.poster_path),
    genres: genreNames,
    genre: genreNames.join(" • "),
    date: movie.release_date || "Unknown",
    duration: movie.runtime
      ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
      : "N/A",
    durationLabel: "Runtime",
    language: (movie.original_language || "en").toUpperCase(),
    source: "TMDB",
    description: movie.overview || "No description available.",
    score: movie.vote_average ? Number(movie.vote_average.toFixed(1)) : null,
    providers: [],
  };
}

function normalizeShow(show, genreMap) {
  const genreNames = show.genres
    ? show.genres.map((g) => g.name)
    : (show.genre_ids || []).map((id) => genreMap.get(id)).filter(Boolean);

  const seasons = show.number_of_seasons;
  const episodeRuntime = Array.isArray(show.episode_run_time)
    ? show.episode_run_time[0]
    : null;

  return {
    id: `show-${show.id}`,
    type: "show",
    tag: "Series",
    title: show.name,
    posterImage: posterUrl(show.poster_path),
    backdropImage: backdropUrl(show.backdrop_path, show.poster_path),
    genres: genreNames,
    genre: genreNames.join(" • "),
    date: show.first_air_date || "Unknown",
    duration: seasons
      ? `${seasons} season${seasons === 1 ? "" : "s"}`
      : episodeRuntime
        ? `${episodeRuntime}m episodes`
        : "N/A",
    durationLabel: "Seasons",
    language: (show.original_language || "en").toUpperCase(),
    source: "TMDB",
    description: show.overview || "No description available.",
    score: show.vote_average ? Number(show.vote_average.toFixed(1)) : null,
    providers: [],
  };
}

async function getWatchProviders(mediaType, id) {
  try {
    const data = await tmdbFetch(`/${mediaType}/${id}/watch/providers`);
    const region = data.results?.US;

    if (!region) return [];

    const names = [
      ...(region.flatrate || []),
      ...(region.free || []),
      ...(region.ads || []),
    ].map((p) => p.provider_name);

    return mapProviders(names);
  } catch {
    return [];
  }
}

// --- Movies ---

async function getPopularMovies(page = 1) {
  const [data, genreMap] = await Promise.all([
    tmdbFetch("/movie/popular", { page }),
    getMovieGenreMap(),
  ]);

  return {
    items: data.results.map((m) => normalizeMovie(m, genreMap)),
    page: data.page,
    totalPages: data.total_pages,
  };
}

async function getMoviesByGenre(genreId, page = 1) {
  const [genreMap, data] = await Promise.all([
    getMovieGenreMap(),
    tmdbFetch("/discover/movie", {
      with_genres: genreId,
      page,
      sort_by: "popularity.desc",
    }),
  ]);

  return {
    items: data.results.map((m) => normalizeMovie(m, genreMap)),
    page: data.page,
    totalPages: data.total_pages,
  };
}

async function searchMovies(query, page = 1) {
  const [genreMap, data] = await Promise.all([
    getMovieGenreMap(),
    tmdbFetch("/search/movie", { query, page }),
  ]);

  return {
    items: data.results.map((m) => normalizeMovie(m, genreMap)),
    page: data.page,
    totalPages: data.total_pages,
  };
}

async function getMovieDetails(id) {
  const [movie, providers, trailerKey] = await Promise.all([
    tmdbFetch(`/movie/${id}`),
    getWatchProviders("movie", id),
    getTrailerKey("movie", id),
  ]);

  const normalized = normalizeMovie(movie, new Map());

  normalized.providers = providers;
  normalized.trailerKey = trailerKey;

  return normalized;
}

// --- TV Shows ---

async function getPopularShows(page = 1) {
  const [data, genreMap] = await Promise.all([
    tmdbFetch("/tv/popular", { page }),
    getTvGenreMap(),
  ]);

  return {
    items: data.results.map((s) => normalizeShow(s, genreMap)),
    page: data.page,
    totalPages: data.total_pages,
  };
}

async function getShowsByGenre(genreId, page = 1) {
  const [genreMap, data] = await Promise.all([
    getTvGenreMap(),
    tmdbFetch("/discover/tv", {
      with_genres: genreId,
      page,
      sort_by: "popularity.desc",
    }),
  ]);

  return {
    items: data.results.map((s) => normalizeShow(s, genreMap)),
    page: data.page,
    totalPages: data.total_pages,
  };
}

async function searchShows(query, page = 1) {
  const [genreMap, data] = await Promise.all([
    getTvGenreMap(),
    tmdbFetch("/search/tv", { query, page }),
  ]);

  return {
    items: data.results.map((s) => normalizeShow(s, genreMap)),
    page: data.page,
    totalPages: data.total_pages,
  };
}

async function getShowDetails(id) {
  const [show, providers, trailerKey] = await Promise.all([
    tmdbFetch(`/tv/${id}`),
    getWatchProviders("tv", id),
    getTrailerKey("tv", id),
  ]);

  const normalized = normalizeShow(show, new Map());

  normalized.providers = providers;
  normalized.trailerKey = trailerKey;

  return normalized;
}

module.exports = {
  getMovieGenres,
  getTvGenres,
  getPopularMovies,
  getMoviesByGenre,
  searchMovies,
  getMovieDetails,
  getPopularShows,
  getShowsByGenre,
  searchShows,
  getShowDetails,
};