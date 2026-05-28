# Backend (FastAPI)

## What is implemented
- Upload and analyze endpoint for fundus images.
- Backend-enforced preprocessing to **300x300** before model inference.
- Original image is kept for medical record, preprocessed image is stored separately.
- Model registry abstraction with **TorchScript model integration** and automatic fallback to mock model.

## Run
1. Create env and install requirements:
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. Optional env vars:
   - `DR_MODEL_INPUT_SIZE=300`
   - `DR_PREPROCESSING_MODE=letterbox` (or `center_crop`)
   - `DR_DEFAULT_AI_MODEL=scripted` (or `mock`)
   - `DR_MODEL_CHANNEL_NORMALIZATION=imagenet` (or `0_1`)
   - `DR_SCRIPTED_MODEL_PATH=./models/best_model_scripted.pt`
   - `DR_SCRIPTED_MODEL_METADATA_PATH=./models/best_model_metadata.json`
3. Start API:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

## Endpoints
- `GET /health`
- `GET /api/v1/diagnosis/model-input-spec`
- `POST /api/v1/diagnosis/analyze`

`/analyze` form-data fields:
- `patient_id`: string
- `eye_side`: `left` or `right`
- `image`: image file

Response includes:
- AI severity + confidence breakdown
- preprocessing metadata (original size, target size, mode)
- URL for original image and URL for preprocessed `300x300` image

## Model files
Place these files in `backend/models/`:
- `best_model_scripted.pt`
- `best_model_metadata.json`
