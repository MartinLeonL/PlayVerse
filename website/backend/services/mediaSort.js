// Sorts a list of already-normalized media items (the {id, title, date,
// score, ...} shape shared by tmdb.js/rawg.js/deezer.js). Returns a new
// array — never mutates the one passed in.
//
// userScoreMap (from ratingsAggregate.js) is only needed for the two
// userScore* options — pass null/undefined for the others.
function sortItems(items, sort, userScoreMap) {
  const list = [...items];

  switch (sort) {
    case "az":
      list.sort((a, b) => a.title.localeCompare(b.title));
      break;

    case "za":
      list.sort((a, b) => b.title.localeCompare(a.title));
      break;

    case "recent":
      // date is an ISO-ish "YYYY-MM-DD" string (or "Unknown") — plain
      // string comparison sorts these correctly without parsing dates.
      list.sort((a, b) => String(b.date).localeCompare(String(a.date)));
      break;

    case "highest":
      // Missing scores go last, not first — a null score means "no
      // data," not "worst possible," so it shouldn't look like the
      // lowest-rated item on the list.
      list.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
      break;

    case "lowest":
      list.sort((a, b) => (a.score ?? Infinity) - (b.score ?? Infinity));
      break;

    case "userScoreDesc":
      list.sort((a, b) => {
        const scoreA = userScoreMap?.get(a.id)?.avg ?? -1;
        const scoreB = userScoreMap?.get(b.id)?.avg ?? -1;
        return scoreB - scoreA;
      });
      break;

    case "userScoreAsc":
      list.sort((a, b) => {
        const scoreA = userScoreMap?.get(a.id)?.avg ?? Infinity;
        const scoreB = userScoreMap?.get(b.id)?.avg ?? Infinity;
        return scoreA - scoreB;
      });
      break;

    case "trending":
    default:
      // Already in trending/popularity order — no re-sort needed.
      break;
  }

  return list;
}

module.exports = { sortItems };