from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.config import Settings, get_settings
from app.core.firebase_auth import AuthenticatedUser, require_firebase_user
from app.core.medical_crypto import decrypt_medical_text, encrypt_medical_text

router = APIRouter(prefix="/security", tags=["Security"])


class TextTransformRequest(BaseModel):
    value: str


class TextTransformResponse(BaseModel):
    value: str


@router.post("/encrypt-text", response_model=TextTransformResponse)
def encrypt_text(
    payload: TextTransformRequest,
    _: AuthenticatedUser = Depends(require_firebase_user),
    settings: Settings = Depends(get_settings),
) -> TextTransformResponse:
    return TextTransformResponse(value=encrypt_medical_text(payload.value, settings))


@router.post("/decrypt-text", response_model=TextTransformResponse)
def decrypt_text(
    payload: TextTransformRequest,
    _: AuthenticatedUser = Depends(require_firebase_user),
    settings: Settings = Depends(get_settings),
) -> TextTransformResponse:
    return TextTransformResponse(value=decrypt_medical_text(payload.value, settings))
