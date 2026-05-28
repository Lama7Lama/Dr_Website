import hashlib
import time

import numpy as np

from app.config import get_settings

from .base import AnalysisResult, BaseAIModel


class MockDRModel(BaseAIModel):
    """Mock model for development. Replace with your real CNN model class."""

    model_name = "DR-MockNet"
    model_version = "0.1.0"
    supported_classes = ["No DR", "Mild", "Moderate", "Severe", "Proliferative"]

    def __init__(self) -> None:
        settings = get_settings()
        self.input_size = settings.model_input_size

    def analyze(self, model_input: np.ndarray) -> AnalysisResult:
        expected_shape = (1, self.input_size, self.input_size, 3)
        if model_input.shape != expected_shape:
            raise ValueError(f"Model expects input shape {expected_shape}, got {model_input.shape}")

        start = time.perf_counter()

        brightness = float(model_input.mean())
        contrast = float(model_input.std())

        # Create deterministic variation from image content.
        seed_source = model_input[0, ::20, ::20, :].tobytes()
        seed = int(hashlib.sha256(seed_source).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)

        base = np.array([0.28, 0.22, 0.20, 0.17, 0.13], dtype=np.float64)
        severity_shift = max(0.0, (0.45 - brightness) * 0.8) + max(0.0, (0.12 - contrast) * 0.6)
        base += np.array([
            -severity_shift,
            -0.3 * severity_shift,
            0.1 * severity_shift,
            0.5 * severity_shift,
            0.7 * severity_shift,
        ])

        logits = np.clip(base + rng.normal(0.0, 0.015, size=5), 0.001, None)
        probabilities = logits / logits.sum()
        predicted_idx = int(np.argmax(probabilities))

        inference_time_ms = (time.perf_counter() - start) * 1000

        return AnalysisResult(
            severity_level=self.supported_classes[predicted_idx],
            confidence_score=float(probabilities[predicted_idx]),
            confidence_distribution={
                label: float(probabilities[idx]) for idx, label in enumerate(self.supported_classes)
            },
            inference_time_ms=inference_time_ms,
            model_name=self.model_name,
            model_version=self.model_version,
        )
