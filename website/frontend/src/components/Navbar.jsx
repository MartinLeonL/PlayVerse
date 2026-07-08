import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home as HomeIcon, Film, Tv, Music2, Gamepad2, Search,
  ChevronDown, User, ListPlus, LogOut,
} from 'lucide-react'
import Logo from './Logo.jsx'
import './Navbar.css'

export const navItems = [
  { key: 'home', label: 'Home', icon: HomeIcon },
  { key: 'movies', label: 'Movies', icon: Film },
  { key: 'shows', label: 'TV Series', icon: Tv },
  { key: 'music', label: 'Music', icon: Music2 },
  { key: 'games', label: 'Games', icon: Gamepad2 },
]

function Navbar({ activeNav = 'home', onNavChange }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <nav className="navbar">
      <div className="brand">
        <Logo size={26} />
        <span>PlayVerse</span>
      </div>

      <ul className="nav-links">
        {navItems.map(({ key, label, icon: Icon }) => (
          <li key={key}>
            <button
              type="button"
              className={activeNav === key ? 'nav-link active' : 'nav-link'}
              onClick={() => (onNavChange ? onNavChange(key) : navigate('/home'))}
            >
              <Icon size={16} />
              {label}
            </button>
          </li>
        ))}
        <li>
          <button type="button" className="nav-link">
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
            <button type="button"><User size={16} /> Account</button>
            <button type="button"><ListPlus size={16} /> Playlists</button>
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