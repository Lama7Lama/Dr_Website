# DR AI Platform

An intelligent web-based platform for early detection and monitoring of diabetic retinopathy using artificial intelligence and retinal fundus image analysis, designed to support ophthalmologists in diagnosis and patient follow-up securely and efficiently.

Main system roles:

* Doctor Portal: Upload images, analyze results, monitor patients, and send follow-up plans.
* Patient Portal: View reports, appointments, and medical notifications.
* Admin Portal: Manage users, permissions, and system monitoring.

## Live Demo

🔗 https://dr-web-rose.vercel.app


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
