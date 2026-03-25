import { createContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { loginUser, logoutUser, getMe } from '../services/authService';

export type Role = 'MEDECIN' | 'PHARMACIEN' | 'ADMIN';

export interface AuthUser {
    id: number;
    email: string;
    nom: string;
    prenom: string;
    role: Role;
    is_verified: boolean;
    photo_url?: string | null;
}

interface AuthContextType {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<AuthUser>;
    logout: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(() => {
        try {
            const stored = localStorage.getItem('user');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });
    const [isLoading, setIsLoading] = useState(true);

    // FIX : logout défini AVANT le useEffect pour pouvoir l'inclure
    // dans les dépendances sans risque de re-création infinie
    // (useCallback avec [] garantit une référence stable)
    const logout = useCallback(async () => {
        try {
            await logoutUser();
        } finally {
            localStorage.removeItem('user');
            setUser(null);
        }
    }, []); // référence stable — ne change jamais

    useEffect(() => {
        let cancelled = false; // évite les setState après démontage

        const checkSession = async () => {
            try {
                const userData = await getMe();
                if (!cancelled) {
                    const stored = localStorage.getItem('user');
                    if (stored) {
                        const storedUser = JSON.parse(stored);
                        if (storedUser.id !== userData.id || storedUser.role !== userData.role) {
                            localStorage.removeItem('user');
                        }
                    }
                    setUser(userData);
                }
            } catch {
                if (!cancelled) {
                    localStorage.removeItem('user');
                    document.cookie = 'access_token=; Max-Age=0; path=/';
                    document.cookie = 'refresh_token=; Max-Age=0; path=/';
                    setUser(null);
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        checkSession();

        return () => {
            cancelled = true;
        };
    }, []); // logout retiré des dépendances — le nettoyage est fait directement

    const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
        const data = await loginUser({ email, password });
        localStorage.removeItem('user');
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
    }, []);

    const value = useMemo(() => ({
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
    }), [user, isLoading, login, logout]);

    return (
        <AuthContext.Provider value={value}>
            {isLoading ? (
                <div style={{
                    height: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <div style={{
                        width: '30px', height: '30px',
                        border: '3px solid #eee',
                        borderTopColor: '#3b82f6',
                        borderRadius: '50%',
                        animation: 'spin .8s linear infinite',
                    }} />
                </div>
            ) : children}
        </AuthContext.Provider>
    );
}