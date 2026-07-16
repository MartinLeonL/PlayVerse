// server.js
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { setupSwagger } = require('./config/swagger');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',   // temporary permissive for testing
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const getRealIp = require('./middleware/getRealIp');

app.use((req, res, next) => {
  req.realIp = getRealIp(req);
  next();
});

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
            console.log('Successfully connected to PlayVerse MongoDB');
        } catch (e) {
            console.warn('MongoDB unavailable. Continuing without DB so Swagger remains accessible.', e.message);
        }
    }
    return client.db('PlayVerse');
}

// Start Server
async function startServer() {
    await getDb();
    app.listen(PORT, () => {
        console.log(`Server is safely running on port ${PORT}`);
        console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
    });
}

startServer();

app.post('/api/register', async (req, res) => {
    console.log(`[REGISTER] IP: ${req.realIp} | Login: ${req.body.login}`);

    const { login, password, firstName, lastName, email } = req.body; // ← added email
    let error = '';
    let userId = null;

    try {
        const db = await getDb();
        const existingUser = await db.collection('Users').findOne({ Login: login });
        if (existingUser) {
            return res.status(200).json({ id: -1, error: 'Username already exists' });
        }

        const totalUsers = await db.collection('Users').countDocuments();
        userId = totalUsers + 1;

        const newUser = {
            UserID: userId,
            Login: login,
            Password: password,
            FirstName: firstName,
            LastName: lastName,
            Email: email, // ← added
        };

        await db.collection('Users').insertOne(newUser);
    } catch (e) {
        error = e.toString();
        userId = -1;
    }

    res.status(200).json({ id: userId, error });
});

app.post('/api/login', async (req, res) => {
    console.log(`[LOGIN] IP: ${req.realIp} | Login: ${req.body.login}`);

    const { login, password } = req.body;
    let error = '';
    let id = -1;
    let fn = '';
    let ln = '';
    let em = '';       // ← added
    let loginOut = ''; // ← added

    try {
        const db = await getDb();
        const result = await db.collection('Users').findOne({ Login: login, Password: password });

        if (result) {
            id = result.UserID;
            fn = result.FirstName;
            ln = result.LastName;
            em = result.Email || '';      // ← added — handles old accounts registered before this fix
            loginOut = result.Login;      // ← added
        } else {
            error = 'Invalid username or password';
        }
    } catch (e) {
        error = e.toString();
    }

    // login + email now included in the response
    res.status(200).json({ id, firstName: fn, lastName: ln, login: loginOut, email: em, error });
});

// Update profile fields (first name, last name, username/login, email)
app.post('/api/updateprofile', async (req, res) => {
    console.log(`[UPDATE PROFILE] IP: ${req.realIp} | UserID: ${req.body.userId}`);

    const { userId, firstName, lastName, login, email } = req.body;
    let error = '';

    try {
        const db = await getDb();

        // only update fields that were actually sent
        const updateFields = {};
        if (firstName !== undefined) updateFields.FirstName = firstName;
        if (lastName !== undefined) updateFields.LastName = lastName;
        if (email !== undefined) updateFields.Email = email;

        if (login !== undefined) {
            // if changing the username, make sure nobody else already has it
            const existing = await db.collection('Users').findOne({
                Login: login,
                UserID: { $ne: userId },
            });
            if (existing) {
                return res.status(200).json({ error: 'Username already exists' });
            }
            updateFields.Login = login;
        }

        if (Object.keys(updateFields).length === 0) {
            return res.status(200).json({ error: 'No fields to update' });
        }

        const result = await db.collection('Users').updateOne(
            { UserID: userId },
            { $set: updateFields }
        );

        if (result.matchedCount === 0) {
            error = 'User not found';
        }
    } catch (e) {
        error = e.toString();
    }

    res.status(200).json({ error });
});

// Update password
app.post('/api/updatepassword', async (req, res) => {
    console.log(`[UPDATE PASSWORD] IP: ${req.realIp} | UserID: ${req.body.userId}`);

    const { userId, currentPassword, newPassword } = req.body;
    let error = '';

    try {
        const db = await getDb();
        const user = await db.collection('Users').findOne({ UserID: userId });

        if (!user) {
            return res.status(200).json({ error: 'User not found' });
        }

        if (user.Password !== currentPassword) {
            return res.status(200).json({ error: 'Current password is incorrect' });
        }

        await db.collection('Users').updateOne(
            { UserID: userId },
            { $set: { Password: newPassword } }
        );
    } catch (e) {
        error = e.toString();
    }

    res.status(200).json({ error });
});

// Delete Account
app.post('/api/deleteaccount', async (req, res) => {
    console.log(`[DELETE ACCOUNT] IP: ${req.realIp} | UserID: ${req.body.userId}`);

    const { userId } = req.body;
    let error = '';

    try {
        const db = await getDb();
        await db.collection('Users').deleteOne({ UserID: userId });
        await db.collection('UserMedia').deleteMany({ UserId: userId });
    } catch (e) {
        error = e.toString();
    }

    res.status(200).json({ error });
});

// Add Media to Playlist
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
 
// Remove Media from Playlist
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
 
// Rate / Edit Rating (Unified Endpoint)
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
 
// Get Ranked Playlist
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