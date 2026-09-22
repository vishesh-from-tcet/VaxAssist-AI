const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface HealthStatus {
  status: string;
  [key: string]: any;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('vaxassist_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data?.detail || data?.message || `HTTP ${response.status} Error`;
      throw new ApiError(errorMessage, response.status, data);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError((error as Error).message || 'Network error occurred', 500);
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(endpoint: string, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'DELETE' }),
};

export const fetchHealth = async (): Promise<HealthStatus> => {
  try {
    return await api.get<HealthStatus>('/health');
  } catch {
    return { status: 'error' };
  }
};

export const fetchDbHealth = async (): Promise<HealthStatus> => {
  try {
    return await api.get<HealthStatus>('/health/database');
  } catch {
    return { status: 'error' };
  }
};

export const fetchVectorDbHealth = async (): Promise<HealthStatus> => {
  try {
    return await api.get<HealthStatus>('/health/vector-db');
  } catch {
    return { status: 'error' };
  }
};
