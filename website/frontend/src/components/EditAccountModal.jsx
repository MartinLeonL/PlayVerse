import { useState } from 'react'
import { X, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import './AccountModal.css'

function EditAccountModal({ user, onCancel, onSave }) {
  const [firstName, setFirstName] = useState(user.firstName)
  const [lastName, setLastName] = useState(user.lastName)
  const [email, setEmail] = useState(user.email)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (password && password !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }
    onSave({ firstName, lastName, email })
  }

  return (
    <div className="account-modal-overlay" onClick={onCancel}>
      <div className="account-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="account-modal-close" onClick={onCancel} aria-label="Close">
          <X size={16} />
        </button>

        <form onSubmit={handleSubmit}>
          <div className="account-modal-row">
            <div className="account-modal-field">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="account-modal-field">
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="account-modal-field full">
            <label htmlFor="email">Email</label>
            <div className="account-modal-input-icon">
              <Mail size={15} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="account-modal-field full">
            <label htmlFor="newPassword">New Password</label>
            <div className="account-modal-input-icon">
              <Lock size={15} />
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="account-modal-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="account-modal-field full">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="account-modal-input-icon">
              <Lock size={15} />
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                className="account-modal-toggle"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && <p className="account-modal-error">{error}</p>}

          <div className="account-modal-actions">
            <button type="button" className="account-modal-cancel" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="account-modal-save">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditAccountModal