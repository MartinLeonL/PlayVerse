import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search as SearchIcon, ChevronDown } from 'lucide-react'
import Navbar from '../components/Navbar.jsx'
import { movies, shows, music, games } from '../data/mockData.js'
import './Search.css'

const categories = [
  { key: 'movies', label: 'Movies', items: movies },
  { key: 'shows', label: 'TV Series', items: shows },
  { key: 'music', label: 'Music', items: music },
  { key: 'games', label: 'Games', items: games },
]

const sortOptions = [
  { key: 'popularity', label: 'Popularity' },
  { key: 'recent', label: 'Recent' },
  { key: 'trending', label: 'Trending' },
]

function Search() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('movies')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('popularity')
  const [sortOpen, setSortOpen] = useState(false)

  const category = categories.find((c) => c.key === activeCategory)
  const sortLabel = sortOptions.find((s) => s.key === sortBy)?.label

  const results = useMemo(() => {
    const list = category.items
    const filtered = query.trim()
      ? list.filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase()))
      : list

    if (sortBy === 'recent') {
      return [...filtered].sort((a, b) => (a.date < b.date ? 1 : -1))
    }
    if (sortBy === 'trending') {
      return [...filtered].reverse()
    }
    return filtered
  }, [category, query, sortBy])

  function openMedia(item) {
    navigate(`/media/${encodeURIComponent(item.id)}`)
  }

  return (
    <div className="home-page">
      <Navbar activeNav="search" />

      <main className="search-main">
        <div className="search-head">
          <div>
            <h1>Search</h1>
            <p>Discover what to watch, what to hear, and what to play next.</p>

            <div className="search-input">
              <input
                type="text"
                placeholder="Search title, streaming service, etc..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <SearchIcon size={16} />
            </div>

            <div className="search-tabs">
              {categories.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={activeCategory === c.key ? 'search-tab active' : 'search-tab'}
                  onClick={() => setActiveCategory(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="search-sort">
            <button type="button" className="sort-btn" onClick={() => setSortOpen((v) => !v)}>
              Sort By: {sortLabel} <ChevronDown size={16} />
            </button>
            {sortOpen && (
              <div className="sort-dropdown">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={sortBy === opt.key ? 'sort-option active' : 'sort-option'}
                    onClick={() => {
                      setSortBy(opt.key)
                      setSortOpen(false)
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {results.length === 0 ? (
          <p className="search-empty">No results for &quot;{query}&quot;.</p>
        ) : (
          <div className="search-grid">
            {results.map((item) => (
              <div
                className="search-card"
                key={item.id}
                onClick={() => openMedia(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && openMedia(item)}
              >
                <div className="search-poster" style={{ background: item.gradient }}>
                  <span>{item.title}</span>
                </div>
                <p>{item.title}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default Search