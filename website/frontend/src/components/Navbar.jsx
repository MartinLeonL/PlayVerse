import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Home as HomeIcon, Film, Tv, Music2, Gamepad2, Search,
  ChevronDown, User, ListPlus, LogOut,
} from 'lucide-react'
import Logo from './Logo.jsx'
import './Navbar.css'

export const navItems = [
  { key: 'home', label: 'Home', icon: HomeIcon, path: '/home' },
  { key: 'movies', label: 'Movies', icon: Film, path: '/movies' },
  { key: 'shows', label: 'TV Series', icon: Tv, path: '/shows' },
  { key: 'music', label: 'Music', icon: Music2, path: '/music' },
  { key: 'games', label: 'Games', icon: Gamepad2, path: '/games' },
]

function Navbar({ activeNav }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const resolvedActive = activeNav ?? (location.pathname.replace('/', '') || 'home')

  return (
    <nav className="navbar">
      <div className="brand">
        <Logo size={26} />
        <span>PlayVerse</span>
      </div>

      <ul className="nav-links">
        {navItems.map(({ key, label, icon: Icon, path }) => (
          <li key={key}>
            <button
              type="button"
              className={resolvedActive === key ? 'nav-link active' : 'nav-link'}
              onClick={() => navigate(path)}
            >
              <Icon size={16} />
              {label}
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            className={resolvedActive === 'search' ? 'nav-link active' : 'nav-link'}
            onClick={() => navigate('/search')}
          >
            <Search size={16} />
            Search
          </button>
        </li>
      </ul>

      <div className="user-menu">
        <button type="button" className="user-btn" onClick={() => setMenuOpen((v) => !v)}>
          Jane Doe
          <ChevronDown size={16} />
        </button>
        {menuOpen && (
          <div className="user-dropdown">
            <button type="button" onClick={() => navigate('/account')}>
              <User size={16} /> Account
            </button>
            <button type="button" onClick={() => navigate('/playlists')}>
              <ListPlus size={16} /> Playlists
            </button>
            <button type="button" onClick={() => navigate('/')}>
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar