import { BackendDiagnosisResponse, EyeSide, GeneratedReportResponse, SeverityLabel } from '../types';
import { getFirebaseIdToken } from './firebase';

function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${window.location.hostname}:8000`;
  }

  return 'http://127.0.0.1:8000';
}

export const API_BASE_URL = resolveApiBaseUrl();

export function toAbsoluteApiUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return pathOrUrl;
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;
  return `${API_BASE_URL}${pathOrUrl}`;
}

function isSignedMediaPath(pathOrUrl: string): boolean {
  return pathOrUrl.includes('/api/v1/media/file?');
}

function normalizeStorageReference(pathOrUrl: string): string {
  if (!pathOrUrl) return '';
  if (isSignedMediaPath(pathOrUrl)) return pathOrUrl;

  try {
    const parsed = new URL(pathOrUrl, API_BASE_URL);
    if (parsed.pathname.startsWith('/storage/')) {
      return parsed.pathname.replace(/^\/storage\//, '');
    }
    if (parsed.pathname.startsWith('/api/v1/media/file')) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // Keep raw path fallback when URL parsing fails.
  }

  return pathOrUrl.replace(/^\/storage\//, '').replace(/^storage\//, '');
}

export async function getAuthorizedHeaders(initial?: HeadersInit): Promise<Headers> {
  const headers = new Headers(initial);
  headers.set('Authorization', `Bearer ${await getFirebaseIdToken()}`);
  return headers;
}

const mediaUrlCache = new Map<string, { signedUrl: string; expiresAt: number }>();

export async function resolveProtectedMediaUrl(pathOrUrl: string): Promise<string> {
  if (!pathOrUrl) return pathOrUrl;
  if (isSignedMediaPath(pathOrUrl)) return toAbsoluteApiUrl(pathOrUrl);

  const normalized = normalizeStorageReference(pathOrUrl);
  const cached = mediaUrlCache.get(normalized);
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt > now + 20) {
    return cached.signedUrl;
  }

  const headers = await getAuthorizedHeaders({ 'Content-Type': 'application/json' });
  const response = await fetch(`${API_BASE_URL}/api/v1/media/sign`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ path: normalized })
  });

  if (!response.ok) {
    let detail = `Unable to sign media URL (${response.status})`;
    try {
      const payload = await response.json();
      detail = payload?.detail || detail;
    } catch {
      // Keep fallback message.
    }
    throw new Error(detail);
  }

  const payload = await response.json() as { signed_url: string; expires_at: number };
  const signedUrl = toAbsoluteApiUrl(payload.signed_url);
  mediaUrlCache.set(normalized, { signedUrl, expiresAt: payload.expires_at });
  return signedUrl;
}

export async function analyzeFundusImage(
  patientId: string,
  eyeSide: EyeSide,
  imageFile: File
): Promise<BackendDiagnosisResponse> {
  const formData = new FormData();
  formData.append('patient_id', patientId);
  formData.append('eye_side', eyeSide);
  formData.append('image', imageFile);

  let response: Response;
  try {
    const headers = await getAuthorizedHeaders();
    response = await fetch(`${API_BASE_URL}/api/v1/diagnosis/analyze`, {
      method: 'POST',
      headers,
      body: formData
    });
  } catch {
    throw new Error(`Load failed: cannot reach backend at ${API_BASE_URL}. Start backend and verify /health.`);
  }

  if (!response.ok) {
    let detail = `API request failed (${response.status})`;
    try {
      const payload = await response.json();
      detail = payload?.detail || detail;
    } catch {
      // Keep fallback message when response body is not JSON.
    }
    throw new Error(detail);
  }

  return response.json();
}

export async function generateMedicalReport(payload: {
  severity: SeverityLabel;
  patient_name: string;
  confidence: number;
}): Promise<GeneratedReportResponse> {
  let response: Response;
  try {
    const headers = await getAuthorizedHeaders({
      'Content-Type': 'application/json'
    });
    response = await fetch(`${API_BASE_URL}/api/v1/diagnosis/report`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
  } catch {
    return {
      medical_report: 'Medical report is not available from backend at the moment.',
      recommendations: [
        'Follow doctor instructions and schedule follow-up.',
        'Keep blood glucose levels under control.',
        'Seek urgent care if vision worsens suddenly.'
      ]
    };
  }

  if (response.ok) {
    return response.json();
  }

  return {
    medical_report: 'Medical report is not available from backend at the moment.',
    recommendations: [
      'Follow doctor instructions and schedule follow-up.',
      'Keep blood glucose levels under control.',
      'Seek urgent care if vision worsens suddenly.'
    ]
  };
}
