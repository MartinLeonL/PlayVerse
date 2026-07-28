const express = require("express");
const request = require("supertest");

jest.mock("../db");
jest.mock("../middleware/requireAuth");
jest.mock("groq-sdk");

const { getDB } = require("../db");
const { requireAuth } = require("../middleware/requireAuth");
const Groq = require("groq-sdk");

const mockCreate = jest.fn();

Groq.mockImplementation(() => ({
  chat: { completions: { create: mockCreate } },
}));

// Default: every request is "logged in" as this user unless a test
// overrides it (each test uses a fresh userId below to avoid session
// bleed, since the module keeps an in-memory session store keyed by id).
let currentUserId = "user-default";
requireAuth.mockImplementation((req, res, next) => {
  req.userId = currentUserId;
  next();
});

// Default: no PlayVerse rating data yet for anything.
function mockNoRatingStats() {
  const toArray = jest.fn().mockResolvedValue([]);
  const aggregate = jest.fn().mockReturnValue({ toArray });
  const collection = jest.fn().mockReturnValue({ aggregate });
  getDB.mockReturnValue({ collection });
}

const recommendationRoutes = require("../services/groqRecom");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/recommendations", recommendationRoutes);
  return app;
}

const app = buildApp();

let userCounter = 0;
function freshUserId() {
  userCounter += 1;
  currentUserId = `user-${userCounter}`;
  return currentUserId;
}

beforeEach(() => {
  jest.clearAllMocks();
  Groq.mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  }));
  requireAuth.mockImplementation((req, res, next) => {
    req.userId = currentUserId;
    next();
  });
  mockNoRatingStats();
  global.fetch = jest.fn();
});

describe("GET /api/recommendations/chat", () => {
  it("returns an empty message list for a brand new session", async () => {
    freshUserId();
    const response = await request(app).get("/api/recommendations/chat");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ messages: [] });
  });
});

describe("DELETE /api/recommendations/chat", () => {
  it("clears the conversation", async () => {
    const userId = freshUserId();

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "Sure thing! []" } }],
    });

    await request(app).post("/api/recommendations/chat").send({ message: "hi" });

    let history = await request(app).get("/api/recommendations/chat");
    expect(history.body.messages.length).toBeGreaterThan(0);

    const del = await request(app).delete("/api/recommendations/chat");
    expect(del.status).toBe(200);
    expect(del.body).toEqual({ message: "Conversation cleared." });

    history = await request(app).get("/api/recommendations/chat");
    expect(history.body.messages).toEqual([]);
  });
});

describe("POST /api/recommendations/chat", () => {
  it("400s when the message is missing", async () => {
    freshUserId();
    const response = await request(app).post("/api/recommendations/chat").send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Message is required." });
  });

  it("returns a fallback line when the model gives an empty recommendation array", async () => {
    freshUserId();
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "[]" } }],
    });

    const response = await request(app)
      .post("/api/recommendations/chat")
      .send({ message: "something obscure" });

    expect(response.status).toBe(200);
    expect(response.body.recommendations).toEqual([]);
    expect(response.body.message).toBe(
      "I couldn't come up with a recommendation for that — try rephrasing?",
    );
  });

  it("parses the trailing JSON array and enriches movie recommendations from TMDB", async () => {
    freshUserId();

    const llmText = `Here's a great pick for you.
[{"title": "Inception", "type": "movie", "year": "2010", "reason": "Mind-bending sci-fi"}]`;

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: llmText } }],
    });

    global.fetch.mockResolvedValue({
      json: async () => ({
        results: [
          {
            id: 27205,
            poster_path: "/abc.jpg",
            overview: "A thief who steals corporate secrets...",
            vote_average: 8.36,
            release_date: "2010-07-15",
          },
        ],
      }),
    });

    const response = await request(app)
      .post("/api/recommendations/chat")
      .send({ message: "mind-bending movie" });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Here's a great pick for you.");
    expect(response.body.recommendations).toHaveLength(1);
    expect(response.body.recommendations[0]).toMatchObject({
      title: "Inception",
      id: "movie-27205",
      poster: "https://image.tmdb.org/t/p/w500/abc.jpg",
      score: 8.4,
      userScore: null,
      userScoreCount: 0,
    });
  });

  it("falls back to a null poster when the enrichment lookup finds nothing", async () => {
    freshUserId();

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content:
              '[{"title": "Some Obscure Thing", "type": "movie", "year": "2024", "reason": "test"}]',
          },
        },
      ],
    });

    global.fetch.mockResolvedValue({ json: async () => ({ results: [] }) });

    const response = await request(app)
      .post("/api/recommendations/chat")
      .send({ message: "obscure request" });

    expect(response.status).toBe(200);
    expect(response.body.recommendations[0]).toMatchObject({
      title: "Some Obscure Thing",
      poster: null,
    });
    // No TMDB match means no id was ever assigned to the item.
    expect(response.body.recommendations[0].id).toBeUndefined();
  });

  it("returns a 500 if the Groq call itself fails", async () => {
    freshUserId();
    mockCreate.mockRejectedValue(new Error("groq is down"));

    const response = await request(app)
      .post("/api/recommendations/chat")
      .send({ message: "anything" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Failed to get recommendations." });
  });

  it("keeps conversation history scoped per user", async () => {
    const userA = freshUserId();
    mockCreate.mockResolvedValue({ choices: [{ message: { content: "Hi A []" } }] });
    await request(app).post("/api/recommendations/chat").send({ message: "hello from A" });

    const userB = freshUserId();
    mockCreate.mockResolvedValue({ choices: [{ message: { content: "Hi B []" } }] });
    await request(app).post("/api/recommendations/chat").send({ message: "hello from B" });

    currentUserId = userA;
    const historyA = await request(app).get("/api/recommendations/chat");
    expect(historyA.body.messages.some((m) => m.text === "hello from A")).toBe(true);
    expect(historyA.body.messages.some((m) => m.text === "hello from B")).toBe(false);

    currentUserId = userB;
    const historyB = await request(app).get("/api/recommendations/chat");
    expect(historyB.body.messages.some((m) => m.text === "hello from B")).toBe(true);
  });
});