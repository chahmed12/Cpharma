import { type Payment } from '../../services/paymentService';

const STATUS_CONFIG: Record<Payment['status'], { label: string; color: string; bg: string }> = {
    PENDING: { label: 'En attente', color: 'var(--amber-700, #b45309)', bg: 'var(--amber-50, #fffbeb)' },
    PAID:    { label: 'Payé',       color: 'var(--green-700)',            bg: 'var(--green-50)' },
    FAILED:  { label: 'Échoué',    color: 'var(--red-700, #b91c1c)',     bg: 'var(--red-50, #fef2f2)' },
};

export function PaymentCard({ payment }: { payment: Payment }) {
    const cfg  = STATUS_CONFIG[payment.status];
    const date = new Date(payment.created_at).toLocaleDateString('fr-FR');

    return (
        <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
        }}>
            <div>
                <p style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>
                    {payment.patient_nom}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Consultation #{payment.consultation_id} — {date}
                </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontWeight: '700', fontSize: '16px' }}>
                    {payment.honoraires_medecin} DNT
                </span>
                <span style={{
                    fontSize: '11px', fontWeight: '700',
                    padding: '3px 10px', borderRadius: '20px',
                    color: cfg.color, background: cfg.bg,
                }}>
                    {cfg.label}
                </span>
                {/* Bug P3 fix (suite) : downloadRecu supprimé (endpoint 404).
                    Le reçu est généré côté client dans ConfirmationFin.tsx via @react-pdf/renderer. */}
            </div>
        </div>
    );
}