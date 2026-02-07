This backend contains services used by the Theo coaching app.

Local usage notes

- Set `OPENAI_API_KEY` in your environment to enable LLM features.
- Example: `export OPENAI_API_KEY="sk-..."`
- Run a quick hint example with:

```bash
PYTHONPATH=backend python3 backend/example_hint.py
```

If `OPENAI_API_KEY` is not set, the LLM client falls back to short deterministic hints derived from Stockfish analysis.
