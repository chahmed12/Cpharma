import { useContext, useEffect, useRef } from 'react';
import { SocketContext } from '../context/SocketContext';

/**
 * Hook pour s'abonner à un événement WebSocket.
 * Usage : useSocketEvent('new_patient', (data) => setQueue(prev => [...prev, data]));
 * 
 * @param event - Nom de l'événement WebSocket
 * @param handler - Callback à exécuter quand l'événement est reçu
 * @returns Fonctions send et état isConnected
 */
export function useSocketEvent(
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
 * Alias pour compatibilité rétroactive.
 * @deprecated Utiliser useSocketEvent à la place
 */
export const useSocket = useSocketEvent;

/**
 * Hook pour accéder uniquement à l'état de connexion WebSocket.
 * Usage : const { isConnected } = useSocketConnection();
 */
export function useSocketConnection() {
    const { isConnected } = useContext(SocketContext);
    return { isConnected };
}