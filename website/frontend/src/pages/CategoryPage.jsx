import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import PlaylistPickerModal from "../components/PlaylistPickerModal.jsx";
import { CATEGORY_FETCHERS, fetchGenres } from "../utils/api.js";
import { formatScore } from "../utils/format.js";
import "./CategoryPage.css";

// Music has no external rating at all (Deezer doesn't track one), so
// "Highest/Lowest Rated" wouldn't mean anything there — the PlayVerse
// user-score options still apply everywhere, since that's our own data.
const SORT_OPTIONS_DEFAULT = [
  { value: "", label: "Trending" },
  { value: "az", label: "A - Z" },
  { value: "za", label: "Z - A" },
  { value: "recent", label: "Recent" },
  { value: "highest", label: "Highest Rated" },
  { value: "lowest", label: "Lowest Rated" },
  { value: "userScoreDesc", label: "Highest User Score" },
  { value: "userScoreAsc", label: "Lowest User Score" },
];

const SORT_OPTIONS_MUSIC = [
  { value: "", label: "Trending" },
  { value: "az", label: "A - Z" },
  { value: "za", label: "Z - A" },
  { value: "recent", label: "Recent" },
  { value: "userScoreDesc", label: "Highest User Score" },
  { value: "userScoreAsc", label: "Lowest User Score" },
];

function CategoryPage({ navKey, title }) {
  const navigate = useNavigate();
  const [activeGenre, setActiveGenre] = useState("All");
  const [sort, setSort] = useState("");
  const [genres, setGenres] = useState([]);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [pickerItem, setPickerItem] = useState(null);

  const sortOptions = navKey === "music" ? SORT_OPTIONS_MUSIC : SORT_OPTIONS_DEFAULT;

  useEffect(() => {
    let cancelled = false;

    async function loadGenres() {
      try {
        const data = await fetchGenres(navKey);
        if (!cancelled) setGenres(data.genres);
      } catch {
        if (!cancelled) setGenres([]);
      }
    }

    loadGenres();
    setActiveGenre("All");
    setSort("");

    return () => {
      cancelled = true;
    };
  }, [navKey]);

  // Loads (or reloads) page 1 whenever the category, genre, or sort changes.
  useEffect(() => {
    let cancelled = false;

    async function loadFirstPage() {
      try {
        setLoading(true);
        setError("");

        const fetcher = CATEGORY_FETCHERS[navKey];
        const genreParam = activeGenre === "All" ? undefined : activeGenre;
        const data = await fetcher({ page: 1, genre: genreParam, sort: sort || undefined });

        if (!cancelled) {
          const fetchedItems = data.items || [];
          setItems(fetchedItems);
          setPage(1);
          setHasMore(fetchedItems.length > 0 && 1 < (data.totalPages ?? 1));
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadFirstPage();

    return () => {
      cancelled = true;
    };
  }, [navKey, activeGenre, sort]);

  async function loadNextPage() {
    if (loadingMore || loading || !hasMore) return;

    try {
      setLoadingMore(true);

      const fetcher = CATEGORY_FETCHERS[navKey];
      const genreParam = activeGenre === "All" ? undefined : activeGenre;
      const nextPage = page + 1;
      const data = await fetcher({ page: nextPage, genre: genreParam, sort: sort || undefined });
      const fetchedItems = data.items || [];

      if (fetchedItems.length === 0) {
        setHasMore(false);
      } else {
        setItems((prev) => [...prev, ...fetchedItems]);
        setPage(nextPage);
        setHasMore(nextPage < (data.totalPages ?? nextPage));
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingMore(false);
    }
  }

  // Infinite scroll — fetch the next page once the user nears the bottom.
  useEffect(() => {
    function onScroll() {
      const scrollBottom = window.innerHeight + window.scrollY;
      const pageHeight = document.documentElement.scrollHeight;

      if (scrollBottom >= pageHeight - 400) {
        loadNextPage();
      }
    }

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, loading, hasMore, page, navKey, activeGenre, sort]);

  function openMedia(item) {
    navigate(`/media/${encodeURIComponent(item.id)}`);
  }

  return (
    <div className="home-page">
      <Navbar activeNav={navKey} />

      <main className="category-main">
        <h1>{title}</h1>
        <p>Browse by genre to find something new.</p>

        <div className="category-controls">
          <div className="category-genres">
            <button
              type="button"
              className={activeGenre === "All" ? "genre-pill active" : "genre-pill"}
              onClick={() => setActiveGenre("All")}
            >
              All
            </button>
            {genres.map((g) => (
              <button
                key={g.id}
                type="button"
                className={activeGenre === String(g.id) ? "genre-pill active" : "genre-pill"}
                onClick={() => setActiveGenre(String(g.id))}
              >
                {g.name}
              </button>
            ))}
          </div>

          <select
            className="category-sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort by"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="category-empty">Loading...</p>
        ) : error ? (
          <p className="category-empty">Couldn&apos;t load this category: {error}</p>
        ) : items.length === 0 ? (
          <p className="category-empty">Nothing in this genre yet.</p>
        ) : (
          <>
            <div className="category-grid">
              {items.map((item, index) => (
                <div
                  className="category-card"
                  key={`${item.id}-${index}`}
                  onClick={() => openMedia(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && openMedia(item)}
                >
                  <div className="category-poster">
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
                  </div>
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
                </div>
              ))}
            </div>
            {loadingMore && <p className="category-empty">Loading more...</p>}
          </>
        )}
      </main>

      {pickerItem && (
        <PlaylistPickerModal item={pickerItem} onClose={() => setPickerItem(null)} />
      )}
    </div>
  );
}

export default CategoryPage;