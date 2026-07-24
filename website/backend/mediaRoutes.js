const express = require("express");

const { getDB } = require("./db");
const tmdb = require("./services/tmdb");
const rawg = require("./services/rawg");
const deezer = require("./services/deezer");
const { getPool } = require("./services/mediaPool");
const { sortItems } = require("./services/mediaSort");
const { getUserScoreMap, getUserScoreForItem } = require("./services/ratingsAggregate");

const router = express.Router();

const PAGE_SIZE = 20;
const VALID_SORTS = new Set([
  "az",
  "za",
  "recent",
  "highest",
  "lowest",
  "userScoreAsc",
  "userScoreDesc",
]);

function parsePage(value) {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

// Attaches the PlayVerse community's own average rating to every item —
// separate from `score`, which is the external TMDB/RAWG rating. One
// aggregation query per call (not one per item), since every item here
// is the same media type.
async function attachUserScores(items, mediaType) {
  if (items.length === 0) return items;

  const userScoreMap = await getUserScoreMap(mediaType);

  return items.map((item) => {
    const stats = userScoreMap.get(item.id);
    return {
      ...item,
      userScore: stats ? stats.avg : null,
      userScoreCount: stats ? stats.count : 0,
    };
  });
}

// Shared by /movies, /shows, /games, /music — handles the sort=... path
// by pulling from the cached pool for that media type (and genre, if
// one's selected) and slicing the requested page out of the sorted
// result. Returns null if `sort` isn't one of the special values, so
// the caller falls through to its normal (genre-filtered or default
// popular) behavior.
async function trySortedResponse(mediaType, req) {
  const sort = req.query.sort;
  if (!VALID_SORTS.has(sort)) return null;

  const page = parsePage(req.query.page);
  const genreId = req.query.genre || null;
  const pool = await getPool(mediaType, genreId);

  // Needed either way now — for the sort itself when it's userScore-
  // based, and for attaching userScore to the response regardless of
  // which sort was actually requested. Computing it once here avoids a
  // second, redundant aggregation query.
  const userScoreMap = await getUserScoreMap(mediaType);

  const sorted = sortItems(pool, sort, userScoreMap);
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = sorted.slice(start, start + PAGE_SIZE);

  const items = pageItems.map((item) => {
    const stats = userScoreMap.get(item.id);
    return {
      ...item,
      userScore: stats ? stats.avg : null,
      userScoreCount: stats ? stats.count : 0,
    };
  });

  return {
    items,
    page,
    totalPages: Math.max(1, Math.ceil(sorted.length / PAGE_SIZE)),
  };
}

// GET /api/media/movies?page=1&genre=28  OR  ?sort=az|za|recent|highest|lowest|userScoreAsc|userScoreDesc
router.get("/movies", async (req, res, next) => {
  try {
    const sorted = await trySortedResponse("movie", req);
    if (sorted) return res.json(sorted);

    const page = parsePage(req.query.page);
    const result = req.query.genre
      ? await tmdb.getMoviesByGenre(req.query.genre, page)
      : await tmdb.getPopularMovies(page);

    result.items = await attachUserScores(result.items, "movie");
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/media/shows?page=1&genre=18  OR  ?sort=...
router.get("/shows", async (req, res, next) => {
  try {
    const sorted = await trySortedResponse("show", req);
    if (sorted) return res.json(sorted);

    const page = parsePage(req.query.page);
    const result = req.query.genre
      ? await tmdb.getShowsByGenre(req.query.genre, page)
      : await tmdb.getPopularShows(page);

    result.items = await attachUserScores(result.items, "show");
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/media/games?page=1&genre=action  OR  ?sort=...
router.get("/games", async (req, res, next) => {
  try {
    const sorted = await trySortedResponse("game", req);
    if (sorted) return res.json(sorted);

    const page = parsePage(req.query.page);
    const result = req.query.genre
      ? await rawg.getGamesByGenre(req.query.genre, page)
      : await rawg.getPopularGames(page);

    result.items = await attachUserScores(result.items, "game");
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/media/music?genre=132&page=1  OR  ?sort=...&page=1
//
// Deezer's chart/genre endpoints don't support real page-based
// pagination the way TMDB/RAWG do (getChartTracks/getTracksByGenre just
// return a fixed batch), so — like the sort=... path above — this pulls
// from the shared cached pool for "music" and slices out the requested
// page itself. That's what makes `totalPages` accurate and lets the
// frontend's infinite scroll on the Music page keep loading more pages,
// the same way it already does for Movies/Shows/Games.
router.get("/music", async (req, res, next) => {
  try {
    const sorted = await trySortedResponse("music", req);
    if (sorted) return res.json(sorted);

    const page = parsePage(req.query.page);
    const genreId = req.query.genre || null;
    const pool = await getPool("music", genreId);

    const start = (page - 1) * PAGE_SIZE;
    const pageItems = pool.slice(start, start + PAGE_SIZE);

    const items = await attachUserScores(pageItems, "music");

    res.json({
      items,
      page,
      totalPages: Math.max(1, Math.ceil(pool.length / PAGE_SIZE)),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/media/genres/:type   (type = movies | shows | games | music)
router.get("/genres/:type", async (req, res, next) => {
  try {
    const { type } = req.params;

    let genres;

    if (type === "movies") genres = await tmdb.getMovieGenres();
    else if (type === "shows") genres = await tmdb.getTvGenres();
    else if (type === "games") genres = await rawg.getGameGenres();
    else if (type === "music") genres = await deezer.getGenres();
    else return res.status(400).json({ message: "Invalid media type." });

    res.json({ genres });
  } catch (error) {
    next(error);
  }
});

const SEARCH_TYPE_TO_MEDIA_TYPE = {
  movies: "movie",
  shows: "show",
  games: "game",
  music: "music",
};

// GET /api/media/search?type=movies&query=star&page=1
router.get("/search", async (req, res, next) => {
  try {
    const { type, query } = req.query;
    const page = parsePage(req.query.page);

    if (!query || !query.trim()) {
      return res.json({ items: [], page: 1, totalPages: 1 });
    }

    let result;

    switch (type) {
      case "movies":
        result = await tmdb.searchMovies(query, page);
        break;
      case "shows":
        result = await tmdb.searchShows(query, page);
        break;
      case "games":
        result = await rawg.searchGames(query, page);
        break;
      case "music":
        result = await deezer.searchTracks(query);
        break;
      default:
        return res.status(400).json({ message: "Invalid media type." });
    }

    result.items = await attachUserScores(result.items, SEARCH_TYPE_TO_MEDIA_TYPE[type]);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/media/hero -> a handful of items for the homepage hero carousel
router.get("/hero", async (req, res, next) => {
  try {
    const [movies, shows, music, games] = await Promise.all([
      tmdb.getPopularMovies(1),
      tmdb.getPopularShows(1),
      deezer.getChartTracks(5),
      rawg.getPopularGames(1),
    ]);

    const rawItems = [
      movies.items[0],
      movies.items[1],
      shows.items[0],
      music.items[0],
      games.items[0],
    ].filter(Boolean);

    // Mixed media types in one small list — a per-item lookup here is
    // simpler than juggling four separate category maps for just 5 items.
    const items = await Promise.all(
      rawItems.map(async (item) => {
        const stats = await getUserScoreForItem(item.id, item.type);
        return {
          ...item,
          userScore: stats ? stats.avg : null,
          userScoreCount: stats ? stats.count : 0,
        };
      }),
    );

    res.json({ items });
  } catch (error) {
    next(error);
  }
});

// GET /api/media/reviews/:mediaId?mediaType=movie|show|game|music
// Public — anyone can read reviews, no login required. Only entries
// with actual written text count as a "review"; a bare star rating
// with no note still counts toward the average score (via
// ratingsAggregate.js) but isn't shown in this list.
router.get("/reviews/:mediaId", async (req, res, next) => {
  try {
    const { mediaId } = req.params;
    const mediaType = String(req.query.mediaType || "").trim();

    if (!mediaId || !mediaType) {
      return res.status(400).json({ message: "mediaId and mediaType are required." });
    }

    const db = getDB();

    const pipeline = [
      { $unwind: "$ratings" },
      {
        $match: {
          "ratings.mediaId": mediaId,
          "ratings.mediaType": mediaType,
          "ratings.note": { $ne: "" },
        },
      },
      { $sort: { "ratings.updatedAt": -1 } },
      {
        $project: {
          _id: 0,
          displayName: {
            $cond: {
              if: { $eq: ["$reviewDisplayPreference", "username"] },
              then: "$username",
              else: { $concat: ["$firstName", " ", "$lastName"] },
            },
          },
          score: "$ratings.score",
          note: "$ratings.note",
          updatedAt: "$ratings.updatedAt",
        },
      },
    ];

    const reviews = await db.collection("users").aggregate(pipeline).toArray();

    res.json({ reviews });
  } catch (error) {
    next(error);
  }
});

// GET /api/media/item/:type/:id   (type = movie | show | game | music)
router.get("/item/:type/:id", async (req, res, next) => {
  try {
    const { type, id } = req.params;

    let item;

    switch (type) {
      case "movie":
        item = await tmdb.getMovieDetails(id);
        break;
      case "show":
        item = await tmdb.getShowDetails(id);
        break;
      case "game":
        item = await rawg.getGameDetails(id);
        break;
      case "music":
        item = await deezer.getTrackDetails(id);
        break;
      default:
        return res.status(404).json({ message: "Media type not found." });
    }

    const stats = await getUserScoreForItem(item.id, type);
    const enrichedItem = {
      ...item,
      userScore: stats ? stats.avg : null,
      userScoreCount: stats ? stats.count : 0,
    };

    res.json({ item: enrichedItem });
  } catch (error) {
    next(error);
  }
});

module.exports = router;