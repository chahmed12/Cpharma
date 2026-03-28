import { useNavigate, Link } from 'react-router-dom';
import { Stethoscope, Pill } from 'lucide-react';

type Role = 'MEDECIN' | 'PHARMACIEN';

const ROLES: { id: Role; icon: React.ReactNode; title: string; desc: string; route: string }[] = [
    {
        id: 'MEDECIN',
        icon: <Stethoscope size={28} />,
        title: 'Médecin',
        desc: 'Consultations en ligne',
        route: '/register/doctor',
    },
    {
        id: 'PHARMACIEN',
        icon: <Pill size={28} />,
        title: 'Espace Pharmacie',
        desc: 'Gérer la borne patient',
        route: '/register/pharmacist',
    },
];

export default function Register() {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-page)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
        }}>
            <div className="animate-fade-up" style={{ width: '100%', maxWidth: '460px' }}>

                {/* En-tête */}
                <div style={{ marginBottom: '28px', textAlign: 'center' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: '700', marginBottom: '6px' }}>
                        Créer un compte
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Rejoignez Cpharma en tant que professionnel
                    </p>
                </div>

                {/* Sélecteur de rôle */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
                    {ROLES.map(r => (
                        <button
                            key={r.id}
                            onClick={() => navigate(r.route)}
                            style={{
                                padding: '24px 16px',
                                border: '2px solid var(--border)',
                                borderRadius: 'var(--radius-lg)',
                                background: 'var(--bg-card)',
                                cursor: 'pointer',
                                transition: 'all .2s ease-in-out',
                                textAlign: 'center',
                                boxShadow: 'var(--shadow-sm)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '12px'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = 'var(--blue-500)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = 'var(--border)';
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                            }}
                        >
                            <div style={{ color: 'var(--blue-600)' }}>
                                {r.icon}
                            </div>
                            <div>
                                <p style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                    {r.title}
                                </p>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    {r.desc}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Lien connexion */}
                <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-muted)' }}>
                    Déjà un compte ?{' '}
                    <Link to="/login" style={{ color: 'var(--blue-600)', fontWeight: '600', transition: 'color .2s' }}>
                        Se connecter
                    </Link>
                </p>
            </div>
        </div>
    );
}