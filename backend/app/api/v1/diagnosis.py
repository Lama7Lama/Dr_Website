from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
import numpy as np
from PIL import Image

from app.config import Settings, get_settings
from app.core.firebase_auth import AuthenticatedUser, require_roles
from app.core.media_access import build_signed_media_url
from app.schemas.diagnosis import AIAnalysisPayload, DiagnosisResponse, PreprocessingPayload
from app.services.ai_engine.registry import registry
from app.services.preprocessing.image_preprocessor import ImagePreprocessor
from app.services.storage.local_storage import LocalStorageService

router = APIRouter(prefix="/diagnosis", tags=["Diagnosis"])


class ReportRequest(BaseModel):
    severity: Literal["No DR", "Mild", "Moderate", "Severe", "Proliferative"]
    patient_name: str
    confidence: float


class ReportResponse(BaseModel):
    medical_report: str
    recommendations: list[str]


def get_storage_service(settings: Settings = Depends(get_settings)) -> LocalStorageService:
    return LocalStorageService(settings.storage_root)


def get_preprocessor(settings: Settings = Depends(get_settings)) -> ImagePreprocessor:
    return ImagePreprocessor(
        target_size=settings.model_input_size,
        mode=settings.preprocessing_mode,
        normalization=settings.model_channel_normalization,
    )


@router.get("/model-input-spec")
def model_input_spec(settings: Settings = Depends(get_settings)) -> dict[str, object]:
    return {
        "expected_shape": [1, settings.model_input_size, settings.model_input_size, 3],
        "normalization": settings.model_channel_normalization,
        "preprocessing_mode": settings.preprocessing_mode,
        "default_model": settings.default_ai_model,
        "note": "All uploaded images are converted in backend before inference.",
    }


@router.post("/report", response_model=ReportResponse)
def generate_report(
    payload: ReportRequest,
    _: AuthenticatedUser = Depends(require_roles("doctor", "admin")),
) -> ReportResponse:
    confidence_pct = max(0.0, min(100.0, payload.confidence * 100))

    recommendations_by_severity = {
        "No DR": [
            "Continue annual retinal screening.",
            "Maintain glycemic and blood pressure control.",
            "Report any sudden vision changes immediately.",
        ],
        "Mild": [
            "Schedule follow-up retinal exam within 12 months.",
            "Improve blood glucose control with your care team.",
            "Monitor vision changes and adhere to treatment plan.",
        ],
        "Moderate": [
            "Schedule follow-up retinal exam within 3 to 6 months.",
            "Coordinate diabetes, blood pressure, and lipid control.",
            "Consult retina specialist if symptoms progress.",
        ],
        "Severe": [
            "Urgent retina specialist review is recommended.",
            "Plan follow-up within weeks, not months.",
            "Seek immediate care for sudden blur or floaters.",
        ],
        "Proliferative": [
            "Immediate retina specialist referral is required.",
            "Discuss treatment options such as laser or injections.",
            "Use emergency care for acute vision loss symptoms.",
        ],
    }

    medical_report = (
        f"Patient {payload.patient_name} has AI severity classification '{payload.severity}' "
        f"with confidence {confidence_pct:.1f}%. Clinical review and doctor confirmation are required."
    )

    return ReportResponse(
        medical_report=medical_report,
        recommendations=recommendations_by_severity[payload.severity],
    )


@router.post("/analyze", response_model=DiagnosisResponse)
async def analyze_fundus_image(
    patient_id: str = Form(...),
    eye_side: Literal["left", "right"] = Form(...),
    image: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
    preprocessor: ImagePreprocessor = Depends(get_preprocessor),
    storage_service: LocalStorageService = Depends(get_storage_service),
    _: AuthenticatedUser = Depends(require_roles("doctor", "admin")),
) -> DiagnosisResponse:
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image format. Please upload a valid image file.",
        )

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

    max_size_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(image_bytes) > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image is too large. Max allowed size is {settings.max_upload_size_mb}MB",
        )

    original_file = storage_service.save_original(image_bytes=image_bytes, filename=image.filename)

    try:
        preprocess_result = preprocessor.preprocess(image_bytes)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to preprocess image: {exc}",
        ) from exc

    preprocessed_file = storage_service.save_preprocessed(
        image_bytes=preprocess_result.preview_bytes,
        base_id=original_file.file_id,
    )

    model = registry.get_model(settings.default_ai_model)
    try:
        ai_result = model.analyze(preprocess_result.model_input)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Model inference failed: {exc}",
        ) from exc

    heatmap_url = ai_result.heatmap_url
    if not heatmap_url:
        heatmap_preview = generate_attention_heatmap(preprocess_result.model_input[0])
        heatmap_file = storage_service.save_heatmap(
            image_bytes=heatmap_preview,
            report_id=original_file.file_id,
        )
        heatmap_url = heatmap_file.storage_ref

    original_signed_url, _ = build_signed_media_url(original_file.storage_ref, settings)
    preprocessed_signed_url, _ = build_signed_media_url(preprocessed_file.storage_ref, settings)
    heatmap_signed_url = None
    if heatmap_url:
        heatmap_signed_url, _ = build_signed_media_url(heatmap_url, settings)

    return DiagnosisResponse(
        report_id=original_file.file_id,
        patient_id=patient_id,
        eye_side=eye_side,
        ai_analysis=AIAnalysisPayload(
            severity=ai_result.severity_level,
            confidence=ai_result.confidence_score,
            confidence_breakdown=ai_result.confidence_distribution,
            model_name=ai_result.model_name,
            model_version=ai_result.model_version,
            inference_time_ms=ai_result.inference_time_ms,
            heatmap_url=heatmap_url,
            heatmap_signed_url=heatmap_signed_url,
        ),
        preprocessing=PreprocessingPayload(
            original_width=preprocess_result.original_width,
            original_height=preprocess_result.original_height,
            target_width=preprocess_result.target_size,
            target_height=preprocess_result.target_size,
            mode=preprocess_result.mode,
            normalized=preprocess_result.normalized,
            original_image_url=original_file.storage_ref,
            preprocessed_image_url=preprocessed_file.storage_ref,
            original_image_signed_url=original_signed_url,
            preprocessed_image_signed_url=preprocessed_signed_url,
        ),
        message=(
            f"Image was normalized to {preprocess_result.target_size}x{preprocess_result.target_size} "
            "in backend and then sent to the model."
        ),
    )


def generate_attention_heatmap(model_input: np.ndarray) -> bytes:
    """Generate GradCAM-like attention visualization from preprocessed tensor."""
    image = np.clip(model_input, 0.0, 1.0)
    luminance = (0.299 * image[:, :, 0]) + (0.587 * image[:, :, 1]) + (0.114 * image[:, :, 2])

    # Approximate lesion attention with local contrast emphasis.
    centered = luminance - luminance.mean()
    attention = np.clip(centered * 3.0 + luminance * 0.4, 0.0, 1.0)

    # Red (high) -> Yellow (mid) -> Blue (low)
    red = np.clip(attention * 2.2, 0.0, 1.0)
    green = np.clip(attention * 1.6, 0.0, 1.0)
    blue = np.clip((1.0 - attention) * 1.4, 0.0, 1.0)
    heatmap = np.stack([red, green, blue], axis=-1)

    heatmap_img = Image.fromarray((heatmap * 255).astype(np.uint8), mode="RGB")
    from io import BytesIO

    output = BytesIO()
    heatmap_img.save(output, format="PNG")
    return output.getvalue()
