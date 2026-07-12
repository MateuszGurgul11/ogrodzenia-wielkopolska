import os

from pydantic_settings import BaseSettings, SettingsConfigDict

_LOCAL_DEV_ORIGINS = ("http://localhost:3000", "http://localhost:3001")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    firebase_project_id: str = "ogrodzenia-wielkopolska"
    google_application_credentials: str = "./serviceAccountKey.json"
    firebase_service_account_json: str | None = None
    cors_origins: str = "http://localhost:3000,http://localhost:3001"
    port: int = 8000

    @property
    def cors_origins_list(self) -> list[str]:
        origins = [o.strip() for o in self.cors_origins.split(",") if o.strip()]
        cred_path = self.google_application_credentials
        if os.path.isfile(cred_path):
            for origin in _LOCAL_DEV_ORIGINS:
                if origin not in origins:
                    origins.append(origin)
        return origins


settings = Settings()
