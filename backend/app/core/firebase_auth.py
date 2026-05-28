from dataclasses import dataclass
from functools import lru_cache

import firebase_admin
from fastapi import Depends, Header, HTTPException, status
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials, firestore

from app.config import Settings, get_settings

FIREBASE_APP_NAME = "dr-ai-platform-backend"


@dataclass(frozen=True)
class AuthenticatedUser:
    uid: str
    email: str | None
    role: str | None


@lru_cache(maxsize=1)
def _get_firebase_app(credentials_path: str):
    try:
        return firebase_admin.get_app(FIREBASE_APP_NAME)
    except ValueError:
        credential_path = str(credentials_path)
        if not credential_path:
            raise RuntimeError("Firebase Admin credentials path is not configured.")
        return firebase_admin.initialize_app(
            credentials.Certificate(credential_path),
            name=FIREBASE_APP_NAME,
        )


def get_firebase_app(settings: Settings):
    if not settings.firebase_credentials_path.exists():
        raise RuntimeError(
            f"Firebase Admin credentials file is missing at {settings.firebase_credentials_path}"
        )
    return _get_firebase_app(str(settings.firebase_credentials_path))


def get_firestore_client(settings: Settings):
    return firestore.client(app=get_firebase_app(settings))


def get_user_role(uid: str, settings: Settings) -> str | None:
    snapshot = get_firestore_client(settings).collection("users").document(uid).get()
    if not snapshot.exists:
        return None
    data = snapshot.to_dict() or {}
    role = data.get("role")
    return str(role).lower() if role else None


def require_firebase_user(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Firebase bearer token.",
        )

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty Firebase bearer token.",
        )

    try:
        decoded = firebase_auth.verify_id_token(token, app=get_firebase_app(settings))
    except Exception as exc:  # pragma: no cover - depends on Firebase runtime
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Firebase bearer token.",
        ) from exc

    role = get_user_role(str(decoded.get("uid", "")), settings)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User profile is missing or has no assigned role.",
        )

    return AuthenticatedUser(
        uid=str(decoded["uid"]),
        email=str(decoded.get("email")) if decoded.get("email") else None,
        role=role,
    )


def require_roles(*allowed_roles: str):
    normalized_roles = {item.lower() for item in allowed_roles}

    def _dependency(user: AuthenticatedUser = Depends(require_firebase_user)) -> AuthenticatedUser:
        if (user.role or "").lower() not in normalized_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return user

    return _dependency
