import { API_BASE_URL, getAuthorizedHeaders } from './diagnosisApi';

const ENCRYPTED_PREFIX = 'enc:v';

export function isEncrypted(value: string | undefined | null): boolean {
  return Boolean(value && value.startsWith(ENCRYPTED_PREFIX));
}

export async function encryptMedicalText(plainText: string): Promise<string> {
  if (!plainText) return plainText;
  if (isEncrypted(plainText)) return plainText;
  const headers = await getAuthorizedHeaders({ 'Content-Type': 'application/json' });
  const response = await fetch(`${API_BASE_URL}/api/v1/security/encrypt-text`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ value: plainText })
  });

  if (!response.ok) {
    throw new Error('Failed to encrypt medical text via backend.');
  }

  const payload = await response.json() as { value: string };
  return payload.value;
}

export async function decryptMedicalText(payload: string): Promise<string> {
  if (!payload) return payload;
  if (!isEncrypted(payload)) return payload;
  try {
    const headers = await getAuthorizedHeaders({ 'Content-Type': 'application/json' });
    const response = await fetch(`${API_BASE_URL}/api/v1/security/decrypt-text`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ value: payload })
    });

    if (!response.ok) {
      return payload;
    }

    const data = await response.json() as { value: string };
    return data.value;
  } catch {
    return payload;
  }
}
