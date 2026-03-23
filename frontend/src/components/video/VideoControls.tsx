import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';

interface VideoControlsProps {
    isMicOn: boolean;
    isCamOn: boolean;
    onToggleMic: () => void;
    onToggleCam: () => void;
    onHangUp: () => void;
}

const btnBase: React.CSSProperties = {
    width: '56px', height: '56px',
    borderRadius: '50%', border: 'none',
    cursor: 'pointer', fontSize: '22px',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity .15s',
};

export function VideoControls({
    isMicOn, isCamOn, onToggleMic, onToggleCam, onHangUp
}: VideoControlsProps) {
    return (
        <div style={{
            display: 'flex', justifyContent: 'center',
            gap: '16px', padding: '20px',
            background: 'rgba(0,0,0,.7)',
        }}>

            {/* Micro */}
            <button
                onClick={onToggleMic}
                title={isMicOn ? 'Couper micro' : 'Activer micro'}
                style={{
                    ...btnBase,
                    background: isMicOn ? '#374151' : '#ef4444',
                }}
            >
                {isMicOn ? <Mic size={24} color="white" /> : <MicOff size={24} color="white" />}
            </button>

            {/* Caméra */}
            <button
                onClick={onToggleCam}
                title={isCamOn ? 'Couper caméra' : 'Activer caméra'}
                style={{
                    ...btnBase,
                    background: isCamOn ? '#374151' : '#ef4444',
                }}
            >
                {isCamOn ? <Video size={24} color="white" /> : <VideoOff size={24} color="white" />}
            </button>

            {/* Raccrocher */}
            <button
                onClick={onHangUp}
                title="Raccrocher"
                style={{ ...btnBase, background: '#dc2626', width: '68px' }}
            >
                <PhoneOff size={28} color="white" />
            </button>

        </div>
    );
}