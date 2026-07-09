import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Film, Tv, Music2, Gamepad2, Compass } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import './Login.css'

const panels = [
  { key: 'movies', label: 'Movies', icon: Film, gradient: 'linear-gradient(160deg,#7a2f2f,#2b0f0f)' },
  { key: 'shows', label: 'Shows', icon: Tv, gradient: 'linear-gradient(160deg,#26304a,#0c111f)' },
  { key: 'music', label: 'Music', icon: Music2, gradient: 'linear-gradient(160deg,#4a2a63,#1a0e26)' },
  { key: 'games', label: 'Games', icon: Gamepad2, gradient: 'linear-gradient(160deg,#7c4a2a,#331c0c)' },
]

function Login() {
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    // No backend yet — just move on to the home screen.
    navigate('/home')
  }

  return (
    <div className="login-page">
      <div className="login-top">
        <div className="collage">
          {panels.map(({ key, label, icon: Icon, gradient }) => (
            <div className="panel" key={key} style={{ background: gradient }}>
              <div className="panel-badge">
                <Icon size={16} />
                <span>{label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="login-card">
          <div className="login-brand">
            <Logo />
            <span>PlayVerse</span>
          </div>

          <div className="login-tabs">
            <button
              type="button"
              className={mode === 'login' ? 'tab active' : 'tab'}
              onClick={() => setMode('login')}
            >
              Login
            </button>
            <span className="tab-divider" />
            <button
              type="button"
              className={mode === 'register' ? 'tab active' : 'tab'}
              onClick={() => setMode('register')}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="email">Email</label>
            <div className="field">
              <Mail size={16} className="field-icon" />
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <label className="field-label" htmlFor="password">Password</label>
            <div className="field">
              <Lock size={16} className="field-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="field-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button type="submit" className="submit-btn">
              {mode === 'login' ? 'Login' : 'Create account'}
            </button>

            <p className="switch-mode">
              {mode === 'login' ? (
                <>Don&apos;t have an account?{' '}
                  <button type="button" onClick={() => setMode('register')}>Register</button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button type="button" onClick={() => setMode('login')}>Login</button>
                </>
              )}
            </p>
          </form>
        </div>
      </div>

      <div className="login-banner">
        <div className="banner-text">
          <span className="banner-icon"><Compass size={18} /></span>
          <div>
            <h2>Discover movies, shows, music, and games in one place</h2>
            <p>Browse entertainment across categories and find something to watch, listen to, or play.</p>
          </div>
        </div>
        <button type="button" className="banner-btn" onClick={() => setMode('register')}>
          Register
        </button>
      </div>
    </div>
  )
}

export default Login