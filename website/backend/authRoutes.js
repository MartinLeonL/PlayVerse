const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const { ObjectId } = require("mongodb");
const { OAuth2Client } = require("google-auth-library");

const { getDB } = require("./db");
const { sendVerificationEmail, sendPasswordResetEmail } = require("./email");
const { requireAuth } = require("./middleware/requireAuth");

const router = express.Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const isProduction = process.env.NODE_ENV === "production";

const authCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

const clearAuthCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

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

// Sets the cookie for web AND returns the raw token so callers (login,
// Google sign-in) can also include it in the JSON body — the mobile app
// has no browser cookie jar, so it needs the token delivered explicitly
// and stores it itself (sent back later as an Authorization header).
function setAuthCookie(res, token) {
  res.cookie("pv_auth", token, authCookieOptions);
}

function clearAuthCookie(res) {
  res.clearCookie("pv_auth", clearAuthCookieOptions);
}

function getPublicUser(user) {
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    isEmailVerified: user.isEmailVerified,
    picture: user.picture || null,
    // 'fullName' | 'username' — which one shows next to this person's
    // reviews. Defaults to full name for anyone who hasn't set a
    // preference (including accounts created before this existed).
    reviewDisplayPreference: user.reviewDisplayPreference || "fullName",
  };
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

// Google sign-in doesn't collect a username, but every account needs
// one now for the review-display-preference feature — this derives a
// reasonable default from their email and appends a number if that
// base is already taken.
async function generateUniqueUsername(usersCollection, seed) {
  const base = String(seed || "user")
    .split("@")[0]
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 16) || "user";

  let candidate = base;
  let suffix = 0;

  while (await usersCollection.findOne({ username: candidate })) {
    suffix += 1;
    candidate = `${base}${suffix}`;
  }

  return candidate;
}

function generatePlaylistId() {
  return crypto.randomBytes(12).toString("hex");
}

// Register with email and password

router.post("/register", async (req, res, next) => {
  try {
    const { firstName, lastName, password } = req.body;
    const username = String(req.body.username || "").trim();

    const email = normalizeEmail(req.body.email);

    if (!firstName || !lastName || !email || !password || !username) {
      return res.status(400).json({
        message: "All fields are required.",
      });
    }

    if (!USERNAME_PATTERN.test(username)) {
      return res.status(400).json({
        message: "Username must be 3-20 characters, letters/numbers/underscores only.",
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

    const existingUsername = await users.findOne({ username });

    if (existingUsername) {
      return res.status(409).json({
        message: "This username is already taken.",
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
      username,
      email,
      passwordHash,

      reviewDisplayPreference: "fullName",

      isEmailVerified: false, // Set to true for development purposes. Change to false to follow the email verification process..
      verificationTokenHash,
      verificationTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),

      customPlaylists: [],

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
    const identifierRaw = String(req.body.email || "").trim();
    const password = String(req.body.password || "");

    if (!identifierRaw || !password) {
      return res.status(400).json({
        message: "Email/username and password are required.",
      });
    }

    // Accepts either an email or a username in the same field — the
    // client doesn't need to say which, this just looks at whether it
    // contains an "@" and queries accordingly.
    const isEmail = identifierRaw.includes("@");
    const query = isEmail ? { email: normalizeEmail(identifierRaw) } : { username: identifierRaw };

    const user = await getUsersCollection().findOne(query);

    // Google-only accounts do not have passwordHash.
    if (!user || !user.passwordHash) {
      return res.status(401).json({
        message: "Invalid login or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid login or password.",
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
      // The cookie is what the web frontend actually relies on — this is
      // included so the mobile app (no browser cookie jar) can store it
      // and send it back as an Authorization: Bearer header.
      token,
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
        const username = await generateUniqueUsername(users, email);

        const newGoogleUser = {
          googleId,
          firstName: payload.given_name || "Google User",
          lastName: payload.family_name || "",
          username,
          email,
          picture: payload.picture || null,
          reviewDisplayPreference: "fullName",
          isEmailVerified: true,
          verifiedAt: new Date(),

          customPlaylists: [],

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
      token,
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
  clearAuthCookie(res);

  return res.json({
    message: "Logged out.",
  });
});

router.delete("/account", requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.userId)) {
      return res.status(401).json({
        message: "Invalid login session.",
      });
    }

    const users = getDB().collection("users");

    const result = await users.deleteOne({
      _id: new ObjectId(req.userId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Account not found.",
      });
    }

    clearAuthCookie(res);

    return res.json({
      message: "Account deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/account", requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.userId)) {
      return res.status(401).json({
        message: "Invalid login session.",
      });
    }

    const firstName = String(req.body.firstName || "").trim();
    const lastName = String(req.body.lastName || "").trim();
    const username = String(req.body.username || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const currentPassword = String(req.body.currentPassword || "");
    const reviewDisplayPreference = req.body.reviewDisplayPreference;

    if (!firstName || !lastName || !email || !username) {
      return res.status(400).json({
        message: "First name, last name, username, and email are required.",
      });
    }

    if (!USERNAME_PATTERN.test(username)) {
      return res.status(400).json({
        message: "Username must be 3-20 characters, letters/numbers/underscores only.",
      });
    }

    if (reviewDisplayPreference && !["fullName", "username"].includes(reviewDisplayPreference)) {
      return res.status(400).json({
        message: "Invalid review display preference.",
      });
    }

    if (password && password.length < 8) {
      return res.status(400).json({
        message: "The new password must contain at least 8 characters.",
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return res.status(400).json({
        message: "Enter a valid email address.",
      });
    }

    const users = getDB().collection("users");
    const userId = new ObjectId(req.userId);

    const currentUser = await users.findOne({
      _id: userId,
    });

    if (!currentUser) {
      return res.status(404).json({
        message: "Account not found.",
      });
    }

    // Changing the password requires proving you know the current one —
    // this was missing before, meaning anyone with a valid session could
    // change the password with no verification at all.
    if (password) {
      if (!currentUser.passwordHash) {
        return res.status(400).json({
          message: "This account doesn't use a password (it signs in with Google).",
        });
      }

      const currentPasswordMatches = await bcrypt.compare(currentPassword, currentUser.passwordHash);
      if (!currentPasswordMatches) {
        return res.status(401).json({
          message: "Current password is incorrect.",
        });
      }
    }

    const emailChanged = email !== currentUser.email;

    if (emailChanged) {
      const emailAlreadyUsed = await users.findOne({
        email,
        _id: {
          $ne: userId,
        },
      });

      if (emailAlreadyUsed) {
        return res.status(409).json({
          message: "Another account already uses this email.",
        });
      }
    }

    const usernameChanged = username !== currentUser.username;

    if (usernameChanged) {
      const usernameAlreadyUsed = await users.findOne({
        username,
        _id: {
          $ne: userId,
        },
      });

      if (usernameAlreadyUsed) {
        return res.status(409).json({
          message: "This username is already taken.",
        });
      }
    }

    const updates = {
      firstName,
      lastName,
      username,
      email,
      updatedAt: new Date(),
    };

    if (reviewDisplayPreference) {
      updates.reviewDisplayPreference = reviewDisplayPreference;
    }

    if (password) {
      updates.passwordHash = await bcrypt.hash(password, 12);
    }

    let verificationToken;

    if (emailChanged) {
      verificationToken = crypto.randomBytes(32).toString("hex");

      const verificationTokenHash = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");

      updates.isEmailVerified = false;
      updates.verificationTokenHash = verificationTokenHash;
      updates.verificationTokenExpiresAt = new Date(
        Date.now() + 60 * 60 * 1000,
      );
    }

    await users.updateOne(
      {
        _id: userId,
      },
      {
        $set: updates,
        ...(emailChanged
          ? {
              $unset: {
                verifiedAt: "",
              },
            }
          : {}),
      },
    );

    if (emailChanged) {
      await sendVerificationEmail(email, verificationToken);
    }

    const updatedUser = await users.findOne({
      _id: userId,
    });

    if (emailChanged) {
      clearAuthCookie(res);
    }

    return res.json({
      message: emailChanged
        ? "Account updated. Verify your new email address before logging in again."
        : "Account updated successfully.",

      requiresEmailVerification: emailChanged,

      user: getPublicUser(updatedUser),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Another account already uses this email.",
      });
    }

    next(error);
  }
});

router.post("/resend-verification", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({
        message: "Enter your email address.",
      });
    }

    const users = getUsersCollection();
    const user = await users.findOne({ email });

    // Same non-revealing pattern as forgot-password — don't confirm
    // whether an account exists, or whether it's already verified.
    const genericResponse = {
      message:
        "If an unverified account exists for this email, a new verification link has been sent.",
    };

    if (!user || user.isEmailVerified || !user.passwordHash) {
      return res.json(genericResponse);
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");

    const verificationTokenHash = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          verificationTokenHash,
          verificationTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      },
    );

    await sendVerificationEmail(email, verificationToken);

    return res.json(genericResponse);
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({
        message: "Enter your email address.",
      });
    }

    const users = getDB().collection("users");

    const user = await users.findOne({
      email,
    });

    /*
     * Always return the same response.
     * This prevents people from checking whether an email
     * has a PlayVerse account.
     */
    const genericResponse = {
      message:
        "If an account exists for this email, a password-reset link has been sent.",
    };

    /*
     * Do not create a reset token for an unknown account
     * or an account that only uses Google OAuth.
     */
    if (!user || !user.passwordHash) {
      return res.json(genericResponse);
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    await users.updateOne(
      {
        _id: user._id,
      },
      {
        $set: {
          passwordResetTokenHash: resetTokenHash,

          passwordResetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      },
    );

    await sendPasswordResetEmail(user.email, resetToken);

    return res.json(genericResponse);
  } catch (error) {
    next(error);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const token = String(req.body.token || "");
    const password = String(req.body.password || "");

    if (!token) {
      return res.status(400).json({
        message: "This password-reset link is invalid.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "The new password must contain at least 8 characters.",
      });
    }

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const users = getDB().collection("users");

    const user = await users.findOne({
      passwordResetTokenHash: resetTokenHash,

      passwordResetTokenExpiresAt: {
        $gt: new Date(),
      },
    });

    if (!user) {
      return res.status(400).json({
        message: "This password-reset link is invalid or has expired.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await users.updateOne(
      {
        _id: user._id,
      },
      {
        $set: {
          passwordHash,
          passwordUpdatedAt: new Date(),
          updatedAt: new Date(),
        },

        $unset: {
          passwordResetTokenHash: "",
          passwordResetTokenExpiresAt: "",
        },
      },
    );

    clearAuthCookie(res);

    return res.json({
      message: "Your password has been reset successfully. You can now log in.",
    });
  } catch (error) {
    next(error);
  }
});

// The simple category-bucket playlist system (playlists.movies/tvSeries/
// music/games) has been removed — customPlaylists (below) is the only
// playlist system now, since it's the one both platforms actually need
// (named playlists mixing any media type together). Any pre-existing
// bucket data was migrated into customPlaylists — see
// scripts/migrateBucketPlaylists.js — before this code was removed.

const validRatingTypes = new Set(["movie", "show", "music", "game"]);

// ---------------------------------------------------------------------
// Custom (named) playlists — each one can mix movies, shows, music, and
// games together, unlike the single category-based playlist above.
// ---------------------------------------------------------------------

// GET all of the user's custom playlists
router.get("/custom-playlists", requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.userId)) {
      return res.status(401).json({ message: "Invalid login session." });
    }

    const user = await getUsersCollection().findOne(
      { _id: new ObjectId(req.userId) },
      { projection: { customPlaylists: 1 } },
    );

    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    const playlists = (user.customPlaylists || []).map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      items: playlist.items || [],
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
    }));

    return res.json({ playlists });
  } catch (error) {
    next(error);
  }
});

// POST create a new named playlist
router.post("/custom-playlists", requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.userId)) {
      return res.status(401).json({ message: "Invalid login session." });
    }

    const name = String(req.body.name || "").trim();

    if (!name) {
      return res.status(400).json({ message: "Playlist name is required." });
    }

    if (name.length > 60) {
      return res.status(400).json({ message: "Playlist name is too long." });
    }

    const now = new Date();

    const newPlaylist = {
      id: generatePlaylistId(),
      name,
      items: [],
      createdAt: now,
      updatedAt: now,
    };

    const result = await getUsersCollection().updateOne(
      { _id: new ObjectId(req.userId) },
      { $push: { customPlaylists: newPlaylist } },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Account not found." });
    }

    return res.status(201).json({
      message: "Playlist created.",
      playlist: {
        id: newPlaylist.id,
        name: newPlaylist.name,
        items: [],
        createdAt: newPlaylist.createdAt,
        updatedAt: newPlaylist.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH rename a custom playlist
router.patch(
  "/custom-playlists/:playlistId",
  requireAuth,
  async (req, res, next) => {
    try {
      if (!ObjectId.isValid(req.userId)) {
        return res.status(401).json({ message: "Invalid login session." });
      }

      const { playlistId } = req.params;
      const name = String(req.body.name || "").trim();

      if (!name) {
        return res.status(400).json({ message: "Playlist name is required." });
      }

      if (name.length > 60) {
        return res.status(400).json({ message: "Playlist name is too long." });
      }

      const result = await getUsersCollection().updateOne(
        { _id: new ObjectId(req.userId), "customPlaylists.id": playlistId },
        {
          $set: {
            "customPlaylists.$.name": name,
            "customPlaylists.$.updatedAt": new Date(),
          },
        },
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Playlist not found." });
      }

      return res.json({ message: "Playlist renamed.", name });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE a custom playlist
router.delete(
  "/custom-playlists/:playlistId",
  requireAuth,
  async (req, res, next) => {
    try {
      if (!ObjectId.isValid(req.userId)) {
        return res.status(401).json({ message: "Invalid login session." });
      }

      const { playlistId } = req.params;

      const result = await getUsersCollection().updateOne(
        { _id: new ObjectId(req.userId) },
        { $pull: { customPlaylists: { id: playlistId } } },
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Account not found." });
      }

      return res.json({ message: "Playlist deleted." });
    } catch (error) {
      next(error);
    }
  },
);

// POST add an item (any media type — movie, show, music, or game) to a playlist
router.post(
  "/custom-playlists/:playlistId/items",
  requireAuth,
  async (req, res, next) => {
    try {
      if (!ObjectId.isValid(req.userId)) {
        return res.status(401).json({ message: "Invalid login session." });
      }

      const { playlistId } = req.params;
      const mediaId = String(req.body.mediaId || "").trim();
      const mediaType = String(req.body.mediaType || "").trim();

      if (!mediaId || !validRatingTypes.has(mediaType)) {
        return res
          .status(400)
          .json({ message: "A valid media ID and media type are required." });
      }

      const users = getUsersCollection();
      const userId = new ObjectId(req.userId);

      // Only push if this exact item isn't already in the playlist.
      const result = await users.updateOne(
        {
          _id: userId,
          customPlaylists: {
            $elemMatch: {
              id: playlistId,
              items: { $not: { $elemMatch: { mediaId, mediaType } } },
            },
          },
        },
        {
          $push: {
            "customPlaylists.$.items": {
              mediaId,
              mediaType,
              addedAt: new Date(),
            },
          },
          $set: { "customPlaylists.$.updatedAt": new Date() },
        },
      );

      if (result.matchedCount === 0) {
        const playlistExists = await users.findOne({
          _id: userId,
          "customPlaylists.id": playlistId,
        });

        if (!playlistExists) {
          return res.status(404).json({ message: "Playlist not found." });
        }

        return res.json({
          message: "This item is already in the playlist.",
          added: false,
        });
      }

      return res.json({ message: "Added to playlist.", added: true });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE remove an item from a playlist
router.delete(
  "/custom-playlists/:playlistId/items",
  requireAuth,
  async (req, res, next) => {
    try {
      if (!ObjectId.isValid(req.userId)) {
        return res.status(401).json({ message: "Invalid login session." });
      }

      const { playlistId } = req.params;
      const mediaId = String(req.body.mediaId || "").trim();
      const mediaType = String(req.body.mediaType || "").trim();

      if (!mediaId || !mediaType) {
        return res
          .status(400)
          .json({ message: "Media ID and media type are required." });
      }

      const result = await getUsersCollection().updateOne(
        { _id: new ObjectId(req.userId), "customPlaylists.id": playlistId },
        {
          $pull: { "customPlaylists.$.items": { mediaId, mediaType } },
          $set: { "customPlaylists.$.updatedAt": new Date() },
        },
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Playlist not found." });
      }

      return res.json({ message: "Removed from playlist.", removed: true });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/ratings/:mediaId", requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.userId)) {
      return res.status(401).json({
        message: "Invalid login session.",
      });
    }

    const mediaId = String(req.params.mediaId || "").trim();
    const mediaType = String(req.query.mediaType || "").trim();

    if (!mediaId || !validRatingTypes.has(mediaType)) {
      return res.status(400).json({
        message: "A valid media ID and media type are required.",
      });
    }

    const user = await getUsersCollection().findOne(
      {
        _id: new ObjectId(req.userId),
      },
      {
        projection: {
          ratings: 1,
        },
      },
    );

    if (!user) {
      return res.status(404).json({
        message: "Account not found.",
      });
    }

    const rating =
      (user.ratings || []).find(
        (currentRating) =>
          String(currentRating.mediaId) === mediaId &&
          currentRating.mediaType === mediaType,
      ) || null;

    return res.json({
      rating,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/ratings/:mediaId", requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.userId)) {
      return res.status(401).json({
        message: "Invalid login session.",
      });
    }

    const mediaId = String(req.params.mediaId || "").trim();
    const mediaType = String(req.body.mediaType || "").trim();
    const score = Number(req.body.score);
    const note = String(req.body.note || "").trim();

    if (!mediaId || !validRatingTypes.has(mediaType)) {
      return res.status(400).json({
        message: "A valid media ID and media type are required.",
      });
    }

    if (!Number.isInteger(score) || score < 1 || score > 10) {
      return res.status(400).json({
        message: "Score must be a whole number from 1 to 10.",
      });
    }

    if (note.length > 500) {
      return res.status(400).json({
        message: "The personal note cannot exceed 500 characters.",
      });
    }

    const users = getUsersCollection();
    const userId = new ObjectId(req.userId);
    const now = new Date();

    /*
     * First try to update an existing rating.
     */
    const updateResult = await users.updateOne(
      {
        _id: userId,
        ratings: {
          $elemMatch: {
            mediaId,
            mediaType,
          },
        },
      },
      {
        $set: {
          "ratings.$.score": score,
          "ratings.$.note": note,
          "ratings.$.updatedAt": now,
          updatedAt: now,
        },
      },
    );

    /*
     * No matching rating existed, so add a new one.
     */
    if (updateResult.matchedCount === 0) {
      const insertResult = await users.updateOne(
        {
          _id: userId,
        },
        {
          $push: {
            ratings: {
              mediaId,
              mediaType,
              score,
              note,
              createdAt: now,
              updatedAt: now,
            },
          },
          $set: {
            updatedAt: now,
          },
        },
      );

      if (insertResult.matchedCount === 0) {
        return res.status(404).json({
          message: "Account not found.",
        });
      }
    }

    return res.json({
      message: "Your rating was saved.",
      rating: {
        mediaId,
        mediaType,
        score,
        note,
        updatedAt: now,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;