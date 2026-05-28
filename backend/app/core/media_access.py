import hashlib
import hmac
import time
from pathlib import Path
from urllib.parse import quote, urlparse

from app.config import Settings
from app.core.firebase_auth import AuthenticatedUser, get_firestore_client


def normalize_storage_reference(value: str) -> str:
    candidate = (value or "").strip()
    if not candidate:
        return ""

    parsed = urlparse(candidate)
    if parsed.scheme or parsed.netloc:
        candidate = parsed.path

    candidate = candidate.replace("\\", "/")
    if candidate.startswith("/storage/"):
        candidate = candidate[len("/storage/"):]
    elif candidate.startswith("storage/"):
        candidate = candidate[len("storage/"):]

    return candidate.lstrip("/")


def resolve_storage_path(storage_ref: str, settings: Settings) -> Path:
    normalized = normalize_storage_reference(storage_ref)
    if not normalized:
        raise ValueError("Missing storage reference.")

    root = settings.storage_root.resolve()
    target = (root / normalized).resolve()
    if target != root and root not in target.parents:
        raise ValueError("Invalid storage reference.")
    return target


def _sign_payload(storage_ref: str, expiry_epoch: int, settings: Settings) -> str:
    payload = f"{normalize_storage_reference(storage_ref)}:{expiry_epoch}"
    return hmac.new(
        settings.media_signing_key.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def build_signed_media_url(storage_ref: str, settings: Settings) -> tuple[str, int]:
    normalized = normalize_storage_reference(storage_ref)
    expiry_epoch = int(time.time()) + max(60, settings.signed_media_ttl_seconds)
    signature = _sign_payload(normalized, expiry_epoch, settings)
    signed_url = (
        f"{settings.api_v1_prefix}/media/file?"
        f"path={quote(normalized, safe='')}&exp={expiry_epoch}&sig={signature}"
    )
    return signed_url, expiry_epoch


def verify_signed_media_request(path: str, exp: int, sig: str, settings: Settings) -> Path:
    normalized = normalize_storage_reference(path)
    if not normalized:
        raise ValueError("Missing storage reference.")
    if exp < int(time.time()):
        raise ValueError("Signed media URL has expired.")

    expected = _sign_payload(normalized, exp, settings)
    if not hmac.compare_digest(expected, sig):
        raise ValueError("Invalid media signature.")

    return resolve_storage_path(normalized, settings)


def _report_matches_user(data: dict, user: AuthenticatedUser) -> bool:
    if user.role == "admin":
        return True
    if user.role == "doctor":
        return str(data.get("doctorId", "")) == user.uid
    if user.role == "patient":
        return str(data.get("patientId", "")) == user.uid
    return False


def user_can_access_media(user: AuthenticatedUser, storage_ref: str, settings: Settings) -> bool:
    normalized = normalize_storage_reference(storage_ref)
    if not normalized:
        return False

    # Doctors and admins need to access freshly analyzed images before the draft
    # report is persisted, so allow them to sign existing storage files directly.
    if user.role in {"doctor", "admin"}:
        try:
            return resolve_storage_path(normalized, settings).exists()
        except ValueError:
            return False

    firestore_client = get_firestore_client(settings)
    legacy_value = f"/storage/{normalized}"
    for field_name in ("imageUrl", "gradcamUrl"):
        for value in (normalized, legacy_value):
            documents = firestore_client.collection("reports").where(field_name, "==", value).limit(10).stream()
            for document in documents:
                data = document.to_dict() or {}
                if _report_matches_user(data, user):
                    return True

    return False
