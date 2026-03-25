import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../../services/authService';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../hooks/useToast';
import { Stethoscope, Pill, ImagePlus } from 'lucide-react';
import { AxiosError } from 'axios';

type Role = 'MEDECIN' | 'PHARMACIEN';

const ROLES: { id: Role; icon: React.ReactNode; title: string; desc: string }[] = [
    {
        id: 'MEDECIN',
        icon: <Stethoscope size={28} />,
        title: 'Médecin',
        desc: 'Consultations en ligne',
    },
    {
        id: 'PHARMACIEN',
        icon: <Pill size={28} />,
        title: 'Espace Pharmacie',
        desc: 'Gérer la borne patient',
    },
];

export default function Register() {
    const navigate = useNavigate();
    const toast = useToast().toast;
    const [loading, setLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
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

    type FormKeys = keyof typeof form;
    const set = <K extends FormKeys>(k: K, v: typeof form[K]) =>
        setForm(p => ({ ...p, [k]: v }));

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append('email',     form.email);
            fd.append('password',  form.password);
            fd.append('nom',       form.nom);
            fd.append('prenom',    form.prenom);
            fd.append('role',      form.role);
            fd.append('specialite',    form.specialite);
            fd.append('numero_ordre',  form.numero_ordre);
            fd.append('nom_pharmacie', form.nom_pharmacie);
            if (imageFile) fd.append('image', imageFile);

            await registerUser(fd);
            toast('Compte créé avec succès ! Vous pouvez maintenant vous connecter.', 'success');
            setTimeout(() => { navigate('/login'); }, 1500);
        } catch (err) {
            const error = err as AxiosError<Record<string, unknown[] | { detail: string }>>;
            const data = error.response?.data;
            let msg = 'Erreur lors de la création du compte.';
            if (data && typeof data === 'object') {
                const firstKey = Object.keys(data)[0];
                if (firstKey && Array.isArray(data[firstKey])) {
                    msg = `${firstKey === 'non_field_errors' ? '' : firstKey + ' : '}${data[firstKey][0]}`;
                } else if (typeof data.detail === 'string') {
                    msg = data.detail;
                }
            }
            toast(msg, 'error');
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
                        Rejoignez Cpharma
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
                                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center', color: active ? 'var(--blue-600)' : 'var(--text-muted)' }}>
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
                            <label className="label">
                                {form.role === 'MEDECIN' ? 'Prénom' : 'Prénom du pharmacien'}
                            </label>
                            <input className="input" placeholder="Ahmed"
                                value={form.prenom}
                                onChange={e => set('prenom', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="label">
                                {form.role === 'MEDECIN' ? 'Nom' : 'Nom du pharmacien'}
                            </label>
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
                            placeholder="Minimum 10 caractères"
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

                    {/* Upload photo */}
                    <div className="form-group animate-fade-up">
                        <label className="label">
                            {form.role === 'MEDECIN' ? 'Photo de profil (optionnel)' : 'Photo de la pharmacie (optionnel)'}
                        </label>
                        <label style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '10px 14px', borderRadius: 'var(--radius-md)',
                            border: '1.5px dashed var(--border)',
                            background: 'var(--bg-subtle)', cursor: 'pointer',
                            fontSize: '13px', color: 'var(--text-secondary)',
                            transition: 'border-color .2s',
                        }}>
                            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                                <ImagePlus size={20} className="text-gray-400" />
                            </span>
                            {imageFile ? imageFile.name : 'Cliquer pour choisir une image…'}
                            <input type="file" accept="image/*" style={{ display: 'none' }}
                                onChange={e => setImageFile(e.target.files?.[0] ?? null)} />
                        </label>
                    </div>

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