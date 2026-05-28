from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from uuid import uuid4


@dataclass
class StoredFile:
    file_id: str
    storage_ref: str
    absolute_path: Path


class LocalStorageService:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.originals_dir = self.root / "originals"
        self.preprocessed_dir = self.root / "preprocessed"
        self.heatmaps_dir = self.root / "heatmaps"

        self.originals_dir.mkdir(parents=True, exist_ok=True)
        self.preprocessed_dir.mkdir(parents=True, exist_ok=True)
        self.heatmaps_dir.mkdir(parents=True, exist_ok=True)

    def save_original(self, image_bytes: bytes, filename: str | None = None) -> StoredFile:
        suffix = Path(filename).suffix.lower() if filename else ".jpg"
        if suffix not in {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}:
            suffix = ".jpg"
        return self._save_bytes(image_bytes=image_bytes, target_dir=self.originals_dir, suffix=suffix)

    def save_preprocessed(self, image_bytes: bytes, base_id: str) -> StoredFile:
        return self._save_bytes(
            image_bytes=image_bytes,
            target_dir=self.preprocessed_dir,
            suffix=".png",
            filename_override=f"{base_id}_300x300",
        )

    def save_heatmap(self, image_bytes: bytes, report_id: str) -> StoredFile:
        report_dir = self.heatmaps_dir / report_id
        report_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%S")
        return self._save_bytes(
            image_bytes=image_bytes,
            target_dir=report_dir,
            suffix=".png",
            filename_override=f"{timestamp}_gradcam",
        )

    def _save_bytes(
        self,
        image_bytes: bytes,
        target_dir: Path,
        suffix: str,
        filename_override: str | None = None,
    ) -> StoredFile:
        file_id = filename_override or uuid4().hex
        filename = f"{file_id}{suffix}"
        absolute_path = target_dir / filename
        absolute_path.write_bytes(image_bytes)

        storage_ref = str(absolute_path.relative_to(self.root)).replace("\\", "/")

        return StoredFile(
            file_id=file_id,
            storage_ref=storage_ref,
            absolute_path=absolute_path,
        )
