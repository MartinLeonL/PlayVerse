import { useState } from 'react'
import { X, Star } from 'lucide-react'
import './RatingModal.css'

function RatingModal({ title, initialRating = 0, onCancel, onSave }) {
  const [hovered, setHovered] = useState(0)
  const [selected, setSelected] = useState(initialRating)

  const display = hovered || selected

  return (
    <div className="rating-overlay" onClick={onCancel}>
      <div className="rating-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="rating-close" onClick={onCancel} aria-label="Close">
          <X size={16} />
        </button>

        <div className="rating-icon">
          <Star size={28} fill="currentColor" />
        </div>

        <h3>{title}</h3>

        <div className="rating-stars" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className="rating-star"
              onMouseEnter={() => setHovered(n)}
              onClick={() => setSelected(n)}
              aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
            >
              <Star size={26} fill={n <= display ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>

        <div className="rating-actions">
          <button type="button" className="rating-cancel" onClick={onCancel}>Cancel</button>
          <button type="button" className="rating-save" onClick={() => onSave(selected)}>Save</button>
        </div>
      </div>
    </div>
  )
}

export default RatingModal