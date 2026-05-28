import json
import time
from pathlib import Path
from typing import Any

import numpy as np

from app.config import get_settings

from .base import AnalysisResult, BaseAIModel

try:
    import torch
except ModuleNotFoundError:  # pragma: no cover - handled at runtime
    torch = None


class ScriptedTorchDRModel(BaseAIModel):
    """Loads and serves predictions from TorchScript model exported as .pt."""

    def __init__(self) -> None:
        if torch is None:
            raise RuntimeError(
                "PyTorch is not installed. Install with: pip install torch "
                "and restart the backend."
            )

        settings = get_settings()
        self.model_path: Path = settings.scripted_model_path
        self.metadata_path: Path = settings.scripted_model_metadata_path

        if not self.model_path.exists():
            raise FileNotFoundError(f"Scripted model not found at: {self.model_path}")
        if not self.metadata_path.exists():
            raise FileNotFoundError(f"Model metadata not found at: {self.metadata_path}")

        metadata = json.loads(self.metadata_path.read_text(encoding="utf-8"))
        self.supported_classes = metadata.get("class_names", [])
        if not self.supported_classes:
            self.supported_classes = ["No DR", "Mild", "Moderate", "Severe", "Proliferative"]

        self.model_name = f"TorchScript-{metadata.get('architecture', 'model')}"
        qwk_value = (
            metadata.get("best_qwk")
            or metadata.get("best_val_qwk")
            or metadata.get("test_qwk_thresholded")
            or metadata.get("test_qwk_argmax")
            or "unknown"
        )
        self.model_version = f"qwk-{qwk_value}"
        self.expected_image_size = int(metadata.get("image_size", settings.model_input_size))

        self.device = torch.device("cpu")
        self.model = torch.jit.load(str(self.model_path), map_location=self.device)
        self.model.eval()

    def analyze(self, model_input: np.ndarray) -> AnalysisResult:
        expected_shape = (1, self.expected_image_size, self.expected_image_size, 3)
        if model_input.shape != expected_shape:
            raise ValueError(f"Model expects input shape {expected_shape}, got {model_input.shape}")

        # Convert NHWC (numpy) -> NCHW (torch) for EfficientNet-like models.
        input_tensor = torch.from_numpy(model_input).permute(0, 3, 1, 2).float().to(self.device)

        start = time.perf_counter()
        with torch.inference_mode():
            raw_output = self.model(input_tensor)
            logits = self._extract_logits(raw_output)
            probabilities = torch.softmax(logits, dim=1)[0]

        inference_time_ms = (time.perf_counter() - start) * 1000

        predicted_idx = int(torch.argmax(probabilities).item())
        confidence = float(probabilities[predicted_idx].item())
        confidence_distribution = {
            class_name: float(probabilities[idx].item())
            for idx, class_name in enumerate(self.supported_classes)
        }

        return AnalysisResult(
            severity_level=self.supported_classes[predicted_idx],
            confidence_score=confidence,
            confidence_distribution=confidence_distribution,
            inference_time_ms=inference_time_ms,
            model_name=self.model_name,
            model_version=self.model_version,
        )

    @staticmethod
    def _extract_logits(output: Any) -> Any:
        if isinstance(output, torch.Tensor):
            return output

        if isinstance(output, (tuple, list)) and output:
            first = output[0]
            if isinstance(first, torch.Tensor):
                return first

        if isinstance(output, dict):
            for value in output.values():
                if isinstance(value, torch.Tensor):
                    return value

        raise ValueError(f"Unsupported model output type: {type(output)!r}")
