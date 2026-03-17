import { useParams, useNavigate } from 'react-router-dom';
import { useWebRTC } from '../hooks/useWebRTC';
import { useAuth } from '../hooks/useAuth';
import { VideoControls } from '../components/video/VideoControls';
import { ConnectionStatus } from '../components/video/ConnectionStatus';
import { updateConsultationStatus } from '../services/consultationService';

export default function VideoCall() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();

    const consultationId = Number(id);
    const isCaller = user?.role === 'PHARMACIEN';

    const {
        localVideoRef, remoteVideoRef,
        connectionState,
        isMicOn, isCamOn,
        toggleMic, toggleCam, hangUp,
    } = useWebRTC({ consultationId, isCaller });

    const handleHangUp = async () => {
        try {
            hangUp();
            // On tente de mettre à jour le statut mais on n'attend pas forcément
            // pour naviguer si c'est critique
            await updateConsultationStatus(consultationId, 'COMPLETED');
        } catch (e) {
            console.error("Erreur lors de la clôture:", e);
        } finally {
            const dest = isCaller
                ? `/pharmacist/dashboard` // Retour au dashboard ou page de vérification
                : `/doctor/prescription/${consultationId}`;
            navigate(dest);
        }
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateRows: '1fr auto',
            height: '100vh',
            background: '#0a0a0a',
        }}>
            <div style={{ position: 'relative', overflow: 'hidden' }}>
                <video
                    ref={remoteVideoRef}
                    autoPlay playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#111' }}
                />
                <video
                    ref={localVideoRef}
                    autoPlay playsInline muted
                    style={{
                        position: 'absolute', bottom: '16px', right: '16px',
                        width: '180px', borderRadius: '12px',
                        border: '2px solid rgba(255,255,255,.2)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                    }}
                />
                <div style={{ position: 'absolute', top: '16px', left: '16px' }}>
                    <ConnectionStatus state={connectionState} />
                </div>
            </div>

            <VideoControls
                isMicOn={isMicOn}
                isCamOn={isCamOn}
                onToggleMic={toggleMic}
                onToggleCam={toggleCam}
                onHangUp={handleHangUp}
            />
        </div>
    );
}
