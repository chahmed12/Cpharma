import axios from 'axios';

// ─── Instance principale ──────────────────────────────
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
});

// ─── Intercepteur REQUÊTE : injecte le JWT ─────────────
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ─── Intercepteur RÉPONSE : refresh automatique ────────
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;

        // Token expiré → tentative de refresh
        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;
            try {
                const refresh = localStorage.getItem('refresh_token');
                const { data } = await axios.post(
                    `${import.meta.env.VITE_API_URL}/auth/token/refresh/`,
                    { refresh }
                );
                localStorage.setItem('access_token', data.access);
                original.headers.Authorization = `Bearer ${data.access}`;
                return api(original);  // relance la requête initiale
            } catch {
                // Refresh échoué → déconnexion forcée
                localStorage.clear();
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;