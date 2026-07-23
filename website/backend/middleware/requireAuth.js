const jwt = require("jsonwebtoken");

// Accepts either the httpOnly cookie (how the web frontend authenticates)
// or an Authorization: Bearer header (how the mobile app authenticates,
// since a native app doesn't have a browser-managed cookie jar the way
// a web frontend does). Checking the cookie first means this is a purely
// additive change — the web frontend's behavior is completely unchanged.
function getTokenFromRequest(req) {
  if (req.cookies?.pv_auth) {
    return req.cookies.pv_auth;
  }

  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  return null;
}

function requireAuth(req, res, next) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({
      message: "Your login session is invalid or expired.",
    });
  }
}

module.exports = { requireAuth, getTokenFromRequest };
