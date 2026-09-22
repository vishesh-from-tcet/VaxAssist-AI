import { api } from './api';

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<TokenResponse> {
    return api.post<TokenResponse>('/api/v1/auth/register', payload);
  },

  async login(payload: LoginPayload): Promise<TokenResponse> {
    return api.post<TokenResponse>('/api/v1/auth/login', payload);
  },

  async logout(): Promise<{ message: string }> {
    try {
      return await api.post<{ message: string }>('/api/v1/auth/logout');
    } catch {
      return { message: 'Logged out' };
    }
  },

  async getMe(): Promise<UserResponse> {
    return api.get<UserResponse>('/api/v1/auth/me');
  },
};
