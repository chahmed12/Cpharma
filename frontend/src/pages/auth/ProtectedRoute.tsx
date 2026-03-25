// src/components/auth/ProtectedRoute.tsx

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { ReactNode } from 'react';

interface Props {
    children: ReactNode;
    role?: 'MEDECIN' | 'PHARMACIEN' | 'ADMIN';
}

const dashboards: Record<string, string> = {
    MEDECIN: '/doctor/dashboard',
    PHARMACIEN: '/pharmacist/dashboard',
    ADMIN: '/admin',
};

export function ProtectedRoute({ children, role }: Props) {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!user.is_verified && location.pathname !== '/pending') {
        return <Navigate to="/pending" replace />;
    }

    if (user.is_verified && location.pathname === '/pending') {
        return <Navigate to={dashboards[user.role] || '/login'} replace />;
    }

    if (role && user.role !== role) {
        return <Navigate to={dashboards[user.role] || '/login'} replace />;
    }

    return <>{children}</>;
}