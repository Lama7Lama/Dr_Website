# DR AI Platform

An intelligent web-based platform for early detection and monitoring of diabetic retinopathy using artificial intelligence and retinal fundus image analysis, designed to support ophthalmologists in diagnosis and patient follow-up securely and efficiently.

Main system roles:

* Doctor Portal: Upload images, analyze results, monitor patients, and send follow-up plans.
* Patient Portal: View reports, appointments, and medical notifications.
* Admin Portal: Manage users, permissions, and system monitoring.

## Tech Stack

- Frontend: React + TypeScript + Vite
- Backend: FastAPI
- Auth / Data: Firebase Authentication + Firestore
- AI Model: TorchScript EfficientNet-B3

## Active Project Structure

* `App.tsx`: Main application control entry point — نقطة التحكم الرئيسية للتطبيق
* `views/`: Actual screens used in the interface — الشاشات الفعلية المستخدمة في الواجهة
* `components/`: Shared UI components — مكونات الواجهة المشتركة
* `services/`: Firebase services, APIs, and frontend helper logic — خدمات Firebase والـ API والمنطق الواجهي المساعد
* `backend/app/`: Backend logic and API endpoints — منطق الباكند وواجهات الـ API
* `backend/models/`: Actual model files — ملفات المودل الفعلية
* `locales/`: Arabic / English translations — ترجمة عربي / إنجليزي

## Current Model

- File: `backend/models/best_model_scripted.pt`
- Metadata: `backend/models/best_model_metadata.json`
- Architecture: `efficientnet_b3`
- Input size: `300x300`
- Classes:
  - `No DR`
  - `Mild`
  - `Moderate`
  - `Severe`
  - `Proliferative`

## Run Locally

**Prerequisites:** Node.js 18+ and Python 3.11

1. Copy `.env.example` to `.env.local` and fill in Firebase web app values.
2. Copy `backend/.env.example` to `backend/.env` and set:
   - `DR_MEDICAL_ENCRYPTION_KEY`
   - `DR_MEDIA_SIGNING_KEY`
   - `DR_FIREBASE_CREDENTIALS_PATH` if needed
3. Place Firebase Admin credentials at `backend/secrets/firebase-admin.json` on trusted developer machines only.
4. Install frontend dependencies:
   ```bash
   npm install
   ```
5. Install backend dependencies:
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   python -m pip install -r requirements.txt
   ```
6. Run the backend:
   ```bash
   cd backend
   source .venv/bin/activate
   python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
7. Run the frontend:
   ```bash
   npm run dev
   ```

## Backend API

- `GET /health`
- `GET /api/v1/diagnosis/model-input-spec`
- `POST /api/v1/diagnosis/analyze`
- `POST /api/v1/diagnosis/report`
