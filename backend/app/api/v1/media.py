import mimetypes

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.config import Settings, get_settings
from app.core.firebase_auth import AuthenticatedUser, require_firebase_user
from app.core.media_access import (
    build_signed_media_url,
    normalize_storage_reference,
    user_can_access_media,
    verify_signed_media_request,
)

router = APIRouter(prefix="/media", tags=["Media"])


class MediaSignRequest(BaseModel):
    path: str


class MediaSignResponse(BaseModel):
    path: str
    signed_url: str
    expires_at: int


@router.post("/sign", response_model=MediaSignResponse)
def sign_media_url(
    payload: MediaSignRequest,
    user: AuthenticatedUser = Depends(require_firebase_user),
    settings: Settings = Depends(get_settings),
) -> MediaSignResponse:
    normalized = normalize_storage_reference(payload.path)
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid media path is required.",
        )

    if not user_can_access_media(user, normalized, settings):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this media file.",
        )

    signed_url, expires_at = build_signed_media_url(normalized, settings)
    return MediaSignResponse(path=normalized, signed_url=signed_url, expires_at=expires_at)


@router.get("/file")
def get_signed_media_file(
    path: str = Query(...),
    exp: int = Query(...),
    sig: str = Query(...),
    settings: Settings = Depends(get_settings),
):
    try:
        file_path = verify_signed_media_request(path, exp, sig, settings)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media file not found.",
        )

    media_type, _ = mimetypes.guess_type(file_path.name)
    return FileResponse(file_path, media_type=media_type or "application/octet-stream")
