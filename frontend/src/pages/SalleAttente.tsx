import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

export default function SalleAttente() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const consultationId = id ? Number(id) : null;
    const [dots, setDots] = useState('');

    // Animation des points d'attente
    useEffect(() => {
        const t = setInterval(() =>
            setDots(d => d.length >= 3 ? '' : d + '.')
            , 500);
        return () => clearInterval(t);
    }, []);

    // Écoute l'acceptation via WebSocket
    useSocket('consultation_accepted', (data) => {
        const payload = data as { consultation_id: number };
        // On vérifie que c'est bien notre consultation qui est acceptée
        if (payload.consultation_id === consultationId) {
            navigate(`/pharmacist/video/${consultationId}`);
        }
    });

    if (!consultationId) {
        return <div className="p-8 text-center">ID de consultation invalide</div>;
    }

    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '100vh', gap: '24px', textAlign: 'center'
        }}>
            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px' }}>
                En attente du médecin{dots}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Consultation #{consultationId} — Le médecin a été notifié et va rejoindre l'appel.
            </p>
            <button 
                className="btn btn-secondary btn-sm"
                onClick={() => navigate('/pharmacist/dashboard')}
            >
                Annuler et retourner au tableau de bord
            </button>
        </div>
    );
}
