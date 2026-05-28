from typing import Dict, Literal

from pydantic import BaseModel, Field


SeverityLabel = Literal["No DR", "Mild", "Moderate", "Severe", "Proliferative"]


class AIAnalysisPayload(BaseModel):
    severity: SeverityLabel
    confidence: float = Field(ge=0, le=1)
    confidence_breakdown: Dict[str, float]
    model_name: str
    model_version: str
    inference_time_ms: float
    heatmap_url: str | None = None
    heatmap_signed_url: str | None = None


class PreprocessingPayload(BaseModel):
    original_width: int
    original_height: int
    target_width: int
    target_height: int
    mode: Literal["letterbox", "center_crop"]
    normalized: Literal["0_1", "imagenet"]
    original_image_url: str
    preprocessed_image_url: str
    original_image_signed_url: str
    preprocessed_image_signed_url: str


class DiagnosisResponse(BaseModel):
    report_id: str
    patient_id: str
    eye_side: Literal["left", "right"]
    ai_analysis: AIAnalysisPayload
    preprocessing: PreprocessingPayload
    message: str
