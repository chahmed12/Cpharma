import { useContext, useEffect, useRef } from 'react';
import { SocketContext } from '../context/SocketContext';

/**
 * S'abonne à un événement WebSocket pendant la durée de vie du composant.
 * Usage : useSocket('new_patient', (data) => setQueue(prev => [...prev, data]));
 */
export function useSocket(
    event: string,
    handler: (data: unknown) => void
) {
    const { on, off, send, isConnected } = useContext(SocketContext);

    // Garde toujours la dernière version du handler sans re-subscribe
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