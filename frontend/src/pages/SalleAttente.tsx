import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

export default function SalleAttente() {
    const navigate = useNavigate();
    const location = useLocation();
    const [dots, setDots] = useState('');

    // 1. On autorise undefined pour éviter les erreurs TypeScript
    const consultationId: number | undefined = location.state?.consultationId;

    // Redirection de sécurité si l'utilisateur rafraîchit la page 
    // (car location.state sera perdu)
    useEffect(() => {
        if (!consultationId) {
            navigate('/pharmacist/dashboard'); // Redirige où tu veux
        }
    }, [consultationId, navigate]);

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
        if (payload.consultation_id === consultationId) {
            navigate(`/pharmacist/video/${consultationId}`);
        }
    });

    // Si pas d'ID, on ne rend rien (le temps que le useEffect redirige)
    if (!consultationId) return null;

    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '100vh', gap: '24px'
        }}>
            <h2>En attente du médecin{dots}</h2>
            <p style={{ opacity: 0.5 }}>
                {/* 2. Simple accolade ici ! */}
                Consultation #{consultationId} — Le médecin va accepter votre demande
            </p>
        </div>
    );
}