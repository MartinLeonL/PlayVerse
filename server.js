// server.js
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); 

// MongoDB Connection Setup
const url = process.env.MONGODB_URI || '';
const client = new MongoClient(url);

async function connectDB() {
    try {
        await client.connect();
        console.log("Successfully connected to PlayVerse MongoDB");
    } catch (e) {
        console.error("MongoDB connection failed:", e);
    }
}
connectDB();

// --- AUTHENTICATION ENDPOINTS ---

// 1. User Registration
app.post('/api/register', async (req, res) => {
    const { login, password, firstName, lastName } = req.body;
    let error = '';
    let userId = null;

    try {
        const db = client.db('PlayVerse');
        
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

    res.status(200).json({ id: userId, error: error });
});

// 2. User Login
app.post('/api/login', async (req, res) => {
    const { login, password } = req.body;
    let error = '';
    let id = -1;
    let fn = '';
    let ln = '';

    try {
        const db = client.db('PlayVerse');
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
app.post('/api/addmedia', async (req, res) => {
    const { userId, mediaId, title, mediaType, userRating } = req.body;
    let error = '';

    const newMediaItem = { 
        UserId: userId, 
        MediaId: mediaId,       // ID coming from TMDB / IGDB / Spotify
        Title: title,           
        MediaType: mediaType,   // 'movie', 'game', or 'music'
        UserRating: Number(userRating) || 0, 
        SavedAt: new Date()
    };

    try {
        const db = client.db('PlayVerse');
        
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
app.post('/api/removemedia', async (req, res) => {
    const { userId, mediaId } = req.body;
    let error = '';

    try {
        const db = client.db('PlayVerse');
        await db.collection('UserMedia').deleteOne({ UserId: userId, MediaId: mediaId });
    } catch (e) {
        error = e.toString();
    }

    res.status(200).json({ error });
});

// 5. Rate / Edit Rating (Unified Endpoint)
app.post('/api/updaterating', async (req, res) => {
    const { userId, mediaId, newUserRating } = req.body;
    let error = '';

    try {
        const db = client.db('PlayVerse');
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
app.post('/api/getrankedmedia', async (req, res) => {
    const { userId, mediaType } = req.body;
    let error = '';
    let results = [];

    try {
        const db = client.db('PlayVerse');
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
