import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../../services/authService';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../hooks/useToast';

type Role = 'MEDECIN' | 'PHARMACIEN';

const ROLES: { id: Role; icon: string; title: string; desc: string }[] = [
    {
        id: 'MEDECIN',
        icon: '🩺',
        title: 'Médecin',
        desc: 'Consultations en ligne',
    },
    {
        id: 'PHARMACIEN',
        icon: '💊',
        title: 'Pharmacien',
        desc: 'Gérer la borne patient',
    },
];

export default function Register() {
    const navigate = useNavigate();
    const toast = useToast().toast;
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        email: '',
        password: '',
        nom: '',
        prenom: '',
        role: 'MEDECIN' as Role,
        specialite: '',
        numero_ordre: '',
        nom_pharmacie: '',
    });

    const set = (k: string, v: string) =>
        setForm(p => ({ ...p, [k]: v }));

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await registerUser(form);
            navigate('/login');
        } catch {
            toast('Erreur lors de la création du compte.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-page)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
        }}>
            <div
                className="animate-fade-up"
                style={{ width: '100%', maxWidth: '460px' }}
            >
                {/* En-tête */}
                <div style={{ marginBottom: '28px' }}>
                    <h2 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '26px',
                        fontWeight: '700',
                        marginBottom: '6px',
                    }}>
                        Créer un compte
                    </h2>
                    <p style={{
                        color: 'var(--text-secondary)',
                        fontSize: '14px',
                    }}>
                        Rejoignez PharmaConsult
                    </p>
                </div>

                {/* Sélecteur de rôle */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    marginBottom: '24px',
                }}>
                    {ROLES.map(r => {
                        const active = form.role === r.id;
                        return (
                            <button
                                key={r.id}
                                onClick={() => set('role', r.id)}
                                style={{
                                    padding: '16px',
                                    border: `2px solid ${active ? 'var(--blue-600)' : 'var(--border)'}`,
                                    borderRadius: 'var(--radius-md)',
                                    background: active ? 'var(--blue-50)' : 'var(--bg-card)',
                                    cursor: 'pointer',
                                    transition: 'all .15s',
                                    textAlign: 'center',
                                    boxShadow: active ? 'var(--shadow-sm)' : 'none',
                                }}
                            >
                                <div style={{ fontSize: '28px', marginBottom: '8px' }}>
                                    {r.icon}
                                </div>
                                <p style={{
                                    fontWeight: '700',
                                    fontSize: '14px',
                                    color: active ? 'var(--blue-700)' : 'var(--text-primary)',
                                    marginBottom: '2px',
                                }}>
                                    {r.title}
                                </p>
                                <p style={{
                                    fontSize: '11px',
                                    color: active ? 'var(--blue-600)' : 'var(--text-muted)',
                                }}>
                                    {r.desc}
                                </p>
                            </button>
                        );
                    })}
                </div>

                {/* Champs du formulaire */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    {/* Prénom + Nom */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '10px',
                    }}>
                        <div className="form-group">
                            <label className="label">Prénom</label>
                            <input className="input" placeholder="Ahmed"
                                value={form.prenom}
                                onChange={e => set('prenom', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="label">Nom</label>
                            <input className="input" placeholder="Benali"
                                value={form.nom}
                                onChange={e => set('nom', e.target.value)} />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="form-group">
                        <label className="label">Email</label>
                        <input className="input" type="email"
                            placeholder="vous@exemple.com"
                            value={form.email}
                            onChange={e => set('email', e.target.value)} />
                    </div>

                    {/* Mot de passe */}
                    <div className="form-group">
                        <label className="label">Mot de passe</label>
                        <input className="input" type="password"
                            placeholder="Minimum 6 caractères"
                            value={form.password}
                            onChange={e => set('password', e.target.value)} />
                    </div>

                    {/* Champs conditionnels médecin */}
                    {form.role === 'MEDECIN' && (
                        <div className="animate-fade-up"
                            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div className="form-group">
                                <label className="label">Spécialité</label>
                                <input className="input"
                                    placeholder="Ex : Généraliste, Cardiologue..."
                                    value={form.specialite}
                                    onChange={e => set('specialite', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="label">N° ordre médecin</label>
                                <input className="input"
                                    placeholder="Ex : 12345"
                                    value={form.numero_ordre}
                                    onChange={e => set('numero_ordre', e.target.value)} />
                            </div>
                        </div>
                    )}

                    {/* Champs conditionnels pharmacien */}
                    {form.role === 'PHARMACIEN' && (
                        <div className="animate-fade-up form-group">
                            <label className="label">Nom de la pharmacie</label>
                            <input className="input"
                                placeholder="Pharmacie du Centre"
                                value={form.nom_pharmacie}
                                onChange={e => set('nom_pharmacie', e.target.value)} />
                        </div>
                    )}

                    {/* Bouton submit */}
                    <button
                        className="btn btn-primary btn-full btn-lg"
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{ marginTop: '4px' }}
                    >
                        {loading ? (
                            <>
                                <Spinner size="sm" />
                                Création du compte...
                            </>
                        ) : "S'inscrire →"}
                    </button>
                </div>

                {/* Lien connexion */}
                <p style={{
                    textAlign: 'center',
                    marginTop: '20px',
                    fontSize: '13px',
                    color: 'var(--text-muted)',
                }}>
                    Déjà un compte ?{' '}
                    <Link
                        to="/login"
                        style={{ color: 'var(--blue-600)', fontWeight: '600' }}
                    >
                        Se connecter
                    </Link>
                </p>
            </div>
        </div>
    );
}