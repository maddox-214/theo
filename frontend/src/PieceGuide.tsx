import React, { useState } from "react";
import PieceCard from "./components/PieceCard";
import { PIECES, type PieceId, type PieceColor } from "./components/pieceData";
import styles from "./PieceGuide.module.css";

const PieceGuide: React.FC = () => {
  const [selectedPiece, setSelectedPiece] = useState<PieceId>("king");
  const [selectedColor, setSelectedColor] = useState<PieceColor>("white");
  const [includeCaptures, setIncludeCaptures] = useState(true);

  // Find the selected piece object
  const piece = PIECES.find(p => p.id === selectedPiece)!;

  // Dynamically build the correct image path based on piece and color
  // e.g. /images/Tiny_King_White.png
  const imageName = `Tiny_${piece.name}_${selectedColor.charAt(0).toUpperCase() + selectedColor.slice(1)}.png`;
  const imageSrc = `/images/${imageName}`;

  // Debug: log the image path
  // eslint-disable-next-line no-console
  console.log('Piece image src:', imageSrc);

  // Fallback for image error
  const [imgError, setImgError] = useState(false);

  return (
    <div id="root" style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2.4rem', fontWeight: 700, color: '#222', marginBottom: 28, letterSpacing: '0.02em' }}>Chess Piece Guide</h1>
      <div style={{ display: 'flex', gap: 24, marginBottom: 36, background: '#f7f7fa', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '16px 28px', alignItems: 'center', justifyContent: 'center' }}>
        <label style={{ fontWeight: 500, color: '#333', fontSize: '1.05rem' }}>
          Piece:
          <select
            value={selectedPiece}
            onChange={(e) => { setSelectedPiece(e.target.value as PieceId); setImgError(false); }}
            style={{ marginLeft: 8, padding: 6, borderRadius: 6, border: '1px solid #bbb', fontSize: '1rem', background: '#fff', color: '#222' }}
          >
            {PIECES.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label style={{ fontWeight: 500, color: '#333', fontSize: '1.05rem' }}>
          Color:
          <select
            value={selectedColor}
            onChange={(e) => { setSelectedColor(e.target.value as PieceColor); setImgError(false); }}
            style={{ marginLeft: 8, padding: 6, borderRadius: 6, border: '1px solid #bbb', fontSize: '1rem', background: '#fff', color: '#222' }}
          >
            <option value="white">White</option>
            <option value="black">Black</option>
          </select>
        </label>
        <label style={{ fontWeight: 500, color: '#333', display: 'flex', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={includeCaptures}
            onChange={() => setIncludeCaptures((v) => !v)}
            style={{ marginRight: 8 }}
          />
          Show capture moves
        </label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: 32 }}>
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: 32, minWidth: 320, maxWidth: 400, width: '100%' }}>
          {/* Piece image with fallback */}
          {!imgError ? (
            <img
              src={imageSrc}
              alt={piece.name}
              style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 16 }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eee', color: '#b00', margin: '0 auto 16px auto', borderRadius: 8, fontSize: 14 }}>
              Image not found for {piece.name} ({selectedColor})
            </div>
          )}
          <h2 style={{ color: '#222', fontSize: '1.5rem', margin: '0 0 8px 0' }}>{piece.name}</h2>
          <p style={{ color: '#444', marginBottom: 16 }}>{piece.description}</p>
          <div style={{ color: '#333', fontSize: '1.1rem', marginBottom: 8 }}>
            <strong>Moves:</strong>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {piece.getLegalMoves('e4', selectedColor, includeCaptures).map((sq) => (
                <li key={sq} style={{ background: '#f0f0f0', borderRadius: 4, padding: '2px 8px', minWidth: 32, textAlign: 'center' }}>{sq.toUpperCase()}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 32, color: '#666', fontSize: '1.1rem', textAlign: 'center' }}>
        <span>Explore each chess piece's moves, abilities, and capture options.</span>
      </div>
      <button className="backBtn" style={{ marginTop: 36, padding: '12px 24px', borderRadius: 8, background: '#2d2d2d', color: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 600, transition: 'background 0.2s' }} onClick={() => window.history.back()}>
        Back to Menu
      </button>
    </div>
  );
};

export default PieceGuide;
