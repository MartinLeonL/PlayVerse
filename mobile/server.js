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

    const { login, password, firstName, lastName, email } = req.body;
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
            Email: email,
        };

        await db.collection('Users').insertOne(newUser);
    } catch (e) {
        error = e.toString();
        userId = -1;
    }

    res.status(200).json({ id: userId, error });
});

app.post('/api/login', async (req, res) => {
    const { login, password } = req.body;
    let error = '';
    let id = -1;
    let fn = '';
    let ln = '';
    let em = '';
    let loginOut = '';

    try {
        const db = await getDb();

        const result = await db.collection('Users').findOne({
            $or: [{ Login: login }, { Email: login }],
            Password: password,
        });

        if (result) {
            id = result.UserID;
            fn = result.FirstName;
            ln = result.LastName;
            em = result.Email || '';
            loginOut = result.Login;
        } else {
            error = 'Invalid username/email or password';
        }
    } catch (e) {
        error = e.toString();
    }

    res.status(200).json({ id, firstName: fn, lastName: ln, login: loginOut, email: em, error });
});


app.post('/api/getmediauserentry', async (req, res) => {
    const { userId, mediaId } = req.body;
    let error = '';
    let rating = null;
    let note = '';

    try {
        const db = await getDb();
        const entry = await db.collection('UserMedia').findOne({ UserId: userId, MediaId: mediaId });
        if (entry) {
            rating = entry.UserRating ?? null;
            note = entry.Note ?? '';
        }
    } catch (e) {
        error = e.toString();
    }

    res.status(200).json({ error, rating, note });
});


app.post('/api/updatenote', async (req, res) => {
    const { userId, mediaId, title, mediaType, note } = req.body;
    let error = '';

    if (typeof note !== 'string' || note.length > 500) {
        return res.status(200).json({ error: 'Note must be a string of 500 characters or fewer' });
    }

    try {
        const db = await getDb();
        await db.collection('UserMedia').updateOne(
            { UserId: userId, MediaId: mediaId },
            {
                $set: { Note: note },
                $setOnInsert: {
                    UserId: userId,
                    MediaId: mediaId,
                    Title: title,
                    MediaType: mediaType,
                    SavedAt: new Date(),
                },
            },
            { upsert: true }
        );
    } catch (e) {
        error = e.toString();
    }

    res.status(200).json({ error });
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
        await db.collection('Playlists').deleteMany({ UserId: userId });
    } catch (e) {
        error = e.toString();
    }

    res.status(200).json({ error });
});

// Add Media to Playlist
app.post('/api/addmedia', async (req, res) => {
    const { userId, mediaId, title, mediaType, playlistName, userRating } = req.body;
    let error = '';

    if (!playlistName) {
        return res.status(200).json({ error: 'playlistName is required' });
    }

    const newMediaItem = {
        UserId: userId,
        MediaId: mediaId,
        Title: title,
        MediaType: mediaType,
        PlaylistName: playlistName,
        UserRating: Number(userRating) || 0,
        SavedAt: new Date()
    };

    try {
        const db = await getDb();

        // Uniqueness is per (user, media, playlist) — the same item can
        // exist in multiple playlists, just not twice in the same one.
        const existing = await db.collection('UserMedia').findOne({ UserId: userId, MediaId: mediaId, PlaylistName: playlistName });
        if (existing) {
            return res.status(200).json({ error: 'Item already in this playlist' });
        }

        await db.collection('UserMedia').insertOne(newMediaItem);
    } catch (e) {
        error = e.toString();
    }

    res.status(200).json({ error });
});

// Remove Media from Playlist
app.post('/api/removemedia', async (req, res) => {
    const { userId, mediaId, playlistName } = req.body;
    let error = '';

    if (!playlistName) {
        return res.status(200).json({ error: 'playlistName is required' });
    }

    try {
        const db = await getDb();
        await db.collection('UserMedia').deleteOne({ UserId: userId, MediaId: mediaId, PlaylistName: playlistName });
    } catch (e) {
        error = e.toString();
    }

    res.status(200).json({ error });
});


app.post('/api/updaterating', async (req, res) => {
    const { userId, mediaId, title, mediaType, newUserRating } = req.body;
    let error = '';

    try {
        const db = await getDb();
        await db.collection('UserMedia').updateOne(
            { UserId: userId, MediaId: mediaId },
            {
                $set: { UserRating: Number(newUserRating) },
                $setOnInsert: {
                    UserId: userId,
                    MediaId: mediaId,
                    Title: title,
                    MediaType: mediaType,
                    SavedAt: new Date(),
                },
            },
            { upsert: true }
        );
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


const TMDB_API_KEY = process.env.TMDB_API_KEY;
const RAWG_API_KEY = process.env.RAWG_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

let movieGenreMap = null;
let tvGenreMap = null;

async function getGenreMap(type) {
    const cache = type === 'movie' ? movieGenreMap : tvGenreMap;
    if (cache) return cache;

    const r = await fetch(`${TMDB_BASE}/genre/${type}/list?api_key=${TMDB_API_KEY}`);
    const data = await r.json();

    if (!r.ok) {
        console.error(`TMDB genre list (${type}) error:`, data);
        throw new Error(data.status_message || `TMDB genre list returned ${r.status}`);
    }

    const map = {};
    (data.genres || []).forEach(g => { map[g.id] = g.name; });
    if (type === 'movie') movieGenreMap = map; else tvGenreMap = map;
    return map;
}


function mapDeezerTrack(track) {
    const durationSec = track.duration || 0;
    const minutes = Math.floor(durationSec / 60);
    const seconds = (durationSec % 60).toString().padStart(2, '0');
    return {
        mediaId: `deezer-${track.id}`,
        title: track.title,
        mediaType: 'music',
        imageUrl: track.album?.cover_medium || track.album?.cover || '',
        bannerUrl: track.album?.cover_xl || track.album?.cover_big || track.album?.cover || '',

        genres: track.artist?.name ? [track.artist.name] : [],
        description: track.album?.title ? `From the album "${track.album.title}"` : '',

        averageRating: null,
        ratingCount: 0,

        releaseDate: track.release_date || '',
        language: '--',
        platforms: [],
        runtime: durationSec ? `${minutes}:${seconds}` : 'N/A',
    };
}

function mapTmdbItem(raw, mediaType, genreMap) {
    const isMovie = mediaType === 'movie';
    return {
        mediaId: `tmdb-${raw.id}`,
        title: isMovie ? raw.title : raw.name,
        mediaType,
        imageUrl: raw.poster_path ? `${TMDB_IMG}/w500${raw.poster_path}` : '',
        bannerUrl: raw.backdrop_path ? `${TMDB_IMG}/w780${raw.backdrop_path}` : '',
        genres: (raw.genre_ids || []).map(id => genreMap[id]).filter(Boolean),
        description: raw.overview || '',
        averageRating: raw.vote_average || null,
        ratingCount: raw.vote_count || 0,
        releaseDate: isMovie ? (raw.release_date || '') : (raw.first_air_date || ''),
        language: raw.original_language || '',
        platforms: [],     // not populated in the list view — see chat notes
        runtime: 'N/A',    // not populated in the list view — see chat notes
    };
}

let popularMoviePool = null;
let popularTvPool = null;

async function buildPopularPool(tmdbMediaType) {
    const genreMap = await getGenreMap(tmdbMediaType);
    // Movies use a lower vote threshold and bigger pool than before —
    // 50 votes instead of 100, 30 pages instead of 20 (~600 titles) —
    // to surface more results while still excluding total unknowns.
    const minVotes = tmdbMediaType === 'movie' ? 50 : 100;
    const pageCount = tmdbMediaType === 'movie' ? 30 : 20;
    const pageNumbers = Array.from({ length: pageCount }, (_, i) => i + 1);

    const pages = await Promise.all(pageNumbers.map(async (p) => {
        const r = await fetch(`${TMDB_BASE}/discover/${tmdbMediaType}?api_key=${TMDB_API_KEY}&page=${p}&sort_by=popularity.desc&vote_count.gte=${minVotes}&language=en-US`);
        const data = await r.json();
        if (!r.ok) {
            console.error(`TMDB pool build error (${tmdbMediaType}, page ${p}):`, data);
            return [];
        }
        return (data.results || []).map(i => mapTmdbItem(i, tmdbMediaType === 'tv' ? 'show' : 'movie', genreMap));
    }));

    // de-dupe in case TMDB's list shifted slightly mid-fetch across pages
    const seen = new Set();
    const pool = [];
    for (const page of pages) {
        for (const item of page) {
            if (!seen.has(item.mediaId)) {
                seen.add(item.mediaId);
                pool.push(item);
            }
        }
    }
    return pool;
}


let popularGamePool = null;

async function buildPopularGamePool() {
    const pageCount = 20; // ~400 games
    const pageNumbers = Array.from({ length: pageCount }, (_, i) => i + 1);

    const pages = await Promise.all(pageNumbers.map(async (p) => {
        // metacritic=40,100 excludes games with no/very low critic score —
        // the RAWG equivalent of TMDB's vote_count filter, keeping out
        // the flood of barely-known indie/asset-flip titles.
        const r = await fetch(`https://api.rawg.io/api/games?key=${RAWG_API_KEY}&page_size=20&page=${p}&ordering=-added&metacritic=40,100`);
        const data = await r.json();
        if (!r.ok) {
            console.error(`RAWG pool build error (page ${p}):`, data);
            return [];
        }
        return data.results || [];
    }));

    const seen = new Set();
    const pool = [];
    for (const page of pages) {
        for (const g of page) {
            if (!seen.has(g.id)) {
                seen.add(g.id);
                pool.push({
                    mediaId: `rawg-${g.id}`,
                    _rawgId: g.id, // internal only, stripped before sending to client
                    title: g.name,
                    mediaType: 'game',
                    imageUrl: g.background_image || '',
                    bannerUrl: g.background_image || '',
                    genres: (g.genres || []).map(x => x.name),
                    description: '', // hydrated lazily — see hydrateGameDescriptions
                    averageRating: g.rating ? g.rating * 2 : null,
                    ratingCount: g.ratings_count || 0,
                    releaseDate: g.released || '',
                    language: '',
                    platforms: (g.platforms || []).map(p => p.platform.name),
                    runtime: g.playtime ? `${g.playtime}h` : 'N/A',
                });
            }
        }
    }
    return pool;
}

async function hydrateGameDescriptions(items) {
    await Promise.all(items.map(async (item) => {
        if (item.description) return; // already fetched on a previous request
        try {
            const detailRes = await fetch(`https://api.rawg.io/api/games/${item._rawgId}?key=${RAWG_API_KEY}`);
            const detail = await detailRes.json();
            if (detailRes.ok) {
                item.description = (detail.description_raw || '').slice(0, 500);
            } else {
                console.error(`RAWG game detail error (id ${item._rawgId}):`, detail);
            }
        } catch (e) {
            console.error(`RAWG game detail fetch failed (id ${item._rawgId}):`, e);
        }
    }));
}

function sortPool(pool, sort) {
    const sorted = [...pool];
    switch (sort) {
        case 'az':
            sorted.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'za':
            sorted.sort((a, b) => b.title.localeCompare(a.title));
            break;
        case 'recent':
            sorted.sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''));
            break;
        case 'highest':
            sorted.sort((a, b) => (b.averageRating ?? -1) - (a.averageRating ?? -1));
            break;
        case 'lowest':
            sorted.sort((a, b) => (a.averageRating ?? 999) - (b.averageRating ?? 999));
            break;
        case 'trending':
        default:
            break; // pool is already popularity-ordered
    }
    return sorted;
}

// Maps our app's sort options to RAWG's ordering param.
function rawgOrderingParam(sort) {
    switch (sort) {
        case 'az': return 'name';
        case 'za': return '-name';
        case 'recent': return '-released';
        case 'highest': return '-rating';
        case 'lowest': return 'rating';
        case 'trending':
        default: return '-added';
    }
}

app.get('/api/getmovies', async (req, res) => {
    try {
        const genreMap = await getGenreMap('movie');
        const r = await fetch(`${TMDB_BASE}/trending/movie/week?api_key=${TMDB_API_KEY}`);
        const data = await r.json();

        if (!r.ok) {
            console.error('TMDB /getmovies error:', data);
            return res.status(200).json({ results: [], error: data.status_message || `TMDB returned ${r.status}` });
        }

        res.status(200).json({ results: (data.results || []).map(i => mapTmdbItem(i, 'movie', genreMap)), error: '' });
    } catch (e) {
        console.error('Error in /api/getmovies:', e);
        res.status(200).json({ results: [], error: e.toString() });
    }
});

app.get('/api/getshows', async (req, res) => {
    try {
        const genreMap = await getGenreMap('tv');
        const r = await fetch(`${TMDB_BASE}/trending/tv/week?api_key=${TMDB_API_KEY}`);
        const data = await r.json();

        if (!r.ok) {
            console.error('TMDB /getshows error:', data);
            return res.status(200).json({ results: [], error: data.status_message || `TMDB returned ${r.status}` });
        }

        res.status(200).json({ results: (data.results || []).map(i => mapTmdbItem(i, 'show', genreMap)), error: '' });
    } catch (e) {
        console.error('Error in /api/getshows:', e);
        res.status(200).json({ results: [], error: e.toString() });
    }
});

app.get('/api/getgames', async (req, res) => {
    try {
        const listRes = await fetch(`https://api.rawg.io/api/games?key=${RAWG_API_KEY}&page_size=20&ordering=-added`);
        const listData = await listRes.json();

        if (!listRes.ok) {
            console.error('RAWG /getgames error:', listData);
            return res.status(200).json({ results: [], error: listData.detail || `RAWG returned ${listRes.status}` });
        }

        const games = listData.results || [];

        const results = await Promise.all(games.map(async (g) => {
            let description = '';
            try {
                const detailRes = await fetch(`https://api.rawg.io/api/games/${g.id}?key=${RAWG_API_KEY}`);
                const detail = await detailRes.json();
                if (detailRes.ok) {
                    description = (detail.description_raw || '').slice(0, 500);
                } else {
                    console.error(`RAWG game detail error (id ${g.id}):`, detail);
                }
            } catch (e) {
                console.error(`RAWG game detail fetch failed (id ${g.id}):`, e);
                // description stays blank if this one call fails
            }
            return {
                mediaId: `rawg-${g.id}`,
                title: g.name,
                mediaType: 'game',
                imageUrl: g.background_image || '',
                bannerUrl: g.background_image || '',
                genres: (g.genres || []).map(x => x.name),
                description,
                // RAWG rates out of 5, TMDB rates out of 10 — normalize
                // so averageRating always means "out of 10" everywhere
                // in the app, including anywhere ratings get compared
                // or sorted across media types.
                averageRating: g.rating ? g.rating * 2 : null,
                ratingCount: g.ratings_count || 0,
                releaseDate: g.released || '',
                language: '',
                platforms: (g.platforms || []).map(p => p.platform.name),
                runtime: g.playtime ? `${g.playtime}h` : 'N/A',
            };
        }));

        res.status(200).json({ results, error: '' });
    } catch (e) {
        console.error('Error in /api/getgames:', e);
        res.status(200).json({ results: [], error: e.toString() });
    }
});


app.get('/api/allmovies', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || 'trending';
    try {
        if (!popularMoviePool) {
            popularMoviePool = await buildPopularPool('movie');
        }
        const sorted = sortPool(popularMoviePool, sort);
        const pageSize = 20;
        const start = (page - 1) * pageSize;
        const results = sorted.slice(start, start + pageSize);
        res.status(200).json({ results, error: '' });
    } catch (e) {
        console.error('Error in /api/allmovies:', e);
        res.status(200).json({ results: [], error: e.toString() });
    }
});

app.get('/api/allshows', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || 'trending';
    try {
        if (!popularTvPool) {
            popularTvPool = await buildPopularPool('tv');
        }
        const sorted = sortPool(popularTvPool, sort);
        const pageSize = 20;
        const start = (page - 1) * pageSize;
        const results = sorted.slice(start, start + pageSize);
        res.status(200).json({ results, error: '' });
    } catch (e) {
        console.error('Error in /api/allshows:', e);
        res.status(200).json({ results: [], error: e.toString() });
    }
});

app.get('/api/allgames', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || 'trending';
    try {
        if (!popularGamePool) {
            popularGamePool = await buildPopularGamePool();
        }
        const sorted = sortPool(popularGamePool, sort);
        const pageSize = 20;
        const start = (page - 1) * pageSize;
        const pageItems = sorted.slice(start, start + pageSize);

        await hydrateGameDescriptions(pageItems);

        const results = pageItems.map(({ _rawgId, ...rest }) => rest);
        res.status(200).json({ results, error: '' });
    } catch (e) {
        console.error('Error in /api/allgames:', e);
        res.status(200).json({ results: [], error: e.toString() });
    }
});

// ============================================================
// Trailer lookup — searches YouTube for the closest match
// ============================================================
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

app.get('/api/gettrailer', async (req, res) => {
    const { title, mediaType } = req.query;
    if (!title) return res.status(200).json({ videoId: null, error: 'title is required' });

    try {
        const q = encodeURIComponent(`${title} ${mediaType === 'game' ? 'trailer' : 'official trailer'}`);
        const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${q}&key=${YOUTUBE_API_KEY}`);
        const data = await r.json();

        if (!r.ok) {
            console.error('YouTube trailer search error:', data);
            return res.status(200).json({ videoId: null, error: data.error?.message || `YouTube returned ${r.status}` });
        }

        const videoId = data.items?.[0]?.id?.videoId || null;
        res.status(200).json({ videoId, error: videoId ? '' : 'No trailer found' });
    } catch (e) {
        console.error('Error in /api/gettrailer:', e);
        res.status(200).json({ videoId: null, error: e.toString() });
    }
});


app.get('/api/searchmovies', async (req, res) => {
    const query = (req.query.query || '').trim();
    if (!query) return res.status(200).json({ results: [], error: '' });

    try {
        const genreMap = await getGenreMap('movie');
        const r = await fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US`);
        const data = await r.json();

        if (!r.ok) {
            console.error('TMDB /searchmovies error:', data);
            return res.status(200).json({ results: [], error: data.status_message || `TMDB returned ${r.status}` });
        }

        res.status(200).json({ results: (data.results || []).map(i => mapTmdbItem(i, 'movie', genreMap)), error: '' });
    } catch (e) {
        console.error('Error in /api/searchmovies:', e);
        res.status(200).json({ results: [], error: e.toString() });
    }
});

app.get('/api/searchshows', async (req, res) => {
    const query = (req.query.query || '').trim();
    if (!query) return res.status(200).json({ results: [], error: '' });

    try {
        const genreMap = await getGenreMap('tv');
        const r = await fetch(`${TMDB_BASE}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US`);
        const data = await r.json();

        if (!r.ok) {
            console.error('TMDB /searchshows error:', data);
            return res.status(200).json({ results: [], error: data.status_message || `TMDB returned ${r.status}` });
        }

        res.status(200).json({ results: (data.results || []).map(i => mapTmdbItem(i, 'show', genreMap)), error: '' });
    } catch (e) {
        console.error('Error in /api/searchshows:', e);
        res.status(200).json({ results: [], error: e.toString() });
    }
});

app.get('/api/searchgames', async (req, res) => {
    const query = (req.query.query || '').trim();
    if (!query) return res.status(200).json({ results: [], error: '' });

    try {
        const r = await fetch(`https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(query)}&page_size=20`);
        const listData = await r.json();

        if (!r.ok) {
            console.error('RAWG /searchgames error:', listData);
            return res.status(200).json({ results: [], error: listData.detail || `RAWG returned ${r.status}` });
        }

        const games = listData.results || [];
        const results = await Promise.all(games.map(async (g) => {
            let description = '';
            try {
                const detailRes = await fetch(`https://api.rawg.io/api/games/${g.id}?key=${RAWG_API_KEY}`);
                const detail = await detailRes.json();
                if (detailRes.ok) description = (detail.description_raw || '').slice(0, 500);
            } catch (e) {
                console.error(`RAWG search detail fetch failed (id ${g.id}):`, e);
            }
            return {
                mediaId: `rawg-${g.id}`,
                title: g.name,
                mediaType: 'game',
                imageUrl: g.background_image || '',
                bannerUrl: g.background_image || '',
                genres: (g.genres || []).map(x => x.name),
                description,
                averageRating: g.rating ? g.rating * 2 : null,
                ratingCount: g.ratings_count || 0,
                releaseDate: g.released || '',
                language: '',
                platforms: (g.platforms || []).map(p => p.platform.name),
                runtime: g.playtime ? `${g.playtime}h` : 'N/A',
            };
        }));

        res.status(200).json({ results, error: '' });
    } catch (e) {
        console.error('Error in /api/searchgames:', e);
        res.status(200).json({ results: [], error: e.toString() });
    }
});


function languageDisplayName(code) {
    if (!code) return '--';
    try {
        const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
        return displayNames.of(code) || code;
    } catch (e) {
        return code;
    }
}

app.get('/api/mediadetails', async (req, res) => {
    const { mediaType, mediaId } = req.query;
    if (!mediaType || !mediaId) {
        return res.status(200).json({ error: 'mediaType and mediaId are required' });
    }

    try {
        if (mediaType === 'movie' || mediaType === 'show') {
            const tmdbId = mediaId.replace(/^tmdb-/, '');
            const tmdbType = mediaType === 'show' ? 'tv' : 'movie';

            const [detailRes, providersRes] = await Promise.all([
                fetch(`${TMDB_BASE}/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`),
                fetch(`${TMDB_BASE}/${tmdbType}/${tmdbId}/watch/providers?api_key=${TMDB_API_KEY}`),
            ]);
            const detail = await detailRes.json();

            if (!detailRes.ok) {
                console.error('TMDB /mediadetails error:', detail);
                return res.status(200).json({ error: detail.status_message || `TMDB returned ${detailRes.status}` });
            }

            let runtime = 'N/A';
            if (tmdbType === 'movie' && detail.runtime) {
                runtime = `${detail.runtime} min`;
            } else if (tmdbType === 'tv' && detail.episode_run_time && detail.episode_run_time.length > 0) {
                runtime = `${detail.episode_run_time[0]} min/ep`;
            }

            let platforms = [];
            if (providersRes.ok) {
                const providersData = await providersRes.json();
                const usProviders = providersData.results?.US;
                const platformNames = new Set();
                if (usProviders) {
                    ['flatrate', 'free', 'ads'].forEach((key) => {
                        (usProviders[key] || []).forEach((p) => platformNames.add(p.provider_name));
                    });
                }
                platforms = Array.from(platformNames);
            }

            return res.status(200).json({
                runtime,
                language: languageDisplayName(detail.original_language),
                platforms,
                releaseDate: tmdbType === 'movie' ? (detail.release_date || '') : (detail.first_air_date || ''),
                error: '',
            });
        }

        if (mediaType === 'game') {
            const rawgId = mediaId.replace(/^rawg-/, '');
            const detailRes = await fetch(`https://api.rawg.io/api/games/${rawgId}?key=${RAWG_API_KEY}`);
            const detail = await detailRes.json();

            if (!detailRes.ok) {
                console.error('RAWG /mediadetails error:', detail);
                return res.status(200).json({ error: detail.detail || `RAWG returned ${detailRes.status}` });
            }

            return res.status(200).json({
                runtime: detail.playtime ? `${detail.playtime}h` : 'N/A',
                language: '--',
                platforms: (detail.platforms || []).map(p => p.platform.name),
                releaseDate: detail.released || '',
                error: '',
            });
        }

        if (mediaType === 'music') {
            const trackId = mediaId.replace(/^deezer-/, '');
            const r = await fetch(`https://api.deezer.com/track/${trackId}`);
            const detail = await r.json();

            if (detail.error) {
                console.error('Deezer /mediadetails error:', detail.error);
                return res.status(200).json({ error: detail.error.message || 'Deezer error' });
            }

            const durationSec = detail.duration || 0;
            return res.status(200).json({
                runtime: durationSec ? `${Math.floor(durationSec / 60)}:${(durationSec % 60).toString().padStart(2, '0')}` : 'N/A',
                language: '--',
                platforms: [], // no "where to watch" equivalent for a single track
                releaseDate: detail.release_date || '',
                error: '',
            });
        }

        res.status(200).json({ error: `Unsupported mediaType: ${mediaType}` });
    } catch (e) {
        console.error('Error in /api/mediadetails:', e);
        res.status(200).json({ error: e.toString() });
    }
});

// ============================================================
// Playlist management — names are stored separately from their
// contents (UserMedia), so an empty playlist still exists after
// creation instead of disappearing until something's added to it.
// ============================================================
app.post('/api/createplaylist', async (req, res) => {
    const { userId, playlistName } = req.body;
    let error = '';

    if (!playlistName || !playlistName.trim()) {
        return res.status(200).json({ error: 'playlistName is required' });
    }

    try {
        const db = await getDb();
        const existing = await db.collection('Playlists').findOne({ UserId: userId, PlaylistName: playlistName });
        if (existing) {
            return res.status(200).json({ error: 'Playlist already exists' });
        }
        await db.collection('Playlists').insertOne({ UserId: userId, PlaylistName: playlistName, CreatedAt: new Date() });
    } catch (e) {
        error = e.toString();
    }

    res.status(200).json({ error });
});

app.post('/api/deleteplaylist', async (req, res) => {
    const { userId, playlistName } = req.body;
    let error = '';

    try {
        const db = await getDb();
        await db.collection('Playlists').deleteOne({ UserId: userId, PlaylistName: playlistName });
        // cascade — also remove every item that was saved under this playlist
        await db.collection('UserMedia').deleteMany({ UserId: userId, PlaylistName: playlistName });
    } catch (e) {
        error = e.toString();
    }

    res.status(200).json({ error });
});

app.post('/api/getplaylists', async (req, res) => {
    const { userId } = req.body;
    let error = '';
    let playlistNames = [];

    try {
        const db = await getDb();
        const results = await db.collection('Playlists').find({ UserId: userId }).toArray();
        playlistNames = results.map(p => p.PlaylistName);
    } catch (e) {
        error = e.toString();
    }

    res.status(200).json({ playlistNames, error });
});


function mapTmdbDetailItem(detail, mediaType) {
    const isMovie = mediaType === 'movie';
    return {
        mediaId: `tmdb-${detail.id}`,
        title: isMovie ? detail.title : detail.name,
        mediaType,
        imageUrl: detail.poster_path ? `${TMDB_IMG}/w500${detail.poster_path}` : '',
        bannerUrl: detail.backdrop_path ? `${TMDB_IMG}/w780${detail.backdrop_path}` : '',
        genres: (detail.genres || []).map(g => g.name),
        description: detail.overview || '',
        averageRating: detail.vote_average || null,
        ratingCount: detail.vote_count || 0,
        releaseDate: isMovie ? (detail.release_date || '') : (detail.first_air_date || ''),
        language: languageDisplayName(detail.original_language),
        platforms: [], // not needed for card display — see /api/mediadetails for the detail page
        runtime: isMovie
            ? (detail.runtime ? `${detail.runtime} min` : 'N/A')
            : (detail.episode_run_time?.[0] ? `${detail.episode_run_time[0]} min/ep` : 'N/A'),
    };
}

function mapRawgDetailItem(detail) {
    return {
        mediaId: `rawg-${detail.id}`,
        title: detail.name,
        mediaType: 'game',
        imageUrl: detail.background_image || '',
        bannerUrl: detail.background_image || '',
        genres: (detail.genres || []).map(g => g.name),
        description: (detail.description_raw || '').slice(0, 500),
        averageRating: detail.rating ? detail.rating * 2 : null,
        ratingCount: detail.ratings_count || 0,
        releaseDate: detail.released || '',
        language: '--',
        platforms: (detail.platforms || []).map(p => p.platform.name),
        runtime: detail.playtime ? `${detail.playtime}h` : 'N/A',
    };
}

app.post('/api/hydratemedia', async (req, res) => {
    const { items } = req.body; // [{ mediaId, mediaType }, ...]
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(200).json({ results: [], error: '' });
    }

    try {
        const results = await Promise.all(items.map(async ({ mediaId, mediaType }) => {
            try {
                if (mediaType === 'movie' || mediaType === 'show') {
                    const tmdbId = mediaId.replace(/^tmdb-/, '');
                    const tmdbType = mediaType === 'show' ? 'tv' : 'movie';
                    const r = await fetch(`${TMDB_BASE}/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`);
                    const detail = await r.json();
                    if (!r.ok) {
                        console.error(`TMDB hydrate error (${mediaId}):`, detail);
                        return null;
                    }
                    return mapTmdbDetailItem(detail, mediaType);
                }
                if (mediaType === 'game') {
                    const rawgId = mediaId.replace(/^rawg-/, '');
                    const r = await fetch(`https://api.rawg.io/api/games/${rawgId}?key=${RAWG_API_KEY}`);
                    const detail = await r.json();
                    if (!r.ok) {
                        console.error(`RAWG hydrate error (${mediaId}):`, detail);
                        return null;
                    }
                    return mapRawgDetailItem(detail);
                }
                if (mediaType === 'music') {
                    const trackId = mediaId.replace(/^deezer-/, '');
                    const r = await fetch(`https://api.deezer.com/track/${trackId}`);
                    const detail = await r.json();
                    if (detail.error) {
                        console.error(`Deezer hydrate error (${mediaId}):`, detail.error);
                        return null;
                    }
                    return mapDeezerTrack(detail);
                }
                return null;
            } catch (e) {
                console.error(`Hydrate failed for ${mediaId}:`, e);
                return null;
            }
        }));

        res.status(200).json({ results: results.filter(Boolean), error: '' });
    } catch (e) {
        console.error('Error in /api/hydratemedia:', e);
        res.status(200).json({ results: [], error: e.toString() });
    }
});

// Trending music (home page row)
app.get('/api/getmusic', async (req, res) => {
    try {
        const r = await fetch('https://api.deezer.com/chart/0/tracks?limit=20');
        const data = await r.json();
        if (data.error) {
            console.error('Deezer /getmusic error:', data.error);
            return res.status(200).json({ results: [], error: data.error.message || 'Deezer error' });
        }
        res.status(200).json({ results: (data.data || []).map(mapDeezerTrack), error: '' });
    } catch (e) {
        console.error('Error in /api/getmusic:', e);
        res.status(200).json({ results: [], error: e.toString() });
    }
});

// Same pool-build-once-and-sort-locally approach as movies/shows —
// Deezer doesn't offer a reliable server-side sort for tracks either,
// and this also naturally filters to popular/known tracks rather than
// the entire catalog.
let popularMusicPool = null;

async function buildPopularMusicPool() {
    const pageCount = 20; // ~500 tracks
    const limit = 25;
    const pageIndexes = Array.from({ length: pageCount }, (_, i) => i * limit);

    const pages = await Promise.all(pageIndexes.map(async (index) => {
        const r = await fetch(`https://api.deezer.com/chart/0/tracks?index=${index}&limit=${limit}`);
        const data = await r.json();
        if (data.error) {
            console.error(`Deezer music pool build error (index ${index}):`, data.error);
            return [];
        }
        return (data.data || []).map(mapDeezerTrack);
    }));

    const seen = new Set();
    const pool = [];
    for (const page of pages) {
        for (const item of page) {
            if (!seen.has(item.mediaId)) {
                seen.add(item.mediaId);
                pool.push(item);
            }
        }
    }
    return pool;
}

app.get('/api/allmusic', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || 'trending';
    try {
        if (!popularMusicPool) {
            popularMusicPool = await buildPopularMusicPool();
        }
        const sorted = sortPool(popularMusicPool, sort);
        const pageSize = 20;
        const start = (page - 1) * pageSize;
        const results = sorted.slice(start, start + pageSize);
        res.status(200).json({ results, error: '' });
    } catch (e) {
        console.error('Error in /api/allmusic:', e);
        res.status(200).json({ results: [], error: e.toString() });
    }
});

app.get('/api/searchmusic', async (req, res) => {
    const query = (req.query.query || '').trim();
    if (!query) return res.status(200).json({ results: [], error: '' });

    try {
        const r = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=20`);
        const data = await r.json();
        if (data.error) {
            console.error('Deezer /searchmusic error:', data.error);
            return res.status(200).json({ results: [], error: data.error.message || 'Deezer error' });
        }
        res.status(200).json({ results: (data.data || []).map(mapDeezerTrack), error: '' });
    } catch (e) {
        console.error('Error in /api/searchmusic:', e);
        res.status(200).json({ results: [], error: e.toString() });
    }
});