from fastapi import FastAPI
from theo_api.api.health import router as health_router
from theo_api.api.games import router as games_router
from theo_api.services.storage.db import Base, engine

def create_app() -> FastAPI:
    app = FastAPI(title="Theo Backend", version="0.1.0")
    Base.metadata.create_all(bind=engine)

    app.include_router(health_router)
    app.include_router(games_router)

    return app

app = create_app()
