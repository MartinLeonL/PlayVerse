const tmdb = require("./tmdb");
const rawg = require("./rawg");
const deezer = require("./deezer");

const POOL_PAGES = 20; // ~400-500 items per pool, depending on page size
const POOL_TTL_MS = 30 * 60 * 1000; // rebuilt at most every 30 min, so new releases eventually surface

// Keyed by "mediaType:genreId" ("all" when no genre) — each distinct
// combination gets its own cached pool, built lazily on first request.
const pools = new Map();

function poolKey(mediaType, genreId) {
  return `${mediaType}:${genreId ?? "all"}`;
}

function dedupe(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

async function buildMoviePool(genreId) {
  const pageNumbers = Array.from({ length: POOL_PAGES }, (_, i) => i + 1);
  const fetchPage = (page) =>
    genreId ? tmdb.getMoviesByGenre(genreId, page) : tmdb.getPopularMovies(page);

  const pages = await Promise.all(
    pageNumbers.map((page) =>
      fetchPage(page).catch((error) => {
        console.error(`Movie pool build error (page ${page}, genre ${genreId}):`, error.message);
        return { items: [] };
      }),
    ),
  );
  return dedupe(pages.flatMap((p) => p.items));
}

async function buildShowPool(genreId) {
  const pageNumbers = Array.from({ length: POOL_PAGES }, (_, i) => i + 1);
  const fetchPage = (page) =>
    genreId ? tmdb.getShowsByGenre(genreId, page) : tmdb.getPopularShows(page);

  const pages = await Promise.all(
    pageNumbers.map((page) =>
      fetchPage(page).catch((error) => {
        console.error(`Show pool build error (page ${page}, genre ${genreId}):`, error.message);
        return { items: [] };
      }),
    ),
  );
  return dedupe(pages.flatMap((p) => p.items));
}

async function buildGamePool(genreId) {
  const pageNumbers = Array.from({ length: POOL_PAGES }, (_, i) => i + 1);
  const fetchPage = (page) =>
    genreId ? rawg.getGamesByGenre(genreId, page) : rawg.getPopularGames(page);

  const pages = await Promise.all(
    pageNumbers.map((page) =>
      fetchPage(page).catch((error) => {
        console.error(`Game pool build error (page ${page}, genre ${genreId}):`, error.message);
        return { items: [] };
      }),
    ),
  );
  return dedupe(pages.flatMap((p) => p.items));
}

async function buildMusicPool(genreId) {
  // Deezer's chart endpoints take index/limit, not page numbers — page
  // through in batches of 25, same either way whether genre-scoped or not.
  const batchSize = 25;
  const indexes = Array.from({ length: POOL_PAGES }, (_, i) => i * batchSize);
  const fetchBatch = (index) =>
    genreId ? deezer.getTracksByGenre(genreId, batchSize, index) : deezer.getChartTracks(batchSize, index);

  const pages = await Promise.all(
    indexes.map((index) =>
      fetchBatch(index).catch((error) => {
        console.error(`Music pool build error (index ${index}, genre ${genreId}):`, error.message);
        return { items: [] };
      }),
    ),
  );
  return dedupe(pages.flatMap((p) => p.items));
}

const BUILDERS = {
  movie: buildMoviePool,
  show: buildShowPool,
  game: buildGamePool,
  music: buildMusicPool,
};

async function getPool(mediaType, genreId = null) {
  const key = poolKey(mediaType, genreId);
  let pool = pools.get(key);

  const isStale = !pool || Date.now() - pool.builtAt > POOL_TTL_MS;

  if (isStale) {
    const items = await BUILDERS[mediaType](genreId);
    pool = { items, builtAt: Date.now() };
    pools.set(key, pool);
  }

  return pool.items;
}

module.exports = { getPool };