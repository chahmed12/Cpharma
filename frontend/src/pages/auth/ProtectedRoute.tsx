// src/components/auth/ProtectedRoute.tsx

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { ReactNode } from 'react';

interface Props {
    children: ReactNode;
    role?: 'MEDECIN' | 'PHARMACIEN';
}

export function ProtectedRoute({ children, role }: Props) {
    const { user, isLoading } = useAuth(); // isLoading correspond à AuthContext

    // Pendant la lecture du localStorage au démarrage
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
            </div>
        );
    }

    // Pas connecté → login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Mauvais rôle → son propre dashboard
    if (role && user.role !== role) {
        return (
            <Navigate
                to={user.role === 'MEDECIN' ? '/doctor/dashboard' : '/pharmacist/dashboard'}
                replace
            />
        );
    }

    return <>{children}</>;
}