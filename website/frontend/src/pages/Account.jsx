import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import Navbar from '../components/Navbar.jsx'
import EditAccountModal from '../components/EditAccountModal.jsx'
import DeleteAccountModal from '../components/DeleteAccountModal.jsx'
import './Account.css'

function initials(first, last) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

function Account() {
  const [user, setUser] = useState({
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
  })
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  function handleSave(updated) {
    setUser((prev) => ({ ...prev, ...updated }))
    setEditOpen(false)
  }

  function handleDelete() {
    // No backend yet — this is where an account-deletion API call would go.
    setDeleteOpen(false)
  }

  return (
    <div className="home-page">
      <Navbar activeNav="home" />

      <main className="account-main">
        <div className="account-card">
          <h1>Account Info</h1>
          <hr />

          <div className="account-body">
            <div className="account-avatar">{initials(user.firstName, user.lastName)}</div>

            <div className="account-fields">
              <div className="account-field">
                <span className="account-label">First Name</span>
                <span className="account-value">{user.firstName}</span>
              </div>
              <div className="account-field">
                <span className="account-label">Email</span>
                <span className="account-value">{user.email}</span>
              </div>
              <div className="account-field">
                <span className="account-label">Last Name</span>
                <span className="account-value">{user.lastName}</span>
              </div>
            </div>
          </div>

          <div className="account-actions">
            <button type="button" className="account-delete" onClick={() => setDeleteOpen(true)}>
              <Trash2 size={15} /> Delete
            </button>
            <button type="button" className="account-edit" onClick={() => setEditOpen(true)}>
              <Pencil size={15} /> Edit
            </button>
          </div>
        </div>
      </main>

      {editOpen && (
        <EditAccountModal
          user={user}
          onCancel={() => setEditOpen(false)}
          onSave={handleSave}
        />
      )}

      {deleteOpen && (
        <DeleteAccountModal
          onCancel={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}

export default Account