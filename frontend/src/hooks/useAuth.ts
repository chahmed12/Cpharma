import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Hook raccourci pour accéder au contexte d'authentification.
 * Utilisation : const { user, login, logout } = useAuth();
 */
export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            'useAuth() doit être utilisé à l\'intérieur d\'un AuthProvider'
        );
    }

    return context;
}