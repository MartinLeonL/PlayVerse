const jwt = require("jsonwebtoken");
const { requireAuth, getTokenFromRequest } = require("../../middleware/requireAuth");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("getTokenFromRequest", () => {
  it("prefers the pv_auth cookie over the Authorization header", () => {
    const req = {
      cookies: { pv_auth: "cookie-token" },
      headers: { authorization: "Bearer header-token" },
    };

    expect(getTokenFromRequest(req)).toBe("cookie-token");
  });

  it("falls back to the Authorization: Bearer header when there's no cookie", () => {
    const req = {
      cookies: {},
      headers: { authorization: "Bearer header-token" },
    };

    expect(getTokenFromRequest(req)).toBe("header-token");
  });

  it("returns null when neither a cookie nor a Bearer header is present", () => {
    const req = { cookies: {}, headers: {} };
    expect(getTokenFromRequest(req)).toBeNull();
  });

  it("ignores a malformed Authorization header", () => {
    const req = { cookies: {}, headers: { authorization: "Basic abc123" } };
    expect(getTokenFromRequest(req)).toBeNull();
  });
});

describe("requireAuth", () => {
  it("rejects a request with no token", () => {
    const req = { cookies: {}, headers: {} };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Authentication required." });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects an invalid/malformed token", () => {
    const req = { cookies: { pv_auth: "not-a-real-token" }, headers: {} };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Your login session is invalid or expired.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches userId and calls next() for a valid cookie token", () => {
    const token = jwt.sign({ sub: "user-42" }, process.env.JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: "1h",
    });

    const req = { cookies: { pv_auth: token }, headers: {} };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(req.userId).toBe("user-42");
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("accepts a valid token from the Authorization header", () => {
    const token = jwt.sign({ sub: "user-99" }, process.env.JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: "1h",
    });

    const req = { cookies: {}, headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(req.userId).toBe("user-99");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("rejects a token signed with the wrong secret", () => {
    const token = jwt.sign({ sub: "user-1" }, "wrong-secret", {
      algorithm: "HS256",
      expiresIn: "1h",
    });

    const req = { cookies: { pv_auth: token }, headers: {} };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects an expired token", () => {
    const token = jwt.sign({ sub: "user-1" }, process.env.JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: -10, // already expired
    });

    const req = { cookies: { pv_auth: token }, headers: {} };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});