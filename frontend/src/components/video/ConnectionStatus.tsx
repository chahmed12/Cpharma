interface Props { state: RTCPeerConnectionState }

const STATE_CONFIG: Record<RTCPeerConnectionState, { label: string; color: string }> = {
    new: { label: 'Initialisation', color: '#64748b' },
    connecting: { label: 'Connexion...', color: '#f59e0b' },
    connected: { label: 'Connecté', color: '#22c55e' },
    disconnected: { label: 'Déconnecté', color: '#ef4444' },
    failed: { label: 'Échec connexion', color: '#ef4444' },
    closed: { label: 'Appel terminé', color: '#64748b' },
};

export function ConnectionStatus({ state }: Props) {
    const { label, color } = STATE_CONFIG[state] ?? STATE_CONFIG.new;
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(0,0,0,.6)',
            padding: '6px 12px', borderRadius: '20px',
        }}>
            <div style={{
                width: '8px', height: '8px',
                borderRadius: '50%', background: color,
            }} />
            <span style={{ color: 'white', fontSize: '12px' }}>
                {label}
            </span>
        </div>
    );
}