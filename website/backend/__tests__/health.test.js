const request = require("supertest");
const { createApp } = require("../app");

const app = createApp();

describe("GET /api/health", () => {
  it("returns a 200 with a status message", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "PlayVerse backend is running.",
    });
  });
});

describe("unknown routes", () => {
  it("returns a 404 for a route that doesn't exist", async () => {
    const response = await request(app).get("/api/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "API route not found.",
    });
  });
});

describe("CORS handling", () => {
  it("blocks a request from a disallowed origin", async () => {
    const response = await request(app)
      .get("/api/health")
      .set("Origin", "https://not-allowed.example.com");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: "This request origin is not allowed.",
    });
  });

  it("allows a request from the configured frontend origin", async () => {
    const response = await request(app)
      .get("/api/health")
      .set("Origin", process.env.FRONTEND_URL);

    expect(response.status).toBe(200);
  });
});