import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../hooks/useToast';
import { Video, FileSignature, Zap, Hand, Stethoscope, Pill, ArrowLeft } from 'lucide-react';
import { requestPasswordReset, verifyPasswordReset, confirmPasswordReset } from '../../services/authService';
import { AxiosError } from 'axios';

type Role = 'MEDECIN' | 'PHARMACIEN';

export default function Login() {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    
    // Login State
    const [loginRole, setLoginRole] = useState<Role>('MEDECIN');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Forgot Password State (0: off, 1: email, 2: otp, 3: new pass, 4: success)
    const [resetStep, setResetStep] = useState(0);
    const [resetEmail, setResetEmail] = useState('');
    const [resetOtp, setResetOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [otpTimer, setOtpTimer] = useState(600);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Initial load: redirect if already logged in
    useEffect(() => {
        if (user && resetStep === 0) {
            if (!user.is_verified) {
                navigate('/pending', { replace: true });
            } else {
                navigate(user.role === 'MEDECIN' ? '/doctor/dashboard' : '/pharmacist/dashboard', { replace: true });
            }
        }
    }, [user, navigate, resetStep]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    // ─── LOGIN SUBMIT ──────────────────────────────────────
    const handleLoginSubmit = async () => {
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
                navigate(u.role === 'MEDECIN' ? '/doctor/dashboard' : '/pharmacist/dashboard', { replace: true });
            }
        } catch {
            toast('Email ou mot de passe incorrect.', 'error');
        } finally {
            setLoading(false);
        }
    };
    const onEnterLogin = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleLoginSubmit(); };

    // ─── FORGOT PASSWORD HANDLERS ─────────────────────────
    const startTimer = () => {
        setOtpTimer(600);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setOtpTimer(t => {
                if (t <= 1) { clearInterval(timerRef.current!); return 0; }
                return t - 1;
            });
        }, 1000);
    };
    const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const handleRequestReset = async () => {
        if (!resetEmail) { toast("L'email est requis.", 'error'); return; }
        setLoading(true);
        try {
            await requestPasswordReset(resetEmail);
            setResetStep(2);
            startTimer();
            toast('Code envoyé si l\'email existe.', 'success');
        } catch {
            toast("Erreur lors de la demande de réinitialisation.", 'error');
        } finally {
            setLoading(false);
        }
    };
    const onEnterResetEmail = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleRequestReset(); };

    const handleVerifyResetOtp = async () => {
        const code = resetOtp.join('');
        if (code.length < 6) { toast("Veuillez saisir le code complet.", 'error'); return; }
        setLoading(true);
        try {
            await verifyPasswordReset(resetEmail, code);
            setResetStep(3);
        } catch (err) {
            const e = err as AxiosError<{ detail?: string }>;
            toast(e.response?.data?.detail ?? "Code invalide ou expiré.", 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmReset = async () => {
        if (!newPassword || newPassword !== confirmNewPassword) {
            toast("Les mots de passe ne correspondent pas.", 'error'); return;
        }
        if (!/^(?=.*\d).{8,}$/.test(newPassword)) {
            toast("Mot de passe : min. 8 caractères dont 1 chiffre.", 'error'); return;
        }
        setLoading(true);
        try {
            await confirmPasswordReset(resetEmail, newPassword);
            setResetStep(4);
            setTimeout(() => {
                setResetStep(0);
                setEmail(resetEmail);
                setPassword('');
            }, 3000);
        } catch (err) {
            const e = err as AxiosError<{ detail?: string }>;
            toast(e.response?.data?.detail ?? "Erreur lors de la réinitialisation.", 'error');
        } finally {
            setLoading(false);
        }
    };
    const onEnterResetPass = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleConfirmReset(); };

    // OTP Inputs logic
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    const handleOtpChange = (idx: number, val: string) => {
        if (!/^\d?$/.test(val)) return;
        const next = [...resetOtp];
        next[idx] = val;
        setResetOtp(next);
        if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
    };
    const handleOtpKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !resetOtp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
    };

    // ─── COMMON STYLES ──────────────────────────────────────
    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-md)',
        border: '1.5px solid var(--border)', background: 'var(--bg-input, var(--bg-card))',
        fontSize: '14px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
        transition: 'border-color .2s',
    };
    const labelStyle: React.CSSProperties = {
        fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block',
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex' }}>

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
                <div style={{ position: 'absolute', width: '300px', height: '300px', border: '1px solid rgba(255,255,255,.08)', borderRadius: '50%', top: '-80px', right: '-80px' }} />
                <div style={{ position: 'absolute', width: '200px', height: '200px', border: '1px solid rgba(255,255,255,.05)', borderRadius: '50%', bottom: '-60px', left: '-60px' }} />

                <img src="/logo.svg" alt="Cpharma Logo" style={{ width: '120px', height: '120px', marginBottom: '16px', objectFit: 'contain', zIndex: 1, position: 'relative' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />

                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: '700', color: '#fff', marginBottom: '12px', textAlign: 'center', position: 'relative', zIndex: 1, }}>
                    Cpharma
                </h1>
                <p style={{ color: 'rgba(255,255,255,.7)', textAlign: 'center', lineHeight: '1.6', fontSize: '15px', position: 'relative', zIndex: 1, }}>
                    Plateforme de téléconsultation médicale en pharmacie
                </p>

                <div style={{ marginTop: '36px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', zIndex: 1, }}>
                    {[
                        { icon: <Video size={16} />, text: 'Consultation vidéo sécurisée' },
                        { icon: <FileSignature size={16} />, text: 'Ordonnances signées numériquement' },
                        { icon: <Zap size={16} />, text: 'Temps réel — médecins disponibles' },
                    ].map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,.08)', borderRadius: '10px', padding: '10px 14px', border: '1px solid rgba(255,255,255,.1)', }}>
                            <span style={{ display: 'flex', alignItems: 'center', color: '#fff' }}>{f.icon}</span>
                            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.85)' }}>{f.text}</span>
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
                <div className="animate-fade-up" style={{ width: '100%', maxWidth: '400px' }}>

                    {/* ============================================================== */}
                    {/* VUE : CONNEXION (resetStep === 0)                              */}
                    {/* ============================================================== */}
                    {resetStep === 0 && (
                        <>
                            <div style={{ marginBottom: '32px' }}>
                                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Bon retour <Hand size={24} className="text-blue-500" strokeWidth={2.5} />
                                </h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                    Connectez-vous à votre espace professionnel
                                </p>
                            </div>

                            {/* Toggles Médecin / Pharmacie */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'var(--bg-subtle)', padding: '6px', borderRadius: 'var(--radius-md)' }}>
                                <button
                                    onClick={() => setLoginRole('MEDECIN')}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)',
                                        background: loginRole === 'MEDECIN' ? 'var(--bg-card)' : 'transparent',
                                        color: loginRole === 'MEDECIN' ? 'var(--blue-600)' : 'var(--text-secondary)',
                                        boxShadow: loginRole === 'MEDECIN' ? 'var(--shadow-sm)' : 'none',
                                        fontWeight: '600', fontSize: '13px', border: 'none', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <Stethoscope size={16} /> Médecin
                                </button>
                                <button
                                    onClick={() => setLoginRole('PHARMACIEN')}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)',
                                        background: loginRole === 'PHARMACIEN' ? 'var(--bg-card)' : 'transparent',
                                        color: loginRole === 'PHARMACIEN' ? 'var(--green-600)' : 'var(--text-secondary)',
                                        boxShadow: loginRole === 'PHARMACIEN' ? 'var(--shadow-sm)' : 'none',
                                        fontWeight: '600', fontSize: '13px', border: 'none', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <Pill size={16} /> Pharmacie
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="form-group">
                                    <label style={labelStyle}>Email</label>
                                    <input
                                        style={inputStyle}
                                        type="email"
                                        placeholder="vous@exemple.com"
                                        autoFocus
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        onKeyDown={onEnterLogin}
                                    />
                                </div>

                                <div className="form-group">
                                    <label style={labelStyle}>Mot de passe</label>
                                    <input
                                        style={inputStyle}
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        onKeyDown={onEnterLogin}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-6px' }}>
                                    <button
                                        onClick={() => { setResetStep(1); setResetEmail(email); }}
                                        style={{ background: 'none', border: 'none', color: 'var(--blue-600)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                                    >
                                        Mot de passe oublié ?
                                    </button>
                                </div>

                                <button
                                    className={`btn btn-full btn-lg ${loginRole === 'PHARMACIEN' ? 'btn-success' : 'btn-primary'}`}
                                    onClick={handleLoginSubmit}
                                    disabled={loading}
                                    style={{ marginTop: '8px' }}
                                >
                                    {loading ? (
                                        <><Spinner size="sm" /> Connexion...</>
                                    ) : 'Se connecter →'}
                                </button>
                            </div>

                            <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-muted)' }}>
                                Pas encore de compte ?{' '}
                                <Link to="/register" style={{ color: loginRole === 'PHARMACIEN' ? 'var(--green-600)' : 'var(--blue-600)', fontWeight: '600' }}>
                                    S'inscrire
                                </Link>
                            </p>
                        </>
                    )}

                    {/* ============================================================== */}
                    {/* VUE : MOT DE PASSE OUBLIÉ                                      */}
                    {/* ============================================================== */}
                    {resetStep > 0 && resetStep < 4 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <button
                                onClick={() => setResetStep(0)}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', padding: 0, width: 'fit-content' }}
                            >
                                <ArrowLeft size={16} /> Retour à la connexion
                            </button>

                            <div style={{ marginBottom: '8px' }}>
                                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    Mot de passe oublié
                                </h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                                    {resetStep === 1 && "Entrez votre email pour recevoir un code de réinitialisation."}
                                    {resetStep === 2 && `Un code a été envoyé à ${resetEmail}. Saisissez-le ci-dessous.`}
                                    {resetStep === 3 && "Définissez un nouveau mot de passe sécurisé."}
                                </p>
                            </div>

                            {/* ÉTAPE 1 : EMAIL */}
                            {resetStep === 1 && (
                                <>
                                    <div>
                                        <label style={labelStyle}>Email</label>
                                        <input
                                            style={inputStyle}
                                            type="email"
                                            placeholder="vous@exemple.com"
                                            value={resetEmail}
                                            onChange={e => setResetEmail(e.target.value)}
                                            onKeyDown={onEnterResetEmail}
                                            autoFocus
                                        />
                                    </div>
                                    <button className="btn btn-primary btn-full" onClick={handleRequestReset} disabled={loading}>
                                        {loading ? <Spinner size="sm" /> : 'Envoyer le code'}
                                    </button>
                                </>
                            )}

                            {/* ÉTAPE 2 : OTP */}
                            {resetStep === 2 && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {resetOtp.map((d, i) => (
                                            <input
                                                key={i}
                                                ref={el => { otpRefs.current[i] = el; }}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={1}
                                                value={d}
                                                onChange={e => handleOtpChange(i, e.target.value)}
                                                onKeyDown={e => handleOtpKey(i, e)}
                                                autoFocus={i === 0}
                                                style={{ width: '48px', height: '56px', textAlign: 'center', fontSize: '20px', fontWeight: '700', border: `2px solid ${d ? 'var(--blue-600)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }}
                                            />
                                        ))}
                                    </div>

                                    <p style={{ fontSize: '13px', color: otpTimer <= 60 ? '#e53e3e' : 'var(--text-muted)' }}>
                                        Expire dans <strong>{fmtTime(otpTimer)}</strong>
                                    </p>

                                    <button className="btn btn-primary btn-full" onClick={handleVerifyResetOtp} disabled={loading || resetOtp.join('').length < 6}>
                                        {loading ? <Spinner size="sm" /> : 'Vérifier le code'}
                                    </button>
                                    
                                    <button
                                        style={{ background: 'none', border: 'none', color: 'var(--blue-600)', cursor: 'pointer', fontSize: '13px', marginTop: '-8px' }}
                                        onClick={handleRequestReset}
                                        disabled={loading}
                                    >
                                        Renvoyer le code
                                    </button>
                                </div>
                            )}

                            {/* ÉTAPE 3 : NOUVEAU MOT DE PASSE */}
                            {resetStep === 3 && (
                                <>
                                    <div>
                                        <label style={labelStyle}>Nouveau mot de passe</label>
                                        <input
                                            style={inputStyle}
                                            type="password"
                                            placeholder="Min. 8 caractères, 1 chiffre"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Confirmer le mot de passe</label>
                                        <input
                                            style={inputStyle}
                                            type="password"
                                            placeholder="Min. 8 caractères, 1 chiffre"
                                            value={confirmNewPassword}
                                            onChange={e => setConfirmNewPassword(e.target.value)}
                                            onKeyDown={onEnterResetPass}
                                        />
                                    </div>
                                    <button className="btn btn-primary btn-full" onClick={handleConfirmReset} disabled={loading} style={{marginTop: '8px'}}>
                                        {loading ? <Spinner size="sm" /> : 'Réinitialiser le mot de passe'}
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* VUE : SUCCÈS (resetStep === 4) */}
                    {resetStep === 4 && (
                        <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f0fff4', border: '2px solid var(--green-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: 'var(--green-600)' }}>
                                ✓
                            </div>
                            <h2 style={{ fontWeight: '700', fontSize: '20px', color: 'var(--green-700)' }}>Mot de passe modifié !</h2>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                Redirection vers la connexion dans quelques secondes...
                            </p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}