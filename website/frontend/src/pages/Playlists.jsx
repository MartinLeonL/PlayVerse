import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Plus, Pencil, Trash2 } from "lucide-react";

import Navbar from "../components/Navbar.jsx";
import { fetchMediaItem, parseMediaId } from "../utils/api.js";

import "./Playlists.css";
import "../components/AccountModal.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function resolvePlaylistItems(entries) {
  const validMediaIds = [...new Set(
    (entries || [])
      .map((entry) => (typeof entry === "string" ? entry : entry?.mediaId))
      .filter(Boolean)
      .map(String)
      .filter((mediaId) => mediaId.includes("-") && mediaId.split("-").slice(1).join("-").trim()),
  )];

  const settled = await Promise.allSettled(
    validMediaIds.map(async (mediaId) => {
      const { type, sourceId } = parseMediaId(mediaId);

      if (!type || !sourceId) {
        return null;
      }

      const result = await fetchMediaItem(type, sourceId);
      const item = result?.item;

      if (!item?.id || !item?.title || !item?.posterImage) {
        return null;
      }

      return item;
    }),
  );

  const resolved = settled.flatMap((result) => {
    if (result.status !== "fulfilled" || !result.value) {
      return [];
    }

    return [result.value];
  });

  const uniqueById = new Map();

  for (const item of resolved) {
    if (!uniqueById.has(item.id)) {
      uniqueById.set(item.id, item);
    }
  }

  return [...uniqueById.values()];
}

function Playlists() {
  const navigate = useNavigate();

  // ---- Custom, named playlists (mix movies/shows/music/games) ----
  // Each entry: { id, name, items: [{mediaId, mediaType}], resolvedItems: [fullMediaItem] }
  const [customPlaylists, setCustomPlaylists] = useState([]);
  const [customLoading, setCustomLoading] = useState(true);
  const [customError, setCustomError] = useState("");
  const [removingCustomKey, setRemovingCustomKey] = useState(null); // `${playlistId}:${itemId}`

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [renamingPlaylist, setRenamingPlaylist] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState("");

  const [deletingPlaylist, setDeletingPlaylist] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCustomPlaylists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  async function loadCustomPlaylists() {
    try {
      setCustomLoading(true);
      setCustomError("");

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

      const playlists = data.playlists || [];

      // Resolve full media details for every playlist's items up front, so
      // each one can render as its own poster grid immediately.
      const withResolvedItems = await Promise.all(
        playlists.map(async (playlist) => ({
          ...playlist,
          resolvedItems: await resolvePlaylistItems(playlist.items),
        })),
      );

      setCustomPlaylists(withResolvedItems);
    } catch (requestError) {
      setCustomError(requestError.message);
    } finally {
      setCustomLoading(false);
    }
  }

  function openMedia(item) {
    navigate(`/media/${encodeURIComponent(item.id)}`);
  }

  // ---- Custom playlist actions ----

  async function handleCreatePlaylist(event) {
    event.preventDefault();

    const trimmedName = createName.trim();

    if (!trimmedName) {
      setCreateError("Give your playlist a name.");
      return;
    }

    try {
      setCreating(true);
      setCreateError("");

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

      setCustomPlaylists((prev) => [
        ...prev,
        { ...data.playlist, items: [], resolvedItems: [] },
      ]);

      setCreateName("");
      setCreateOpen(false);
    } catch (requestError) {
      setCreateError(requestError.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleRenamePlaylist(event) {
    event.preventDefault();

    if (!renamingPlaylist) return;

    const trimmedName = renameValue.trim();

    if (!trimmedName) {
      setRenameError("Give your playlist a name.");
      return;
    }

    try {
      setRenaming(true);
      setRenameError("");

      const response = await fetch(
        `${API_URL}/api/auth/custom-playlists/${encodeURIComponent(renamingPlaylist.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: trimmedName }),
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to rename this playlist.");
      }

      setCustomPlaylists((prev) =>
        prev.map((playlist) =>
          playlist.id === renamingPlaylist.id ? { ...playlist, name: trimmedName } : playlist,
        ),
      );

      setRenamingPlaylist(null);
    } catch (requestError) {
      setRenameError(requestError.message);
    } finally {
      setRenaming(false);
    }
  }

  async function handleDeletePlaylist() {
    if (!deletingPlaylist) return;

    try {
      setDeleting(true);

      const response = await fetch(
        `${API_URL}/api/auth/custom-playlists/${encodeURIComponent(deletingPlaylist.id)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete this playlist.");
      }

      setCustomPlaylists((prev) => prev.filter((playlist) => playlist.id !== deletingPlaylist.id));
      setDeletingPlaylist(null);
    } catch (requestError) {
      setCustomError(requestError.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleRemoveFromCustomPlaylist(playlistId, item) {
    const removeKey = `${playlistId}:${item.id}`;

    try {
      setRemovingCustomKey(removeKey);

      const response = await fetch(
        `${API_URL}/api/auth/custom-playlists/${encodeURIComponent(playlistId)}/items`,
        {
          method: "DELETE",
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
        throw new Error(data.message || "Unable to remove this item.");
      }

      setCustomPlaylists((prev) =>
        prev.map((playlist) =>
          playlist.id === playlistId
            ? {
                ...playlist,
                items: (playlist.items || []).filter(
                  (entry) => !(entry.mediaId === String(item.id) && entry.mediaType === item.type),
                ),
                resolvedItems: (playlist.resolvedItems || []).filter(
                  (existing) => existing.id !== item.id,
                ),
              }
            : playlist,
        ),
      );
    } catch (requestError) {
      setCustomError(requestError.message);
    } finally {
      setRemovingCustomKey(null);
    }
  }

  const totalItems = customPlaylists.reduce(
    (sum, playlist) => sum + (playlist.resolvedItems?.length || 0),
    0,
  );

  return (
    <div className="playlists-page">
      <Navbar activeNav="home" />

      <main className="playlists-main">
        <h1>Playlists</h1>

        <p>Discover what to watch, what to hear, and what to play next.</p>

        <div className="playlist-hub-head">
          <div>
            <h2>Your Playlists</h2>
            <p className="playlist-hub-sub">Curate mood-based mixes or save your next obsession.</p>
          </div>
          <button
            type="button"
            className="playlist-hub-create-btn"
            onClick={() => {
              setCreateOpen(true);
              setCreateName("");
              setCreateError("");
            }}
          >
            <Plus size={15} /> New Playlist
          </button>
        </div>

        {customError && <p className="playlists-error">{customError}</p>}

        {customLoading ? (
          <div className="playlists-empty">Loading your playlists...</div>
        ) : customPlaylists.length === 0 ? (
          <div className="playlists-empty">
            You haven&apos;t created any playlists yet. Tap &quot;New Playlist&quot; to start one —
            it can mix movies, shows, music, and games together.
          </div>
        ) : (
          <div className="playlist-sections">
            {customPlaylists.map((playlist) => (
              <section className="playlist-hub-section" key={playlist.id}>
                <div className="playlists-detail-head">
                  <div>
                    <h2>{playlist.name}</h2>
                    <p className="playlist-hub-sub">
                      {(playlist.resolvedItems || []).length} saved title
                      {(playlist.resolvedItems || []).length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="playlists-detail-actions">
                    <button
                      type="button"
                      className="playlist-hub-icon-btn"
                      onClick={() => {
                        setRenamingPlaylist(playlist);
                        setRenameValue(playlist.name);
                        setRenameError("");
                      }}
                      aria-label={`Rename ${playlist.name}`}
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      type="button"
                      className="playlist-hub-icon-btn danger"
                      onClick={() => setDeletingPlaylist(playlist)}
                      aria-label={`Delete ${playlist.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {(playlist.resolvedItems || []).length === 0 ? (
                  <div className="playlists-empty">
                    Nothing here yet. Open a title and use &quot;Add to Playlist&quot; to add it
                    here.
                  </div>
                ) : (
                  <div className="playlists-grid">
                    {playlist.resolvedItems.map((item) => (
                      <div className="playlist-card" key={item.id}>
                        <button
                          type="button"
                          className="playlist-remove"
                          onClick={() => handleRemoveFromCustomPlaylist(playlist.id, item)}
                          disabled={removingCustomKey === `${playlist.id}:${item.id}`}
                          aria-label={`Remove ${item.title} from ${playlist.name}`}
                        >
                          <X size={14} />
                        </button>

                        <div
                          className="playlist-poster"
                          onClick={() => openMedia(item)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") openMedia(item);
                          }}
                        >
                          <img src={item.posterImage} alt={`${item.title} poster`} />
                        </div>

                        <p>{item.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </main>

      {createOpen && (
        <div className="account-modal-overlay" onClick={() => !creating && setCreateOpen(false)}>
          <div className="account-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="account-modal-close"
              onClick={() => !creating && setCreateOpen(false)}
              aria-label="Close"
              disabled={creating}
            >
              <X size={16} />
            </button>

            <form onSubmit={handleCreatePlaylist}>
              <div className="account-modal-field full">
                <label htmlFor="new-playlist-name">Playlist name</label>
                <input
                  id="new-playlist-name"
                  type="text"
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  placeholder="e.g. Cozy Weekend, Road Trip Mix"
                  maxLength={60}
                  disabled={creating}
                  autoFocus
                />
              </div>

              {createError && <p className="account-modal-error">{createError}</p>}

              <div className="account-modal-actions">
                <button
                  type="button"
                  className="account-modal-cancel"
                  onClick={() => setCreateOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </button>

                <button type="submit" className="account-modal-save" disabled={creating}>
                  {creating ? "Creating..." : "Create Playlist"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {renamingPlaylist && (
        <div
          className="account-modal-overlay"
          onClick={() => !renaming && setRenamingPlaylist(null)}
        >
          <div className="account-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="account-modal-close"
              onClick={() => !renaming && setRenamingPlaylist(null)}
              aria-label="Close"
              disabled={renaming}
            >
              <X size={16} />
            </button>

            <form onSubmit={handleRenamePlaylist}>
              <div className="account-modal-field full">
                <label htmlFor="rename-playlist-name">Playlist name</label>
                <input
                  id="rename-playlist-name"
                  type="text"
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  maxLength={60}
                  disabled={renaming}
                  autoFocus
                />
              </div>

              {renameError && <p className="account-modal-error">{renameError}</p>}

              <div className="account-modal-actions">
                <button
                  type="button"
                  className="account-modal-cancel"
                  onClick={() => setRenamingPlaylist(null)}
                  disabled={renaming}
                >
                  Cancel
                </button>

                <button type="submit" className="account-modal-save" disabled={renaming}>
                  {renaming ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingPlaylist && (
        <div
          className="account-modal-overlay"
          onClick={() => !deleting && setDeletingPlaylist(null)}
        >
          <div className="delete-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Delete Playlist</h3>
            <p>
              Are you sure you want to delete &quot;{deletingPlaylist.name}&quot;? This cannot be
              undone.
            </p>
            <div className="delete-modal-actions">
              <button
                type="button"
                className="delete-modal-cancel"
                onClick={() => setDeletingPlaylist(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="delete-modal-confirm"
                onClick={handleDeletePlaylist}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Playlists;