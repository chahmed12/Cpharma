import { createContext, useState, useEffect, type ReactNode } from 'react';
import { loginUser, refreshAccessToken } from '../services/authService';

// ─── Types ────────────────────────────────────────────
export type Role = 'MEDECIN' | 'PHARMACIEN';

export interface AuthUser {
    id: number;
    email: string;
    nom: string;
    prenom: string;
    role: Role;
}

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<AuthUser>;
    logout: () => void;
}

// ─── Création du contexte ──────────────────────────────
export const AuthContext = createContext<AuthContextType>(null!);

// ─── Provider ─────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Rechargement session depuis localStorage au montage
    useEffect(() => {
        const storedToken = localStorage.getItem('access_token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Erreur de lecture du localStorage", e);
            }
        }
        setIsLoading(false);
    }, []);

    // ── login ────────────────────────────────────────────
    // AuthContext.tsx — modifier la fonction login

    const login = async (email: string, password: string): Promise<AuthUser> => {
        const data = await loginUser({ email, password });
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.access);
        setUser(data.user);
        return data.user; // ← retourner l'user
    };

    // ── logout ───────────────────────────────────────────
    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user, token, isLoading,
            isAuthenticated: !!token,
            login, logout
        }}>
            {isLoading ? <div>Chargement de la session...</div> : children}
        </AuthContext.Provider>
    );
}