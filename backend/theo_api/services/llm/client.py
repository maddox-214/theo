import os
import typing as t
import json
import asyncio
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

    async def chat_async(self, messages: list[dict], temperature: float = 0.6, max_tokens: int = 400) -> str:
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

        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()

        try:
            return data["choices"][0]["message"]["content"]
        except Exception:
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
            # ELO-aware tone guidance
            if elo_bucket <= 600:
                tone = (
                    "The player is a complete beginner. Be extra warm, patient, and celebratory. "
                    "Praise what they're doing well before offering gentle suggestions. Use phrases like "
                    "'Great job!', 'You're doing awesome!', 'Nice thinking!'. Keep advice very simple — "
                    "one concrete idea at a time. Never be demanding or critical. Also ensure not to go over 150 characters in each response, and do not cut any sentences short, speak in complete sentences that are concise but not abrupt."
                )
            elif elo_bucket <= 1000:
                tone = (
                    "The player is a beginner. Be encouraging, supportive, and friendly. "
                    "Acknowledge their effort and gently guide them. Mix praise with one small tip. "
                    "Use warm language like 'Nice move!', 'I like that idea', 'Here's a little thought...'. "
                    "Keep it conversational and uplifting.Also ensure not to go over 150 characters in each response, and do not cut any sentences short, speak in complete sentences that are concise but not abrupt."
                )
            elif elo_bucket <= 1400:
                tone = (
                    "The player is intermediate. Be friendly and conversational. "
                    "You can point out tactical or strategic ideas more directly, but still be supportive. "
                    "Balance praise with constructive observation.Also ensure not to go over 150 characters in each response, and do not cut any sentences short, speak in complete sentences that are concise but not abrupt."
                )
            else:
                tone = (
                    "The player is advanced. Be concise and respect their skill. "
                    "Focus on deeper ideas, concrete variations, or subtle positional themes. "
                    "You can be more direct but still collegial.Also ensure not to go over 150 characters in each response, and do not cut any sentences short, speak in complete sentences that are concise but not abrupt."
                )

            system = (
                "You are Theo, a kind and thoughtful chess coach who genuinely cares about your student's growth. "
                "You speak naturally, like a real person — warm, varied, sometimes playful. "
                "IMPORTANT RULES:\n"
                "- Do NOT just say 'try this move'. React to the position and how the game is going.\n"
                "- Vary your responses — comment on the position, share an idea, praise good play, warn about a threat, or teach a concept.\n"
                "- You may mention a move, but frame it as part of a bigger thought, not as a command.\n"
                "- Keep responses to 1-2 sentences. Never use centipawn values or engine jargon.\n"
                "- Never repeat the same phrasing twice in a game.\n\n"
                f"Tone guidance: {tone}"
            )
            user = (
                f"Player elo bucket: {elo_bucket}\n"
                f"Position FEN: {analysis.fen}\n"
                "Engine's top lines (for your context only — never quote these directly):\n" + "\n".join(lines) + "\n\n"
                "Give a short, natural coaching comment about this position. Be varied — you might praise something, "
                "point out an interesting idea, warn about a threat, or share a small teaching moment. "
                "Do not start with 'Try' or 'Consider'. Sound human."
            )
            messages = [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ]
            try:
                return self.chat(messages, temperature=0.85)
            except Exception:
                # fall back to deterministic summary below
                pass
        # Deterministic fallback when no API key or the call failed
        return self._fallback_hint(analysis, elo_bucket)

    async def hint_from_analysis_async(self, analysis: EngineAnalysis, elo_bucket: int) -> str:
        # Async variant that prefers an async HTTP client when API key present
        facts = [f"FEN: {analysis.fen}"]
        if analysis.best_move:
            facts.append(f"Best move (uci): {analysis.best_move}")

        lines = []
        for i, l in enumerate(analysis.lines[:3], start=1):
            ev = None
            if l.eval_cp is not None:
                ev = f"{l.eval_cp/100:.2f}"
            elif l.mate is not None:
                ev = f"mate in {l.mate}"
            pv = " ".join(l.pv) if l.pv else ""
            lines.append(f"Line {i}: eval={ev or 'n/a'} depth={l.depth} pv={pv}")

        if self.api_key:
            # ELO-aware tone guidance
            if elo_bucket <= 600:
                tone = (
                    "The player is a complete beginner. Be extra warm, patient, and celebratory. "
                    "Praise what they're doing well before offering gentle suggestions. Use phrases like "
                    "'Great job!', 'You're doing awesome!', 'Nice thinking!'. Keep advice very simple — "
                    "one concrete idea at a time. Never be demanding or critical."
                )
            elif elo_bucket <= 1000:
                tone = (
                    "The player is a beginner. Be encouraging, supportive, and friendly. "
                    "Acknowledge their effort and gently guide them. Mix praise with one small tip. "
                    "Use warm language like 'Nice move!', 'I like that idea', 'Here's a little thought...'. "
                    "Keep it conversational and uplifting."
                )
            elif elo_bucket <= 1400:
                tone = (
                    "The player is intermediate. Be friendly and conversational. "
                    "You can point out tactical or strategic ideas more directly, but still be supportive. "
                    "Balance praise with constructive observation."
                )
            else:
                tone = (
                    "The player is advanced. Be concise and respect their skill. "
                    "Focus on deeper ideas, concrete variations, or subtle positional themes. "
                    "You can be more direct but still collegial."
                )

            system = (
                "You are Theo, a kind and thoughtful chess coach who genuinely cares about your student's growth. "
                "You speak naturally, like a real person — warm, varied, sometimes playful. "
                "IMPORTANT RULES:\n"
                "- Do NOT just say 'try this move'. React to the position and how the game is going.\n"
                "- Vary your responses — comment on the position, share an idea, praise good play, warn about a threat, or teach a concept.\n"
                "- You may mention a move, but frame it as part of a bigger thought, not as a command.\n"
                "- Keep responses to 1-2 sentences. Never use centipawn values or engine jargon.\n"
                "- Never repeat the same phrasing twice in a game.\n\n"
                f"Tone guidance: {tone}"
            )
            user = (
                f"Player elo bucket: {elo_bucket}\n"
                f"Position FEN: {analysis.fen}\n"
                "Engine's top lines (for your context only — never quote these directly):\n" + "\n".join(lines) + "\n\n"
                "Give a short, natural coaching comment about this position. Be varied — you might praise something, "
                "point out an interesting idea, warn about a threat, or share a small teaching moment. "
                "Do not start with 'Try' or 'Consider'. Sound human."
            )
            messages = [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ]
            try:
                return await self.chat_async(messages, temperature=0.85)
            except Exception:
                pass

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
        if elo_bucket <= 600:
            advice = "You're doing great! Keep your pieces safe and look for ways to move them toward the center."
        elif elo_bucket <= 1000:
            advice = "Nice progress! Think about developing your pieces and keeping your king safe."
        elif elo_bucket <= 1400:
            advice = "Solid position — look for tactical opportunities like captures, forks, or pins."
        else:
            advice = "Consider the opponent's replies and look for concrete continuations."

        return advice


# Convenience function used by other modules
def get_hint_for(analysis: EngineAnalysis, elo_bucket: int) -> str:
    return LLMClient().hint_from_analysis(analysis, elo_bucket)


async def get_hint_for_async(analysis: EngineAnalysis, elo_bucket: int) -> str:
    return await LLMClient().hint_from_analysis_async(analysis, elo_bucket)
