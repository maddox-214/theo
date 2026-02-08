import React from "react";
import type { Piece, PieceColor } from "./pieceData";

interface MoveDiagramProps {
  piece: Piece;
  color: PieceColor;
  includeCaptures: boolean;
  fromSquare: string;
}

function squareToCoords(square: string): [number, number] {
  const file = square[0].toLowerCase();
  const rank = parseInt(square[1], 10);
  return [file.charCodeAt(0) - 97, 8 - rank];
}

function coordsToSquare(col: number, row: number): string {
  return String.fromCharCode(97 + col) + (8 - row);
}

const MoveDiagram: React.FC<MoveDiagramProps> = ({ piece, color, includeCaptures, fromSquare }) => {
  const legalMoves = piece.getLegalMoves(fromSquare, color, includeCaptures);
  const [fromCol, fromRow] = squareToCoords(fromSquare);

  return (
    <div className="move-diagram">
      <table className="chess-board">
        <tbody>
          {[...Array(8)].map((_, row) => (
            <tr key={row}>
              {[...Array(8)].map((_, col) => {
                const sq = coordsToSquare(col, row);
                const isFrom = sq === fromSquare;
                const isLegal = legalMoves.includes(sq);
                return (
                  <td
                    key={col}
                    className={
                      "chess-square" +
                      (isFrom ? " from-square" : "") +
                      (isLegal ? " legal-move" : "")
                    }
                  >
                    {isFrom ? "●" : isLegal ? "○" : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MoveDiagram;
