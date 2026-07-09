import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { genresByCategory } from '../data/mockData.js'
import './CategoryPage.css'

function CategoryPage({ navKey, title, items }) {
  const navigate = useNavigate()
  const [activeGenre, setActiveGenre] = useState('All')

  const genres = ['All', ...genresByCategory[navKey]]

  const filtered = useMemo(() => {
    if (activeGenre === 'All') return items
    return items.filter((item) => item.genres.includes(activeGenre))
  }, [items, activeGenre])

  function openMedia(item) {
    navigate(`/media/${encodeURIComponent(item.id)}`)
  }

  return (
    <div className="home-page">
      <Navbar activeNav={navKey} />

      <main className="category-main">
        <h1>{title}</h1>
        <p>Browse by genre to find something new.</p>

        <div className="category-genres">
          {genres.map((g) => (
            <button
              key={g}
              type="button"
              className={activeGenre === g ? 'genre-pill active' : 'genre-pill'}
              onClick={() => setActiveGenre(g)}
            >
              {g}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="category-empty">Nothing in this genre yet.</p>
        ) : (
          <div className="category-grid">
            {filtered.map((item) => (
              <div
                className="category-card"
                key={item.id}
                onClick={() => openMedia(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && openMedia(item)}
              >
                <div className="category-poster" style={{ background: item.gradient }}>
                  <span>{item.title}</span>
                </div>
                <p>{item.title}</p>
                <span className="category-card-genres">{item.genres.join(' • ')}</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default CategoryPage