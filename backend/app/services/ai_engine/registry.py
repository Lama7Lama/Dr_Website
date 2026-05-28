import logging
from typing import Type

from .base import BaseAIModel
from .mock_model import MockDRModel
from .scripted_model import ScriptedTorchDRModel

logger = logging.getLogger(__name__)


class ModelRegistry:
    def __init__(self) -> None:
        self._models: dict[str, Type[BaseAIModel]] = {}
        self._instances: dict[str, BaseAIModel] = {}
        self._default_model: str | None = None
        self._fallback_model: str | None = None

    def register(self, name: str, model_class: Type[BaseAIModel]) -> None:
        self._models[name] = model_class

    def set_default(self, name: str) -> None:
        if name not in self._models:
            raise ValueError(f"Model '{name}' is not registered")
        self._default_model = name

    def set_fallback(self, name: str) -> None:
        if name not in self._models:
            raise ValueError(f"Fallback model '{name}' is not registered")
        self._fallback_model = name

    def get_model(self, name: str | None = None, _allow_fallback: bool = True) -> BaseAIModel:
        model_name = name or self._default_model
        if model_name is None:
            raise ValueError("No default model configured")
        if model_name not in self._models:
            raise ValueError(f"Model '{model_name}' not found")

        try:
            if model_name not in self._instances:
                self._instances[model_name] = self._models[model_name]()
            return self._instances[model_name]
        except Exception as exc:
            if _allow_fallback and self._fallback_model and self._fallback_model != model_name:
                logger.warning(
                    "Failed to initialize model '%s' (%s). Falling back to '%s'.",
                    model_name,
                    exc,
                    self._fallback_model,
                )
                return self.get_model(self._fallback_model, _allow_fallback=False)
            raise


registry = ModelRegistry()
registry.register("scripted", ScriptedTorchDRModel)
registry.register("mock", MockDRModel)
registry.set_default("scripted")
registry.set_fallback("mock")
