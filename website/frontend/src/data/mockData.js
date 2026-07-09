// Placeholder catalog data. Swap this out for real API responses later —
// the components below only expect this shape, so nothing else needs to change.

const gradients = [
  'linear-gradient(160deg, #6d5bd0, #2e1f63)',
  'linear-gradient(160deg, #d0466d, #631f3a)',
  'linear-gradient(160deg, #46a0d0, #1f4763)',
  'linear-gradient(160deg, #d0a446, #63481f)',
  'linear-gradient(160deg, #46d08b, #1f6345)',
  'linear-gradient(160deg, #a446d0, #4b1f63)',
  'linear-gradient(160deg, #d04646, #631f1f)',
  'linear-gradient(160deg, #46d0c4, #1f6360)',
]

const providerCatalog = {
  prime: { label: 'Prime Video', bg: '#00a8e1', fg: '#0b1a2b' },
  apple: { label: 'Apple TV', bg: '#111111', fg: '#fff' },
  disney: { label: 'Disney+', bg: '#113ccf', fg: '#fff' },
  netflix: { label: 'Netflix', bg: '#e50914', fg: '#fff' },
  spotify: { label: 'Spotify', bg: '#1db954', fg: '#04120a' },
  steam: { label: 'Steam', bg: '#1b2838', fg: '#fff' },
}

// Full genre lists per category — shown as filter pills on each category page.
export const genresByCategory = {
  movies: ['Action', 'Sci-Fi', 'Drama', 'Thriller', 'Comedy', 'Romance', 'Horror', 'Mystery'],
  shows: ['Drama', 'Mystery', 'Action', 'Thriller', 'Comedy', 'Sci-Fi', 'Crime', 'Fantasy'],
  music: ['Indie Pop', 'Synthwave', 'Alt Rock', 'Lo-fi', 'Hip-Hop', 'R&B', 'Folk', 'Electronic'],
  games: ['Action', 'RPG', 'Open World', 'Strategy', 'Adventure', 'Simulation', 'Puzzle', 'Horror'],
}

// Two-genre combos assigned round-robin to items within each category.
const genrePairsByCategory = {
  movies: [
    ['Action', 'Sci-Fi'], ['Drama', 'Thriller'], ['Comedy', 'Romance'], ['Horror', 'Mystery'],
  ],
  shows: [
    ['Drama', 'Mystery'], ['Action', 'Thriller'], ['Comedy', 'Crime'], ['Sci-Fi', 'Fantasy'],
  ],
  music: [
    ['Indie Pop'], ['Synthwave', 'Electronic'], ['Alt Rock'], ['Lo-fi'], ['Hip-Hop'], ['R&B'], ['Folk'],
  ],
  games: [
    ['Action', 'RPG'], ['Open World', 'Adventure'], ['Strategy'], ['Simulation'], ['Puzzle'], ['Action', 'Horror'],
  ],
}

const providersByType = {
  movie: [['prime', 'apple'], ['netflix'], ['disney', 'apple'], ['prime']],
  show: [['netflix'], ['disney'], ['prime', 'apple'], ['netflix', 'prime']],
  music: [['spotify'], ['spotify', 'apple'], ['spotify'], ['apple']],
  game: [['steam'], ['steam'], ['steam'], ['steam']],
}

const durationLabelByType = { movie: 'Runtime', show: 'Runtime', music: 'Duration', game: 'Playtime' }
const tagByType = { movie: 'Movie', show: 'Series', music: 'Song', game: 'Game' }
const sourceByType = { movie: 'TMDB', show: 'TMDB', music: 'Spotify', game: 'IGDB' }
const categoryByType = { movie: 'movies', show: 'shows', music: 'music', game: 'games' }

function build(type, names) {
  const category = categoryByType[type]
  const pairs = genrePairsByCategory[category]

  return names.map((title, i) => {
    const genres = pairs[i % pairs.length]
    return {
      id: `${title}-${i}`,
      type,
      tag: tagByType[type],
      title,
      gradient: gradients[i % gradients.length],
      genres,
      genre: genres.join(' • '),
      date: `0${(i % 9) + 1}/12/2026`,
      duration:
        type === 'music'
          ? `${2 + (i % 3)}:${String((15 + i * 7) % 60).padStart(2, '0')}`
          : `${1 + (i % 2)}h ${20 + i * 3}m`,
      durationLabel: durationLabelByType[type],
      language: 'English',
      source: sourceByType[type],
      description:
        'A short synopsis will go here once real catalog data is connected. For now this is placeholder copy so the layout can be reviewed end to end.',
      providers: providersByType[type][i % providersByType[type].length].map((key) => ({
        key,
        ...providerCatalog[key],
      })),
    }
  })
}

export const movies = build('movie', [
  'Silver Horizon', 'Midnight Runner', 'Glass Orbit', 'Echo Valley', 'Paper Tigers', 'Last Frequency', 'Amber Road', 'Static Bloom',
])

export const shows = build('show', [
  'The Long Dark', 'Cedar Heights', 'Vantage Point', 'Nightfall Ave', 'Blue Static', 'Hollow Court', 'Redline', 'The Understudy',
])

export const music = build('music', [
  'Low Tide', 'Neon Fields', 'Paper Moon', 'Concrete Bloom', 'Slow Static', 'Amber Skies', 'Glasshouse', 'Wire & Wax',
])

export const games = build('game', [
  'Ashen Reach', 'Nightshift', 'Ironvale', 'Drift Protocol', 'Hollow Sky', 'Faultline', 'Rust & Ruin', 'Copper Sun',
])

export const heroSlides = movies.slice(0, 5)

export const allMedia = [...movies, ...shows, ...music, ...games]

export function getMediaById(id) {
  return allMedia.find((item) => item.id === id)
}