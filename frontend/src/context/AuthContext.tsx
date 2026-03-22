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
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            try {
                // On vérifie la session avec l'API (qui lira le cookie)
                const userData = await getMe();
                setUser(userData);
            } catch {
                // Si le refresh échoue, on est silencieux, le useEffect de api.ts s'en chargera
                logout();
            } finally {
                setIsLoading(false);
            }
        };

        checkSession();
    }, []);

    const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
        const data = await loginUser({ email, password });
        // On ne stocke plus le token ! Juste les infos non-sensibles du profil
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
    }, []);

    const logout = useCallback(async () => {
        try {
            await logoutUser();
        } finally {
            localStorage.removeItem('user');
            setUser(null);
        }
    }, []);

    const value = useMemo(() => ({
        user, isLoading,
        isAuthenticated: !!user,
        login, logout
    }), [user, isLoading, login, logout]);

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
