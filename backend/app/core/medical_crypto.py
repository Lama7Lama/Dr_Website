import base64
import hashlib
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import Settings

ENCRYPTED_PREFIX = "enc:v2"
LEGACY_ENCRYPTED_PREFIX = "enc:v1"


def is_encrypted(value: str | None) -> bool:
    return bool(value and value.startswith("enc:v"))


def _derive_key(secret: str) -> bytes:
    return hashlib.sha256(secret.encode("utf-8")).digest()


def _candidate_secrets(payload: str, settings: Settings) -> list[str]:
    current = settings.medical_encryption_key.strip()
    legacy = settings.legacy_medical_decryption_key.strip()

    candidates: list[str] = []
    if payload.startswith(f"{LEGACY_ENCRYPTED_PREFIX}:"):
        if legacy:
            candidates.append(legacy)
        if current and current != legacy:
            candidates.append(current)
        return candidates

    if current:
        candidates.append(current)
    if legacy and legacy != current:
        candidates.append(legacy)
    return candidates


def encrypt_medical_text(plain_text: str, settings: Settings) -> str:
    if not plain_text or is_encrypted(plain_text):
        return plain_text

    iv = os.urandom(12)
    aesgcm = AESGCM(_derive_key(settings.medical_encryption_key.strip()))
    encrypted = aesgcm.encrypt(iv, plain_text.encode("utf-8"), None)
    return (
        f"{ENCRYPTED_PREFIX}:"
        f"{base64.b64encode(iv).decode('utf-8')}:"
        f"{base64.b64encode(encrypted).decode('utf-8')}"
    )


def decrypt_medical_text(payload: str, settings: Settings) -> str:
    if not payload or not is_encrypted(payload):
        return payload

    parts = payload.split(":")
    if len(parts) != 4:
        return payload

    try:
        iv = base64.b64decode(parts[2])
        encrypted = base64.b64decode(parts[3])
        for secret in _candidate_secrets(payload, settings):
            try:
                aesgcm = AESGCM(_derive_key(secret))
                decrypted = aesgcm.decrypt(iv, encrypted, None)
                return decrypted.decode("utf-8")
            except Exception:
                continue
        return payload
    except Exception:  # pragma: no cover - defensive
        return payload
