import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  Plus,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import PlaylistPickerModal from "../components/PlaylistPickerModal.jsx";
import { fetchMovies, fetchShows, fetchMusic, fetchGames, fetchHero } from "../utils/api.js";
import { formatScore } from "../utils/format.js";
import "./Home.css";

function MediaRow({ title, items, onSelect, onAddToPlaylist }) {
  const scrollerRef = useRef(null);

  function scroll(dir) {
    scrollerRef.current?.scrollBy({ left: dir * 500, behavior: "smooth" });
  }

  if (!items || items.length === 0) return null;

  return (
    <section className="media-row">
      <h2>{title}</h2>
      <div className="row-wrap">
        <div className="row-scroller" ref={scrollerRef}>
          {items.map((item) => (
            <div
              className="poster-card"
              key={item.id}
              onClick={() => onSelect(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onSelect(item)}
            >
              <div className="poster">
                <img src={item.posterImage} alt={`${item.title} poster`} />
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
                    onAddToPlaylist(item);
                  }}
                  aria-label={`Add ${item.title} to playlist`}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="row-next left"
          onClick={() => scroll(-1)}
          aria-label="Scroll left"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          className="row-next right"
          onClick={() => scroll(1)}
          aria-label="Scroll right"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}

function Home() {
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroSlides, setHeroSlides] = useState([]);
  const [movies, setMovies] = useState([]);
  const [shows, setShows] = useState([]);
  const [music, setMusic] = useState([]);
  const [games, setGames] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");

  // Which item the "Add to Playlist" modal is currently open for, if any.
  const [pickerItem, setPickerItem] = useState(null);

  const navigate = useNavigate();

  const hero = heroSlides[heroIndex];

  useEffect(() => {
    async function loadCatalog() {
      try {
        setCatalogLoading(true);
        setCatalogError("");

        const [moviesResult, showsResult, musicResult, gamesResult, heroResult] =
          await Promise.all([
            fetchMovies(),
            fetchShows(),
            fetchMusic(),
            fetchGames(),
            fetchHero(),
          ]);

        setMovies(moviesResult.items);
        setShows(showsResult.items);
        setMusic(musicResult.items);
        setGames(gamesResult.items);
        setHeroSlides(heroResult.items);
      } catch (error) {
        setCatalogError(error.message);
      } finally {
        setCatalogLoading(false);
      }
    }

    loadCatalog();
  }, []);

  function changeHero(dir) {
    setHeroIndex((i) => (i + dir + heroSlides.length) % heroSlides.length);
  }

  function openMedia(item) {
    navigate(`/media/${encodeURIComponent(item.id)}`);
  }

  if (catalogLoading) {
    return (
      <div className="home-page">
        <Navbar activeNav="home" />
        <main>
          <p>Loading PlayVerse...</p>
        </main>
      </div>
    );
  }

  if (catalogError) {
    return (
      <div className="home-page">
        <Navbar activeNav="home" />
        <main>
          <p>Couldn&apos;t load the catalog: {catalogError}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="home-page">
      <Navbar activeNav="home" />

      <main>
        {hero && (
          <>
            <section className="hero">
              <div className="hero-info">
                <span className="hero-tag">{hero.tag}</span>
                <h1>{hero.title}</h1>
                <p className="hero-genre">{hero.genre || hero.genres?.join(" • ")}</p>
                <div className="hero-meta">
                  <span>
                    <Calendar size={14} /> {hero.date}
                  </span>
                  <span>
                    <Clock size={14} /> {hero.duration}
                  </span>
                </div>
                <p className="hero-desc">{hero.description}</p>
                <div className="hero-actions">
                  <button
                    type="button"
                    className="hero-view"
                    onClick={() => openMedia(hero)}
                  >
                    View <ChevronRight size={16} />
                  </button>
                  <button
                    type="button"
                    className="hero-playlist"
                    onClick={() => setPickerItem(hero)}
                  >
                    <Plus size={16} />
                    Playlist
                  </button>
                </div>
              </div>

              <div
                className="hero-image"
                style={{
                  backgroundImage: `url("${hero.backdropImage}")`,
                }}
              >
                <button
                  type="button"
                  className="hero-arrow left"
                  onClick={() => changeHero(-1)}
                  aria-label="Previous"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  className="hero-arrow right"
                  onClick={() => changeHero(1)}
                  aria-label="Next"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </section>

            <div className="hero-dots">
              {heroSlides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  className={i === heroIndex ? "dot active" : "dot"}
                  onClick={() => setHeroIndex(i)}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}

        <MediaRow title="Popular Movies" items={movies} onSelect={openMedia} onAddToPlaylist={setPickerItem} />
        <MediaRow title="Popular Shows" items={shows} onSelect={openMedia} onAddToPlaylist={setPickerItem} />
        <MediaRow title="Popular Music" items={music} onSelect={openMedia} onAddToPlaylist={setPickerItem} />
        <MediaRow title="Popular Games" items={games} onSelect={openMedia} onAddToPlaylist={setPickerItem} />
      </main>

      {pickerItem && (
        <PlaylistPickerModal item={pickerItem} onClose={() => setPickerItem(null)} />
      )}
    </div>
  );
}

export default Home;