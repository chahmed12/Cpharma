import { useParams, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { useAuth } from '../hooks/useAuth';
import { VideoControls } from '../components/video/VideoControls';
import { ConnectionStatus } from '../components/video/ConnectionStatus';
import { updateConsultationStatus, getConsultation } from '../services/consultationService';
import { X, Send } from 'lucide-react';

interface ChatMessage {
    sender_id: number;
    sender_name: string;
    content: string;
    timestamp: string;
}

export default function VideoCall() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();

    const consultationId = Number(id);
    const isCaller = user?.role === 'PHARMACIEN';
    const [showChat, setShowChat] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const controller = new AbortController();
        (async () => {
            try {
                const c = await getConsultation(consultationId, { signal: controller.signal });
                if (c.status === 'COMPLETED' || c.status === 'CANCELLED') {
                    if (isCaller) {
                        navigate('/pharmacist/dashboard', { replace: true });
                    } else {
                        navigate('/doctor/dashboard', { replace: true });
                    }
                }
            } catch {
                // ignore
            }
        })();
        return () => controller.abort();
    }, [consultationId, isCaller, navigate]);

    const handleChatMessage = (msg: ChatMessage) => {
        setMessages(prev => [...prev, msg]);
    };

    const {
        localVideoRef, remoteVideoRef,
        connectionState,
        isMicOn, isCamOn,
        toggleMic, toggleCam, hangUp, sendChatMessage,
    } = useWebRTC({ consultationId, isCaller, onChatMessage: handleChatMessage });

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendChat = () => {
        if (!chatInput.trim()) return;
        sendChatMessage(chatInput);
        setMessages(prev => [...prev, {
            sender_id: user?.id || 0,
            sender_name: `${user?.prenom} ${user?.nom}`,
            content: chatInput,
            timestamp: new Date().toISOString(),
        }]);
        setChatInput('');
    };

    const handleHangUp = async () => {
        try {
            hangUp();
            if (!isCaller) {
                await updateConsultationStatus(consultationId, 'COMPLETED');
            }
        } catch (e) {
            console.error("Erreur lors de la clôture:", e);
        } finally {
            if (isCaller) {
                navigate(`/pharmacist/waiting-prescription/${consultationId}`);
            } else {
                try {
                    const c = await getConsultation(consultationId);
                    if (c.status === 'CANCELLED') {
                        navigate('/doctor/dashboard');
                        return;
                    }
                } catch {
                    navigate('/doctor/dashboard');
                    return;
                }
                navigate(`/doctor/prescription/${consultationId}`);
            }
        }
    };

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            background: '#0a0a0a',
        }}>
            <div style={{
                flex: 1,
                display: 'grid',
                gridTemplateRows: '1fr auto',
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
                    onToggleChat={() => setShowChat(!showChat)}
                    showChat={showChat}
                />
            </div>

            {showChat && (
                <div style={{
                    width: '320px',
                    background: '#1a1a1a',
                    borderLeft: '1px solid #333',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <div style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #333',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <span style={{ color: '#fff', fontWeight: '600' }}>Messages</span>
                        <button onClick={() => setShowChat(false)} style={{
                            background: 'none', border: 'none', cursor: 'pointer', color: '#999',
                        }}>
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{
                        flex: 1,
                        overflow: 'auto',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                    }}>
                        {messages.length === 0 && (
                            <p style={{ color: '#666', textAlign: 'center', marginTop: '20px' }}>
                                Aucun message encore
                            </p>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                background: msg.sender_id === user?.id ? '#2563eb' : '#333',
                                color: '#fff',
                                alignSelf: msg.sender_id === user?.id ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                            }}>
                                {msg.sender_id !== user?.id && (
                                    <p style={{ fontSize: '11px', color: '#aaa', marginBottom: '2px' }}>
                                        {msg.sender_name}
                                    </p>
                                )}
                                <p style={{ fontSize: '14px' }}>{msg.content}</p>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    <div style={{
                        padding: '12px',
                        borderTop: '1px solid #333',
                        display: 'flex',
                        gap: '8px',
                    }}>
                        <input
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                            placeholder="Message..."
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                borderRadius: '20px',
                                border: '1px solid #444',
                                background: '#222',
                                color: '#fff',
                                outline: 'none',
                            }}
                        />
                        <button onClick={handleSendChat} style={{
                            background: '#2563eb', border: 'none', borderRadius: '50%',
                            width: '40px', height: '40px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Send size={18} color="#fff" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
