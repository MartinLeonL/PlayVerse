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
  CalendarDays,
} from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import RatingModal from "../components/RatingModal.jsx";
import { getMediaById } from "../data/mockData.js";
import { isInPlaylist, togglePlaylist } from "../utils/playlist.js";
import "./MediaDetail.css";

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

function ratingKey(id) {
  return `pv-rating-${id}`;
}

function MediaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const item = useMemo(() => getMediaById(decodeURIComponent(id ?? "")), [id]);

  const [rating, setRating] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [inPlaylist, setInPlaylist] = useState(false);

  useEffect(() => {
    if (!item) return;
    const stored = window.localStorage.getItem(ratingKey(item.id));
    setRating(stored ? Number(stored) : 0);
    setInPlaylist(isInPlaylist(item.id));
  }, [item]);

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

  function handleSaveRating(value) {
    setRating(value);
    window.localStorage.setItem(ratingKey(item.id), String(value));
    setModalOpen(false);
  }

  function handleTogglePlaylist() {
    setInPlaylist(togglePlaylist(item.id));
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
                onClick={handleTogglePlaylist}
              >
                {inPlaylist ? <Check size={16} /> : <Plus size={16} />}
                {inPlaylist ? "In Playlist" : "Playlist"}
              </button>
              <button type="button" className="hero-view">
                <Play size={16} /> Trailer
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
                >
                  <Pencil size={14} />
                </button>
              </div>
              <div className="detail-score-value">
                <Star size={18} fill={rating ? "currentColor" : "none"} />
                {rating ? rating.toFixed(1) : "--"}/5
              </div>
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
          onCancel={() => setModalOpen(false)}
          onSave={handleSaveRating}
        />
      )}
    </div>
  );
}

export default MediaDetail;
