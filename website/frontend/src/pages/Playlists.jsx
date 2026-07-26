import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from "lucide-react";

import Navbar from "../components/Navbar.jsx";
import { fetchMediaItem, parseMediaId } from "../utils/api.js";
import { formatScore } from "../utils/format.js";

import "./Playlists.css";
import "../components/AccountModal.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Applies to every playlist's grid uniformly — no genre filter here,
// since a custom playlist already mixes movies/shows/music/games and
// genre wouldn't cleanly apply across all of them the way it does on
// the single-category browse pages.
const PLAYLIST_SORT_OPTIONS = [
  { value: "", label: "Date Added" },
  { value: "az", label: "A - Z" },
  { value: "za", label: "Z - A" },
  { value: "highest", label: "Highest Rated" },
  { value: "lowest", label: "Lowest Rated" },
  { value: "userScoreDesc", label: "Highest User Score" },
  { value: "userScoreAsc", label: "Lowest User Score" },
];

// The backend doesn't track a playlist display order, so the manually
// arranged order lives in localStorage on this browser. It's applied on
// top of whatever order the API returns, and any playlist not yet in
// the stored order (e.g. one just created) is appended at the end.
const PLAYLIST_ORDER_STORAGE_KEY = "pv-playlist-order";

function loadStoredPlaylistOrder() {
  try {
    const raw = window.localStorage.getItem(PLAYLIST_ORDER_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredPlaylistOrder(orderedIds) {
  try {
    window.localStorage.setItem(PLAYLIST_ORDER_STORAGE_KEY, JSON.stringify(orderedIds));
  } catch {
    // Not fatal — worst case the manual order just doesn't persist.
  }
}

function applyStoredOrder(playlists) {
  const storedOrder = loadStoredPlaylistOrder();
  const byId = new Map(playlists.map((playlist) => [playlist.id, playlist]));

  const ordered = storedOrder
    .map((id) => byId.get(id))
    .filter(Boolean);

  const orderedIds = new Set(ordered.map((playlist) => playlist.id));
  const remaining = playlists.filter((playlist) => !orderedIds.has(playlist.id));

  return [...ordered, ...remaining];
}

function sortPlaylistItems(items, sortBy) {
  const sorted = [...items];

  switch (sortBy) {
    case "az":
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "za":
      sorted.sort((a, b) => b.title.localeCompare(a.title));
      break;
    case "highest":
      sorted.sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
      break;
    case "lowest":
      sorted.sort((a, b) => (a.score ?? Infinity) - (b.score ?? Infinity));
      break;
    case "userScoreDesc":
      sorted.sort((a, b) => (b.userScore ?? -Infinity) - (a.userScore ?? -Infinity));
      break;
    case "userScoreAsc":
      sorted.sort((a, b) => (a.userScore ?? Infinity) - (b.userScore ?? Infinity));
      break;
    default:
      // "Date Added" — oldest first, matching the order items were
      // originally saved into the playlist.
      sorted.sort((a, b) => new Date(a.addedAt || 0) - new Date(b.addedAt || 0));
  }

  return sorted;
}

async function resolvePlaylistItems(entries) {
  const normalizedEntries = (entries || []).map((entry) =>
    typeof entry === "string" ? { mediaId: entry } : entry,
  );

  // Preserve each entry's addedAt so it can travel with the resolved
  // item — needed for the "Date Added" sort option below.
  const addedAtByMediaId = new Map();
  for (const entry of normalizedEntries) {
    if (entry?.mediaId) {
      addedAtByMediaId.set(String(entry.mediaId), entry.addedAt);
    }
  }

  const validMediaIds = [...new Set(
    normalizedEntries
      .map((entry) => entry?.mediaId)
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

      return { ...item, addedAt: addedAtByMediaId.get(mediaId) };
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
  // Each entry: { id, name, items: [{mediaId, mediaType, addedAt}], resolvedItems: [fullMediaItem] }
  // Array order here IS the display order — reordering just re-sorts
  // this array and mirrors the result into localStorage.
  const [customPlaylists, setCustomPlaylists] = useState([]);
  const [customLoading, setCustomLoading] = useState(true);
  const [customError, setCustomError] = useState("");
  const [removingCustomKey, setRemovingCustomKey] = useState(null); // `${playlistId}:${itemId}`

  // Applies to every playlist's grid at once.
  const [sortBy, setSortBy] = useState("");

  // Playlist IDs whose grid is currently collapsed. Populated once
  // playlists finish loading (see loadCustomPlaylists) so every
  // playlist starts collapsed by default.
  const [collapsedPlaylistIds, setCollapsedPlaylistIds] = useState(() => new Set());

  // Drag-and-drop reordering state.
  const [draggedPlaylistId, setDraggedPlaylistId] = useState(null);
  const [dragOverPlaylistId, setDragOverPlaylistId] = useState(null);

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

      const ordered = applyStoredOrder(withResolvedItems);

      setCustomPlaylists(ordered);
      setCollapsedPlaylistIds(new Set(ordered.map((playlist) => playlist.id)));
    } catch (requestError) {
      setCustomError(requestError.message);
    } finally {
      setCustomLoading(false);
    }
  }

  function openMedia(item) {
    navigate(`/media/${encodeURIComponent(item.id)}`);
  }

  function toggleCollapsed(playlistId) {
    setCollapsedPlaylistIds((prev) => {
      const next = new Set(prev);

      if (next.has(playlistId)) {
        next.delete(playlistId);
      } else {
        next.add(playlistId);
      }

      return next;
    });
  }

  // ---- Reordering ----

  function reorderTo(fromId, toId) {
    setCustomPlaylists((prev) => {
      const fromIndex = prev.findIndex((playlist) => playlist.id === fromId);
      const toIndex = prev.findIndex((playlist) => playlist.id === toId);

      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return prev;
      }

      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);

      saveStoredPlaylistOrder(next.map((playlist) => playlist.id));
      return next;
    });
  }

  function movePlaylist(playlistId, direction) {
    setCustomPlaylists((prev) => {
      const index = prev.findIndex((playlist) => playlist.id === playlistId);
      const targetIndex = index + direction;

      if (index === -1 || targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }

      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);

      saveStoredPlaylistOrder(next.map((playlist) => playlist.id));
      return next;
    });
  }

  function handleDragStart(event, playlistId) {
    setDraggedPlaylistId(playlistId);
    event.dataTransfer.effectAllowed = "move";
    // Firefox requires data to actually be set for the drag to start.
    event.dataTransfer.setData("text/plain", playlistId);
  }

  function handleDragOver(event, playlistId) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    if (draggedPlaylistId && draggedPlaylistId !== playlistId && dragOverPlaylistId !== playlistId) {
      setDragOverPlaylistId(playlistId);
    }
  }

  function handleDrop(event, targetPlaylistId) {
    event.preventDefault();

    if (draggedPlaylistId && draggedPlaylistId !== targetPlaylistId) {
      reorderTo(draggedPlaylistId, targetPlaylistId);
    }

    setDraggedPlaylistId(null);
    setDragOverPlaylistId(null);
  }

  function handleDragEnd() {
    setDraggedPlaylistId(null);
    setDragOverPlaylistId(null);
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

      setCustomPlaylists((prev) => {
        const next = prev.filter((playlist) => playlist.id !== deletingPlaylist.id);
        saveStoredPlaylistOrder(next.map((playlist) => playlist.id));
        return next;
      });

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

        {customPlaylists.length > 0 && (
          <div className="playlists-toolbar">
            <div className="playlists-sort-bar">
              <label htmlFor="playlists-sort-select" className="playlists-sort-icon">
                <ArrowUpDown size={14} />
                Sort By
              </label>

              <select
                id="playlists-sort-select"
                className="playlists-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort playlist items"
              >
                {PLAYLIST_SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="playlist-hub-head">
          <div>
            <h2>Your Playlists</h2>
            <p className="playlist-hub-sub">
              Curate mood-based mixes or save your next obsession. Drag the{" "}
              <GripVertical size={12} style={{ verticalAlign: "-1px" }} /> handle to reorder them.
            </p>
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
            {customPlaylists.map((playlist, index) => {
              const isCollapsed = collapsedPlaylistIds.has(playlist.id);
              const resolvedItems = playlist.resolvedItems || [];
              const sortedItems = sortPlaylistItems(resolvedItems, sortBy);
              const itemCount = resolvedItems.length;

              const isDragging = draggedPlaylistId === playlist.id;
              const isDragOver = dragOverPlaylistId === playlist.id && !isDragging;

              const sectionClassName = [
                "playlist-hub-section",
                isDragging ? "is-dragging" : "",
                isDragOver ? "is-drag-over" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <section
                  className={sectionClassName}
                  key={playlist.id}
                  onDragOver={(event) => handleDragOver(event, playlist.id)}
                  onDrop={(event) => handleDrop(event, playlist.id)}
                >
                  <div className="playlists-detail-head">
                    <span
                      className="playlist-drag-handle"
                      draggable
                      onDragStart={(event) => handleDragStart(event, playlist.id)}
                      onDragEnd={handleDragEnd}
                      role="button"
                      tabIndex={-1}
                      aria-hidden="true"
                      title="Drag to reorder"
                    >
                      <GripVertical size={16} />
                    </span>

                    <button
                      type="button"
                      className="playlist-collapse-toggle"
                      onClick={() => toggleCollapsed(playlist.id)}
                      aria-expanded={!isCollapsed}
                      aria-label={
                        isCollapsed ? `Expand ${playlist.name}` : `Collapse ${playlist.name}`
                      }
                    >
                      {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}

                      <div>
                        <h2>{playlist.name}</h2>
                        <p className="playlist-hub-sub">
                          {itemCount} saved title
                          {itemCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    </button>

                    <div className="playlists-detail-actions">
                      <button
                        type="button"
                        className="playlist-hub-icon-btn"
                        onClick={() => movePlaylist(playlist.id, -1)}
                        disabled={index === 0}
                        aria-label={`Move ${playlist.name} up`}
                        title="Move up"
                      >
                        <ArrowUp size={14} />
                      </button>

                      <button
                        type="button"
                        className="playlist-hub-icon-btn"
                        onClick={() => movePlaylist(playlist.id, 1)}
                        disabled={index === customPlaylists.length - 1}
                        aria-label={`Move ${playlist.name} down`}
                        title="Move down"
                      >
                        <ArrowDown size={14} />
                      </button>

                      <button
                        type="button"
                        className="playlist-hub-icon-btn"
                        onClick={() =>
                          navigate(
                            `/search?addTo=${encodeURIComponent(playlist.id)}&addToName=${encodeURIComponent(playlist.name)}`,
                          )
                        }
                        aria-label={`Add to ${playlist.name}`}
                      >
                        <Plus size={14} />
                      </button>

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

                  {!isCollapsed && (
                    itemCount === 0 ? (
                      <div className="playlists-empty">
                        Nothing here yet. Open a title and use &quot;Add to Playlist&quot; to add it
                        here.
                      </div>
                    ) : (
                      <div className="playlists-grid">
                        {sortedItems.map((item) => (
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
                              {item.userScore != null && (
                                <span className="score-badge score-badge-user">
                                  ★ {formatScore(item.userScore)}
                                </span>
                              )}
                              {item.score != null && (
                                <span className="score-badge score-badge-external">
                                  ★ {formatScore(item.score)}
                                </span>
                              )}
                            </div>

                            <p>{item.title}</p>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </section>
              );
            })}
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