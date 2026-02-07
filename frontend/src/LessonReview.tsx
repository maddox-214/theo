import React, { useState } from "react";

/* =========================
   Types
========================= */

type Note = {
  id: number;
  text: string;
};

/* =========================
   Mock data (backend will replace)
========================= */

const MOCK_NOTES: Note[] = [
  {
    id: 1,
    text: "You controlled the center well but delayed development of your kingside knight.",
  },
  {
    id: 2,
    text: "Watch for back-rank weaknesses and avoid unnecessary pawn pushes.",
  },
];

/* =========================
   Component
========================= */

const LessonReview: React.FC = () => {
  const [notes] = useState<Note[]>(MOCK_NOTES);
  const [activeNote, setActiveNote] = useState<Note | null>(null);

  return (
    <div className="review-root">
      {/* =========================
          LEFT SIDEBAR (30%)
      ========================= */}
      <aside className="review-sidebar">
        {/* Sidebar header */}
        <h2 className="sidebar-title">Key Notes</h2>

        {/* Notes list */}
        <div className="notes-list">
          {notes.length === 0 ? (
            <p className="empty-notes">No games yet</p>
          ) : (
            notes.map((note) => (
              <button
                key={note.id}
                className={`note-item ${
                  activeNote?.id === note.id ? "active" : ""
                }`}
                onClick={() => setActiveNote(note)}
              >
                Notes from game {note.id}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* =========================
          RIGHT CONTENT (70%)
      ========================= */}
      <main className="review-content">
        {/* Top-right action */}
        <button className="new-lesson-btn">Start New Lesson</button>

        {/* Center content */}
        <div className="review-center">
          {/* Display text above avatar */}
          <div className="review-text">
            {notes.length === 0 ? (
              <p>No notes yet</p>
            ) : activeNote ? (
              <p>{activeNote.text}</p>
            ) : (
              <p className="review-prompt">
                Review your notes or start your next lesson
              </p>
            )}
          </div>

          {/* Instructor avatar */}
          <div className="avatar-wrapper">
            <img
              src="/images/tiny_knight_white.png"
              alt="Instructor Avatar"
              className="review-avatar"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default LessonReview;
