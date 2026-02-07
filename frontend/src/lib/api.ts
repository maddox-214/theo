// api client for theo backend

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

// some types??? idk

export type PlayerColor = "white" | "black";

export type GameStatus = "active" | "finished";

export interface CreateGameRequest {
  elo: number;
  player_color: PlayerColor;
}

export interface CreateGameResponse {
  game_id: string;
  start_fen: string;
  player_color: PlayerColor;
  elo_bucket: number;
}

export interface SubmitMoveRequest {
  move_uci: string;
}

export interface AnalysisLine {
  move: string;
  eval_white_cp: number | null;
  mate_white: number | null;
  eval_player_cp: number | null;
  mate_player: number | null;
}

export interface MoveResponse {
  game_id: string;
  fen_before: string;
  move_uci: string;
  fen_after: string;
  engine_reply_uci: string | null;
  fen_after_engine: string | null;
  eval_white_cp: number | null;
  mate_white: number | null;
  eval_player_cp: number | null;
  mate_player: number | null;
  pv: string[];
  top_moves: AnalysisLine[];
  game_over?: boolean;
  outcome?: "checkmate" | "stalemate" | "insufficient_material" | "fifty_move" | "threefold" | "draw" | null;
  winner?: PlayerColor | null;
  llm_response?: string | null;
}

export interface GameStateResponse {
  game_id: string;
  status: GameStatus;
  elo_bucket: number;
  player_color: PlayerColor;
  start_fen: string;
  current_fen: string;
  moves_uci: string[];
  pgn: string;
}

export interface HealthResponse {
  status: string;
}

// api functions

class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function fetchJson<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        `api error: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      `network error: ${error instanceof Error ? error.message : "unknown"}`,
      0
    );
  }
}

export async function getHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>("/health");
}

export async function createGame(
  elo: number,
  playerColor: PlayerColor = "white"
): Promise<CreateGameResponse> {
  return fetchJson<CreateGameResponse>("/games", {
    method: "POST",
    body: JSON.stringify({
      elo,
      player_color: playerColor,
    }),
  });
}

export async function submitMove(
  gameId: string,
  from: string,
  to: string,
  promotion?: string
): Promise<MoveResponse> {
  const moveUci = `${from}${to}${promotion || ''}`;
  return fetchJson<MoveResponse>(`/games/${gameId}/move`, {
    method: "POST",
    body: JSON.stringify({
      move_uci: moveUci,
    }),
  });
}

export async function getGameState(
  gameId: string
): Promise<GameStateResponse> {
  return fetchJson<GameStateResponse>(`/games/${gameId}`);
}

export async function finishGame(gameId: string): Promise<{
  game_id: string;
  status: string;
  pgn: string;
}> {
  return fetchJson(`/games/${gameId}/finish`, {
    method: "POST",
  });
}

export interface GameReviewResponse {
  game_id: string;
  elo_bucket: number;
  player_color: PlayerColor;
  takeaways: string[];
}

export async function getGameReview(gameId: string): Promise<GameReviewResponse> {
  return fetchJson<GameReviewResponse>(`/games/${gameId}/review`);
}

// ===== utility functions =====

export function formatEvaluation(
  evalCp: number | null,
  mate: number | null
): string {
  if (mate !== null) {
    return `M${mate}`;
  }
  if (evalCp === null) {
    return "0.0";
  }
  return (evalCp / 100).toFixed(1);
}

export function getEvaluationColor(evalCp: number | null): "positive" | "negative" | "neutral" {
  if (evalCp === null || Math.abs(evalCp) < 50) {
    return "neutral";
  }
  return evalCp > 0 ? "positive" : "negative";
}

export { ApiError };
