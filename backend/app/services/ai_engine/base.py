from abc import ABC, abstractmethod
from dataclasses import dataclass

import numpy as np


@dataclass
class AnalysisResult:
    severity_level: str
    confidence_score: float
    confidence_distribution: dict[str, float]
    inference_time_ms: float
    model_name: str
    model_version: str
    heatmap_url: str | None = None


class BaseAIModel(ABC):
    model_name: str
    model_version: str
    supported_classes: list[str]

    @abstractmethod
    def analyze(self, model_input: np.ndarray) -> AnalysisResult:
        """Analyze a preprocessed tensor with shape (1, 300, 300, 3)."""

    def health_check(self) -> bool:
        return True
