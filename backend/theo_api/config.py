from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    stockfish_path: str = "stockfish"
    database_url: str = "sqlite:///./theo.db"


settings = Settings()
