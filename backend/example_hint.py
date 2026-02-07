from theo_api.services.stockfish.analysis import choose_engine_reply
from theo_api.services.llm.client import get_hint_for, LLMClient


def example():
    # A short sample position: white to move
    fen = "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 4"
    elo = 1200

    # Show whether an OpenAI API key is visible to the app
    client = LLMClient()
    print("OPENAI_API_KEY present?", bool(client.api_key))

    # If there's a key, attempt a very small test chat to confirm the request works
    if client.api_key:
        try:
            test = client.chat([
                {"role": "system", "content": "You are a friendly chess coach."},
                {"role": "user", "content": "Say: Hello from the LLM in one short sentence."},
            ], temperature=0.0, max_tokens=30)
            print("LLM test response:\n", test)
        except Exception as e:
            print("LLM test failed:", e)

    move_uci, analysis = choose_engine_reply(fen, elo)
    hint = get_hint_for(analysis, elo)

    print("\nFEN:", fen)
    print("Engine move (uci):", move_uci)
    print("Hint:\n", hint)


if __name__ == '__main__':
    example()
