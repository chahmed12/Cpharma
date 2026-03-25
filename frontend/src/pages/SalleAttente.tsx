import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { Spinner } from '../components/ui/Spinner';

export default function SalleAttente() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const consultationId = id ? Number(id) : null;
    const [dots, setDots] = useState('');

    // FIX : hasNavigated en ref booléenne — mis à true de façon synchrone
    // avant tout appel à navigate() pour empêcher toute double navigation,
    // même si le WebSocket et le polling se déclenchent dans le même tick JS.
    const hasNavigated = useRef(false);

    // Helper centralisé : un seul endroit qui appelle navigate()
    // FIX : vérification + marquage sont atomiques (pas d'await entre les deux)
    const navigateToVideo = (cId: number) => {
        if (hasNavigated.current) return; // déjà en cours de navigation
        hasNavigated.current = true;       // marqué AVANT navigate pour être sûr
        navigate(`/pharmacist/video/${cId}`);
    };

    // Animation des points d'attente
    useEffect(() => {
        const t = setInterval(() =>
            setDots(d => d.length >= 3 ? '' : d + '.'), 500);
        return () => clearInterval(t);
    }, []);

    // Écoute l'acceptation via WebSocket
    const { isConnected } = useSocket('consultation_accepted', (data) => {
        const payload = data as { consultation_id: number };
        if (payload.consultation_id === consultationId) {
            navigateToVideo(consultationId!);
        }
    });

    // Polling en fallback si le WebSocket est coupé
    useEffect(() => {
        if (!consultationId) return;

        const controller = new AbortController();

        const checkStatus = async () => {
            // FIX : vérification avant la requête async pour éviter
            // qu'un navigate déjà déclenché via WS ne soit doublé par le polling
            if (hasNavigated.current) return;

            try {
                const { getConsultation } = await import('../services/consultationService');
                const c = await getConsultation(consultationId, { signal: controller.signal });
                if (c.status === 'ACTIVE') {
                    navigateToVideo(consultationId);
                }
            } catch (err) {
                const error = err as { name?: string };
                if (error.name === 'CanceledError') return;
                console.error(err);
            }
        };

        // Vérification immédiate au montage
        checkStatus();

        // Polling uniquement si le WebSocket n'est pas connecté
        let interval: ReturnType<typeof setInterval> | undefined;
        if (!isConnected) {
            interval = setInterval(checkStatus, 3000);
        }

        return () => {
            if (interval) clearInterval(interval);
            controller.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [consultationId, isConnected]);
    // navigateToVideo volontairement exclu : c'est une fonction locale stable
    // qui capture hasNavigated.current par closure — l'inclure causerait
    // des re-runs inutiles du useEffect

    if (!consultationId) {
        return (
            <div style={{ padding: '32px', textAlign: 'center' }}>
                ID de consultation invalide
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '100vh', gap: '24px', textAlign: 'center',
        }}>
            <Spinner dark size="lg" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px' }}>
                En attente du médecin{dots}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Consultation #{consultationId} — Le médecin a été notifié et va rejoindre l'appel.
            </p>
            <button
                className="btn btn-secondary btn-sm"
                onClick={async () => {
                    hasNavigated.current = true; // bloquer tout navigate concurrent
                    try {
                        const { updateConsultationStatus } = await import('../services/consultationService');
                        await updateConsultationStatus(consultationId, 'CANCELLED');
                    } catch (err) {
                        console.error("Erreur d'annulation :", err);
                    }
                    navigate('/pharmacist/dashboard');
                }}
            >
                Annuler et retourner au tableau de bord
            </button>
        </div>
    );
}