import api from './api';
import type { AuthUser, Role } from '../context/AuthContext';

// ─── Types ────────────────────────────────────────────
interface LoginResponse {
    user: AuthUser;
}

interface RegisterPayload {
    email: string;
    password: string;
    nom: string;
    prenom: string;
    role: Role;
    numero_ordre?: string;  // requis si role === 'MEDECIN'
    nom_pharmacie?: string; // requis si role === 'PHARMACIEN'
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

// ─── Logout ─────────────────────────────────────────────
export async function logoutUser(): Promise<void> {
    await api.post('/auth/logout/');
}

// ─── Get Me (Vérifier session) ──────────────────────────
export async function getMe(): Promise<AuthUser> {
    const { data } = await api.get<AuthUser>('/auth/me/');
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
export async function refreshAccessToken(): Promise<void> {
    // Le refresh token est dans un cookie HttpOnly, pas besoin de l'envoyer manuellement
    await api.post('/auth/token/refresh/', {});
}