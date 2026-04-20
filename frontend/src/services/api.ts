import axios from 'axios';

const getBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    return '/api';
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true, // IMPORTANT: Envoie les cookies HttpOnly
});

// Les interceptors ne manipulent plus le localStorage pour les tokens
api.interceptors.response.use(
    (res) => res,
    async (err) => {
        const original = err.config;
        if (err.response?.status === 401 && !original._retry) {
            original._retry = true;
            try {
                // Le refresh token est aussi dans un cookie HttpOnly, 
                // l'appel au refresh se fait donc tout seul avec withCredentials
                await axios.post(`${getBaseUrl()}/auth/token/refresh/`, {}, { withCredentials: true });
                return api(original);
            } catch (refreshError) {
                // Les cookies HttpOnly ne peuvent PAS être supprimés par JS.
                // Le backend les supprime via POST /auth/logout/ (appelé depuis AuthContext).
                localStorage.removeItem('user');

                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(err);
    }
);

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export default api;
