import { downloadRecu, type Payment } from '../../services/paymentService';

const STATUS_CONFIG = {
    PENDING: { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
    PAID: { label: 'Payé', cls: 'bg-green-100 text-green-700' },
    FAILED: { label: 'Échoué', cls: 'bg-red-100 text-red-700' },
};

export function PaymentCard({ payment }: { payment: Payment }) {
    const { label, cls } = STATUS_CONFIG[payment.status];
    const date = new Date(payment.created_at).toLocaleDateString('fr-FR');

    return (
        <div className="flex items-center justify-between p-4 bg-white border rounded-xl shadow-sm">
            <div>
                <p className="font-semibold">{payment.patient_nom}</p>
                <p className="text-sm text-gray-400">
                    Consult. #{payment.consultation_id} — {date}
                </p>
            </div>
            <div className="flex items-center gap-4">
                <span className="font-bold text-lg">
                    {payment.honoraires_medecin} DA
                </span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cls}`}>
                    {label}
                </span>
                {payment.status === 'PAID' && (
                    <button
                        onClick={() => downloadRecu(payment.id)}
                        className="text-blue-500 text-xs hover:underline"
                    >
                        ↓ Reçu
                    </button>
                )}
            </div>
        </div>
    );
}