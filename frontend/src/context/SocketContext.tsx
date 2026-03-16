import { createContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

// ─── Types ────────────────────────────────────────────
type EventHandler = (data: unknown) => void;

interface SocketContextType {
    isConnected: boolean;
    send: (type: string, payload: unknown) => void;
    on: (event: string, handler: EventHandler) => void;
    off: (event: string, handler: EventHandler) => void;
}

export const SocketContext = createContext<SocketContextType>(null!);

// ─── Provider ─────────────────────────────────────────
export function SocketProvider({ children }: { children: ReactNode }) {
    const { token, isAuthenticated } = useAuth();
    const wsRef = useRef<WebSocket | null>(null);
    const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!isAuthenticated || !token) return;

        const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/ws';
        const ws = new WebSocket(`${WS_URL}/queue/?token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => setIsConnected(true);
        ws.onclose = () => setIsConnected(false);

        // Dispatch des messages entrants vers les handlers enregistrés
        ws.onmessage = (event) => {
            const { type, payload } = JSON.parse(event.data);
            const handlers = handlersRef.current.get(type);
            handlers?.forEach(h => h(payload));
        };

        return () => ws.close();
    }, [isAuthenticated, token]);

    // ── send : émet un message JSON ──────────────────────
    const send = (type: string, payload: unknown) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type, payload }));
        }
    };

    // ── on/off : abonnement aux événements ───────────────
    const on = (event: string, handler: EventHandler) => {
        if (!handlersRef.current.has(event))
            handlersRef.current.set(event, new Set());
        handlersRef.current.get(event)!.add(handler);
    };

    const off = (event: string, handler: EventHandler) => {
        handlersRef.current.get(event)?.delete(handler);
    };

    return (
        <SocketContext.Provider value={{ isConnected, send, on, off }}>
            {children}
        </SocketContext.Provider>
    );
}