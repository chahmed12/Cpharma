// ── src/hooks/useToast.ts ─────────────────────────────
import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info';
export interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
}

export function useToast() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const toast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now();
        setToasts(p => [...p, { id, message, type }]);
        setTimeout(() =>
            setToasts(p => p.filter(t => t.id !== id))
            , 3500);
    }, []);

    return { toasts, toast };
}
