import { createContext, useEffect, useRef, useState, useCallback, useMemo, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

type EventHandler = (data: any) => void;

interface SocketContextType {
    isConnected: boolean;
    send: (type: string, payload: any) => void;
    on: (event: string, handler: EventHandler) => void;
    off: (event: string, handler: EventHandler) => void;
}

export const SocketContext = createContext<SocketContextType>(null!);

export function SocketProvider({ children }: { children: ReactNode }) {
    const { token, isAuthenticated } = useAuth();
    const wsRef = useRef<WebSocket | null>(null);
    const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
    const [isConnected, setIsConnected] = useState(false);

    // Initialisation de la WebSocket
    useEffect(() => {
        if (!isAuthenticated || !token) {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            setIsConnected(false);
            return;
        }

        // On utilise l'URL absolue ou relative selon l'env
        let wsUrl = import.meta.env.VITE_WS_URL;
        if (!wsUrl) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host.includes('localhost') ? 'localhost:8000' : window.location.host;
            wsUrl = `${protocol}//${host}/ws`;
        }
        
        const ws = new WebSocket(`${wsUrl}/queue/?token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => setIsConnected(true);
        ws.onclose = () => setIsConnected(false);
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const handlers = handlersRef.current.get(data.type);
                handlers?.forEach(h => h(data.payload));
            } catch (e) {
                console.error("Erreur WS:", e);
            }
        };

        return () => {
            ws.close();
        };
    }, [isAuthenticated, token]);

    // Fonctions stables avec useCallback
    const send = useCallback((type: string, payload: any) => {
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
