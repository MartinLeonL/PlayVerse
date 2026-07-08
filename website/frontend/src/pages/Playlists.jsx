import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import Navbar from '../components/Navbar.jsx'
import { movies, shows, music, games, allMedia } from '../data/mockData.js'
import { getPlaylistIds, removeFromPlaylist } from '../utils/playlist.js'
import './Playlists.css'

const categories = [
  { key: 'all', label: 'All', items: allMedia },
  { key: 'movies', label: 'Movies', items: movies },
  { key: 'shows', label: 'TV Series', items: shows },
  { key: 'music', label: 'Music', items: music },
  { key: 'games', label: 'Games', items: games },
]

function Playlists() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('all')
  const [ids, setIds] = useState(() => getPlaylistIds())

  const category = categories.find((c) => c.key === activeCategory)

  const items = useMemo(
    () => category.items.filter((item) => ids.includes(item.id)),
    [category, ids]
  )

  function handleRemove(id) {
    removeFromPlaylist(id)
    setIds(getPlaylistIds())
  }

  function openMedia(item) {
    navigate(`/media/${encodeURIComponent(item.id)}`)
  }

  return (
    <div className="home-page">
      <Navbar activeNav="home" />

      <main className="playlists-main">
        <h1>Playlists</h1>
        <p>Discover what to watch, what to hear, and what to play next.</p>

        <div className="playlists-tabs">
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

        {items.length === 0 ? (
          <p className="playlists-empty">
            Nothing here yet. Add movies, shows, music, or games from their detail page.
          </p>
        ) : (
          <div className="playlists-grid">
            {items.map((item) => (
              <div className="playlist-card" key={item.id}>
                <button
                  type="button"
                  className="playlist-remove"
                  onClick={() => handleRemove(item.id)}
                  aria-label={`Remove ${item.title} from playlists`}
                >
                  <X size={14} />
                </button>
                <div
                  className="playlist-poster"
                  style={{ background: item.gradient }}
                  onClick={() => openMedia(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && openMedia(item)}
                >
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

export default Playlists