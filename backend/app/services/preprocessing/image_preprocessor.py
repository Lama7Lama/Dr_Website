from dataclasses import dataclass
from io import BytesIO
from typing import Literal

import numpy as np
from PIL import Image


PreprocessingMode = Literal["letterbox", "center_crop"]
NormalizationMode = Literal["0_1", "imagenet"]


@dataclass
class PreprocessResult:
    model_input: np.ndarray
    preview_bytes: bytes
    original_width: int
    original_height: int
    target_size: int
    mode: PreprocessingMode
    normalized: NormalizationMode


class ImagePreprocessor:
    """Converts any incoming image to model-ready tensor shape (1, H, W, 3)."""

    def __init__(
        self,
        target_size: int = 300,
        mode: PreprocessingMode = "letterbox",
        normalization: NormalizationMode = "0_1",
    ) -> None:
        self.target_size = target_size
        self.mode = mode
        self.normalization = normalization

    def preprocess(self, image_bytes: bytes) -> PreprocessResult:
        with Image.open(BytesIO(image_bytes)) as raw:
            image = raw.convert("RGB")

        original_width, original_height = image.size

        if self.mode == "center_crop":
            square = self._center_crop_to_square(image)
        else:
            square = self._letterbox_to_square(image)

        resampling_ns = Image.Resampling if hasattr(Image, "Resampling") else Image
        resized = square.resize((self.target_size, self.target_size), resampling_ns.BILINEAR)

        array = np.asarray(resized, dtype=np.float32) / 255.0
        if self.normalization == "imagenet":
            mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
            std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
            array = (array - mean) / std

        model_input = np.expand_dims(array, axis=0)

        preview_buffer = BytesIO()
        resized.save(preview_buffer, format="PNG", optimize=True)

        return PreprocessResult(
            model_input=model_input,
            preview_bytes=preview_buffer.getvalue(),
            original_width=original_width,
            original_height=original_height,
            target_size=self.target_size,
            mode=self.mode,
            normalized=self.normalization,
        )

    @staticmethod
    def _center_crop_to_square(image: Image.Image) -> Image.Image:
        width, height = image.size
        side = min(width, height)
        left = (width - side) // 2
        top = (height - side) // 2
        return image.crop((left, top, left + side, top + side))

    @staticmethod
    def _letterbox_to_square(image: Image.Image) -> Image.Image:
        width, height = image.size
        side = max(width, height)
        square = Image.new("RGB", (side, side), (0, 0, 0))
        square.paste(image, ((side - width) // 2, (side - height) // 2))
        return square
