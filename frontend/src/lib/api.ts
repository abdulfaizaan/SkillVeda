const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

export const API_BASE_URL = configuredApiBase.replace(/\/+$/, '');

export function apiUrl(path: string): string {
  return API_BASE_URL + (path.startsWith('/') ? path : '/' + path);
}

// Anonymous local identity. There is no login yet; the backend keys all
// student data by this ID. It holds no personal data.
const STUDENT_ID_KEY = 'skillveda_student_id';
const STUDENT_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

function newStudentId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replaceAll('-', '');
  }
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export function getStudentId(): string {
  const existing = localStorage.getItem(STUDENT_ID_KEY);
  if (existing && STUDENT_ID_PATTERN.test(existing)) return existing;
  const id = newStudentId();
  localStorage.setItem(STUDENT_ID_KEY, id);
  return id;
}

export function resetStudentId(): void {
  localStorage.removeItem(STUDENT_ID_KEY);
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type ApiOptions = Omit<RequestInit, 'body' | 'signal'> & { body?: unknown; timeoutMs?: number };

function detailMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail: unknown }).detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => (item && typeof item === 'object' && 'msg' in item ? String((item as { msg: unknown }).msg) : ''))
        .filter(Boolean);
      if (messages.length) return messages.join('; ');
    }
  }
  return fallback;
}

/** Call the SkillVeda backend with the student ID, a timeout and readable errors. */
export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, timeoutMs = 20000, headers, ...rest } = options;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const finalHeaders = new Headers(headers);
  finalHeaders.set('X-Student-Id', getStudentId());

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    payload = JSON.stringify(body);
    finalHeaders.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path), { ...rest, headers: finalHeaders, body: payload, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(0, 'SkillVeda took too long to respond. Try again.');
    }
    throw new ApiError(0, `Cannot reach the SkillVeda API at ${API_BASE_URL}. Start the backend and try again.`);
  } finally {
    window.clearTimeout(timer);
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, detailMessage(data, `Request failed (${response.status}).`));
  }
  return data as T;
}

export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
