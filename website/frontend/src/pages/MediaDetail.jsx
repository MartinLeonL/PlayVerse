import { useEffect, useState } from "react";
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
  ListPlus,
} from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import RatingModal from "../components/RatingModal.jsx";
import TrailerModal from "../components/TrailerModal.jsx";
import PlaylistPickerModal from "../components/PlaylistPickerModal.jsx";
import { fetchMediaItem, parseMediaId } from "../utils/api.js";
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

function getYouTubeVideoKey(item) {
  if (item?.youtubeVideoKey) {
    return item.youtubeVideoKey;
  }

  if (item?.trailerKey) {
    return item.trailerKey;
  }

  if (!item?.previewUrl) {
    return "";
  }

  try {
    const url = new URL(item.previewUrl);
    const hostname = url.hostname.replace("www.", "");

    if (hostname === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (hostname === "youtube.com" || hostname === "youtube-nocookie.com") {
      if (url.pathname.startsWith("/embed/")) {
        return url.pathname.split("/embed/")[1]?.split("/")[0] || "";
      }

      return url.searchParams.get("v") || "";
    }
  } catch (error) {
    console.error("Invalid trailer URL:", error);
  }

  return "";
}

function MediaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [itemLoading, setItemLoading] = useState(true);
  const [itemError, setItemError] = useState("");

  const [rating, setRating] = useState(0);
  const [ratingNote, setRatingNote] = useState("");
  const [ratingLoading, setRatingLoading] = useState(true);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingError, setRatingError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const trailerVideoKey = getYouTubeVideoKey(item);

  const musicPreviewUrl = item?.type === "music" ? item.previewUrl || "" : "";

  const canPlayCurrentMedia = Boolean(trailerVideoKey || musicPreviewUrl);

  const gameVideoUrl = item?.type === "game" ? item.previewUrl || "" : "";

  const hasPlayableVideo = Boolean(trailerVideoKey || gameVideoUrl);

  useEffect(() => {
    async function loadItem() {
      try {
        setItemLoading(true);
        setItemError("");

        const decodedId = decodeURIComponent(id ?? "");
        const { type, sourceId } = parseMediaId(decodedId);

        const data = await fetchMediaItem(type, sourceId);
        console.log("Fetched media item:", data.item);
        console.log("Trailer key:", data.item?.trailerKey);
        console.log("Preview URL:", data.item?.previewUrl);
        setItem(data.item);
      } catch (error) {
        setItemError(error.message);
      } finally {
        setItemLoading(false);
      }
    }

    loadItem();
  }, [id]);

  useEffect(() => {
    if (!item) return;

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

    loadRating();
  }, [item, navigate]);

  if (itemLoading) {
    return (
      <div className="home-page">
        <Navbar activeNav="home" />
        <main className="detail-missing">
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  if (itemError || !item) {
    return (
      <div className="home-page">
        <Navbar activeNav="home" />
        <main className="detail-missing">
          <p>
            We couldn&apos;t find that title{itemError ? `: ${itemError}` : "."}
          </p>
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

  return (
    <div className="home-page">
      <Navbar activeNav={navKeyByType[item.type]} />

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
                className="hero-view"
                onClick={() => setPickerOpen(true)}
              >
                <ListPlus size={16} />
                Add to Playlist
              </button>

              {item.type === "music" ? (
                canPlayCurrentMedia ? (
                  <button
                    type="button"
                    className="hero-view"
                    onClick={() => setTrailerOpen(true)}
                  >
                    <Play size={16} />

                    {musicPreviewUrl ? "Play Preview" : "Listen on YouTube"}
                  </button>
                ) : item.externalUrl ? (
                  <a
                    className="hero-view"
                    href={item.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: "none" }}
                  >
                    <Play size={16} />
                    Open in Deezer
                  </a>
                ) : (
                  <button type="button" className="hero-view" disabled>
                    <Play size={16} />
                    Music unavailable
                  </button>
                )
              ) : (
                <button
                  type="button"
                  className="hero-view"
                  onClick={() => setTrailerOpen(true)}
                  disabled={!trailerVideoKey}
                >
                  <Play size={16} />

                  {trailerVideoKey ? "Trailer" : "Trailer unavailable"}
                </button>
              )}
              {item.type === "music" &&
                item.externalUrl &&
                canPlayCurrentMedia && (
                  <a
                    className="hero-view"
                    href={item.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Deezer
                  </a>
                )}
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
                {(item.providers || []).length === 0 && (
                  <span style={{ fontSize: 12, opacity: 0.7 }}>
                    No providers found
                  </span>
                )}
                {(item.providers || []).map((p) => (
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

      {trailerOpen && canPlayCurrentMedia && (
        <TrailerModal
          title={item.title}
          videoKey={musicPreviewUrl ? "" : trailerVideoKey}
          audioUrl={musicPreviewUrl}
          onClose={() => setTrailerOpen(false)}
        />
      )}

      {pickerOpen && (
        <PlaylistPickerModal item={item} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
}

export default MediaDetail;
