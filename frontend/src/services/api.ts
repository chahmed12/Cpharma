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
                // Si le refresh échoue, on déconnecte l'utilisateur localement
                localStorage.removeItem('user');

                // On redirige vers login UNIQUEMENT si on n'y est pas déjà
                // pour éviter une boucle de rechargement infinie
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(err);
    }
);

export default api;
