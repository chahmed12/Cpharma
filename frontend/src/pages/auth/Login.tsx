import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../hooks/useToast';
import { Video, FileSignature, Zap, Hand } from 'lucide-react';

export default function Login() {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const toast = useToast().toast;
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            if (!user.is_verified) {
                navigate('/pending', { replace: true });
            } else {
                navigate(
                    user.role === 'MEDECIN'
                        ? '/doctor/dashboard'
                        : '/pharmacist/dashboard',
                    { replace: true }
                );
            }
        }
    }, [user, navigate]);

    const handleSubmit = async () => {
        if (!email || !password) {
            toast('Veuillez remplir tous les champs.', 'error');
            return;
        }
        setLoading(true);
        try {
            const u = await login(email, password);
            if (!u.is_verified) {
                navigate('/pending', { replace: true });
            } else {
                navigate(
                    u.role === 'MEDECIN'
                        ? '/doctor/dashboard'
                        : '/pharmacist/dashboard',
                    { replace: true }
                );
            }
        } catch {
            toast('Email ou mot de passe incorrect.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const onEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSubmit(); };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
        }}>

            {/* ── Panneau gauche — branding (masqué sur mobile) ── */}
            <div className="hidden lg:flex" style={{
                flex: '0 0 420px',
                background: 'linear-gradient(160deg, var(--blue-600) 0%, var(--blue-800) 100%)',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 48px',
                position: 'relative',
                overflow: 'hidden',
            }}>

                {/* Cercles décoratifs en arrière-plan */}
                <div style={{
                    position: 'absolute', width: '300px', height: '300px',
                    border: '1px solid rgba(255,255,255,.08)',
                    borderRadius: '50%', top: '-80px', right: '-80px',
                }} />
                <div style={{
                    position: 'absolute', width: '200px', height: '200px',
                    border: '1px solid rgba(255,255,255,.05)',
                    borderRadius: '50%', bottom: '-60px', left: '-60px',
                }} />

                <img src="/logo.svg" alt="Cpharma Logo" style={{ width: '120px', height: '120px', marginBottom: '16px', objectFit: 'contain', zIndex: 1, position: 'relative' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />

                <h1 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '32px',
                    fontWeight: '700',
                    color: '#fff',
                    marginBottom: '12px',
                    textAlign: 'center',
                    position: 'relative', zIndex: 1,
                }}>
                    Cpharma
                </h1>

                <p style={{
                    color: 'rgba(255,255,255,.7)',
                    textAlign: 'center',
                    lineHeight: '1.6',
                    fontSize: '15px',
                    position: 'relative', zIndex: 1,
                }}>
                    Plateforme de téléconsultation
                    médicale en pharmacie
                </p>

                {/* 3 features clés */}
                <div style={{
                    marginTop: '36px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    position: 'relative', zIndex: 1,
                }}>
                    {[
                        { icon: <Video size={16} />, text: 'Consultation vidéo sécurisée' },
                        { icon: <FileSignature size={16} />, text: 'Ordonnances signées numériquement' },
                        { icon: <Zap size={16} />, text: 'Temps réel — médecins disponibles' },
                    ].map((f, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            background: 'rgba(255,255,255,.08)',
                            borderRadius: '10px',
                            padding: '10px 14px',
                            border: '1px solid rgba(255,255,255,.1)',
                        }}>
                            <span style={{ display: 'flex', alignItems: 'center', color: '#fff' }}>{f.icon}</span>
                            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.85)' }}>
                                {f.text}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Panneau droit — formulaire ── */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 24px',
                background: 'var(--bg-page)',
            }}>
                <div
                    className="animate-fade-up"
                    style={{ width: '100%', maxWidth: '400px' }}
                >
                    {/* En-tête */}
                    <div style={{ marginBottom: '32px' }}>
                        <h2 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '28px',
                            fontWeight: '700',
                            color: 'var(--text-primary)',
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            Bon retour <Hand size={24} className="text-blue-500" strokeWidth={2.5} />
                        </h2>
                        <p style={{
                            color: 'var(--text-secondary)',
                            fontSize: '14px',
                        }}>
                            Connectez-vous à votre espace
                        </p>
                    </div>

                    {/* Formulaire */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        <div className="form-group">
                            <label className="label">Email</label>
                            <input
                                className="input"
                                type="email"
                                placeholder="vous@exemple.com"
                                autoFocus
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                onKeyDown={onEnter}
                            />
                        </div>

                        <div className="form-group">
                            <label className="label">Mot de passe</label>
                            <input
                                className="input"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onKeyDown={onEnter}
                            />
                        </div>

                        <button
                            className="btn btn-primary btn-full btn-lg"
                            onClick={handleSubmit}
                            disabled={loading}
                            style={{ marginTop: '4px' }}
                        >
                            {loading ? (
                                <>
                                    <Spinner size="sm" />
                                    Connexion en cours...
                                </>
                            ) : 'Se connecter →'}
                        </button>
                    </div>

                    {/* Lien inscription */}
                    <p style={{
                        textAlign: 'center',
                        marginTop: '20px',
                        fontSize: '13px',
                        color: 'var(--text-muted)',
                    }}>
                        Pas encore de compte ?{' '}
                        <Link
                            to="/register"
                            style={{ color: 'var(--blue-600)', fontWeight: '600' }}
                        >
                            S'inscrire
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}