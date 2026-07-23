import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search as SearchIcon, ChevronDown, Plus } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import PlaylistPickerModal from "../components/PlaylistPickerModal.jsx";
import { CATEGORY_FETCHERS, searchMedia } from "../utils/api.js";
import { formatScore } from "../utils/format.js";
import "./Search.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const categories = [
  { key: "movies", label: "Movies" },
  { key: "shows", label: "TV Series" },
  { key: "music", label: "Music" },
  { key: "games", label: "Games" },
];

const sortOptions = [
  { key: "popularity", label: "Popularity" },
  { key: "recent", label: "Recent" },
  { key: "trending", label: "Trending" },
];

function Search() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // When present, this page is in "add to playlist" mode — arriving
  // here from a specific playlist's own "Add to Playlist" button,
  // matching the same flow mobile has.
  const addToPlaylistId = searchParams.get("addTo");
  const addToPlaylistName = searchParams.get("addToName") || "your playlist";

  const [activeCategory, setActiveCategory] = useState("movies");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("popularity");
  const [sortOpen, setSortOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [addingId, setAddingId] = useState(null);
  const [addMessage, setAddMessage] = useState("");
  const [addError, setAddError] = useState("");
  // Only used outside "add mode" — when arriving with ?addTo=, clicking
  // a card already adds directly to that one playlist, so this generic
  // picker would just be redundant there.
  const [pickerItem, setPickerItem] = useState(null);

  const sortLabel = sortOptions.find((s) => s.key === sortBy)?.label;

  useEffect(() => {
    let cancelled = false;

    async function loadResults() {
      try {
        setLoading(true);
        setError("");

        const trimmedQuery = query.trim();

        const data = trimmedQuery
          ? await searchMedia({ type: activeCategory, query: trimmedQuery })
          : await CATEGORY_FETCHERS[activeCategory]();

        if (cancelled) return;

        let items = data.items;

        if (sortBy === "recent") {
          items = [...items].sort((a, b) => (a.date < b.date ? 1 : -1));
        } else if (sortBy === "trending") {
          items = [...items].reverse();
        }

        setResults(items);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const timeoutId = setTimeout(loadResults, 300); // debounce typing

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [activeCategory, query, sortBy]);

  function openMedia(item) {
    navigate(`/media/${encodeURIComponent(item.id)}`);
  }

  async function handleAddToPlaylist(item) {
    try {
      setAddingId(item.id);
      setAddError("");
      setAddMessage("");

      const response = await fetch(
        `${API_URL}/api/auth/custom-playlists/${encodeURIComponent(addToPlaylistId)}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ mediaId: item.id, mediaType: item.type }),
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to add this item.");
      }

      setAddMessage(
        data.added
          ? `Added "${item.title}" to ${addToPlaylistName}`
          : `"${item.title}" is already in ${addToPlaylistName}`,
      );
    } catch (requestError) {
      setAddError(requestError.message);
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="home-page">
      <Navbar activeNav="search" />

      <main className="search-main">
        {addToPlaylistId && (
          <p className="search-add-mode-banner">
            Adding to <strong>{addToPlaylistName}</strong> — tap a result to add it.
          </p>
        )}

        <div className="search-head">
          <div>
            <h1>Search</h1>
            <p>Discover what to watch, what to hear, and what to play next.</p>

            <div className="search-input">
              <input
                type="text"
                placeholder="Search title, artist, etc..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <SearchIcon size={16} />
            </div>

            <div className="search-tabs">
              {categories.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={activeCategory === c.key ? "search-tab active" : "search-tab"}
                  onClick={() => setActiveCategory(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="search-sort">
            <button type="button" className="sort-btn" onClick={() => setSortOpen((v) => !v)}>
              Sort By: {sortLabel} <ChevronDown size={16} />
            </button>
            {sortOpen && (
              <div className="sort-dropdown">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={sortBy === opt.key ? "sort-option active" : "sort-option"}
                    onClick={() => {
                      setSortBy(opt.key);
                      setSortOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {addMessage && <p className="search-add-message">{addMessage}</p>}
        {addError && <p className="search-add-error">{addError}</p>}

        {loading ? (
          <p className="search-empty">Loading...</p>
        ) : error ? (
          <p className="search-empty">Couldn&apos;t search: {error}</p>
        ) : results.length === 0 ? (
          <p className="search-empty">No results for &quot;{query}&quot;.</p>
        ) : (
          <div className="search-grid">
            {results.map((item) => (
              <div
                className="search-card"
                key={item.id}
                onClick={() => (addToPlaylistId ? handleAddToPlaylist(item) : openMedia(item))}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  addToPlaylistId ? handleAddToPlaylist(item) : openMedia(item);
                }}
              >
                <div className="search-poster">
                  <img src={item.posterImage} alt={`${item.title} poster`} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "12px" }} />
                  {item.userScore != null && (
                    <span className="score-badge score-badge-user">
                      ★ {formatScore(item.userScore)}
                    </span>
                  )}
                  {item.type === "music" && item.artist ? (
                    <span className="score-badge score-badge-artist">{item.artist}</span>
                  ) : (
                    item.score != null && (
                      <span className="score-badge score-badge-external">
                        ★ {formatScore(item.score)}
                      </span>
                    )
                  )}
                  {addToPlaylistId && (
                    <span className="search-add-icon">
                      {addingId === item.id ? "..." : <Plus size={16} />}
                    </span>
                  )}
                </div>
                {addToPlaylistId ? (
                  <p>{item.title}</p>
                ) : (
                  <div className="poster-card-title-row">
                    <p>{item.title}</p>
                    <button
                      type="button"
                      className="poster-card-add-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPickerItem(item);
                      }}
                      aria-label={`Add ${item.title} to playlist`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {pickerItem && (
        <PlaylistPickerModal item={pickerItem} onClose={() => setPickerItem(null)} />
      )}
    </div>
  );
}

export default Search;