import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebRTCOptions {
    consultationId: number;
    isCaller: boolean;
}

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        ...(import.meta.env.VITE_TURN_URL ? [{
            urls: import.meta.env.VITE_TURN_URL,
            username: import.meta.env.VITE_TURN_USERNAME,
            credential: import.meta.env.VITE_TURN_CREDENTIAL,
        }] : []),
    ],
};

export function useWebRTC({ consultationId, isCaller }: UseWebRTCOptions) {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    // FIX : pingInterval exposé en ref pour pouvoir le stopper depuis hangUp
    const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCamOn, setIsCamOn] = useState(true);

    useEffect(() => {
        if (!consultationId) return;

        let isMounted = true;
        let localMediaReady = false;
        let peerConnected = false;
        let offerSent = false;

        let wsUrl = import.meta.env.VITE_WS_URL;
        if (!wsUrl) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            wsUrl = `${protocol}//${window.location.host}/ws`;
        }

        const ws = new WebSocket(`${wsUrl}/webrtc/${consultationId}/`);
        wsRef.current = ws;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        // ── Handlers média ───────────────────────────────────────────────────
        pc.ontrack = (event) => {
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
        };

        pc.onicecandidate = (event) => {
            if (event.candidate && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ice', data: event.candidate }));
            }
        };

        pc.onconnectionstatechange = () => setConnectionState(pc.connectionState);

        // ── Orchestration ────────────────────────────────────────────────────
        const maybeStartCall = async () => {
            if (isCaller && localMediaReady && peerConnected && !offerSent) {
                offerSent = true;
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    ws.send(JSON.stringify({ type: 'offer', data: offer }));
                } catch (e) {
                    console.error("Erreur lors de la création de l'offre:", e);
                }
            }
        };

        // FIX : on stocke l'intervalle dans la ref pour que hangUp puisse le stopper
        pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN && !offerSent && pc.signalingState === 'stable') {
                ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 1500);

        ws.onmessage = async (event) => {
            const { type, data } = JSON.parse(event.data);

            if (type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
                peerConnected = true;
                maybeStartCall();
            } else if (type === 'pong') {
                peerConnected = true;
                maybeStartCall();
            } else if (type === 'offer') {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(data));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    ws.send(JSON.stringify({ type: 'answer', data: answer }));
                } catch (e) {
                    console.error("Error handling offer:", e);
                }
            } else if (type === 'answer') {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(data));
                } catch (e) {
                    console.error("Error handling answer:", e);
                }
            } else if (type === 'ice') {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(data));
                } catch (e) {
                    console.error("Error adding ice candidate:", e);
                }
            } else if (type === 'hangup') {
                pc.close();
                setConnectionState('disconnected');
            }
        };

        // ── Initialisation média ──────────────────────────────────────────────
        const initMedia = async () => {
            try {
                let stream: MediaStream;
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                } catch (err) {
                    console.warn("Caméra indisponible, tentative audio unique...", err);
                    stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                    setIsCamOn(false);
                    setTimeout(() => alert("Appel en AUDIO uniquement (caméra bloquée par une autre application)."), 1000);
                }

                if (!isMounted) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                localStreamRef.current = stream;
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                stream.getTracks().forEach(track => pc.addTrack(track, stream));

                localMediaReady = true;
                maybeStartCall();
            } catch (criticalErr) {
                console.error("Erreur critique d'accès aux médias", criticalErr);
                setTimeout(() => alert("Impossible d'accéder au micro. Veuillez vérifier vos permissions."), 1000);
            }
        };

        initMedia();

        // ── Cleanup au démontage ──────────────────────────────────────────────
        return () => {
            isMounted = false;
            // FIX : on stoppe l'intervalle via la ref
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = null;
            }
            ws.close();
            pc.close();
            localStreamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, [consultationId, isCaller]);

    const toggleMic = useCallback(() => {
        localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
        setIsMicOn(prev => !prev);
    }, []);

    const toggleCam = useCallback(() => {
        localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
        setIsCamOn(prev => !prev);
    }, []);

    const hangUp = useCallback(() => {
        // FIX : stopper le pingInterval immédiatement lors du hangUp
        // sans attendre le démontage du composant
        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
        }

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'hangup', data: {} }));
        }

        pcRef.current?.close();

        // Timeout pour laisser le message 'hangup' partir avant de fermer le WS
        setTimeout(() => wsRef.current?.close(), 300);

        localStreamRef.current?.getTracks().forEach(t => t.stop());
    }, []);

    return {
        localVideoRef, remoteVideoRef, connectionState,
        isMicOn, isCamOn, toggleMic, toggleCam, hangUp,
    };
}