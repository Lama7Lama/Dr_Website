from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.diagnosis import router as diagnosis_router
from app.api.v1.media import router as media_router
from app.api.v1.security import router as security_router
from app.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="FastAPI backend for diabetic retinopathy analysis.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    settings.storage_root.mkdir(parents=True, exist_ok=True)

    app.include_router(diagnosis_router, prefix=settings.api_v1_prefix)
    app.include_router(media_router, prefix=settings.api_v1_prefix)
    app.include_router(security_router, prefix=settings.api_v1_prefix)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
