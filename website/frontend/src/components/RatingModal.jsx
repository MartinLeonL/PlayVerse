import { useState } from "react";
import { X, Star } from "lucide-react";
import "./RatingModal.css";

function RatingModal({
  title,
  initialRating = 0,
  initialNote = "",
  saving = false,
  serverError = "",
  onCancel,
  onSave,
}) {
  const [hovered, setHovered] = useState(0);
  const [selectedRating, setSelectedRating] = useState(initialRating);
  const [note, setNote] = useState(initialNote);
  const [validationError, setValidationError] = useState("");

  const displayRating = hovered || selectedRating;

  async function handleSubmit(event) {
    event.preventDefault();
    setValidationError("");

    if (!selectedRating) {
      setValidationError("Choose a score before saving.");
      return;
    }

    if (note.trim().length > 500) {
      setValidationError("Your personal note cannot exceed 500 characters.");
      return;
    }

    await onSave({
      score: selectedRating,
      note: note.trim(),
    });
  }

  function handleClose() {
    if (!saving) {
      onCancel();
    }
  }

  return (
    <div className="rating-overlay" onClick={handleClose}>
      <div
        className="rating-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="rating-close"
          onClick={handleClose}
          aria-label="Close"
          disabled={saving}
        >
          <X size={16} />
        </button>

        <div className="rating-icon">
          <Star size={28} fill="currentColor" />
        </div>

        <h3>{title}</h3>

        <form onSubmit={handleSubmit}>
          <div className="rating-stars" onMouseLeave={() => setHovered(0)}>
            {[1, 2, 3, 4, 5].map((number) => (
              <button
                key={number}
                type="button"
                className="rating-star"
                onMouseEnter={() => setHovered(number)}
                onFocus={() => setHovered(number)}
                onBlur={() => setHovered(0)}
                onClick={() => setSelectedRating(number)}
                aria-label={`Rate ${number} star${number > 1 ? "s" : ""}`}
                disabled={saving}
              >
                <Star
                  size={26}
                  fill={number <= displayRating ? "currentColor" : "none"}
                />
              </button>
            ))}
          </div>

          <div className="rating-note-field">
            <label htmlFor="rating-note">
              Personal note <span>(optional)</span>
            </label>

            <textarea
              id="rating-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Why did you give it this score?"
              maxLength={500}
              rows={4}
              disabled={saving}
            />

            <small>{note.length}/500</small>
          </div>

          {validationError && <p className="rating-error">{validationError}</p>}

          {serverError && <p className="rating-error">{serverError}</p>}

          <div className="rating-actions">
            <button
              type="button"
              className="rating-cancel"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button type="submit" className="rating-save" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RatingModal;
