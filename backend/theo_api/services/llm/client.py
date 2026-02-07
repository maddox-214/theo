import os
import typing as t
import json
from theo_api.services.stockfish.engine import EngineAnalysis, UciLine


class LLMClient:
    """Minimal OpenAI-backed LLM client with a deterministic fallback.

    Reads `OPENAI_API_KEY` from environment. If not present, returns a
    simple, explainable fallback generated from the engine analysis.
    """

    def __init__(self, api_key: t.Optional[str] = None, model: str | None = None):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        self.model = model or os.environ.get("OPENAI_MODEL") or "gpt-4o-mini"
        self.base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")

    def chat(self, messages: list[dict], temperature: float = 0.6, max_tokens: int = 400) -> str:
        if not self.api_key:
            raise RuntimeError("OPENAI_API_KEY not set")

        try:
            import httpx
        except Exception as e:
            raise RuntimeError("httpx is required to call the OpenAI API; install it or set no API key") from e

        url = f"{self.base_url}/chat/completions"
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

        with httpx.Client(timeout=30.0) as client:
            r = client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()

        # OpenAI chat completion response shape: choices[0].message.content
        try:
            return data["choices"][0]["message"]["content"]
        except Exception:
            # best-effort fallback to stringified response
            return json.dumps(data)

    def hint_from_analysis(self, analysis: EngineAnalysis, elo_bucket: int) -> str:
        """Return a human-friendly hint for the player based on analysis and elo.

        If API key is available this will call the OpenAI chat completion endpoint
        with a compact system prompt and the engine facts. Otherwise it falls back
        to a deterministic short summary.
        """
        # Build compact factual summary from analysis
        facts = [f"FEN: {analysis.fen}"]
        if analysis.best_move:
            facts.append(f"Best move (uci): {analysis.best_move}")

        lines = []
        for i, l in enumerate(analysis.lines[:3], start=1):
            ev = None
            if l.eval_cp is not None:
                ev = f"{l.eval_cp/100:.2f}"  # show in pawns
            elif l.mate is not None:
                ev = f"mate in {l.mate}"
            pv = " ".join(l.pv) if l.pv else ""
            lines.append(f"Line {i}: eval={ev or 'n/a'} depth={l.depth} pv={pv}")
        facts.extend(lines)

        if self.api_key:
            system = (
                "You are a warm, encouraging chess coach. Provide one short, friendly, and actionable hint the player can use right away. "
                "Use simple, non-technical language and avoid engine jargon. Tailor tone to the player's ELO: for beginners give concrete, step-by-step suggestions; "
                "for intermediate players give concise tactical/strategic guidance."
            )
            user = (
                f"Player elo bucket: {elo_bucket}\n"
                "Below are the engine's top lines for context (do not repeat raw centipawn values).\n" + "\n".join(lines) + "\n"
                "Give one short move suggestion (prefer SAN) and one clear sentence explaining why it's a good choice or what to watch for."
            )
            messages = [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ]
            try:
                return self.chat(messages)
            except Exception:
                # fall back to deterministic summary below
                pass

        # Deterministic fallback when no API key or the call failed
        return self._fallback_hint(analysis, elo_bucket)

    def _fallback_hint(self, analysis: EngineAnalysis, elo_bucket: int) -> str:
        """Produce a short, deterministic hint from engine analysis."""
        best = analysis.best_move or (analysis.lines[0].pv[0] if analysis.lines and analysis.lines[0].pv else None)
        best_text = best or "(no move found)"

        primary = analysis.lines[0] if analysis.lines else None
        alt_moves = []
        if primary and primary.pv:
            alt_moves = primary.pv[1:3]

        # Elo-specific, beginner-friendly wording
        if elo_bucket <= 800:
            advice = "Try this simple move — it develops a piece and reduces immediate threats. Look at your opponent's next move and don't leave pieces hanging."
        elif elo_bucket <= 1400:
            advice = "This move improves your position; check for simple tactics (captures, forks, pins) after it. If unsure, calculate two moves ahead."
        else:
            advice = "This move is positionally justified; consider the opponent's replies and calculate concrete continuations."

        alt = f" Alternatives: {', '.join(alt_moves)}." if alt_moves else ""

        return f"Try {best_text}. {advice}{alt}"


# Convenience function used by other modules
def get_hint_for(analysis: EngineAnalysis, elo_bucket: int) -> str:
    return LLMClient().hint_from_analysis(analysis, elo_bucket)
