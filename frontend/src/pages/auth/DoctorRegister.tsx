import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser, sendRegisterOtp, verifyRegisterOtp } from '../../services/authService';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../hooks/useToast';
import { AxiosError } from 'axios';

// ──────────────────────────────────────────────────────────
//  DONNÉES STATIQUES
// ──────────────────────────────────────────────────────────
const SPECIALITES = [
    'Généraliste', 'Cardiologue', 'Dermatologue', 'Endocrinologue', 'Gastro-entérologue',
    'Gynécologue', 'Infectiologue', 'Néphrologue', 'Neurologue', 'Oncologue',
    'Ophtalmologue', 'ORL', 'Orthopédiste', 'Pédiatre', 'Pneumologue',
    'Psychiatre', 'Rhumatologue', 'Urologue', 'Autre',
];

const GOUVERNORATS = [
    'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba',
    'Kairouan', 'Kasserine', 'Kébili', 'Kef', 'Mahdia', 'Manouba', 'Médenine',
    'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid', 'Siliana', 'Sousse',
    'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
];

// ──────────────────────────────────────────────────────────
//  INDICATEUR D'ÉTAPE
// ──────────────────────────────────────────────────────────
function StepIndicator({ step, total }: { step: number; total: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '28px' }}>
            {Array.from({ length: total }, (_, i) => {
                const n = i + 1;
                const done = n < step;
                const active = n === step;
                return (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', fontWeight: '700',
                            background: done ? 'var(--green-600)' : active ? 'var(--blue-600)' : 'var(--bg-subtle)',
                            color: done || active ? '#fff' : 'var(--text-muted)',
                            border: done || active ? 'none' : '1.5px solid var(--border)',
                            transition: 'all .2s',
                            flexShrink: 0,
                        }}>
                            {done ? '✓' : n}
                        </div>
                        {i < total - 1 && (
                            <div style={{
                                width: '28px', height: '2px',
                                background: done ? 'var(--green-600)' : 'var(--border)',
                                transition: 'background .2s',
                            }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ──────────────────────────────────────────────────────────
//  COMPOSANT PRINCIPAL
// ──────────────────────────────────────────────────────────
export default function DoctorRegister() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Données du formulaire
    const [form, setForm] = useState({
        prenom: '', nom: '', email: '', password: '', passwordConfirm: '',
        cin_numero: '', numero_ordre: '', specialite: 'Généraliste', gouvernorat: 'Tunis',
        tarif_consultation: '50.00',
    });
    const set = <K extends keyof typeof form>(k: K, v: string) =>
        setForm(p => ({ ...p, [k]: v }));

    // Fichiers
    const [photoProfil, setPhotoProfil] = useState<File | null>(null);
    const [docCIN, setDocCIN] = useState<File | null>(null);
    const [docCNOM, setDocCNOM] = useState<File | null>(null);

    // OTP
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [otpTimer, setOtpTimer] = useState(600); // 10 min
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Conditions
    const [checks, setChecks] = useState([false, false, false, false]);
    const toggleCheck = (i: number) =>
        setChecks(prev => prev.map((v, idx) => idx === i ? !v : v));
    const allChecked = checks.every(Boolean);

    // OTP timer
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
    useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

    const fmtTime = (s: number) =>
        `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    // ── OTP refs ──────────────────────────────────────────
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    const handleOtpChange = (idx: number, val: string) => {
        if (!/^\d?$/.test(val)) return;
        const next = [...otp];
        next[idx] = val;
        setOtp(next);
        if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
    };
    const handleOtpKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
            otpRefs.current[idx - 1]?.focus();
        }
    };

    // ── Navigation STEP 1 → 2 (envoi OTP) ───────────────
    const goStep2 = async () => {
        if (!form.prenom || !form.nom || !form.email || !form.password) {
            toast('Veuillez remplir tous les champs.', 'error'); return;
        }
        if (form.password !== form.passwordConfirm) {
            toast('Les mots de passe ne correspondent pas.', 'error'); return;
        }
        if (!/^(?=.*\d).{8,}$/.test(form.password)) {
            toast('Mot de passe : minimum 8 caractères dont 1 chiffre.', 'error'); return;
        }
        setLoading(true);
        try {
            await sendRegisterOtp(form.email, `${form.prenom} ${form.nom}`);
            startTimer();
            setStep(2);
        } catch (err) {
            const e = err as AxiosError<{ detail?: string }>;
            toast(e.response?.data?.detail ?? 'Erreur lors de l\'envoi du code.', 'error');
        } finally { setLoading(false); }
    };

    // ── Navigation STEP 2 → 3 (vérification OTP) ─────────
    const goStep3 = async () => {
        const code = otp.join('');
        if (code.length < 6) { toast('Code incomplet.', 'error'); return; }
        setLoading(true);
        try {
            await verifyRegisterOtp(form.email, code);
            setStep(3);
        } catch (err) {
            const e = err as AxiosError<{ detail?: string }>;
            toast(e.response?.data?.detail ?? 'Code invalide ou expiré.', 'error');
        } finally { setLoading(false); }
    };

    // ── Navigation STEP 3 → 4 ─────────────────────────────
    const goStep4 = () => {
        if (!form.cin_numero || !form.numero_ordre || !form.specialite || !form.gouvernorat) {
            toast('Veuillez remplir tous les champs professionnels.', 'error'); return;
        }
        if (!/^\d{8}$/.test(form.cin_numero)) {
            toast('Le numéro CIN doit contenir exactement 8 chiffres.', 'error'); return;
        }
        setStep(4);
    };

    // ── Navigation STEP 4 → 5 ─────────────────────────────
    const goStep5 = () => {
        if (!photoProfil) { toast('Veuillez ajouter votre photo professionnelle.', 'error'); return; }
        setStep(5);
    };

    // ── SOUMISSION FINALE ─────────────────────────────────
    const handleSubmit = async () => {
        if (!allChecked) { toast('Veuillez accepter toutes les conditions.', 'error'); return; }
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append('email', form.email);
            fd.append('password', form.password);
            fd.append('nom', form.nom);
            fd.append('prenom', form.prenom);
            fd.append('role', 'MEDECIN');
            fd.append('specialite', form.specialite);
            fd.append('numero_ordre', form.numero_ordre);
            fd.append('cin_numero', form.cin_numero);
            fd.append('gouvernorat', form.gouvernorat);
            fd.append('tarif_consultation', form.tarif_consultation);
            
            // Legal tracking
            fd.append('cgu_version', '1.0');
            fd.append('contrat_version', '1.0');
            fd.append('confidentialite_version', '1.0');

            if (photoProfil) fd.append('image', photoProfil);
            if (docCIN) fd.append('document_cin', docCIN);
            if (docCNOM) fd.append('document_cnom', docCNOM);

            await registerUser(fd);
            setStep(6); // Succès
        } catch (err) {
            const error = err as AxiosError<Record<string, unknown[] | { detail: string }>>;
            const data = error.response?.data;
            let msg = 'Erreur lors de la création du compte.';
            if (data && typeof data === 'object') {
                const firstKey = Object.keys(data)[0];
                if (firstKey && Array.isArray(data[firstKey])) {
                    msg = `${firstKey === 'non_field_errors' ? '' : firstKey + ' : '}${(data[firstKey] as string[])[0]}`;
                } else if (typeof data.detail === 'string') {
                    msg = data.detail;
                } else if (firstKey && typeof data[firstKey] === 'object' && !Array.isArray(data[firstKey])) {
                    const nested = data[firstKey] as { detail: string };
                    msg = nested.detail ?? msg;
                }
            }
            toast(msg, 'error');
        } finally { setLoading(false); }
    };

    // ──────────────────────────────────────────────────────
    //  RENDU
    // ──────────────────────────────────────────────────────
    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)',
        border: '1.5px solid var(--border)', background: 'var(--bg-input, var(--bg-card))',
        fontSize: '14px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
        transition: 'border-color .2s',
    };
    const labelStyle: React.CSSProperties = {
        fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', letterSpacing: '0.04em',
    };
    const btnPrimary: React.CSSProperties = {
        width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: 'none',
        background: 'var(--blue-600)', color: '#fff', fontWeight: '700', fontSize: '14px',
        cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        marginTop: '8px', transition: 'opacity .2s',
    };
    const fileLabel: React.CSSProperties = {
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 14px', borderRadius: 'var(--radius-md)',
        border: '1.5px dashed var(--border)', background: 'var(--bg-subtle)',
        cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)',
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
            <div style={{ width: '100%', maxWidth: '500px' }}>

                {/* En-tête */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
                        Inscription Médecin
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {step < 6 ? `Étape ${step} sur 5` : 'Dossier soumis'}
                    </p>
                </div>

                {step < 6 && <StepIndicator step={step} total={5} />}

                <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '28px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>

                    {/* ── ÉTAPE 1 — Informations du compte ─────────── */}
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <h2 style={{ fontWeight: '700', fontSize: '18px', marginBottom: '4px' }}>Informations du compte</h2>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={labelStyle}>Prénom</label>
                                    <input style={inputStyle} placeholder="Ahmed" value={form.prenom} onChange={e => set('prenom', e.target.value)} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Nom</label>
                                    <input style={inputStyle} placeholder="Ben Ali" value={form.nom} onChange={e => set('nom', e.target.value)} />
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Email professionnel</label>
                                <input style={inputStyle} type="email" placeholder="dr.ahmed@gmail.com" value={form.email} onChange={e => set('email', e.target.value)} />
                            </div>
                            <div>
                                <label style={labelStyle}>Mot de passe <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>(min. 8 caractères + 1 chiffre)</span></label>
                                <input style={inputStyle} type="password" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} />
                            </div>
                            <div>
                                <label style={labelStyle}>Confirmer le mot de passe</label>
                                <input style={inputStyle} type="password" placeholder="••••••••" value={form.passwordConfirm} onChange={e => set('passwordConfirm', e.target.value)} />
                            </div>

                            <button style={btnPrimary} onClick={goStep2} disabled={loading}>
                                {loading ? <><Spinner size="sm" /> Envoi du code...</> : 'Continuer →'}
                            </button>
                        </div>
                    )}

                    {/* ── ÉTAPE 2 — Vérification OTP ───────────────── */}
                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', textAlign: 'center' }}>
                            <h2 style={{ fontWeight: '700', fontSize: '18px' }}>Vérification Email</h2>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '340px' }}>
                                Un code à 6 chiffres a été envoyé à <strong>{form.email}</strong>. Saisissez-le ci-dessous.
                            </p>

                            {/* OTP inputs */}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {otp.map((d, i) => (
                                    <input
                                        key={i}
                                        ref={el => { otpRefs.current[i] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={d}
                                        onChange={e => handleOtpChange(i, e.target.value)}
                                        onKeyDown={e => handleOtpKey(i, e)}
                                        style={{
                                            width: '52px', height: '60px', textAlign: 'center',
                                            fontSize: '22px', fontWeight: '700',
                                            border: `2px solid ${d ? 'var(--blue-600)' : 'var(--border)'}`,
                                            borderRadius: 'var(--radius-md)',
                                            background: 'var(--bg-card)', color: 'var(--text-primary)',
                                            outline: 'none',
                                        }}
                                    />
                                ))}
                            </div>

                            <p style={{ fontSize: '13px', color: otpTimer <= 60 ? '#e53e3e' : 'var(--text-muted)' }}>
                                Expire dans <strong>{fmtTime(otpTimer)}</strong>
                            </p>

                            <button style={{ ...btnPrimary, maxWidth: '320px' }} onClick={goStep3} disabled={loading || otp.join('').length < 6}>
                                {loading ? <><Spinner size="sm" /> Vérification...</> : 'Vérifier'}
                            </button>

                            <button
                                style={{ background: 'none', border: 'none', color: 'var(--blue-600)', cursor: 'pointer', fontSize: '13px' }}
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        await sendRegisterOtp(form.email, `${form.prenom} ${form.nom}`);
                                        startTimer();
                                        setOtp(['', '', '', '', '', '']);
                                        toast('Nouveau code envoyé.', 'success');
                                    } catch { toast('Erreur lors du renvoi.', 'error'); }
                                    finally { setLoading(false); }
                                }}
                                disabled={loading}
                            >
                                Renvoyer le code
                            </button>
                        </div>
                    )}

                    {/* ── ÉTAPE 3 — Identité professionnelle ───────── */}
                    {step === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <h2 style={{ fontWeight: '700', fontSize: '18px', marginBottom: '4px' }}>Identité Professionnelle</h2>

                            <div>
                                <label style={labelStyle}>Numéro CIN <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>(8 chiffres)</span></label>
                                <input style={inputStyle} placeholder="12345678" maxLength={8} value={form.cin_numero} onChange={e => set('cin_numero', e.target.value.replace(/\D/g, ''))} />
                            </div>
                            <div>
                                <label style={labelStyle}>Numéro Ordre (CNOM)</label>
                                <input style={inputStyle} placeholder="Numéro d'ordre médical" value={form.numero_ordre} onChange={e => set('numero_ordre', e.target.value)} />
                            </div>
                            <div>
                                <label style={labelStyle}>Spécialité</label>
                                <select style={{ ...inputStyle }} value={form.specialite} onChange={e => set('specialite', e.target.value)}>
                                    {SPECIALITES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Gouvernorat</label>
                                <select style={{ ...inputStyle }} value={form.gouvernorat} onChange={e => set('gouvernorat', e.target.value)}>
                                    {GOUVERNORATS.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Tarif consultation (DNT)</label>
                                <input style={inputStyle} type="number" step="0.01" min="0" value={form.tarif_consultation} onChange={e => set('tarif_consultation', e.target.value)} />
                            </div>

                            <button style={btnPrimary} onClick={goStep4}>Continuer →</button>
                        </div>
                    )}

                    {/* ── ÉTAPE 4 — Documents ───────────────────────── */}
                    {step === 4 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h2 style={{ fontWeight: '700', fontSize: '18px', marginBottom: '4px' }}>Documents à uploader</h2>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Format accepté : PDF ou JPG — Taille maximale : 5 MB</p>

                            {([
                                { label: 'CIN (recto/verso)', file: docCIN, set: setDocCIN, accept: '.pdf,.jpg,.jpeg', required: false },
                                { label: 'Carte CNOM', file: docCNOM, set: setDocCNOM, accept: '.pdf,.jpg,.jpeg', required: false },
                                { label: 'Photo professionnelle *', file: photoProfil, set: setPhotoProfil, accept: 'image/*', required: true },
                            ] as const).map(({ label, file, set: setFile, accept }) => (
                                <div key={label}>
                                    <label style={labelStyle}>{label}</label>
                                    <label style={fileLabel}>
                                        <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>+</span>
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {file ? file.name : 'Choisir fichier'}
                                        </span>
                                        <input
                                            type="file"
                                            accept={accept}
                                            style={{ display: 'none' }}
                                            onChange={e => setFile(e.target.files?.[0] ?? null)}
                                        />
                                    </label>
                                </div>
                            ))}

                            <button style={btnPrimary} onClick={goStep5}>Continuer →</button>
                        </div>
                    )}

                    {/* ── ÉTAPE 5 — Conditions ─────────────────────── */}
                    {step === 5 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h2 style={{ fontWeight: '700', fontSize: '18px', marginBottom: '4px' }}>Acceptation des conditions</h2>

                            {[
                                <span key="cgu">J'ai lu et j'accepte les → <a href="/legal/cgu.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue-600)', textDecoration: 'underline' }} onClick={e => e.stopPropagation()}>Conditions Générales d'Utilisation (CGU) — Version 1.0</a></span>,
                                <span key="contrat">J'ai lu et j'accepte le → <a href="/legal/contrat-medecin.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue-600)', textDecoration: 'underline' }} onClick={e => e.stopPropagation()}>Contrat de Partenariat Médecin-Plateforme — Version 1.0</a></span>,
                                <span key="confid">J'accepte la → <a href="/legal/confidentialite.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue-600)', textDecoration: 'underline' }} onClick={e => e.stopPropagation()}>Politique de Confidentialité des données — Version 1.0</a></span>,
                                "Je certifie que toutes mes informations personnelles et professionnelles sont exactes et authentiques",
                                "Je certifie que tous mes documents uploadés sont conformes, en règle et à jour",
                            ].map((text, i) => (
                                <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                                    <input
                                        type="checkbox"
                                        checked={checks[i]}
                                        onChange={() => toggleCheck(i)}
                                        style={{ width: '16px', height: '16px', marginTop: '2px', cursor: 'pointer', flexShrink: 0 }}
                                    />
                                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{text}</span>
                                </label>
                            ))}

                            <p style={{ fontSize: '12px', color: '#c53030', background: '#fff5f5', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #fed7d7' }}>
                                ⚠️ Toute fausse déclaration engage votre responsabilité civile et pénale conformément au droit tunisien.
                            </p>

                            <button
                                style={{ ...btnPrimary, opacity: allChecked && !loading ? 1 : 0.5, cursor: allChecked && !loading ? 'pointer' : 'not-allowed' }}
                                onClick={handleSubmit}
                                disabled={!allChecked || loading}
                            >
                                {loading ? <><Spinner size="sm" /> Envoi du dossier...</> : 'Soumettre ma demande'}
                            </button>
                        </div>
                    )}

                    {/* ── ÉTAPE 6 — Succès ─────────────────────────── */}
                    {step === 6 && (
                        <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f0fff4', border: '2px solid var(--green-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                                ✓
                            </div>
                            <h2 style={{ fontWeight: '700', fontSize: '20px', color: 'var(--green-700, #276749)' }}>Dossier soumis avec succès</h2>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '360px' }}>
                                Votre dossier a bien été reçu. Vous recevrez une réponse par email sous 24 à 48 heures ouvrables.
                            </p>
                            <button className="btn btn-primary" onClick={() => navigate('/login')}>
                                Retour à la connexion
                            </button>
                        </div>
                    )}
                </div>

                {/* Lien connexion */}
                {step < 6 && (
                    <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        Déjà un compte ?{' '}
                        <Link to="/login" style={{ color: 'var(--blue-600)', fontWeight: '600' }}>Se connecter</Link>
                    </p>
                )}
            </div>
        </div>
    );
}
