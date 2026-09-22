const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface HealthStatus {
  status: string;
  app?: string;
  environment?: string;
  version?: string;
  database?: string;
  host?: string;
  port?: number;
  error?: string;
}

export async function fetchHealth(): Promise<HealthStatus> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    return await res.json();
  } catch (err: any) {
    return { status: 'unreachable', error: err.message || 'Backend unreachable' };
  }
}

export async function fetchDbHealth(): Promise<HealthStatus> {
  try {
    const res = await fetch(`${API_BASE_URL}/health/database`);
    return await res.json();
  } catch (err: any) {
    return { status: 'unreachable', error: err.message || 'MongoDB service unreachable' };
  }
}

export async function fetchVectorDbHealth(): Promise<HealthStatus> {
  try {
    const res = await fetch(`${API_BASE_URL}/health/vector-db`);
    return await res.json();
  } catch (err: any) {
    return { status: 'unreachable', error: err.message || 'ChromaDB service unreachable' };
  }
}
