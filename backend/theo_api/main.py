from fastapi import FastAPI
from theo_api.api.health import router as health_router
from theo_api.api.games import router as games_router
from theo_api.services.storage.db import Base, engine
from fastapi.middleware.cors import CORSMiddleware

def create_app() -> FastAPI:
    app = FastAPI(title="Theo Backend", version="0.1.0")
    Base.metadata.create_all(bind=engine)

    app.include_router(health_router)
    app.include_router(games_router)

    return app

app = create_app()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
