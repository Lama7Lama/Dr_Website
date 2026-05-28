import json
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "DR AI Platform Backend"
    api_v1_prefix: str = "/api/v1"

    storage_root: Path = Path(__file__).resolve().parent.parent / "storage_data"
    models_root: Path = Path(__file__).resolve().parent.parent / "models"
    max_upload_size_mb: int = 10

    default_ai_model: Literal["scripted", "mock"] = "scripted"
    model_input_size: int = 300
    model_channel_normalization: Literal["0_1", "imagenet"] = "imagenet"
    preprocessing_mode: Literal["letterbox", "center_crop"] = "letterbox"
    scripted_model_path: Path = Path(__file__).resolve().parent.parent / "models" / "best_model_scripted.pt"
    scripted_model_metadata_path: Path = (
        Path(__file__).resolve().parent.parent / "models" / "best_model_metadata.json"
    )

    cors_origins: list[str] = [
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:3001",
        "http://localhost:3001",
    ]

    firebase_credentials_path: Path = Path(__file__).resolve().parent.parent / "secrets" / "firebase-admin.json"
    medical_encryption_key: str = "replace-this-medical-key"
    legacy_medical_decryption_key: str = ""
    media_signing_key: str = "replace-this-media-signing-key"
    signed_media_ttl_seconds: int = 300

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="DR_",
        extra="ignore",
    )


def _resolve_from_backend_root(path_value: Path, backend_root: Path) -> Path:
    if path_value.is_absolute():
        return path_value.resolve()
    return (backend_root / path_value).resolve()


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    backend_root = Path(__file__).resolve().parent.parent
    settings.storage_root = _resolve_from_backend_root(settings.storage_root, backend_root)
    settings.models_root = _resolve_from_backend_root(settings.models_root, backend_root)
    settings.scripted_model_path = _resolve_from_backend_root(settings.scripted_model_path, backend_root)
    settings.scripted_model_metadata_path = _resolve_from_backend_root(
        settings.scripted_model_metadata_path, backend_root
    )
    settings.firebase_credentials_path = _resolve_from_backend_root(settings.firebase_credentials_path, backend_root)

    if settings.scripted_model_metadata_path.exists():
        try:
            metadata = json.loads(settings.scripted_model_metadata_path.read_text(encoding="utf-8"))
            image_size = int(metadata.get("image_size", settings.model_input_size))
            if image_size > 0:
                settings.model_input_size = image_size
        except (ValueError, OSError, json.JSONDecodeError):
            # Keep defaults if metadata cannot be parsed.
            pass

    return settings
