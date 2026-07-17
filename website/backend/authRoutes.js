const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const { ObjectId } = require("mongodb");
const { OAuth2Client } = require("google-auth-library");

const { getDB } = require("./db");
const { sendVerificationEmail, sendPasswordResetEmail } = require("./email");

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

      isEmailVerified: false, // Set to true for development purposes. Change to false to follow the email verification process..
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

    res.clearCookie("pv_auth", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

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
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        message: "First name, last name, and email are required.",
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

    const updates = {
      firstName,
      lastName,
      email,
      updatedAt: new Date(),
    };

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
      res.clearCookie("pv_auth", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
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

    /*
     * Log out the current browser session after changing
     * the password.
     */
    res.clearCookie("pv_auth", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.json({
      message: "Your password has been reset successfully. You can now log in.",
    });
  } catch (error) {
    next(error);
  }
});

const playlistKeyByType = {
  movie: "movies",
  movies: "movies",

  show: "tvSeries",
  shows: "tvSeries",
  tv: "tvSeries",
  tvSeries: "tvSeries",

  music: "music",

  game: "games",
  games: "games",
};

router.post("/playlists/items", requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.userId)) {
      return res.status(401).json({
        message: "Invalid login session.",
      });
    }

    const mediaId = String(req.body.mediaId || "").trim();
    const mediaType = String(req.body.mediaType || "").trim();

    if (!mediaId || !mediaType) {
      return res.status(400).json({
        message: "Media ID and media type are required.",
      });
    }

    const playlistKey = playlistKeyByType[mediaType];

    if (!playlistKey) {
      return res.status(400).json({
        message: "Invalid media type.",
      });
    }

    const users = getDB().collection("users");
    const userId = new ObjectId(req.userId);

    const playlistPath = `playlists.${playlistKey}`;

    const result = await users.updateOne(
      {
        _id: userId,
      },
      {
        /*
         * addToSet prevents the same ID from being added twice.
         */
        $addToSet: {
          [playlistPath]: mediaId,
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "Account not found.",
      });
    }

    const wasAdded = result.modifiedCount === 1;

    return res.json({
      message: wasAdded
        ? "Added to your playlist."
        : "This item is already in your playlist.",
      added: wasAdded,
      playlist: playlistKey,
      mediaId,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/playlists", requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.userId)) {
      return res.status(401).json({
        message: "Invalid login session.",
      });
    }

    const user = await getUsersCollection().findOne(
      {
        _id: new ObjectId(req.userId),
      },
      {
        projection: {
          playlists: 1,
        },
      },
    );

    if (!user) {
      return res.status(404).json({
        message: "Account not found.",
      });
    }

    return res.json({
      playlists: {
        movies: user.playlists?.movies || [],
        tvSeries: user.playlists?.tvSeries || [],
        music: user.playlists?.music || [],
        games: user.playlists?.games || [],
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/playlists/items", requireAuth, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.userId)) {
      return res.status(401).json({
        message: "Invalid login session.",
      });
    }

    const mediaId = String(req.body.mediaId || "").trim();
    const mediaType = String(req.body.mediaType || "").trim();

    if (!mediaId || !mediaType) {
      return res.status(400).json({
        message: "Media ID and media type are required.",
      });
    }

    const playlistKey = playlistKeyByType[mediaType];

    if (!playlistKey) {
      return res.status(400).json({
        message: "Invalid media type.",
      });
    }

    const playlistPath = `playlists.${playlistKey}`;

    const result = await getUsersCollection().updateOne(
      {
        _id: new ObjectId(req.userId),
      },
      {
        $pull: {
          [playlistPath]: mediaId,
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "Account not found.",
      });
    }

    return res.json({
      message:
        result.modifiedCount === 1
          ? "Removed from your playlist."
          : "This item was not found in your playlist.",
      removed: result.modifiedCount === 1,
      mediaId,
      playlist: playlistKey,
    });
  } catch (error) {
    next(error);
  }
});


const validRatingTypes = new Set([
  "movie",
  "show",
  "music",
  "game",
]);


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

    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return res.status(400).json({
        message: "Score must be a whole number from 1 to 5.",
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
