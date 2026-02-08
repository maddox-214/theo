export type PieceId = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";
export type PieceColor = "white" | "black";

export interface Piece {
  id: PieceId;
  name: string;
  imageSrc: string;
  description: string;
  getLegalMoves: (
    fromSquare: string,
    color: PieceColor,
    includeCaptures: boolean
  ) => string[];
}

export const PIECES: Piece[] = [
  {
    id: "king",
    name: "King",
    imageSrc: "/images/king.png",
    description: "The King moves one square in any direction. Protect your King!",
    getLegalMoves: (from, color, includeCaptures) => {
      return ["d3", "e3", "f3", "d4", "f4", "d5", "e5", "f5"];
    },
  },
  {
    id: "queen",
    name: "Queen",
    imageSrc: "/images/queen.png",
    description: "The Queen moves any number of squares in any direction.",
    getLegalMoves: (from, color, includeCaptures) => {
      return [
        "e3", "e2", "e1", "e5", "e6", "e7", "e8",
        "d4", "c4", "b4", "a4", "f4", "g4", "h4",
        "d3", "c2", "b1", "f3", "g2", "h1",
        "d5", "c6", "b7", "a8", "f5", "g6", "h7"
      ];
    },
  },
  {
    id: "rook",
    name: "Rook",
    imageSrc: "/images/rook.png",
    description: "The Rook moves any number of squares horizontally or vertically.",
    getLegalMoves: (from, color, includeCaptures) => {
      return [
        "e3", "e2", "e1", "e5", "e6", "e7", "e8",
        "d4", "c4", "b4", "a4", "f4", "g4", "h4"
      ];
    },
  },
  {
    id: "bishop",
    name: "Bishop",
    imageSrc: "/images/bishop.png",
    description: "The Bishop moves any number of squares diagonally.",
    getLegalMoves: (from, color, includeCaptures) => {
      return [
        "d3", "c2", "b1", "f3", "g2", "h1",
        "d5", "c6", "b7", "a8", "f5", "g6", "h7"
      ];
    },
  },
  {
    id: "knight",
    name: "Knight",
    imageSrc: "/images/knight.png",
    description: "The Knight moves in an L-shape: two squares in one direction, then one square perpendicular.",
    getLegalMoves: (from, color, includeCaptures) => {
      return ["d2", "f2", "c3", "g3", "c5", "g5", "d6", "f6"];
    },
  },
  {
    id: "pawn",
    name: "Pawn",
    imageSrc: "/images/pawn.png",
    description: "The Pawn moves forward one square. On its first move, it can move two squares. Pawns capture diagonally.",
    getLegalMoves: (from, color, includeCaptures) => {
      const moves = [];
      if (color === "white") {
        moves.push("e5");
        if (from === "e2") moves.push("e4");
        if (includeCaptures) moves.push("d5", "f5");
      } else {
        moves.push("e3");
        if (from === "e7") moves.push("e5");
        if (includeCaptures) moves.push("d3", "f3");
      }
      return moves;
    },
  },
];
