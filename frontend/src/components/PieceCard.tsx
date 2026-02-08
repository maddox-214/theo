import React from "react";
import type { Piece, PieceColor } from "./pieceData";

interface PieceCardProps {
  piece: Piece;
  color: PieceColor;
  includeCaptures: boolean;
  fromSquare: string;
}

const PieceCard: React.FC<PieceCardProps> = ({ piece, color, includeCaptures, fromSquare }) => {
  return (
    <div className="piece-card">
      <img src={piece.imageSrc} alt={piece.name} className="piece-image" />
      <h2>{piece.name}</h2>
      <p>{piece.description}</p>
      <div className="piece-moves">
        <strong>Moves:</strong>
        <ul>
          {piece.getLegalMoves(fromSquare, color, includeCaptures).map((sq) => (
            <li key={sq}>{sq.toUpperCase()}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PieceCard;
