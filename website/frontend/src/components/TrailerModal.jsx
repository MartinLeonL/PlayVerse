import { useEffect } from "react";
import { X } from "lucide-react";
import "./TrailerModal.css";

function TrailerModal({ title, videoKey, onClose }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!videoKey) {
    return null;
  }

  const videoUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
    videoKey,
  )}?autoplay=1&rel=0`;

  return (
    <div className="trailer-overlay" onClick={onClose}>
      <div
        className="trailer-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} trailer`}
      >
        <button
          type="button"
          className="trailer-close"
          onClick={onClose}
          aria-label="Close trailer"
        >
          <X size={20} />
        </button>

        <div className="trailer-video">
          <iframe
            src={videoUrl}
            title={`${title} trailer`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}

export default TrailerModal;
