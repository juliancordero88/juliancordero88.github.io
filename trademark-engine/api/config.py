from __future__ import annotations
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    marker_api_key: str = ""
    rapidapi_key: str = ""
    euipo_client_id: str = ""
    euipo_client_secret: str = ""
    whoisxml_api_key: str = ""
    opencorporates_api_key: str = ""
    enable_semantic: bool = True
    cors_origins: str = "*"
    redis_url: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
