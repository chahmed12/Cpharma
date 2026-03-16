interface Props {
    size?: 'sm' | 'md' | 'lg';
    dark?: boolean;  // true = spinner bleu sur fond blanc
    label?: string;
    center?: boolean;  // true = centré dans un div plein écran
}

const SIZES = {
    sm: { width: '16px', height: '16px', border: '2px' },
    md: { width: '28px', height: '28px', border: '3px' },
    lg: { width: '44px', height: '44px', border: '4px' },
};

export function Spinner({ size = 'md', dark = false, label, center = false }: Props) {
    const s = SIZES[size];

    const spinEl = (
        <div style={{
            width: s.width,
            height: s.height,
            border: `${s.border} solid ${dark ? 'var(--blue-200)' : 'rgba(255,255,255,.3)'}`,
            borderTopColor: dark ? 'var(--blue-600)' : '#fff',
            borderRadius: '50%',
            animation: 'spin .8s linear infinite',
            flexShrink: 0,
        }} />
    );

    if (center) return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
        }}>
            {spinEl}
            {label && <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{label}</p>}
        </div>
    );

    return spinEl;
}

// Usage :
// <Spinner />                           → spinner blanc md
// <Spinner dark />                      → spinner bleu md
// <Spinner size="sm" />                 → petit spinner (dans bouton)
// <Spinner size="lg" dark center label="Chargement..." />  → plein écran