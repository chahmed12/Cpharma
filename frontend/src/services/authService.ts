import api from './api';
import type { AuthUser, Role } from '../context/AuthContext';

// ─── Types ────────────────────────────────────────────
interface LoginResponse {
    access: string;
    refresh: string;
    user: AuthUser;
}

interface RegisterPayload {
    email: string;
    password: string;
    nom: string;
    prenom: string;
    role: Role;
    numero_ordre?: string;  // requis si role === 'MEDECIN'
}

// ─── Login ─────────────────────────────────────────────
export async function loginUser(
    credentials: { email: string; password: string }
): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>(
        '/auth/login/', credentials
    );
    return data;
}

// ─── Register ──────────────────────────────────────────
export async function registerUser(
    payload: RegisterPayload
): Promise<{ message: string }> {
    const { data } = await api.post('/auth/register/', payload);
    return data;
}

// ─── Refresh Token ─────────────────────────────────────
export async function refreshAccessToken(): Promise<string> {
    const refresh = localStorage.getItem('refresh_token');
    const { data } = await api.post<{ access: string }>(
        '/auth/token/refresh/', { refresh }
    );
    localStorage.setItem('access_token', data.access);
    return data.access;
}