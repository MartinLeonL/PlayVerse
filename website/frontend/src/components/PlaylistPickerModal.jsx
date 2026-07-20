import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Check, Plus } from "lucide-react";

import "./AccountModal.css";
import "./PlaylistPickerModal.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function PlaylistPickerModal({ item, onClose }) {
  const navigate = useNavigate();

  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadPlaylists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPlaylists() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/auth/custom-playlists`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to load your playlists.");
      }

      setPlaylists(data.playlists || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function isInPlaylist(playlist) {
    return (playlist.items || []).some(
      (entry) => entry.mediaId === String(item.id) && entry.mediaType === item.type,
    );
  }

  async function toggle(playlist) {
    const alreadyIn = isInPlaylist(playlist);

    try {
      setUpdatingId(playlist.id);
      setError("");

      const response = await fetch(
        `${API_URL}/api/auth/custom-playlists/${encodeURIComponent(playlist.id)}/items`,
        {
          method: alreadyIn ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ mediaId: String(item.id), mediaType: item.type }),
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to update this playlist.");
      }

      setPlaylists((prev) =>
        prev.map((existing) => {
          if (existing.id !== playlist.id) return existing;

          const items = alreadyIn
            ? (existing.items || []).filter(
                (entry) => !(entry.mediaId === String(item.id) && entry.mediaType === item.type),
              )
            : [
                ...(existing.items || []),
                {
                  mediaId: String(item.id),
                  mediaType: item.type,
                  addedAt: new Date().toISOString(),
                },
              ];

          return { ...existing, items };
        }),
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();

    const trimmedName = newName.trim();
    if (!trimmedName) return;

    try {
      setCreating(true);
      setError("");

      const response = await fetch(`${API_URL}/api/auth/custom-playlists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: trimmedName }),
      });

      const data = await response.json();

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to create this playlist.");
      }

      setPlaylists((prev) => [...prev, { ...data.playlist, items: [] }]);
      setNewName("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="account-modal-overlay" onClick={onClose}>
      <div className="playlist-picker-modal" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="account-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <h3>Add &quot;{item.title}&quot; to Playlists</h3>

        {error && <p className="account-modal-error">{error}</p>}

        <form className="playlist-picker-create" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="New playlist name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            maxLength={60}
            disabled={creating}
          />
          <button type="submit" disabled={creating || !newName.trim()}>
            <Plus size={14} /> Create
          </button>
        </form>

        {loading ? (
          <p className="playlists-empty">Loading your playlists...</p>
        ) : (
          <ul className="playlist-picker-list">
            {playlists.length === 0 ? (
              <li>
                <p className="playlists-empty">
                  You don&apos;t have any playlists yet. Create one above.
                </p>
              </li>
            ) : (
              playlists.map((playlist) => {
                const checked = isInPlaylist(playlist);

                return (
                  <li key={playlist.id}>
                    <button
                      type="button"
                      className={checked ? "playlist-picker-row active" : "playlist-picker-row"}
                      onClick={() => toggle(playlist)}
                      disabled={updatingId === playlist.id}
                    >
                      <span className={checked ? "playlist-picker-check checked" : "playlist-picker-check"}>
                        {checked && <Check size={14} />}
                      </span>
                      <span className="playlist-picker-name">{playlist.name}</span>
                      <span className="playlist-picker-count">{(playlist.items || []).length}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        )}

        <div className="playlist-picker-footer">
          <button type="button" className="playlist-picker-add-btn" onClick={onClose}>
            Add +
          </button>
        </div>
      </div>
    </div>
  );
}

export default PlaylistPickerModal;