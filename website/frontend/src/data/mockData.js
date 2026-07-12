// // Placeholder catalog data. Swap this out for real API responses later —
// // the components below only expect this shape, so nothing else needs to change.

// const gradients = [
//   'linear-gradient(160deg, #6d5bd0, #2e1f63)',
//   'linear-gradient(160deg, #d0466d, #631f3a)',
//   'linear-gradient(160deg, #46a0d0, #1f4763)',
//   'linear-gradient(160deg, #d0a446, #63481f)',
//   'linear-gradient(160deg, #46d08b, #1f6345)',
//   'linear-gradient(160deg, #a446d0, #4b1f63)',
//   'linear-gradient(160deg, #d04646, #631f1f)',
//   'linear-gradient(160deg, #46d0c4, #1f6360)',
// ]

// const providerCatalog = {
//   prime: { label: 'Prime Video', bg: '#00a8e1', fg: '#0b1a2b' },
//   apple: { label: 'Apple TV', bg: '#111111', fg: '#fff' },
//   disney: { label: 'Disney+', bg: '#113ccf', fg: '#fff' },
//   netflix: { label: 'Netflix', bg: '#e50914', fg: '#fff' },
//   spotify: { label: 'Spotify', bg: '#1db954', fg: '#04120a' },
//   steam: { label: 'Steam', bg: '#1b2838', fg: '#fff' },
// }

// // Full genre lists per category — shown as filter pills on each category page.
// export const genresByCategory = {
//   movies: ['Action', 'Sci-Fi', 'Drama', 'Thriller', 'Comedy', 'Romance', 'Horror', 'Mystery'],
//   shows: ['Drama', 'Mystery', 'Action', 'Thriller', 'Comedy', 'Sci-Fi', 'Crime', 'Fantasy'],
//   music: ['Indie Pop', 'Synthwave', 'Alt Rock', 'Lo-fi', 'Hip-Hop', 'R&B', 'Folk', 'Electronic'],
//   games: ['Action', 'RPG', 'Open World', 'Strategy', 'Adventure', 'Simulation', 'Puzzle', 'Horror'],
// }

// // Two-genre combos assigned round-robin to items within each category.
// const genrePairsByCategory = {
//   movies: [
//     ['Action', 'Sci-Fi'], ['Drama', 'Thriller'], ['Comedy', 'Romance'], ['Horror', 'Mystery'],
//   ],
//   shows: [
//     ['Drama', 'Mystery'], ['Action', 'Thriller'], ['Comedy', 'Crime'], ['Sci-Fi', 'Fantasy'],
//   ],
//   music: [
//     ['Indie Pop'], ['Synthwave', 'Electronic'], ['Alt Rock'], ['Lo-fi'], ['Hip-Hop'], ['R&B'], ['Folk'],
//   ],
//   games: [
//     ['Action', 'RPG'], ['Open World', 'Adventure'], ['Strategy'], ['Simulation'], ['Puzzle'], ['Action', 'Horror'],
//   ],
// }

// const providersByType = {
//   movie: [['prime', 'apple'], ['netflix'], ['disney', 'apple'], ['prime']],
//   show: [['netflix'], ['disney'], ['prime', 'apple'], ['netflix', 'prime']],
//   music: [['spotify'], ['spotify', 'apple'], ['spotify'], ['apple']],
//   game: [['steam'], ['steam'], ['steam'], ['steam']],
// }

// const durationLabelByType = { movie: 'Runtime', show: 'Runtime', music: 'Duration', game: 'Playtime' }
// const tagByType = { movie: 'Movie', show: 'Series', music: 'Song', game: 'Game' }
// const sourceByType = { movie: 'TMDB', show: 'TMDB', music: 'Spotify', game: 'IGDB' }
// const categoryByType = { movie: 'movies', show: 'shows', music: 'music', game: 'games' }

// function build(type, names) {
//   const category = categoryByType[type]
//   const pairs = genrePairsByCategory[category]

//   return names.map((title, i) => {
//     const genres = pairs[i % pairs.length]
//     return {
//       id: `${title}-${i}`,
//       type,
//       tag: tagByType[type],
//       title,
//       gradient: gradients[i % gradients.length],
//       genres,
//       genre: genres.join(' • '),
//       date: `0${(i % 9) + 1}/12/2026`,
//       duration:
//         type === 'music'
//           ? `${2 + (i % 3)}:${String((15 + i * 7) % 60).padStart(2, '0')}`
//           : `${1 + (i % 2)}h ${20 + i * 3}m`,
//       durationLabel: durationLabelByType[type],
//       language: 'English',
//       source: sourceByType[type],
//       description:
//         'A short synopsis will go here once real catalog data is connected. For now this is placeholder copy so the layout can be reviewed end to end.',
//       providers: providersByType[type][i % providersByType[type].length].map((key) => ({
//         key,
//         ...providerCatalog[key],
//       })),
//     }
//   })
// }

// export const movies = build('movie', [
//   'Silver Horizon', 'Midnight Runner', 'Glass Orbit', 'Echo Valley', 'Paper Tigers', 'Last Frequency', 'Amber Road', 'Static Bloom',
// ])

// export const shows = build('show', [
//   'The Long Dark', 'Cedar Heights', 'Vantage Point', 'Nightfall Ave', 'Blue Static', 'Hollow Court', 'Redline', 'The Understudy',
// ])

// export const music = build('music', [
//   'Low Tide', 'Neon Fields', 'Paper Moon', 'Concrete Bloom', 'Slow Static', 'Amber Skies', 'Glasshouse', 'Wire & Wax',
// ])

// export const games = build('game', [
//   'Ashen Reach', 'Nightshift', 'Ironvale', 'Drift Protocol', 'Hollow Sky', 'Faultline', 'Rust & Ruin', 'Copper Sun',
// ])

// export const heroSlides = movies.slice(0, 5)

// export const allMedia = [...movies, ...shows, ...music, ...games]

// export function getMediaById(id) {
//   return allMedia.find((item) => item.id === id)
// }

// src/data/mockData.js

const providerCatalog = {
  prime: {
    key: "prime",
    label: "Prime Video",
    bg: "#00a8e1",
    fg: "#0b1a2b",
  },
  apple: {
    key: "apple",
    label: "Apple TV",
    bg: "#111111",
    fg: "#ffffff",
  },
  disney: {
    key: "disney",
    label: "Disney+",
    bg: "#113ccf",
    fg: "#ffffff",
  },
  netflix: {
    key: "netflix",
    label: "Netflix",
    bg: "#e50914",
    fg: "#ffffff",
  },
  spotify: {
    key: "spotify",
    label: "Spotify",
    bg: "#1db954",
    fg: "#04120a",
  },
  steam: {
    key: "steam",
    label: "Steam",
    bg: "#1b2838",
    fg: "#ffffff",
  },
};

export const movies = [
  {
    id: "movie-1",
    type: "movie",
    tag: "Movie",
    title: "Mortal Kombat 2",

    posterImage: "/mockImages/mortalKombatPoster.webp",
    backdropImage: "/mockImages/mortalKombatBackdrop.webp",

    genres: ["Action", "Sci-Fi"],
    genre: "Action • Sci-Fi",

    date: "02/14/2026",
    duration: "2h 8m",
    durationLabel: "Runtime",

    language: "English",
    source: "TMDB",

    description:
      "A stranded pilot discovers a signal coming from beyond the known solar system.A stranded pilot discovers a signal coming from beyond the known solar system.",

    score: 8.7,
    trendingRank: 1,

    providers: [providerCatalog.prime, providerCatalog.apple],
  },
  {
    id: "movie-2",
    type: "movie",
    tag: "Movie",
    title: "Superman",

    posterImage: "/mockImages/supermanPoster.webp",
    backdropImage: "/mockImages/supermanBackdrop.webp",

    genres: ["Action", "Sci-Fi"],
    genre: "Action • Sci-Fi",

    date: "02/14/2026",
    duration: "2h 8m",
    durationLabel: "Runtime",

    language: "English",
    source: "TMDB",

    description:
      "A stranded pilot discovers a signal coming from beyond the known solar system.A stranded pilot discovers a signal coming from beyond the known solar system.",

    score: 8.7,
    trendingRank: 1,

    providers: [providerCatalog.prime, providerCatalog.apple],
  },
  {
    id: "movie-3",
    type: "movie",
    tag: "Movie",
    title: "Michael",

    posterImage: "/mockImages/michaelPoster.webp",
    backdropImage: "/mockImages/michaelBackdrop.webp",

    genres: ["Action", "Sci-Fi"],
    genre: "Action • Sci-Fi",

    date: "02/14/2026",
    duration: "2h 8m",
    durationLabel: "Runtime",

    language: "English",
    source: "TMDB",

    description:
      "A stranded pilot discovers a signal coming from beyond the known solar system.A stranded pilot discovers a signal coming from beyond the known solar system.",

    score: 8.7,
    trendingRank: 1,

    providers: [providerCatalog.prime, providerCatalog.apple],
  },
  {
    id: "movie-4",
    type: "movie",
    tag: "Movie",
    title: "Backrooms",

    posterImage: "/mockImages/backroomsPoster.webp",
    backdropImage: "/mockImages/backroomsBackdrop.webp",

    genres: ["Action", "Sci-Fi"],
    genre: "Action • Sci-Fi",

    date: "02/14/2026",
    duration: "2h 8m",
    durationLabel: "Runtime",

    language: "English",
    source: "TMDB",

    description:
      "A stranded pilot discovers a signal coming from beyond the known solar system.A stranded pilot discovers a signal coming from beyond the known solar system.",

    score: 8.7,
    trendingRank: 1,

    providers: [providerCatalog.prime, providerCatalog.apple],
  },
  {
    id: "movie-5",
    type: "movie",
    tag: "Movie",
    title: "Mortal Kombat 2",

    posterImage: "/mockImages/mortalKombatPoster.webp",
    backdropImage: "/mockImages/mortalKombatBackdrop.webp",

    genres: ["Action", "Sci-Fi"],
    genre: "Action • Sci-Fi",

    date: "02/14/2026",
    duration: "2h 8m",
    durationLabel: "Runtime",

    language: "English",
    source: "TMDB",

    description:
      "A stranded pilot discovers a signal coming from beyond the known solar system.A stranded pilot discovers a signal coming from beyond the known solar system.",

    score: 8.7,
    trendingRank: 1,

    providers: [providerCatalog.prime, providerCatalog.apple],
  },
  {
    id: "movie-6",
    type: "movie",
    tag: "Movie",
    title: "Superman",

    posterImage: "/mockImages/supermanPoster.webp",
    backdropImage: "/mockImages/supermanBackdrop.webp",

    genres: ["Action", "Sci-Fi"],
    genre: "Action • Sci-Fi",

    date: "02/14/2026",
    duration: "2h 8m",
    durationLabel: "Runtime",

    language: "English",
    source: "TMDB",

    description:
      "A stranded pilot discovers a signal coming from beyond the known solar system.A stranded pilot discovers a signal coming from beyond the known solar system.",

    score: 8.7,
    trendingRank: 1,

    providers: [providerCatalog.prime, providerCatalog.apple],
  },
  {
    id: "movie-7",
    type: "movie",
    tag: "Movie",
    title: "Michael",

    posterImage: "/mockImages/michaelPoster.webp",
    backdropImage: "/mockImages/michaelBackdrop.webp",

    genres: ["Action", "Sci-Fi"],
    genre: "Action • Sci-Fi",

    date: "02/14/2026",
    duration: "2h 8m",
    durationLabel: "Runtime",

    language: "English",
    source: "TMDB",

    description:
      "A stranded pilot discovers a signal coming from beyond the known solar system.A stranded pilot discovers a signal coming from beyond the known solar system.",

    score: 8.7,
    trendingRank: 1,

    providers: [providerCatalog.prime, providerCatalog.apple],
  },
  {
    id: "movie-8",
    type: "movie",
    tag: "Movie",
    title: "Backrooms",

    posterImage: "/mockImages/backroomsPoster.webp",
    backdropImage: "/mockImages/backroomsBackdrop.webp",

    genres: ["Action", "Sci-Fi"],
    genre: "Action • Sci-Fi",

    date: "02/14/2026",
    duration: "2h 8m",
    durationLabel: "Runtime",

    language: "English",
    source: "TMDB",

    description:
      "A stranded pilot discovers a signal coming from beyond the known solar system.A stranded pilot discovers a signal coming from beyond the known solar system.",

    score: 8.7,
    trendingRank: 1,

    providers: [providerCatalog.prime, providerCatalog.apple],
  },
];

export const shows = [
  {
    id: "show-1",
    type: "show",
    tag: "Series",
    title: "The Long Dark",

    posterImage: "/mockImages/showPoster.jpg",
    backdropImage: "/mockImages/showBackdrop.webp",

    genres: ["Drama", "Mystery"],
    genre: "Drama • Mystery",

    date: "01/20/2026",
    duration: "2 seasons",
    durationLabel: "Seasons",

    language: "English",
    source: "TMDB",

    description:
      "Residents of an isolated town investigate a disappearance linked to their past.",

    score: 8.6,
    trendingRank: 3,

    providers: [providerCatalog.netflix],
  },
  {
    id: "show-1",
    type: "show",
    tag: "Series",
    title: "The Long Dark",

    posterImage: "/mockImages/showPoster.jpg",
    backdropImage: "/mockImages/showBackdrop.webp",

    genres: ["Drama", "Mystery"],
    genre: "Drama • Mystery",

    date: "01/20/2026",
    duration: "2 seasons",
    durationLabel: "Seasons",

    language: "English",
    source: "TMDB",

    description:
      "Residents of an isolated town investigate a disappearance linked to their past.",

    score: 8.6,
    trendingRank: 3,

    providers: [providerCatalog.netflix],
  },
  {
    id: "show-1",
    type: "show",
    tag: "Series",
    title: "The Long Dark",

    posterImage: "/mockImages/showPoster.jpg",
    backdropImage: "/mockImages/showBackdrop.webp",

    genres: ["Drama", "Mystery"],
    genre: "Drama • Mystery",

    date: "01/20/2026",
    duration: "2 seasons",
    durationLabel: "Seasons",

    language: "English",
    source: "TMDB",

    description:
      "Residents of an isolated town investigate a disappearance linked to their past.",

    score: 8.6,
    trendingRank: 3,

    providers: [providerCatalog.netflix],
  },
  {
    id: "show-1",
    type: "show",
    tag: "Series",
    title: "The Long Dark",

    posterImage: "/mockImages/showPoster.jpg",
    backdropImage: "/mockImages/showBackdrop.webp",

    genres: ["Drama", "Mystery"],
    genre: "Drama • Mystery",

    date: "01/20/2026",
    duration: "2 seasons",
    durationLabel: "Seasons",

    language: "English",
    source: "TMDB",

    description:
      "Residents of an isolated town investigate a disappearance linked to their past.",

    score: 8.6,
    trendingRank: 3,

    providers: [providerCatalog.netflix],
  },
  {
    id: "show-1",
    type: "show",
    tag: "Series",
    title: "The Long Dark",

    posterImage: "/mockImages/showPoster.jpg",
    backdropImage: "/mockImages/showBackdrop.webp",

    genres: ["Drama", "Mystery"],
    genre: "Drama • Mystery",

    date: "01/20/2026",
    duration: "2 seasons",
    durationLabel: "Seasons",

    language: "English",
    source: "TMDB",

    description:
      "Residents of an isolated town investigate a disappearance linked to their past.",

    score: 8.6,
    trendingRank: 3,

    providers: [providerCatalog.netflix],
  },
  {
    id: "show-1",
    type: "show",
    tag: "Series",
    title: "The Long Dark",

    posterImage: "/mockImages/showPoster.jpg",
    backdropImage: "/mockImages/showBackdrop.webp",

    genres: ["Drama", "Mystery"],
    genre: "Drama • Mystery",

    date: "01/20/2026",
    duration: "2 seasons",
    durationLabel: "Seasons",

    language: "English",
    source: "TMDB",

    description:
      "Residents of an isolated town investigate a disappearance linked to their past.",

    score: 8.6,
    trendingRank: 3,

    providers: [providerCatalog.netflix],
  },
  {
    id: "show-1",
    type: "show",
    tag: "Series",
    title: "The Long Dark",

    posterImage: "/mockImages/showPoster.jpg",
    backdropImage: "/mockImages/showBackdrop.webp",

    genres: ["Drama", "Mystery"],
    genre: "Drama • Mystery",

    date: "01/20/2026",
    duration: "2 seasons",
    durationLabel: "Seasons",

    language: "English",
    source: "TMDB",

    description:
      "Residents of an isolated town investigate a disappearance linked to their past.",

    score: 8.6,
    trendingRank: 3,

    providers: [providerCatalog.netflix],
  },
  {
    id: "show-1",
    type: "show",
    tag: "Series",
    title: "The Long Dark",

    posterImage: "/mockImages/showPoster.jpg",
    backdropImage: "/mockImages/showBackdrop.webp",

    genres: ["Drama", "Mystery"],
    genre: "Drama • Mystery",

    date: "01/20/2026",
    duration: "2 seasons",
    durationLabel: "Seasons",

    language: "English",
    source: "TMDB",

    description:
      "Residents of an isolated town investigate a disappearance linked to their past.",

    score: 8.6,
    trendingRank: 3,

    providers: [providerCatalog.netflix],
  },
];

export const music = [
  {
    id: "music-1",
    type: "music",
    tag: "Song",
    title: "Low Tide",
    artist: "Northern Signals",

    posterImage: "/mockImages/musicPoster.jpg",
    backdropImage: "/mockImages/musicBackdrop.jpg",

    genres: ["Indie Pop"],
    genre: "Indie Pop",

    date: "05/03/2026",
    duration: "3:34",
    durationLabel: "Duration",

    language: "English",
    source: "Spotify",

    description:
      "An atmospheric indie-pop track built around soft vocals and layered synths.",

    score: 8.2,
    trendingRank: 4,

    providers: [providerCatalog.spotify],
  },
  {
    id: "music-1",
    type: "music",
    tag: "Song",
    title: "Low Tide",
    artist: "Northern Signals",

    posterImage: "/mockImages/musicPoster.jpg",
    backdropImage: "/mockImages/musicBackdrop.jpg",

    genres: ["Indie Pop"],
    genre: "Indie Pop",

    date: "05/03/2026",
    duration: "3:34",
    durationLabel: "Duration",

    language: "English",
    source: "Spotify",

    description:
      "An atmospheric indie-pop track built around soft vocals and layered synths.",

    score: 8.2,
    trendingRank: 4,

    providers: [providerCatalog.spotify],
  },
  {
    id: "music-1",
    type: "music",
    tag: "Song",
    title: "Low Tide",
    artist: "Northern Signals",

    posterImage: "/mockImages/musicPoster.jpg",
    backdropImage: "/mockImages/musicBackdrop.jpg",

    genres: ["Indie Pop"],
    genre: "Indie Pop",

    date: "05/03/2026",
    duration: "3:34",
    durationLabel: "Duration",

    language: "English",
    source: "Spotify",

    description:
      "An atmospheric indie-pop track built around soft vocals and layered synths.",

    score: 8.2,
    trendingRank: 4,

    providers: [providerCatalog.spotify],
  },
  {
    id: "music-1",
    type: "music",
    tag: "Song",
    title: "Low Tide",
    artist: "Northern Signals",

    posterImage: "/mockImages/musicPoster.jpg",
    backdropImage: "/mockImages/musicBackdrop.jpg",

    genres: ["Indie Pop"],
    genre: "Indie Pop",

    date: "05/03/2026",
    duration: "3:34",
    durationLabel: "Duration",

    language: "English",
    source: "Spotify",

    description:
      "An atmospheric indie-pop track built around soft vocals and layered synths.",

    score: 8.2,
    trendingRank: 4,

    providers: [providerCatalog.spotify],
  },
  {
    id: "music-1",
    type: "music",
    tag: "Song",
    title: "Low Tide",
    artist: "Northern Signals",

    posterImage: "/mockImages/musicPoster.jpg",
    backdropImage: "/mockImages/musicBackdrop.jpg",

    genres: ["Indie Pop"],
    genre: "Indie Pop",

    date: "05/03/2026",
    duration: "3:34",
    durationLabel: "Duration",

    language: "English",
    source: "Spotify",

    description:
      "An atmospheric indie-pop track built around soft vocals and layered synths.",

    score: 8.2,
    trendingRank: 4,

    providers: [providerCatalog.spotify],
  },
  {
    id: "music-1",
    type: "music",
    tag: "Song",
    title: "Low Tide",
    artist: "Northern Signals",

    posterImage: "/mockImages/musicPoster.jpg",
    backdropImage: "/mockImages/musicBackdrop.jpg",

    genres: ["Indie Pop"],
    genre: "Indie Pop",

    date: "05/03/2026",
    duration: "3:34",
    durationLabel: "Duration",

    language: "English",
    source: "Spotify",

    description:
      "An atmospheric indie-pop track built around soft vocals and layered synths.",

    score: 8.2,
    trendingRank: 4,

    providers: [providerCatalog.spotify],
  },
  {
    id: "music-1",
    type: "music",
    tag: "Song",
    title: "Low Tide",
    artist: "Northern Signals",

    posterImage: "/mockImages/musicPoster.jpg",
    backdropImage: "/mockImages/musicBackdrop.jpg",

    genres: ["Indie Pop"],
    genre: "Indie Pop",

    date: "05/03/2026",
    duration: "3:34",
    durationLabel: "Duration",

    language: "English",
    source: "Spotify",

    description:
      "An atmospheric indie-pop track built around soft vocals and layered synths.",

    score: 8.2,
    trendingRank: 4,

    providers: [providerCatalog.spotify],
  },
  {
    id: "music-1",
    type: "music",
    tag: "Song",
    title: "Low Tide",
    artist: "Northern Signals",

    posterImage: "/mockImages/musicPoster.jpg",
    backdropImage: "/mockImages/musicBackdrop.jpg",

    genres: ["Indie Pop"],
    genre: "Indie Pop",

    date: "05/03/2026",
    duration: "3:34",
    durationLabel: "Duration",

    language: "English",
    source: "Spotify",

    description:
      "An atmospheric indie-pop track built around soft vocals and layered synths.",

    score: 8.2,
    trendingRank: 4,

    providers: [providerCatalog.spotify],
  },
  {
    id: "music-1",
    type: "music",
    tag: "Song",
    title: "Low Tide",
    artist: "Northern Signals",

    posterImage: "/mockImages/musicPoster.jpg",
    backdropImage: "/mockImages/musicBackdrop.jpg",

    genres: ["Indie Pop"],
    genre: "Indie Pop",

    date: "05/03/2026",
    duration: "3:34",
    durationLabel: "Duration",

    language: "English",
    source: "Spotify",

    description:
      "An atmospheric indie-pop track built around soft vocals and layered synths.",

    score: 8.2,
    trendingRank: 4,

    providers: [providerCatalog.spotify],
  },
  {
    id: "music-1",
    type: "music",
    tag: "Song",
    title: "Low Tide",
    artist: "Northern Signals",

    posterImage: "/mockImages/musicPoster.jpg",
    backdropImage: "/mockImages/musicBackdrop.jpg",

    genres: ["Indie Pop"],
    genre: "Indie Pop",

    date: "05/03/2026",
    duration: "3:34",
    durationLabel: "Duration",

    language: "English",
    source: "Spotify",

    description:
      "An atmospheric indie-pop track built around soft vocals and layered synths.",

    score: 8.2,
    trendingRank: 4,

    providers: [providerCatalog.spotify],
  },
];

export const games = [
  {
    id: "game-1",
    type: "game",
    tag: "Game",
    title: "Ashen Reach",

    posterImage: "/mockImages/gamePoster.jpg",
    backdropImage: "/mockImages/gameBackdrop.jpg",

    genres: ["Action", "RPG"],
    genre: "Action • RPG",

    date: "03/12/2026",
    duration: "42h average",
    durationLabel: "Playtime",

    language: "English",
    source: "IGDB",

    description:
      "Explore a ruined kingdom and uncover the origin of a spreading corruption.",

    platforms: ["PC", "PlayStation 5", "Xbox Series X"],

    score: 9.1,
    trendingRank: 5,

    providers: [providerCatalog.steam],
  },
  {
    id: "game-1",
    type: "game",
    tag: "Game",
    title: "Ashen Reach",

    posterImage: "/mockImages/gamePoster.jpg",
    backdropImage: "/mockImages/gameBackdrop.jpg",

    genres: ["Action", "RPG"],
    genre: "Action • RPG",

    date: "03/12/2026",
    duration: "42h average",
    durationLabel: "Playtime",

    language: "English",
    source: "IGDB",

    description:
      "Explore a ruined kingdom and uncover the origin of a spreading corruption.",

    platforms: ["PC", "PlayStation 5", "Xbox Series X"],

    score: 9.1,
    trendingRank: 5,

    providers: [providerCatalog.steam],
  },
  {
    id: "game-1",
    type: "game",
    tag: "Game",
    title: "Ashen Reach",

    posterImage: "/mockImages/gamePoster.jpg",
    backdropImage: "/mockImages/gameBackdrop.jpg",

    genres: ["Action", "RPG"],
    genre: "Action • RPG",

    date: "03/12/2026",
    duration: "42h average",
    durationLabel: "Playtime",

    language: "English",
    source: "IGDB",

    description:
      "Explore a ruined kingdom and uncover the origin of a spreading corruption.",

    platforms: ["PC", "PlayStation 5", "Xbox Series X"],

    score: 9.1,
    trendingRank: 5,

    providers: [providerCatalog.steam],
  },
  {
    id: "game-1",
    type: "game",
    tag: "Game",
    title: "Ashen Reach",

    posterImage: "/mockImages/gamePoster.jpg",
    backdropImage: "/mockImages/gameBackdrop.jpg",

    genres: ["Action", "RPG"],
    genre: "Action • RPG",

    date: "03/12/2026",
    duration: "42h average",
    durationLabel: "Playtime",

    language: "English",
    source: "IGDB",

    description:
      "Explore a ruined kingdom and uncover the origin of a spreading corruption.",

    platforms: ["PC", "PlayStation 5", "Xbox Series X"],

    score: 9.1,
    trendingRank: 5,

    providers: [providerCatalog.steam],
  },
  {
    id: "game-1",
    type: "game",
    tag: "Game",
    title: "Ashen Reach",

    posterImage: "/mockImages/gamePoster.jpg",
    backdropImage: "/mockImages/gameBackdrop.jpg",

    genres: ["Action", "RPG"],
    genre: "Action • RPG",

    date: "03/12/2026",
    duration: "42h average",
    durationLabel: "Playtime",

    language: "English",
    source: "IGDB",

    description:
      "Explore a ruined kingdom and uncover the origin of a spreading corruption.",

    platforms: ["PC", "PlayStation 5", "Xbox Series X"],

    score: 9.1,
    trendingRank: 5,

    providers: [providerCatalog.steam],
  },
  {
    id: "game-1",
    type: "game",
    tag: "Game",
    title: "Ashen Reach",

    posterImage: "/mockImages/gamePoster.jpg",
    backdropImage: "/mockImages/gameBackdrop.jpg",

    genres: ["Action", "RPG"],
    genre: "Action • RPG",

    date: "03/12/2026",
    duration: "42h average",
    durationLabel: "Playtime",

    language: "English",
    source: "IGDB",

    description:
      "Explore a ruined kingdom and uncover the origin of a spreading corruption.",

    platforms: ["PC", "PlayStation 5", "Xbox Series X"],

    score: 9.1,
    trendingRank: 5,

    providers: [providerCatalog.steam],
  },
  {
    id: "game-1",
    type: "game",
    tag: "Game",
    title: "Ashen Reach",

    posterImage: "/mockImages/gamePoster.jpg",
    backdropImage: "/mockImages/gameBackdrop.jpg",

    genres: ["Action", "RPG"],
    genre: "Action • RPG",

    date: "03/12/2026",
    duration: "42h average",
    durationLabel: "Playtime",

    language: "English",
    source: "IGDB",

    description:
      "Explore a ruined kingdom and uncover the origin of a spreading corruption.",

    platforms: ["PC", "PlayStation 5", "Xbox Series X"],

    score: 9.1,
    trendingRank: 5,

    providers: [providerCatalog.steam],
  },
  {
    id: "game-1",
    type: "game",
    tag: "Game",
    title: "Ashen Reach",

    posterImage: "/mockImages/gamePoster.jpg",
    backdropImage: "/mockImages/gameBackdrop.jpg",

    genres: ["Action", "RPG"],
    genre: "Action • RPG",

    date: "03/12/2026",
    duration: "42h average",
    durationLabel: "Playtime",

    language: "English",
    source: "IGDB",

    description:
      "Explore a ruined kingdom and uncover the origin of a spreading corruption.",

    platforms: ["PC", "PlayStation 5", "Xbox Series X"],

    score: 9.1,
    trendingRank: 5,

    providers: [providerCatalog.steam],
  },
];

export const genresByCategory = {
  movies: [
    "Action",
    "Sci-Fi",
    "Drama",
    "Thriller",
    "Comedy",
    "Romance",
    "Horror",
    "Mystery",
  ],
  shows: [
    "Drama",
    "Mystery",
    "Action",
    "Thriller",
    "Comedy",
    "Sci-Fi",
    "Crime",
    "Fantasy",
  ],
  music: [
    "Indie Pop",
    "Synthwave",
    "Alt Rock",
    "Lo-fi",
    "Hip-Hop",
    "R&B",
    "Folk",
    "Electronic",
  ],
  games: [
    "Action",
    "RPG",
    "Open World",
    "Strategy",
    "Adventure",
    "Simulation",
    "Puzzle",
    "Horror",
  ],
};

export const allMedia = [...movies, ...shows, ...music, ...games];

// Two movies, one show, one song, and one game.
export const heroSlides = [movies[0], movies[1], shows[0], music[0], games[0]];

export function getMediaById(id) {
  return allMedia.find((item) => item.id === id);
}
