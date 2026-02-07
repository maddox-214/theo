from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from theo_api.api.health import router as health_router
from theo_api.api.coach import router as coach_router
from theo_api.config import settings

# Try to import DB and games router; if SQLAlchemy is unavailable (e.g., in minimal test env),
# fall back to creating the app without DB-backed routes to keep tests lightweight.
try:
    from theo_api.services.storage.db import Base, engine
    from theo_api.api.games import router as games_router
    _HAS_DB = True
except Exception:
    Base = None
    engine = None
    games_router = None
    _HAS_DB = False
    # If DB isn't available, expose a stateless games router instead
    try:
        from theo_api.api.stateless_games import router as stateless_games_router
    except Exception:
        stateless_games_router = None

def create_app() -> FastAPI:
    app = FastAPI(title="Theo Backend", version="0.1.0")
    # Create tables only when explicitly requested (avoid side-effects during tests)
    if _HAS_DB and Base is not None and os.environ.get("THEO_INIT_DB") == "1":
        Base.metadata.create_all(bind=engine)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router, prefix=settings.api_prefix)
    if _HAS_DB and games_router is not None:
        app.include_router(games_router, prefix=settings.api_prefix)
    else:
        if stateless_games_router is not None:
            app.include_router(stateless_games_router, prefix=settings.api_prefix)
    app.include_router(coach_router, prefix=settings.api_prefix)

    return app

app = create_app()
