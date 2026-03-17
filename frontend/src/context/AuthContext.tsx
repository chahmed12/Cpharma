import { createContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { loginUser } from '../services/authService';

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

export const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem('access_token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Session corrompue", e);
                localStorage.clear();
            }
        }
        setIsLoading(false);
    }, []);

    const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
        const data = await loginUser({ email, password });
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.access);
        setUser(data.user);
        return data.user;
    }, []);

    const logout = useCallback(() => {
        localStorage.clear();
        setToken(null);
        setUser(null);
    }, []);

    const value = useMemo(() => ({
        user, token, isLoading,
        isAuthenticated: !!token,
        login, logout
    }), [user, token, isLoading, login, logout]);

    return (
        <AuthContext.Provider value={value}>
            {/* On ne bloque le rendu QUE si on est en train de vérifier la session au tout début */}
            {isLoading ? (
                <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '30px', height: '30px', border: '3px solid #eee', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                </div>
            ) : children}
        </AuthContext.Provider>
    );
}
