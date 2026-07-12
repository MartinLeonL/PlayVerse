import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Plus, ChevronRight, ChevronLeft } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import { movies, shows, music, games, heroSlides } from "../data/mockData.js";
import "./Home.css";

function MediaRow({ title, items, onSelect }) {
  const scrollerRef = useRef(null);

  function scroll(dir) {
    scrollerRef.current?.scrollBy({ left: dir * 500, behavior: "smooth" });
  }

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
              </div>
              <p>{item.title}</p>
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
  const navigate = useNavigate();

  const hero = heroSlides[heroIndex];

  function changeHero(dir) {
    setHeroIndex((i) => (i + dir + heroSlides.length) % heroSlides.length);
  }

  function openMedia(item) {
    navigate(`/media/${encodeURIComponent(item.id)}`);
  }

  return (
    <div className="home-page">
      <Navbar activeNav="home" />

      <main>
        <section className="hero">
          <div className="hero-info">
            <span className="hero-tag">{hero.tag}</span>
            <h1>{hero.title}</h1>
            <p className="hero-genre">{hero.genres.join(" • ")}</p>
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
              <button type="button" className="hero-playlist">
                <Plus size={16} /> Playlist
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

        <MediaRow title="Popular Movies" items={movies} onSelect={openMedia} />
        <MediaRow title="Popular Shows" items={shows} onSelect={openMedia} />
        <MediaRow title="Popular Music" items={music} onSelect={openMedia} />
        <MediaRow title="Popular Games" items={games} onSelect={openMedia} />
      </main>
    </div>
  );
}

export default Home;
