import React, { useEffect, useState } from "react";
import { getGameReview } from "./lib/api";

/* =========================
   Types
========================= */

type LessonReviewProps = {
  gameId: string;
  eloBucket: number;
  onNewLesson?: () => void;
};

/* =========================
   Component
========================= */

const LessonReview: React.FC<LessonReviewProps> = ({ gameId, eloBucket, onNewLesson }) => {
  const [takeaways, setTakeaways] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchReview() {
      try {
        setLoading(true);
        setError(null);
        const review = await getGameReview(gameId);
        if (!cancelled) {
          setTakeaways(review.takeaways);
        }
      } catch (err) {
        console.error("Failed to fetch game review:", err);
        if (!cancelled) {
          setError("Couldn't load your review right now. Here are some general tips!");
          setTakeaways([
            "Great effort completing this game — every game is a chance to learn!",
            "Review your opening moves: developing pieces early and controlling the center is key.",
            "Watch for undefended pieces — keeping everything protected avoids easy losses.",
            "Think about your opponent's last move before making yours.",
            "Practice spotting checks, captures, and threats each turn.",
          ]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchReview();
    return () => { cancelled = true; };
  }, [gameId]);

  return (
    <div className="review-root">
      {/* =========================
          LEFT SIDEBAR (30%)
      ========================= */}
      <aside className="review-sidebar">
        <h2 className="sidebar-title">Game Review</h2>

        <div className="review-meta">
          <p className="meta-label">ELO Level</p>
          <p className="meta-value">~{eloBucket}</p>
        </div>

        {onNewLesson && (
          <button className="new-lesson-sidebar-btn" onClick={onNewLesson}>
            Start New Lesson
          </button>
        )}
      </aside>

      {/* =========================
          RIGHT CONTENT (70%)
      ========================= */}
      <main className="review-content">
        {onNewLesson && (
          <button className="new-lesson-btn" onClick={onNewLesson}>
            New Game
          </button>
        )}

        <div className="review-center">
          {/* Instructor avatar */}
          <div className="avatar-wrapper">
            <img
              src="public/images/knight_white.png"
              alt="Instructor Avatar"
              className="review-avatar"
            />
          </div>

          {/* Takeaways section */}
          <div className="takeaways-section">
            <h3 className="takeaways-title">Key Takeaways</h3>

            {loading ? (
              <div className="takeaways-loading">
                <div className="loading-spinner" />
                <p>Theo is analyzing your game...</p>
              </div>
            ) : (
              <>
                {error && <p className="takeaways-error">{error}</p>}
                <ul className="takeaways-list">
                  {takeaways.map((point, index) => (
                    <li key={index} className="takeaway-item">
                      <span className="takeaway-bullet">{index + 1}</span>
                      <span className="takeaway-text">{point}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default LessonReview;
