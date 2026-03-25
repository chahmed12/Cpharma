import { useContext, useEffect, useRef } from 'react';
import { SocketContext } from '../context/SocketContext';

/**
 * Hook pour s'abonner à un événement WebSocket.
 * Usage : useSocket('new_patient', (data) => setQueue(prev => [...prev, data]));
 */
export function useSocket(
    event: string,
    handler: (data: unknown) => void
) {
    const { on, off, send, isConnected } = useContext(SocketContext);

    const handlerRef = useRef(handler);
    useEffect(() => {
        handlerRef.current = handler;
    }, [handler]);

    useEffect(() => {
        const stableHandler = (data: unknown) => handlerRef.current(data);
        on(event, stableHandler);
        return () => off(event, stableHandler);
    }, [event, on, off]);

    return { send, isConnected };
}

/**
 * Hook pour accéder uniquement à l'état de connexion WebSocket.
 * Usage : const { isConnected } = useSocketConnection();
 */
export function useSocketConnection() {
    const { isConnected } = useContext(SocketContext);
    return { isConnected };
}