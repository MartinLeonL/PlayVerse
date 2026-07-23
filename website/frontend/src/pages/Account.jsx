import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../contexts/ToastContext.jsx";
import { Pencil, Trash2 } from "lucide-react";

import Navbar from "../components/Navbar.jsx";
import EditAccountModal from "../components/EditAccountModal.jsx";
import DeleteAccountModal from "../components/DeleteAccountModal.jsx";

import "./Account.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function initials(first = "", last = "") {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function Account() {
  const navigate = useNavigate();
  const showToast = useToast();

  const [user, setUser] = useState(null);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [loadingUser, setLoadingUser] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        setLoadingUser(true);
        setError("");

        const response = await fetch(`${API_URL}/api/auth/me`, {
          method: "GET",
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load account.");
        }

        setUser(data.user);
      } catch (requestError) {
        setError(requestError.message);

        // The user is probably no longer authenticated.
        navigate("/", {
          replace: true,
        });
      } finally {
        setLoadingUser(false);
      }
    }

    loadCurrentUser();
  }, [navigate]);

  async function handleSave(updated) {
    try {
      setSaving(true);
      setEditError("");

      const response = await fetch(`${API_URL}/api/auth/account`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updated),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update your account.");
      }

      setUser(data.user);
      setEditOpen(false);

      if (data.requiresEmailVerification) {
        showToast(data.message);

        navigate("/", {
          replace: true,
        });
      }
    } catch (error) {
      setEditError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      setDeleting(true);
      setError("");

      const response = await fetch(`${API_URL}/api/auth/account`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete account.");
      }

      setDeleteOpen(false);

      // The backend deleted the user and cleared the cookie.
      navigate("/", {
        replace: true,
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeleting(false);
    }
  }

  if (loadingUser) {
    return (
      <div className="home-page">
        <Navbar activeNav="home" />

        <main className="account-main">
          <p>Loading account...</p>
        </main>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="home-page">
      <Navbar activeNav="home" />

      <main className="account-main">
        <div className="account-card">
          <h1>Account Info</h1>
          <hr />

          {error && <p className="account-error">{error}</p>}

          <div className="account-body">
            <div className="account-avatar">
              {initials(user.firstName, user.lastName)}
            </div>

            <div className="account-fields">
              <div className="account-field">
                <span className="account-label">First Name</span>

                <span className="account-value">{user.firstName}</span>
              </div>

              <div className="account-field">
                <span className="account-label">Last Name</span>

                <span className="account-value">{user.lastName}</span>
              </div>

              <div className="account-field">
                <span className="account-label">Username</span>

                <span className="account-value">{user.username}</span>
              </div>

              <div className="account-field">
                <span className="account-label">Email</span>

                <span className="account-value">{user.email}</span>
              </div>
            </div>
          </div>

          <div className="account-actions">
            <button
              type="button"
              className="account-delete"
              onClick={() => {
                setError("");
                setDeleteOpen(true);
              }}
            >
              <Trash2 size={15} />
              Delete
            </button>

            <button
              type="button"
              className="account-edit"
              onClick={() => setEditOpen(true)}
            >
              <Pencil size={15} />
              Edit
            </button>
          </div>
        </div>
      </main>

      {editOpen && (
        <EditAccountModal
          user={user}
          onCancel={() => {
            if (!saving) {
              setEditOpen(false);
              setEditError("");
            }
          }}
          onSave={handleSave}
          saving={saving}
          serverError={editError}
        />
      )}

      {deleteOpen && (
        <DeleteAccountModal
          onCancel={() => {
            if (!deleting) {
              setDeleteOpen(false);
            }
          }}
          onConfirm={handleDelete}
          deleting={deleting}
          error={error}
        />
      )}
    </div>
  );
}

export default Account;