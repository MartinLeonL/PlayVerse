const { getDB } = require("../db");

// Computes the average PlayVerse user rating per media item, for one
// media type at a time. Ratings are stored 1-10 directly, matching the
// scale every other score in the app uses (TMDB, RAWG after
// normalization, etc.) — no conversion needed here anymore.
//
// Returns a Map<mediaId, { avg: number, count: number }>. An item with
// no ratings simply won't appear in the map at all — callers should
// treat a missing entry as "no data," not as a score of zero.
async function getUserScoreMap(mediaType) {
  const db = getDB();

  const pipeline = [
    { $unwind: "$ratings" },
    { $match: { "ratings.mediaType": mediaType } },
    {
      $group: {
        _id: "$ratings.mediaId",
        avg: { $avg: "$ratings.score" },
        count: { $sum: 1 },
      },
    },
  ];

  const rows = await db.collection("users").aggregate(pipeline).toArray();

  const map = new Map();
  for (const row of rows) {
    map.set(row._id, {
      // No doubling anymore — ratings are stored 1-10 directly now, not
      // 1-5 with a *2 display conversion.
      avg: Number(row.avg.toFixed(1)),
      count: row.count,
    });
  }

  return map;
}

// For a single item — used where computing the full per-category map
// would be wasteful (item detail, the small mixed-type hero list).
async function getUserScoreForItem(mediaId, mediaType) {
  const db = getDB();

  const pipeline = [
    { $unwind: "$ratings" },
    { $match: { "ratings.mediaId": mediaId, "ratings.mediaType": mediaType } },
    {
      $group: {
        _id: null,
        avg: { $avg: "$ratings.score" },
        count: { $sum: 1 },
      },
    },
  ];

  const rows = await db.collection("users").aggregate(pipeline).toArray();
  if (rows.length === 0) return null;

  return {
    avg: Number(rows[0].avg.toFixed(1)),
    count: rows[0].count,
  };
}

module.exports = { getUserScoreMap, getUserScoreForItem };