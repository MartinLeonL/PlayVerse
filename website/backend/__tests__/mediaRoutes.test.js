const express = require("express");
const request = require("supertest");

jest.mock("../db");
jest.mock("../services/tmdb");
jest.mock("../services/rawg");
jest.mock("../services/deezer");
jest.mock("../services/mediaPool");
jest.mock("../services/mediaSort");
jest.mock("../services/ratingsAggregate");

const { getDB } = require("../db");
const tmdb = require("../services/tmdb");
const rawg = require("../services/rawg");
const deezer = require("../services/deezer");
const { getPool } = require("../services/mediaPool");
const { sortItems } = require("../services/mediaSort");
const {
  getUserScoreMap,
  getUserScoreForItem,
} = require("../services/ratingsAggregate");

const mediaRoutes = require("../mediaRoutes");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/media", mediaRoutes);
  return app;
}

const app = buildApp();

beforeEach(() => {
  jest.clearAllMocks();
  getUserScoreMap.mockResolvedValue(new Map());
  getUserScoreForItem.mockResolvedValue(null);
});

describe("GET /api/media/movies", () => {
  it("fetches popular movies when no genre or sort is given", async () => {
    tmdb.getPopularMovies.mockResolvedValue({
      items: [{ id: "movie-1", title: "A" }],
      page: 1,
      totalPages: 5,
    });

    const response = await request(app).get("/api/media/movies");

    expect(response.status).toBe(200);
    expect(tmdb.getPopularMovies).toHaveBeenCalledWith(1);
    expect(tmdb.getMoviesByGenre).not.toHaveBeenCalled();
    expect(response.body.items[0]).toMatchObject({
      id: "movie-1",
      userScore: null,
      userScoreCount: 0,
    });
  });

  it("fetches by genre when a genre is given", async () => {
    tmdb.getMoviesByGenre.mockResolvedValue({ items: [], page: 1, totalPages: 1 });

    await request(app).get("/api/media/movies?genre=28&page=2");

    expect(tmdb.getMoviesByGenre).toHaveBeenCalledWith("28", 2);
    expect(tmdb.getPopularMovies).not.toHaveBeenCalled();
  });

  it("attaches known user scores from the score map", async () => {
    tmdb.getPopularMovies.mockResolvedValue({
      items: [{ id: "movie-1", title: "A" }],
      page: 1,
      totalPages: 1,
    });
    getUserScoreMap.mockResolvedValue(new Map([["movie-1", { avg: 8.4, count: 3 }]]));

    const response = await request(app).get("/api/media/movies");

    expect(response.body.items[0]).toMatchObject({ userScore: 8.4, userScoreCount: 3 });
  });

  it("uses the cached pool + sortItems when sort is a valid option", async () => {
    const pool = Array.from({ length: 25 }, (_, i) => ({ id: `movie-${i}` }));
    getPool.mockResolvedValue(pool);
    sortItems.mockReturnValue(pool);

    const response = await request(app).get("/api/media/movies?sort=az&page=1");

    expect(getPool).toHaveBeenCalledWith("movie", null);
    expect(sortItems).toHaveBeenCalledWith(pool, "az", expect.any(Map));
    expect(tmdb.getPopularMovies).not.toHaveBeenCalled();
    expect(response.body.items).toHaveLength(20);
    expect(response.body.totalPages).toBe(2);
  });

  it("ignores an unrecognized sort value and falls through to the normal path", async () => {
    tmdb.getPopularMovies.mockResolvedValue({ items: [], page: 1, totalPages: 1 });

    await request(app).get("/api/media/movies?sort=bogus");

    expect(getPool).not.toHaveBeenCalled();
    expect(tmdb.getPopularMovies).toHaveBeenCalled();
  });
});

describe("GET /api/media/shows", () => {
  it("fetches popular shows by default and by-genre when given", async () => {
    tmdb.getPopularShows.mockResolvedValue({ items: [], page: 1, totalPages: 1 });
    await request(app).get("/api/media/shows");
    expect(tmdb.getPopularShows).toHaveBeenCalledWith(1);

    tmdb.getShowsByGenre.mockResolvedValue({ items: [], page: 1, totalPages: 1 });
    await request(app).get("/api/media/shows?genre=18");
    expect(tmdb.getShowsByGenre).toHaveBeenCalledWith("18", 1);
  });
});

describe("GET /api/media/games", () => {
  it("fetches popular games by default and by-genre when given", async () => {
    rawg.getPopularGames.mockResolvedValue({ items: [], page: 1, totalPages: 1 });
    await request(app).get("/api/media/games");
    expect(rawg.getPopularGames).toHaveBeenCalledWith(1);

    rawg.getGamesByGenre.mockResolvedValue({ items: [], page: 1, totalPages: 1 });
    await request(app).get("/api/media/games?genre=action");
    expect(rawg.getGamesByGenre).toHaveBeenCalledWith("action", 1);
  });
});

describe("GET /api/media/music", () => {
  it("paginates from the cached pool and computes totalPages from pool length", async () => {
    const pool = Array.from({ length: 45 }, (_, i) => ({ id: `music-${i}` }));
    getPool.mockResolvedValue(pool);

    const response = await request(app).get("/api/media/music?page=2");

    expect(getPool).toHaveBeenCalledWith("music", null);
    expect(response.body.items).toHaveLength(20);
    expect(response.body.items[0].id).toBe("music-20");
    expect(response.body.totalPages).toBe(3);
  });

  it("passes the genre through to getPool when given", async () => {
    getPool.mockResolvedValue([]);
    await request(app).get("/api/media/music?genre=132");
    expect(getPool).toHaveBeenCalledWith("music", "132");
  });

  it("uses the sorted path when sort is valid", async () => {
    const pool = [{ id: "music-1" }, { id: "music-2" }];
    getPool.mockResolvedValue(pool);
    sortItems.mockReturnValue(pool);

    const response = await request(app).get("/api/media/music?sort=userScoreDesc");

    expect(sortItems).toHaveBeenCalledWith(pool, "userScoreDesc", expect.any(Map));
    expect(response.body.totalPages).toBe(1);
  });
});

describe("GET /api/media/genres/:type", () => {
  it("returns movie genres", async () => {
    tmdb.getMovieGenres.mockResolvedValue([{ id: 28, name: "Action" }]);
    const response = await request(app).get("/api/media/genres/movies");
    expect(response.status).toBe(200);
    expect(response.body.genres).toEqual([{ id: 28, name: "Action" }]);
  });

  it("returns show genres", async () => {
    tmdb.getTvGenres.mockResolvedValue([]);
    await request(app).get("/api/media/genres/shows");
    expect(tmdb.getTvGenres).toHaveBeenCalled();
  });

  it("returns game genres", async () => {
    rawg.getGameGenres.mockResolvedValue([]);
    await request(app).get("/api/media/genres/games");
    expect(rawg.getGameGenres).toHaveBeenCalled();
  });

  it("returns music genres", async () => {
    deezer.getGenres.mockResolvedValue([]);
    await request(app).get("/api/media/genres/music");
    expect(deezer.getGenres).toHaveBeenCalled();
  });

  it("400s on an unrecognized type", async () => {
    const response = await request(app).get("/api/media/genres/bogus");
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Invalid media type." });
  });
});

describe("GET /api/media/search", () => {
  it("returns an empty result without hitting any provider when query is blank", async () => {
    const response = await request(app).get("/api/media/search?type=movies");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [], page: 1, totalPages: 1 });
    expect(tmdb.searchMovies).not.toHaveBeenCalled();
  });

  it("400s on an unrecognized type", async () => {
    const response = await request(app).get("/api/media/search?type=bogus&query=hi");
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Invalid media type." });
  });

  it("searches movies and attaches user scores", async () => {
    tmdb.searchMovies.mockResolvedValue({
      items: [{ id: "movie-1", title: "Match" }],
      page: 1,
      totalPages: 1,
    });

    const response = await request(app).get("/api/media/search?type=movies&query=star&page=2");

    expect(tmdb.searchMovies).toHaveBeenCalledWith("star", 2);
    expect(response.body.items[0]).toMatchObject({ id: "movie-1", userScore: null });
  });
});

describe("GET /api/media/hero", () => {
  it("assembles a mixed-media hero list", async () => {
    tmdb.getPopularMovies.mockResolvedValue({
      items: [
        { id: "movie-1", type: "movie" },
        { id: "movie-2", type: "movie" },
      ],
    });
    tmdb.getPopularShows.mockResolvedValue({ items: [{ id: "show-1", type: "show" }] });
    deezer.getChartTracks.mockResolvedValue({ items: [{ id: "music-1", type: "music" }] });
    rawg.getPopularGames.mockResolvedValue({ items: [{ id: "game-1", type: "game" }] });

    const response = await request(app).get("/api/media/hero");

    expect(response.status).toBe(200);
    expect(response.body.items.map((item) => item.id)).toEqual([
      "movie-1",
      "movie-2",
      "show-1",
      "music-1",
      "game-1",
    ]);
    expect(deezer.getChartTracks).toHaveBeenCalledWith(5);
  });
});

describe("GET /api/media/reviews/:mediaId", () => {
  it("400s when mediaType is missing", async () => {
    const response = await request(app).get("/api/media/reviews/movie-1");
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "mediaId and mediaType are required." });
  });

  it("returns aggregated reviews for a valid request", async () => {
    const toArray = jest.fn().mockResolvedValue([
      { displayName: "Jane Doe", score: 9, note: "Loved it", updatedAt: new Date() },
    ]);
    const aggregate = jest.fn().mockReturnValue({ toArray });
    const collection = jest.fn().mockReturnValue({ aggregate });
    getDB.mockReturnValue({ collection });

    const response = await request(app).get(
      "/api/media/reviews/movie-1?mediaType=movie",
    );

    expect(response.status).toBe(200);
    expect(collection).toHaveBeenCalledWith("users");
    expect(response.body.reviews).toHaveLength(1);
    expect(response.body.reviews[0]).toMatchObject({ displayName: "Jane Doe", score: 9 });
  });
});

describe("GET /api/media/item/:type/:id", () => {
  it("404s on an unrecognized type", async () => {
    const response = await request(app).get("/api/media/item/bogus/1");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Media type not found." });
  });

  it("fetches movie details and attaches the user score", async () => {
    tmdb.getMovieDetails.mockResolvedValue({ id: "movie-27205", title: "Inception" });
    getUserScoreForItem.mockResolvedValue({ avg: 9.1, count: 12 });

    const response = await request(app).get("/api/media/item/movie/27205");

    expect(tmdb.getMovieDetails).toHaveBeenCalledWith("27205");
    expect(getUserScoreForItem).toHaveBeenCalledWith("movie-27205", "movie");
    expect(response.body.item).toMatchObject({
      id: "movie-27205",
      userScore: 9.1,
      userScoreCount: 12,
    });
  });

  it("fetches game details via rawg", async () => {
    rawg.getGameDetails.mockResolvedValue({ id: "game-3498" });
    await request(app).get("/api/media/item/game/3498");
    expect(rawg.getGameDetails).toHaveBeenCalledWith("3498");
  });

  it("fetches music details via deezer", async () => {
    deezer.getTrackDetails.mockResolvedValue({ id: "music-1" });
    await request(app).get("/api/media/item/music/1");
    expect(deezer.getTrackDetails).toHaveBeenCalledWith("1");
  });
});