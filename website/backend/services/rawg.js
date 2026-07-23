const { badge } = require("./providers");
const { findGameTrailer } = require("./youtube");
const RAWG_BASE = "https://api.rawg.io/api";
const PAGE_SIZE = 20;

async function rawgFetch(path, params = {}) {
  const url = new URL(`${RAWG_BASE}${path}`);

  url.searchParams.set("key", process.env.RAWG_API_KEY);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`RAWG request failed (${response.status}): ${body}`);
  }

  return response.json();
}

// RAWG's description_raw often concatenates multiple language
// translations back to back in the same field (English, then Spanish,
// then sometimes more) with no reliable delimiter between them. This
// drops any paragraph containing characters that essentially never show
// up in English text (ñ, á, ¿, etc.) — a targeted fix for the reported
// case, not a general-purpose language detector.
const NON_ENGLISH_CHARS = /[ñÑáéíóúÁÉÍÓÚ¿¡]/;

function englishOnlyDescription(rawText) {
  if (!rawText) return null;

  const paragraphs = rawText.split(/\n{2,}/);
  const englishParagraphs = paragraphs.filter((p) => !NON_ENGLISH_CHARS.test(p));

  const result = englishParagraphs.join("\n\n").trim();
  return result || rawText.trim(); // if everything got filtered out, fall back to the original rather than showing nothing
}

function normalizeGame(game) {
  const genreNames = (game.genres || []).map((g) => g.name);

  const hasSteam = (game.stores || []).some(
    (s) => s.store?.slug === "steam" || s.slug === "steam",
  );

  return {
    id: `game-${game.id}`,
    type: "game",
    tag: "Game",
    title: game.name,
    posterImage: game.background_image || "/mockImages/placeholder-poster.png",
    backdropImage:
      game.background_image_additional || game.background_image || null,
    genres: genreNames,
    genre: genreNames.join(" • "),
    date: game.released || "Unknown",
    duration: game.playtime ? `${game.playtime}h average` : "N/A",
    durationLabel: "Playtime",
    language: "English",
    source: "RAWG",
    description:
      englishOnlyDescription(game.description_raw) || "No description available for this title.",
    // Doubled to match TMDB's 0-10 scale — RAWG rates out of 5 natively,
    // and every other media type in the app is out of 10.
    score: game.rating ? Number((game.rating * 2).toFixed(1)) : null,
    platforms: (game.platforms || []).map((p) => p.platform.name),
    providers: hasSteam ? [badge("steam")] : [],
  };
}

function selectGameVideo(videos = []) {
  const selectedVideo = videos.find(
    (video) => video?.data?.max || video?.data?.["480"],
  );

  if (!selectedVideo) {
    return "";
  }

  return selectedVideo.data?.max || selectedVideo.data?.["480"] || "";
}

async function getGamePreviewUrl(id) {
  try {
    const data = await rawgFetch(`/games/${id}/movies`);

    return selectGameVideo(data.results || []);
  } catch (error) {
    console.warn(`Unable to load RAWG video for game ${id}:`, error.message);

    return "";
  }
}

async function getGameGenres() {
  const data = await rawgFetch("/genres");
  return data.results.map((g) => ({ id: g.slug, name: g.name }));
}

async function getPopularGames(page = 1) {
  const data = await rawgFetch("/games", {
    page,
    page_size: PAGE_SIZE,
    ordering: "-added",
  });

  return {
    items: data.results.map(normalizeGame),
    page,
    totalPages: Math.max(1, Math.ceil(data.count / PAGE_SIZE)),
  };
}

async function getGamesByGenre(genreSlug, page = 1) {
  const data = await rawgFetch("/games", {
    genres: genreSlug,
    page,
    page_size: PAGE_SIZE,
    ordering: "-added",
  });

  return {
    items: data.results.map(normalizeGame),
    page,
    totalPages: Math.max(1, Math.ceil(data.count / PAGE_SIZE)),
  };
}

async function searchGames(query, page = 1) {
  const data = await rawgFetch("/games", {
    search: query,
    page,
    page_size: PAGE_SIZE,
  });

  return {
    items: data.results.map(normalizeGame),
    page,
    totalPages: Math.max(1, Math.ceil(data.count / PAGE_SIZE)),
  };
}

async function getGameDetails(id) {
  const game = await rawgFetch(`/games/${id}`);

  let trailerKey = "";

  try {
    trailerKey = await findGameTrailer(game.name, game.released);
  } catch (error) {
    console.warn(
      `Unable to find a YouTube trailer for ${game.name}:`,
      error.message,
    );
  }

  const normalized = normalizeGame(game);

  normalized.trailerKey = trailerKey;

  return normalized;
}

module.exports = {
  getGameGenres,
  getPopularGames,
  getGamesByGenre,
  searchGames,
  getGameDetails,
};