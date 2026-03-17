import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

interface UseWebRTCOptions {
    consultationId: number;
    isCaller: boolean;
}

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

export function useWebRTC({ consultationId, isCaller }: UseWebRTCOptions) {
    const { token } = useAuth();
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    
    const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCamOn, setIsCamOn] = useState(true);

    useEffect(() => {
        if (!token || !consultationId) return;

        const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
        const ws = new WebSocket(`${WS_BASE}/webrtc/${consultationId}/?token=${token}`);
        wsRef.current = ws;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        // 1. Médias
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            stream.getTracks().forEach(track => pc.addTrack(track, stream));
        });

        pc.ontrack = (event) => {
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                ws.send(JSON.stringify({ type: 'ice', data: event.candidate }));
            }
        };

        pc.onconnectionstatechange = () => setConnectionState(pc.connectionState);

        ws.onmessage = async (event) => {
            const { type, data } = JSON.parse(event.data);
            if (type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                ws.send(JSON.stringify({ type: 'answer', data: answer }));
            } else if (type === 'answer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data));
            } else if (type === 'ice') {
                await pc.addIceCandidate(new RTCIceCandidate(data));
            } else if (type === 'hangup') {
                pc.close();
                setConnectionState('disconnected');
            }
        };

        ws.onopen = async () => {
            if (isCaller) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                ws.send(JSON.stringify({ type: 'offer', data: offer }));
            }
        };

        return () => {
            ws.close();
            pc.close();
            localStreamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, [consultationId, isCaller, token]);

    const toggleMic = useCallback(() => {
        localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = !t.enabled);
        setIsMicOn(prev => !prev);
    }, []);

    const toggleCam = useCallback(() => {
        localStreamRef.current?.getVideoTracks().forEach(t => t.enabled = !t.enabled);
        setIsCamOn(prev => !prev);
    }, []);

    const hangUp = useCallback(() => {
        wsRef.current?.send(JSON.stringify({ type: 'hangup', data: {} }));
        pcRef.current?.close();
        wsRef.current?.close();
        localStreamRef.current?.getTracks().forEach(t => t.stop());
    }, []);

    return { 
        localVideoRef, remoteVideoRef, connectionState, 
        isMicOn, isCamOn, toggleMic, toggleCam, hangUp 
    };
}
