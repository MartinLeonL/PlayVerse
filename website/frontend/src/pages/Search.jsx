import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search as SearchIcon, ChevronDown, Plus } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import PlaylistPickerModal from "../components/PlaylistPickerModal.jsx";
import { CATEGORY_FETCHERS, searchMedia } from "../utils/api.js";
import { formatScore } from "../utils/format.js";
import "./Search.css";
import { ArrowUpDown } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const categories = [
  { key: "movies", label: "Movies" },
  { key: "shows", label: "TV Series" },
  { key: "music", label: "Music" },
  { key: "games", label: "Games" },
];

// Music has no external rating at all (Deezer doesn't track one), so
// "Highest/Lowest Rated" wouldn't mean anything there — the PlayVerse
// user-score options still apply everywhere, since that's our own data.
const SORT_OPTIONS_DEFAULT = [
  { value: "", label: "Popularity" },
  { value: "recent", label: "Recent" },
  { value: "az", label: "A - Z" },
  { value: "za", label: "Z - A" },
  { value: "highest", label: "Highest Rated" },
  { value: "lowest", label: "Lowest Rated" },
  { value: "userScoreDesc", label: "Highest User Score" },
  { value: "userScoreAsc", label: "Lowest User Score" },
];

const SORT_OPTIONS_MUSIC = [
  { value: "", label: "Popularity" },
  { value: "recent", label: "Recent" },
  { value: "az", label: "A - Z" },
  { value: "za", label: "Z - A" },
  { value: "userScoreDesc", label: "Highest User Score" },
  { value: "userScoreAsc", label: "Lowest User Score" },
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
  const [sortBy, setSortBy] = useState("");
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

  const sortOptions = activeCategory === "music" ? SORT_OPTIONS_MUSIC : SORT_OPTIONS_DEFAULT;
  const sortLabel = sortOptions.find((option) => option.value === sortBy)?.label || "Popularity";

  useEffect(() => {
    const sortStillExists = sortOptions.some((option) => option.value === sortBy);
    if (!sortStillExists) {
      setSortBy("");
    }
  }, [activeCategory, sortBy, sortOptions]);

  useEffect(() => {
    let cancelled = false;

    async function loadResults() {
      try {
        setLoading(true);
        setError("");

        const trimmedQuery = query.trim();

        // Artists have no "popular artists" browse endpoint — only
        // searchable by name, unlike the other categories.
        const data = trimmedQuery
          ? await searchMedia({ type: activeCategory, query: trimmedQuery, sort: sortBy || undefined })
          : activeCategory === "artist"
            ? { items: [] }
            : await CATEGORY_FETCHERS[activeCategory]({ sort: sortBy || undefined });

        if (cancelled) return;

        setResults(data.items || []);
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
    // Artists don't have their own detail page — there's no "artist"
    // case in the backend's /media/item route (an artist isn't a
    // rateable, single-release thing like a movie/show/game/track).
    // Tapping one instead pivots the search to their tracks.
    if (item.type === "artist") {
      setActiveCategory("music");
      setQuery(item.title);
      return;
    }
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
            <button
              type="button"
              className="search-sort-btn"
              onClick={() => setSortOpen((current) => !current)}
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
            >
              <ArrowUpDown id="sort-icon" size={14} />

              <p>Sort By:</p>
              <span>{sortLabel}</span>

              <ChevronDown
                size={16}
                id="sort-icon"
                className={sortOpen ? "search-sort-chevron open" : "search-sort-chevron"}
              />
            </button>

            {sortOpen && (
              <div className="search-sort-dropdown" role="listbox" aria-label="Sort search results">
                {sortOptions.map((option) => (
                  <button
                    key={option.value || "popularity"}
                    type="button"
                    role="option"
                    aria-selected={sortBy === option.value}
                    className={sortBy === option.value ? "search-sort-option active" : "search-sort-option"}
                    onClick={() => {
                      setSortBy(option.value);
                      setSortOpen(false);
                    }}
                  >
                    {option.label}
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
                    {item.type !== "artist" && (
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
                    )}
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
