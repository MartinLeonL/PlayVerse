// server.js
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { setupSwagger } = require('./config/swagger');
require('dotenv').config();
const dbURI = process.env.MONGODB_URI;
const emailKey = process.env.SENDGRID_API_KEY;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
setupSwagger(app);

// MongoDB Connection Setup
const url = process.env.MONGODB_URI || 'mongodb+srv://student:1234@largeproject.7nxvpcl.mongodb.net/?appName=LargeProject';
const client = new MongoClient(url);
let dbReady = false;

async function getDb() {
    if (!dbReady) {
        try {
            await client.connect();
            dbReady = true;
        } catch (e) {
            throw new Error('Database unavailable');
        }
    }

    return client.db('PlayVerse');
}

// Unified Database and Server Start
async function startServer() {
    try {
        await client.connect();
        dbReady = true;
        console.log('Successfully connected to PlayVerse MongoDB');
    } catch (e) {
        console.warn('MongoDB unavailable. Continuing without DB so Swagger remains accessible.', e.message);
    }

    app.listen(PORT, () => {
        console.log(`Server is safely running on port ${PORT}`);
        console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
    });
}

// Fire up the backend safely
startServer();

// --- AUTHENTICATION ENDPOINTS ---

// 1. User Registration
/**
 * @swagger
 * /api/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [login, password, firstName, lastName]
 *             properties:
 *               login:
 *                 type: string
 *                 example: student123
 *               password:
 *                 type: string
 *                 example: secret123
 *               firstName:
 *                 type: string
 *                 example: Jane
 *               lastName:
 *                 type: string
 *                 example: Doe
 *     responses:
 *       200:
 *         description: Registration result
 */
app.post('/api/register', async (req, res) => {
    const { login, password, firstName, lastName } = req.body;
    let error = '';
    let userId = null;

    try {
        const db = await getDb();

        // Check if user already exists
        const existingUser = await db.collection('Users').findOne({ Login: login });
        if (existingUser) {
            return res.status(200).json({ id: -1, error: 'Username already exists' });
        }

        // Auto-increment placeholder for UserID (or use unique strings/ObjectIds)
        const totalUsers = await db.collection('Users').countDocuments();
        userId = totalUsers + 1;

        const newUser = {
            UserID: userId,
            Login: login,
            Password: password,
            FirstName: firstName,
            LastName: lastName
        };

        await db.collection('Users').insertOne(newUser);
    } catch (e) {
        error = e.toString();
        userId = -1;
    }

    res.status(200).json({ id: userId, error });
});

// 2. User Login
/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Log in an existing user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [login, password]
 *             properties:
 *               login:
 *                 type: string
 *                 example: student123
 *               password:
 *                 type: string
 *                 example: secret123
 *     responses:
 *       200:
 *         description: Login result
 */
app.post('/api/login', async (req, res) => {
    const { login, password } = req.body;
    let error = '';
    let id = -1;
    let fn = '';
    let ln = '';

    try {
        const db = await getDb();
        const result = await db.collection('Users').findOne({ Login: login, Password: password });

        if (result) {
            id = result.UserID;
            fn = result.FirstName;
            ln = result.LastName;
        } else {
            error = 'Invalid username or password';
        }
    } catch (e) {
        error = e.toString();
    }

    res.status(200).json({ id, firstName: fn, lastName: ln, error });
});

// --- PLAYLIST / MEDIA MANAGEMENT ENDPOINTS ---

// 3. Add Media to Playlist
/**
 * @swagger
 * /api/addmedia:
 *   post:
 *     summary: Add a media item to a user's playlist
 *     tags: [Media]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, mediaId, title, mediaType]
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 1
 *               mediaId:
 *                 type: string
 *                 example: tmdb-123
 *               title:
 *                 type: string
 *                 example: Inception
 *               mediaType:
 *                 type: string
 *                 enum: [movie, game, music]
 *                 example: movie
 *               userRating:
 *                 type: number
 *                 example: 5
 *     responses:
 *       200:
 *         description: Media item added
 */
app.post('/api/addmedia', async (req, res) => {
    const { userId, mediaId, title, mediaType, userRating } = req.body;
    let error = '';

    const newMediaItem = {
        UserId: userId,
        MediaId: mediaId,
        Title: title,
        MediaType: mediaType,
        UserRating: Number(userRating) || 0,
        SavedAt: new Date()
    };

    try {
        const db = await getDb();

        // Prevent duplicate entries of the exact same media item for the same user
        const existing = await db.collection('UserMedia').findOne({ UserId: userId, MediaId: mediaId });
        if (existing) {
            return res.status(200).json({ error: 'Item already in playlist' });
        }

        await db.collection('UserMedia').insertOne(newMediaItem);
    } catch (e) {
        error = e.toString();
    }

    res.status(200).json({ error });
});

// 4. Remove Media from Playlist
/**
 * @swagger
 * /api/removemedia:
 *   post:
 *     summary: Remove a media item from a user's playlist
 *     tags: [Media]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, mediaId]
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 1
 *               mediaId:
 *                 type: string
 *                 example: tmdb-123
 *     responses:
 *       200:
 *         description: Media item removed
 */
app.post('/api/removemedia', async (req, res) => {
    const { userId, mediaId } = req.body;
    let error = '';

    try {
        const db = await getDb();
        await db.collection('UserMedia').deleteOne({ UserId: userId, MediaId: mediaId });
    } catch (e) {
        error = e.toString();
    }

    res.status(200).json({ error });
});

// 5. Rate / Edit Rating (Unified Endpoint)
/**
 * @swagger
 * /api/updaterating:
 *   post:
 *     summary: Update a user's rating for a media item
 *     tags: [Media]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, mediaId, newUserRating]
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 1
 *               mediaId:
 *                 type: string
 *                 example: tmdb-123
 *               newUserRating:
 *                 type: number
 *                 example: 4
 *     responses:
 *       200:
 *         description: Rating updated
 */
app.post('/api/updaterating', async (req, res) => {
    const { userId, mediaId, newUserRating } = req.body;
    let error = '';

    try {
        const db = await getDb();
        const result = await db.collection('UserMedia').updateOne(
            { UserId: userId, MediaId: mediaId },
            { $set: { UserRating: Number(newUserRating) } }
        );

        if (result.matchedCount === 0) {
            error = 'Media item not found in user playlist';
        }
    } catch (e) {
        error = e.toString();
    }

    res.status(200).json({ error });
});

// 6. Get Ranked Playlist
/**
 * @swagger
 * /api/getrankedmedia:
 *   post:
 *     summary: Retrieve a user's ranked media playlist
 *     tags: [Media]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 1
 *               mediaType:
 *                 type: string
 *                 enum: [movie, game, music]
 *                 example: movie
 *     responses:
 *       200:
 *         description: Ranked playlist returned
 */
app.post('/api/getrankedmedia', async (req, res) => {
    const { userId, mediaType } = req.body;
    let error = '';
    let results = [];

    try {
        const db = await getDb();
        let query = { UserId: userId };

        if (mediaType) {
            query.MediaType = mediaType;
        }

        // Sort automatically by UserRating in descending order (highest rating first)
        results = await db.collection('UserMedia')
            .find(query)
            .sort({ UserRating: -1 })
            .toArray();
    } catch (e) {
        error = e.toString();
    }

    res.status(200).json({ results, error });
});

