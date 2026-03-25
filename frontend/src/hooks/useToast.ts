// ── src/hooks/useToast.ts ─────────────────────────────
import { useState, useCallback, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';
export interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
}

type ToastListener = (toast: ToastItem) => void;
const listeners = new Set<ToastListener>();
let toastIdCounter = 0;

export const triggerToast = (message: string, type: ToastType = 'info') => {
    const item = { id: ++toastIdCounter, message, type };
    listeners.forEach(l => l(item));
};

export function useToast() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    useEffect(() => {
        const handler = (item: ToastItem) => {
            setToasts(p => [...p, item]);
            setTimeout(() => {
                setToasts(p => p.filter(t => t.id !== item.id));
            }, 3500);
        };
        listeners.add(handler);
        return () => { listeners.delete(handler); };
    }, []);

    const toast = useCallback((message: string, type: ToastType = 'info') => {
        triggerToast(message, type);
    }, []);

    return { toasts, toast };
}
