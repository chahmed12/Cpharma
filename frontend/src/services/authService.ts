import api from './api';
import type { AuthUser } from '../context/AuthContext';

// ─── Types ────────────────────────────────────────────
interface LoginResponse {
    user: AuthUser;
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
    payload: FormData
): Promise<{ message: string }> {
    const { data } = await api.post('/auth/register/', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
}

// ─── Refresh Token ─────────────────────────────────────
export async function refreshAccessToken(): Promise<void> {
    // Le refresh token est dans un cookie HttpOnly, pas besoin de l'envoyer manuellement
    await api.post('/auth/token/refresh/', {});
}

// ─── OTP Registration ──────────────────────────────────
export async function sendRegisterOtp(email: string, nom: string): Promise<{ message: string }> {
    const { data } = await api.post('/auth/send-register-otp/', { email, nom });
    return data;
}

export async function verifyRegisterOtp(email: string, otp_code: string): Promise<{ message: string }> {
    const { data } = await api.post('/auth/verify-register-otp/', { email, otp_code });
    return data;
}

// ─── Password Reset (OTP) ──────────────────────────────
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
    const { data } = await api.post('/auth/password/reset/request/', { email });
    return data;
}

export async function verifyPasswordReset(email: string, otp_code: string): Promise<{ message: string }> {
    const { data } = await api.post('/auth/password/reset/verify/', { email, otp_code });
    return data;
}

export async function confirmPasswordReset(email: string, new_password: string): Promise<{ message: string }> {
    const { data } = await api.post('/auth/password/reset/confirm/', { email, new_password });
    return data;
}

// ─── Doctor Profile ────────────────────────────────────
export interface DoctorProfile {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    specialite: string;
    numero_ordre: string;
    tarif_consultation: string;
    status: string;
    photo: string | null;
}

export async function getDoctorProfile(): Promise<DoctorProfile> {
    const { data } = await api.get<DoctorProfile>('/doctors/profile/');
    return data;
}

export async function updateDoctorProfile(payload: FormData | Partial<DoctorProfile>): Promise<DoctorProfile> {
    const isFormData = payload instanceof FormData;
    const { data } = await api.patch<DoctorProfile>('/doctors/profile/', payload, {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return data;
}