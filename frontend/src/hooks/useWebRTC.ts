import { useEffect, useRef, useState, useCallback, useContext } from 'react';
import { SocketContext } from '../context/SocketContext';

interface UseWebRTCOptions {
    consultationId: number;
    isCaller: boolean;  // true = pharmacien, false = médecin
}

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

export function useWebRTC({ consultationId, isCaller }: UseWebRTCOptions) {
    const { send, on, off } = useContext(SocketContext);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
    const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCamOn, setIsCamOn] = useState(true);

    // ── Helpers signaling ────────────────────────────────
    const sendSignal = useCallback(
        (type: string, data: unknown) =>
            send('webrtc_signal', { consultation_id: consultationId, type, data }),
        [send, consultationId]
    );

    // ── Initialisation principale ────────────────────────
    useEffect(() => {
        let cancelled = false;

        async function init() {
            // 1. Capture caméra + micro
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true, audio: true
            });
            if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

            localStreamRef.current = stream;
            if (localVideoRef.current)
                localVideoRef.current.srcObject = stream;

            // 2. Créer RTCPeerConnection
            const pc = new RTCPeerConnection(ICE_SERVERS);
            pcRef.current = pc;

            // Ajouter les pistes locales au peer
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            // Réception du flux distant
            pc.ontrack = ({ streams }) => {
                if (remoteVideoRef.current)
                    remoteVideoRef.current.srcObject = streams[0];
            };

            // Envoi des candidats ICE au pair via WebSocket
            pc.onicecandidate = ({ candidate }) => {
                if (candidate) sendSignal('ice', candidate.toJSON());
            };

            pc.onconnectionstatechange = () =>
                setConnectionState(pc.connectionState);

            // 3. Si caller (pharmacien) → créer l'Offer
            if (isCaller) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                sendSignal('offer', offer);
            }
        }

        init().catch(console.error);

        // ── Handlers signaling entrant ───────────────────────
        const handleSignal = async (raw: unknown) => {
            const { type, data } = raw as { type: string; data: unknown };
            const pc = pcRef.current;
            if (!pc) return;

            if (type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(
                    data as RTCSessionDescriptionInit
                ));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                sendSignal('answer', answer);
                // Vider la file des ICE en attente
                for (const c of iceCandidateQueue.current)
                    await pc.addIceCandidate(new RTCIceCandidate(c));
                iceCandidateQueue.current = [];
            }

            if (type === 'answer') {
                await pc.setRemoteDescription(new RTCSessionDescription(
                    data as RTCSessionDescriptionInit
                ));
            }

            if (type === 'ice') {
                const candidate = data as RTCIceCandidateInit;
                if (pc.remoteDescription)
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                else
                    iceCandidateQueue.current.push(candidate);
            }
        };

        on('webrtc_signal', handleSignal);

        return () => {
            cancelled = true;
            off('webrtc_signal', handleSignal);
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            pcRef.current?.close();
        };
    }, [consultationId, isCaller, sendSignal, on, off]);

    // ── Contrôles micro / caméra ─────────────────────────
    const toggleMic = useCallback(() => {
        localStreamRef.current?.getAudioTracks().forEach(t => {
            t.enabled = !t.enabled;
        });
        setIsMicOn(v => !v);
    }, []);

    const toggleCam = useCallback(() => {
        localStreamRef.current?.getVideoTracks().forEach(t => {
            t.enabled = !t.enabled;
        });
        setIsCamOn(v => !v);
    }, []);

    const hangUp = useCallback(() => {
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        pcRef.current?.close();
        sendSignal('hangup', {});
    }, [sendSignal]);

    return {
        localVideoRef, remoteVideoRef,
        connectionState,
        isMicOn, isCamOn,
        toggleMic, toggleCam, hangUp,
    };
}