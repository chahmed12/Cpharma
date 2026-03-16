import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
    if (!open) return null;

    return createPortal(
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
                onClick={e => e.stopPropagation()}
            >
                {title && (
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold">{title}</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                        >×</button>
                    </div>
                )}
                {children}
            </div>
        </div>,
        document.body
    );
}