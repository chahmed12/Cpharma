import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

/**
 * Page affichée côté Pharmacien après avoir raccroché,
 * en attendant que le médecin signe et envoie l'ordonnance.
 * Écoute l'événement WebSocket "prescription_ready" et redirige automatiquement.
 */
export default function WaitingPrescription() {
    const navigate  = useNavigate();
    useParams<{ id: string }>();  // id présent dans la route mais non utilisé directement

    // Bug B5 fix : l'effet getConsultation était du code mort (aucune action réelle).
    // La redirection se fait exclusivement via le WebSocket 'prescription_ready'.

    // Écoute temps-réel — le médecin vient de signer
    useSocket('prescription_ready', (data: unknown) => {
        const payload = data as { hash?: string };
        if (payload.hash) {
            navigate(`/pharmacist/verify/${payload.hash}`);
        }
    });

    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '100vh', gap: '28px', textAlign: 'center',
            background: 'var(--bg-subtle)',
            padding: '32px',
        }}>
            {/* Icône animée */}
            <div style={{
                width: '72px', height: '72px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--blue-600), #6366f1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '32px',
                boxShadow: '0 0 0 12px rgba(99,102,241,.12)',
                animation: 'pulse 2s infinite ease-in-out',
            }}>
                📋
            </div>

            <div>
                <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '22px', fontWeight: '700',
                    marginBottom: '8px',
                }}>
                    En attente de l'ordonnance
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '340px' }}>
                    La consultation est terminée. Le médecin va maintenant rédiger et signer l'ordonnance.
                    Vous serez automatiquement redirigé·e dès qu'elle sera prête.
                </p>
            </div>

            {/* Indicateur de chargement */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                {[0, 1, 2].map(i => (
                    <div key={i} style={{
                        width: '8px', height: '8px',
                        borderRadius: '50%',
                        background: 'var(--blue-600)',
                        animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
                    }} />
                ))}
            </div>

            <button
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '16px' }}
                onClick={() => navigate('/pharmacist/dashboard')}
            >
                Retour au tableau de bord
            </button>

            <style>{`
                @keyframes bounce {
                    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
                    40% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
