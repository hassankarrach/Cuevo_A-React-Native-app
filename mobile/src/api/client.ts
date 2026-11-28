type FieldError = { field: string; code: string; message: string };

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly requestId?: string,
    public readonly retryAfterSeconds?: number,
    public readonly fieldErrors: FieldError[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  rawBody?: ArrayBuffer;
  contentType?: string;
  responseType?: 'image';
  accessToken?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Calls are never automatically retried: refresh tokens and challenge codes
// can be consumed by a request even when its response is lost.
export async function apiRequest(path: string, options: RequestOptions = {}): Promise<unknown> {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!configuredUrl) {
    throw new ApiError('The service connection is not configured.', 'API_NOT_CONFIGURED', 0);
  }
  const baseUrl = configuredUrl.replace(/\/+$/, '');
  if (!/^https?:\/\//.test(baseUrl) || !path.startsWith('/') || path.startsWith('//')) {
    throw new ApiError('The service connection is invalid.', 'API_NOT_CONFIGURED', 0);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.rawBody) headers['Content-Type'] = options.contentType ?? 'application/octet-stream';
    if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
      signal: controller.signal,
    });
    if (response.ok && options.responseType === 'image') {
      const type = response.headers.get('Content-Type')?.split(';')[0];
      if (!type || !['image/jpeg', 'image/png', 'image/webp'].includes(type)) throw new ApiError('Invalid profile photo response.', 'INVALID_RESPONSE', response.status);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > 2 * 1024 * 1024) throw new ApiError('Profile photo is too large.', 'INVALID_RESPONSE', response.status);
      let binary = '';
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return `data:${type};base64,${btoa(binary)}`;
    }
    const data: unknown = response.status === 204 ? undefined : await response.json().catch(() => undefined);
    if (!response.ok) {
      const error = isObject(data) && isObject(data.error) ? data.error : {};
      const retryAfter = response.headers.get('Retry-After');
      const fieldErrors = Array.isArray(error.fieldErrors) ? error.fieldErrors.filter(
        (field): field is FieldError => isObject(field) && typeof field.field === 'string'
          && typeof field.code === 'string' && typeof field.message === 'string',
      ) : [];
      throw new ApiError(
        typeof error.message === 'string' ? error.message : 'The request could not be completed.',
        typeof error.code === 'string' ? error.code : 'HTTP_ERROR',
        response.status,
        typeof error.requestId === 'string' ? error.requestId : response.headers.get('X-Request-ID') ?? undefined,
        retryAfter !== null && /^\d+$/.test(retryAfter) ? Number(retryAfter) : undefined,
        fieldErrors,
      );
    }
    if (response.status !== 204 && data === undefined) {
      throw new ApiError('The service returned an unexpected response.', 'INVALID_RESPONSE', response.status);
    }
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      controller.signal.aborted ? 'The request timed out. Please try again.' : 'Unable to connect. Check your connection and try again.',
      controller.signal.aborted ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR',
      0,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkBackendHealth(): Promise<void> {
  const data = await apiRequest('/health');
  if (!isObject(data) || data.status !== 'ok' || data.api !== 'ready' || data.database !== 'ready') {
    throw new ApiError('The service is not ready yet.', 'SERVICE_UNAVAILABLE', 503);
  }
}
