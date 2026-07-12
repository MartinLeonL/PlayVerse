const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const { ObjectId } = require("mongodb");
const { OAuth2Client } = require("google-auth-library");

const { getDB } = require("./db");
const { sendVerificationEmail } = require("./email");

const router = express.Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function getUsersCollection() {
  return getDB().collection("users");
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function createAppToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
    },
    process.env.JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "7d",
    },
  );
}

function setAuthCookie(res, token) {
  res.cookie("pv_auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function getPublicUser(user) {
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    isEmailVerified: user.isEmailVerified,
    picture: user.picture || null,
  };
}

function requireAuth(req, res, next) {
  const token = req.cookies.pv_auth;

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

// Register with email and password

router.post("/register", async (req, res, next) => {
  try {
    const { firstName, lastName, password } = req.body;

    const email = normalizeEmail(req.body.email);

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: "All fields are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters.",
      });
    }

    const users = getUsersCollection();

    const existingUser = await users.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Store a hash of the email token, not the raw token.
    const verificationTokenHash = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    const newUser = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email,
      passwordHash,

      isEmailVerified: true, // Set to true for development purposes. Change to false to follow the email verification process..
      verificationTokenHash,
      verificationTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),

      playlists: {
        movies: [],
        tvSeries: [],
        music: [],
        games: [],
      },

      ratings: [],

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await users.insertOne(newUser);

    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (emailError) {
      // This prevents an unusable account during development.
      await users.deleteOne({
        _id: result.insertedId,
      });

      console.error("SendGrid error:", emailError.response?.body || emailError);

      return res.status(500).json({
        message:
          "The verification email could not be sent. The account was not created.",
      });
    }

    return res.status(201).json({
      message: "Account created. Check your email before logging in.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    next(error);
  }
});

//Verify email address

router.post("/verify-email", async (req, res, next) => {
  try {
    const token = String(req.body.token || "");

    if (!token) {
      return res.status(400).json({
        message: "Verification token is missing.",
      });
    }

    const verificationTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const users = getDB().collection("users");

    const user = await users.findOne({
      verificationTokenHash,
    });

    console.log("Verification user found:", Boolean(user));

    if (!user) {
      return res.status(400).json({
        message: "This verification link is invalid.",
      });
    }

    if (
      !user.verificationTokenExpiresAt ||
      user.verificationTokenExpiresAt <= new Date()
    ) {
      return res.status(400).json({
        message: "This verification link has expired.",
      });
    }

    await users.updateOne(
      {
        _id: user._id,
      },
      {
        $set: {
          isEmailVerified: true,
          verifiedAt: new Date(),
          updatedAt: new Date(),
        },
        $unset: {
          verificationTokenHash: "",
          verificationTokenExpiresAt: "",
        },
      },
    );

    console.log("Email verified for:", user.email);

    return res.json({
      message: "Your email has been verified.",
    });
  } catch (error) {
    next(error);
  }
});

//Login with email and password

router.post("/login", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await getUsersCollection().findOne({
      email,
    });

    // Google-only accounts do not have passwordHash.
    if (!user || !user.passwordHash) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: "Verify your email address before logging in.",
      });
    }

    const token = createAppToken(user);
    setAuthCookie(res, token);

    return res.json({
      message: "Login successful.",
      user: getPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
});

//Sign in or register using Google

router.post("/google", async (req, res, next) => {
  try {
    const credential = String(req.body.credential || "");

    if (!credential) {
      return res.status(400).json({
        message: "Google credential is missing.",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.sub || !payload?.email || !payload.email_verified) {
      return res.status(401).json({
        message: "Google could not verify this account.",
      });
    }

    const users = getUsersCollection();

    const googleId = payload.sub;
    const email = normalizeEmail(payload.email);

    let user = await users.findOne({ googleId });

    if (!user) {
      const existingUser = await users.findOne({ email });

      if (existingUser) {
        await users.updateOne(
          {
            _id: existingUser._id,
          },
          {
            $set: {
              googleId,
              isEmailVerified: true,
              verifiedAt: existingUser.verifiedAt || new Date(),
              picture: payload.picture || existingUser.picture || null,
              updatedAt: new Date(),
            },
          },
        );

        user = await users.findOne({
          _id: existingUser._id,
        });
      } else {
        const newGoogleUser = {
          googleId,
          firstName: payload.given_name || "Google User",
          lastName: payload.family_name || "",
          email,
          picture: payload.picture || null,
          isEmailVerified: true,
          verifiedAt: new Date(),

          playlists: {
            movies: [],
            tvSeries: [],
            music: [],
            games: [],
          },

          ratings: [],

          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await users.insertOne(newGoogleUser);

        user = {
          ...newGoogleUser,
          _id: result.insertedId,
        };
      }
    }

    const token = createAppToken(user);
    setAuthCookie(res, token);

    return res.json({
      message: "Google login successful.",
      user: getPublicUser(user),
    });
  } catch (error) {
    console.error("Google authentication error:", error);

    return res.status(401).json({
      message: "Google authentication failed.",
    });
  }
});

//Return the currently logged-in user

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.userId)) {
      return res.status(401).json({
        message: "Invalid login session.",
      });
    }

    const user = await getUsersCollection().findOne({
      _id: new ObjectId(req.userId),
    });

    if (!user) {
      return res.status(401).json({
        message: "User no longer exists.",
      });
    }

    return res.json({
      user: getPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
});

//Logout

router.post("/logout", (req, res) => {
  res.clearCookie("pv_auth", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return res.json({
    message: "Logged out.",
  });
});

module.exports = router;
