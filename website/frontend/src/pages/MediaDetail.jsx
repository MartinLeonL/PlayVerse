import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
  Plus,
  Check,
  Play,
  Star,
  Pencil,
  Clock,
  Tag,
  Globe,
  Database,
  Calendar,
  CalendarDays,
} from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import RatingModal from "../components/RatingModal.jsx";
import { getMediaById } from "../data/mockData.js";
import TrailerModal from "../components/TrailerModal.jsx";
import "./MediaDetail.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const navKeyByType = {
  movie: "movies",
  show: "shows",
  music: "music",
  game: "games",
};

const heroCopy = {
  movie: [
    "The best movies.",
    "Explore and keep track of your favorite movies all in one place.",
  ],
  show: [
    "The best shows.",
    "Explore and keep track of your favorite series all in one place.",
  ],
  music: [
    "The best music.",
    "Explore and keep track of your favorite tracks all in one place.",
  ],
  game: [
    "The best games.",
    "Explore and keep track of your favorite games all in one place.",
  ],
};

function MediaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const item = useMemo(() => getMediaById(decodeURIComponent(id ?? "")), [id]);

  const [rating, setRating] = useState(0);
  const [ratingNote, setRatingNote] = useState("");
  const [ratingLoading, setRatingLoading] = useState(true);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingError, setRatingError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [inPlaylist, setInPlaylist] = useState(false);
  const [playlistLoading, setPlaylistLoading] = useState(true);
  const [playlistUpdating, setPlaylistUpdating] = useState(false);
  const [playlistMessage, setPlaylistMessage] = useState("");
  const [playlistError, setPlaylistError] = useState("");
  const [trailerOpen, setTrailerOpen] = useState(false);

  useEffect(() => {
    if (!item) {
      return;
    }

    async function loadPlaylistStatus() {
      try {
        setPlaylistLoading(true);
        setPlaylistError("");

        const response = await fetch(`${API_URL}/api/auth/playlists`, {
          method: "GET",
          credentials: "include",
        });

        const data = await response.json();

        if (response.status === 401) {
          navigate("/login", {
            replace: true,
          });

          return;
        }

        if (!response.ok) {
          throw new Error(data.message || "Unable to load your playlist.");
        }

        const playlistKeyByType = {
          movie: "movies",
          show: "tvSeries",
          music: "music",
          game: "games",
        };

        const playlistKey = playlistKeyByType[item.type];

        const savedIds = (data.playlists?.[playlistKey] || []).map(String);

        setInPlaylist(savedIds.includes(String(item.id)));
      } catch (error) {
        setPlaylistError(error.message);
      } finally {
        setPlaylistLoading(false);
      }
    }

    async function loadRating() {
      try {
        setRatingLoading(true);
        setRatingError("");

        const response = await fetch(
          `${API_URL}/api/auth/ratings/${encodeURIComponent(
            item.id,
          )}?mediaType=${encodeURIComponent(item.type)}`,
          {
            method: "GET",
            credentials: "include",
          },
        );

        const data = await response.json();

        if (response.status === 401) {
          navigate("/login", {
            replace: true,
          });

          return;
        }

        if (!response.ok) {
          throw new Error(data.message || "Unable to load your rating.");
        }

        setRating(data.rating?.score || 0);
        setRatingNote(data.rating?.note || "");
      } catch (error) {
        setRatingError(error.message);
      } finally {
        setRatingLoading(false);
      }
    }

    loadPlaylistStatus();
    loadRating();
  }, [item, navigate]);

  if (!item) {
    return (
      <div className="home-page">
        <Navbar activeNav="home" onNavChange={() => navigate("/home")} />
        <main className="detail-missing">
          <p>We couldn&apos;t find that title.</p>
          <button
            type="button"
            className="hero-view"
            onClick={() => navigate("/home")}
          >
            Back to Home <ChevronRight size={16} />
          </button>
        </main>
      </div>
    );
  }

  const [tagline, subline] = heroCopy[item.type];

  async function handleSaveRating({ score, note }) {
    try {
      setRatingSaving(true);
      setRatingError("");

      const response = await fetch(
        `${API_URL}/api/auth/ratings/${encodeURIComponent(item.id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            mediaType: item.type,
            score,
            note,
          }),
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        navigate("/login", {
          replace: true,
        });

        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to save your rating.");
      }

      setRating(data.rating.score);
      setRatingNote(data.rating.note || "");
      setModalOpen(false);
    } catch (error) {
      setRatingError(error.message);
    } finally {
      setRatingSaving(false);
    }
  }

  async function addToPlaylist() {
    try {
      setPlaylistUpdating(true);
      setPlaylistMessage("");
      setPlaylistError("");

      const response = await fetch(`${API_URL}/api/auth/playlists/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          mediaId: String(item.id),
          mediaType: item.type,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        navigate("/login", {
          replace: true,
        });

        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to add this item to your playlist.",
        );
      }

      setInPlaylist(true);
      setPlaylistMessage(data.message);
    } catch (error) {
      setPlaylistError(error.message);
    } finally {
      setPlaylistUpdating(false);
    }
  }

  async function removeFromPlaylist() {
    try {
      setPlaylistUpdating(true);
      setPlaylistMessage("");
      setPlaylistError("");

      const response = await fetch(`${API_URL}/api/auth/playlists/items`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          mediaId: String(item.id),
          mediaType: item.type,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        navigate("/login", {
          replace: true,
        });

        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to remove this item from your playlist.",
        );
      }

      setInPlaylist(false);
      setPlaylistMessage(data.message);
    } catch (error) {
      setPlaylistError(error.message);
    } finally {
      setPlaylistUpdating(false);
    }
  }

  function handlePlaylistClick() {
    if (inPlaylist) {
      removeFromPlaylist();
    } else {
      addToPlaylist();
    }
  }

  return (
    <div className="home-page">
      <Navbar
        activeNav={navKeyByType[item.type]}
        onNavChange={(key) => navigate(key === "home" ? "/home" : "/home")}
      />

      <div
        className="detail-hero"
        style={{
          backgroundImage: `url("${item.backdropImage}")`,
        }}
      >
        <div className="detail-hero-text">
          <span>Experience</span>
          <h1>{tagline}</h1>
          <p>{subline}</p>
        </div>
      </div>

      <main className="detail-main">
        <section className="detail-card">
          <div className="detail-poster">
            <img src={item.posterImage} alt={`${item.title} poster`} />
          </div>

          <div className="detail-info">
            <span className="detail-tag">{item.tag}</span>
            <h2>{item.title}</h2>
            <p className="detail-genre">{item.genre}</p>
            <p className="detail-desc">{item.description}</p>
            <div className="detail-actions">
              <button
                type="button"
                className="hero-playlist"
                onClick={handlePlaylistClick}
                disabled={playlistLoading || playlistUpdating}
              >
                {playlistLoading ? (
                  "Loading..."
                ) : playlistUpdating ? (
                  inPlaylist ? (
                    "Removing..."
                  ) : (
                    "Adding..."
                  )
                ) : inPlaylist ? (
                  <>
                    <Check size={16} />
                    Remove
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Playlist
                  </>
                )}
              </button>
              <button
                type="button"
                className="hero-view"
                onClick={() => setTrailerOpen(true)}
                disabled={!item.trailerKey}
              >
                <Play size={16} />

                {item.trailerKey ? "Trailer" : "Trailer unavailable"}
              </button>
            </div>
          </div>

          <div className="detail-side">
            <div className="detail-score">
              <div className="detail-score-head">
                <span>Your Score</span>

                <button
                  type="button"
                  className="score-edit"
                  onClick={() => setModalOpen(true)}
                  aria-label="Rate this title"
                  disabled={ratingLoading}
                >
                  <Pencil size={14} />
                </button>
              </div>

              <div className="detail-score-value">
                <Star size={18} fill={rating ? "currentColor" : "none"} />

                {ratingLoading ? "Loading..." : `${rating || "--"}/5`}
              </div>

              {ratingNote && <p className="detail-score-note">{ratingNote}</p>}

              {ratingError && (
                <p className="detail-score-error">{ratingError}</p>
              )}
            </div>

            <div className="detail-watch">
              <span>How To Watch</span>
              <div className="provider-row">
                {item.providers.map((p) => (
                  <span
                    key={p.key}
                    className="provider-badge"
                    style={{ background: p.bg, color: p.fg }}
                    title={p.label}
                  >
                    {p.label.slice(0, 1)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="detail-stats">
          <div>
            <Clock size={16} />
            <div>
              <b>{item.durationLabel}</b>
              <span>{item.duration}</span>
            </div>
          </div>
          <div>
            <Tag size={16} />
            <div>
              <b>Genres</b>
              <span>{item.genre}</span>
            </div>
          </div>
          <div>
            <Globe size={16} />
            <div>
              <b>Language</b>
              <span>{item.language}</span>
            </div>
          </div>
          <div>
            <Database size={16} />
            <div>
              <b>Source</b>
              <span>{item.source}</span>
            </div>
          </div>
          <div>
            <CalendarDays size={16} />
            <div>
              <b>Release Date</b>
              <span>{item.date}</span>
            </div>
          </div>
        </section>
      </main>

      {modalOpen && (
        <RatingModal
          title={item.title}
          initialRating={rating}
          initialNote={ratingNote}
          saving={ratingSaving}
          serverError={ratingError}
          onCancel={() => {
            if (!ratingSaving) {
              setModalOpen(false);
              setRatingError("");
            }
          }}
          onSave={handleSaveRating}
        />
      )}

      {trailerOpen && item.trailerKey && (
        <TrailerModal
          title={item.title}
          videoKey={item.trailerKey}
          onClose={() => setTrailerOpen(false)}
        />
      )}
    </div>
  );
}

export default MediaDetail;
