import { createContext, useEffect, useRef, useState, useCallback, useMemo, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

type EventHandler = (data: unknown) => void;

interface SocketContextType {
    isConnected: boolean;
    send: (type: string, payload: unknown) => void;
    on: (event: string, handler: EventHandler) => void;
    off: (event: string, handler: EventHandler) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const SocketContext = createContext<SocketContextType>(null!);

export function SocketProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth();
    const wsRef = useRef<WebSocket | null>(null);
    const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
    const [isConnected, setIsConnected] = useState(false);

    // Initialisation de la WebSocket
    useEffect(() => {
        if (!isAuthenticated) {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            setIsConnected(false);
            return;
        }

        let isMounted = true;
        let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
        let attempt = 0;

        const connect = () => {
            // Bug B2 fix : ne jamais hardcoder le port backend
            let wsUrl = import.meta.env.VITE_WS_URL;
            if (!wsUrl) {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                wsUrl = `${protocol}//${window.location.host}/ws`;
                if (import.meta.env.DEV) {
                    console.warn('[WS] VITE_WS_URL non défini — utilisation du fallback:', wsUrl);
                }
            }
            
            // Note: Le token n'est plus envoyé dans l'URL (SOL-SEC-8 en cours)
            const ws = new WebSocket(`${wsUrl}/queue/`);
            wsRef.current = ws;

            ws.onopen = () => {
                if (!isMounted) return;
                setIsConnected(true);
                attempt = 0; // Réinitialiser le compteur à chaque connexion réussie
            };

            ws.onclose = () => {
                if (!isMounted) return;
                setIsConnected(false);
                
                // Backoff exponentiel
                if (attempt < 10) {
                    const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // 1s à 30s
                    attempt++;
                    reconnectTimeoutId = setTimeout(connect, delay);
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const handlers = handlersRef.current.get(data.type);
                    handlers?.forEach(h => h(data.payload));
                } catch (e) {
                    console.error("Erreur WS:", e);
                }
            };
        };

        connect();

        return () => {
            isMounted = false;
            if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
            if (wsRef.current) {
                wsRef.current.onclose = null; // Désactiver la reconnexion au démontage
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [isAuthenticated]);

    // Fonctions stables avec useCallback
    const send = useCallback((type: string, payload: unknown) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type, payload }));
        }
    }, []);

    const on = useCallback((event: string, handler: EventHandler) => {
        if (!handlersRef.current.has(event))
            handlersRef.current.set(event, new Set());
        handlersRef.current.get(event)!.add(handler);
    }, []);

    const off = useCallback((event: string, handler: EventHandler) => {
        handlersRef.current.get(event)?.delete(handler);
    }, []);

    // Valeur du contexte mémoïsée pour éviter de re-render toute l'app
    const value = useMemo(() => ({
        isConnected, send, on, off
    }), [isConnected, send, on, off]);

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
}
