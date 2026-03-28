import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/ui/Navbar';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../hooks/useToast';
import { getDoctorProfile, updateDoctorProfile, type DoctorProfile } from '../services/authService';
import { ArrowLeft, Save, ImagePlus } from 'lucide-react';

export default function DoctorProfile() {
    const navigate = useNavigate();
    const toast = useToast().toast;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<DoctorProfile | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [form, setForm] = useState({
        nom: '',
        prenom: '',
        specialite: '',
        numero_ordre: '',
        tarif_consultation: '',
    });

    useEffect(() => {
        getDoctorProfile()
            .then(p => {
                setProfile(p);
                setForm({
                    nom: p.nom,
                    prenom: p.prenom,
                    specialite: p.specialite || '',
                    numero_ordre: p.numero_ordre || '',
                    tarif_consultation: p.tarif_consultation || '50.00',
                });
            })
            .catch(() => toast('Erreur lors du chargement du profil', 'error'))
            .finally(() => setLoading(false));
    }, []);

    const handleSubmit = async () => {
        if (!form.nom.trim() || !form.prenom.trim()) {
            toast('Nom et prénom sont requis', 'error');
            return;
        }
        if (!form.tarif_consultation || parseFloat(form.tarif_consultation) < 0) {
            toast('Tarif invalide', 'error');
            return;
        }

        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('nom', form.nom);
            fd.append('prenom', form.prenom);
            fd.append('specialite', form.specialite);
            fd.append('numero_ordre', form.numero_ordre);
            fd.append('tarif_consultation', form.tarif_consultation);
            if (photoFile) fd.append('photo', photoFile);

            await updateDoctorProfile(fd);
            toast('Profil mis à jour avec succès', 'success');
        } catch {
            toast('Erreur lors de la mise à jour', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Spinner />
        </div>
    );

    if (!profile) return null;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
            <Navbar />
            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }}>
                <button
                    onClick={() => navigate('/doctor/dashboard')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-secondary)', marginBottom: '24px',
                        fontSize: '14px',
                    }}
                >
                    <ArrowLeft size={18} />
                    Retour au tableau de bord
                </button>

                <div className="card animate-fade-up" style={{ padding: '32px' }}>
                    <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '24px', fontWeight: '700', marginBottom: '8px',
                    }}>
                        Mon profil
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                        Modifiez vos informations professionnelles
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Photo */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            {profile.photo ? (
                                <img
                                    src={profile.photo}
                                    alt="Photo de profil"
                                    style={{
                                        width: '80px', height: '80px', borderRadius: '50%',
                                        objectFit: 'cover', border: '3px solid var(--border)',
                                    }}
                                />
                            ) : (
                                <div style={{
                                    width: '80px', height: '80px', borderRadius: '50%',
                                    background: 'var(--bg-subtle)', border: '2px dashed var(--border)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <ImagePlus size={32} color="var(--text-muted)" />
                                </div>
                            )}
                            <div>
                                <label style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                    padding: '8px 16px', borderRadius: '8px',
                                    border: '1.5px solid var(--border)', cursor: 'pointer',
                                    fontSize: '14px', color: 'var(--text-secondary)',
                                    transition: 'border-color .2s',
                                }}>
                                    Changer la photo
                                    <input
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={e => setPhotoFile(e.target.files?.[0] ?? null)}
                                    />
                                </label>
                                {photoFile && (
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        {photoFile.name}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Email (lecture seule) */}
                        <div className="form-group">
                            <label className="label">Email</label>
                            <input
                                className="input"
                                value={profile.email}
                                disabled
                                style={{ opacity: 0.6, cursor: 'not-allowed' }}
                            />
                        </div>

                        {/* Nom / Prénom */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div className="form-group">
                                <label className="label">Prénom</label>
                                <input
                                    className="input"
                                    value={form.prenom}
                                    onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Nom</label>
                                <input
                                    className="input"
                                    value={form.nom}
                                    onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Spécialité */}
                        <div className="form-group">
                            <label className="label">Spécialité</label>
                            <input
                                className="input"
                                placeholder="Ex : Généraliste, Cardiologue..."
                                value={form.specialite}
                                onChange={e => setForm(p => ({ ...p, specialite: e.target.value }))}
                            />
                        </div>

                        {/* N° Ordre */}
                        <div className="form-group">
                            <label className="label">N° Ordre médecin</label>
                            <input
                                className="input"
                                placeholder="Ex : 12345"
                                value={form.numero_ordre}
                                onChange={e => setForm(p => ({ ...p, numero_ordre: e.target.value }))}
                            />
                        </div>

                        {/* Tarif */}
                        <div className="form-group">
                            <label className="label">Tarif de consultation (DNT)</label>
                            <input
                                className="input"
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.tarif_consultation}
                                onChange={e => setForm(p => ({ ...p, tarif_consultation: e.target.value }))}
                                style={{ fontWeight: '600' }}
                            />
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Ce tarif sera affiché aux pharmaciens lors de la sélection du médecin
                            </p>
                        </div>

                        {/* Bouton */}
                        <button
                            className="btn btn-primary btn-full btn-lg"
                            onClick={handleSubmit}
                            disabled={saving}
                            style={{ marginTop: '8px' }}
                        >
                            {saving ? <><Spinner size="sm" /> Enregistrement...</> : <><Save size={18} /> Enregistrer</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
