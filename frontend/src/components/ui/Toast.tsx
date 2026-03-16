// ── src/components/ui/Toast.tsx ───────────────────────
import type { ToastItem } from '../../hooks/useToast';

const COLORS = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
};

export function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
    return (
        <div className="fixed top-4 right-4 flex flex-col gap-2 z-[9999]">
            {toasts.map(t => (
                <div
                    key={t.id}
                    className={`${COLORS[t.type]} text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium min-w-[240px] animate-in`}
                >
                    {t.message}
                </div>
            ))}
        </div>
    );
}

// Usage dans App.tsx :
// const { toasts, toast } = useToast();
// <ToastContainer toasts={toasts} />
// toast('Consultation créée !', 'success');
// toast('Erreur de connexion', 'error');