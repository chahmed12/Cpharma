import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';


const NAV_LINKS = {
    MEDECIN: [
        { href: '/doctor/dashboard', label: 'Tableau de bord' },
    ],
    PHARMACIEN: [
        { href: '/pharmacist/dashboard', label: 'Tableau de bord' },
    ],
    ADMIN: [
        { href: '/admin', label: 'Dashboard Admin' },
    ],
};

export function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const links = NAV_LINKS[user?.role as keyof typeof NAV_LINKS] ?? [];

    if (links.length === 0) {
        return null;
    }

    return (
        <nav style={{
            height: '60px',
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border)',
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            boxShadow: 'var(--shadow-xs)',
        }}>

            {/* Gauche — logo + liens */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>

                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                    onClick={() => navigate(links[0].href)}>
                    <img src="/logo.svg" alt="Cpharma" style={{ height: '32px', objectFit: 'contain' }} onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        if (target.nextElementSibling) (target.nextElementSibling as HTMLElement).style.display = 'block';
                    }} />
                    <div style={{
                        width: '32px', height: '32px',
                        background: 'linear-gradient(135deg, var(--green-600), #10b981)',
                        borderRadius: '8px',
                        display: 'none', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <span style={{ color: '#fff', fontWeight: '800', fontSize: '16px' }}>C</span>
                    </div>
                </div>

                {/* Liens nav */}
                <div style={{ display: 'flex', gap: '2px' }}>
                    {links.map(l => {
                        const active = pathname === l.href;
                        return (
                            <button key={l.href}
                                onClick={() => navigate(l.href)}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: active ? 'var(--blue-50)' : 'transparent',
                                    color: active ? 'var(--blue-700)' : 'var(--text-secondary)',
                                    fontWeight: active ? '600' : '400',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    transition: 'all .15s',
                                    fontFamily: 'var(--font-body)',
                                    whiteSpace: 'nowrap',
                                }}
                            >{l.label}</button>
                        );
                    })}
                </div>
            </div>

            {/* Droite — info utilisateur + déconnexion */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

                {/* Avatar + nom */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {user?.photo_url ? (
                        <img 
                            src={user.photo_url} 
                            alt={`${user.prenom} ${user.nom}`} 
                            style={{
                                width: '32px', height: '32px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '1px solid var(--border)',
                            }}
                        />
                    ) : (
                        <div style={{
                            width: '32px', height: '32px',
                            background: 'var(--blue-50)',
                            border: '1px solid var(--blue-200)',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', fontWeight: '700',
                            color: 'var(--blue-700)',
                            flexShrink: 0,
                        }}>
                            {user?.prenom?.[0]}{user?.nom?.[0]}
                        </div>
                    )}
                    <div>
                        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', margin: 0, lineHeight: '1.3' }}>
                            {user?.role === 'MEDECIN' ? 'Dr. ' : ''}{user?.prenom} {user?.nom}
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.3' }}>
                            {user?.role}
                        </p>
                    </div>
                </div>

                {/* Bouton déconnexion */}
                <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => { logout(); navigate('/login'); }}
                >
                    Déconnexion
                </button>

            </div>
        </nav>
    );
}