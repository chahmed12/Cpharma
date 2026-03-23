import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getConsultation } from '../services/consultationService';
import type { Patient } from '../services/patientService';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/ui/Navbar';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../hooks/useToast';
import { AlertTriangle, FileText } from 'lucide-react';

export interface Medicament {
    id: string;
    nom: string;
    posologie: string;
    duree: string;
}

export interface OrdonnanceData {
    consultation_id: number;
    patient: {
        nom: string;
        prenom?: string;
        date_naissance?: string;
        motif?: string;
    };
    medicaments: Medicament[];
    instructions: string;
    medecin_nom: string;
    date: string;
}

const newMed = (): Medicament => ({
    id: crypto.randomUUID(),
    nom: '',
    posologie: '',
    duree: '',
});

export default function PrescriptionForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [meds, setMeds] = useState<Medicament[]>([newMed()]);
    const [instructions, setInstructions] = useState('');
    const [loading, setLoading] = useState(true);
    const toast = useToast().toast;

    useEffect(() => {
        const controller = new AbortController();
        if (id) {
            getConsultation(Number(id), { signal: controller.signal })
                .then(c => {
                    // On utilise patient_details qui vient du backend
                    setPatient(c.patient_details);
                })
                .catch(err => {
                    if (err.name === 'CanceledError') return;
                    console.error("Erreur chargement consultation:", err);
                    toast("Impossible de charger les données.", "error");
                })
                .finally(() => setLoading(false));
        }
        return () => controller.abort();
    }, [id, toast]);

    const updateMed = (medId: string, field: keyof Medicament, val: string) =>
        setMeds(prev => prev.map(m => m.id === medId ? { ...m, [field]: val } : m));

    const removeMed = (medId: string) =>
        setMeds(prev => prev.filter(m => m.id !== medId));

    const handleNext = () => {
        const filled = meds.filter(m => m.nom.trim());
        if (filled.length === 0) {
            toast('Ajoutez au moins un médicament.', 'error');
            return;
        }
        if (!patient) return;

        navigate(`/doctor/sign/${id}`, {
            state: {
                consultation_id: Number(id),
                patient: {
                    nom: patient.nom,
                    prenom: patient.prenom,
                    date_naissance: patient.date_naissance,
                },
                medicaments: filled,
                instructions,
                medecin_nom: `Dr. ${user?.prenom} ${user?.nom}`,
                date: new Date().toISOString(),
            },
        });
    };

    if (loading) return <Spinner center dark size="lg" label="Chargement..." />;

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="page-content-narrow">
                <div className="animate-fade-up" style={{ marginBottom: '24px' }}>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', marginBottom: '4px' }}>Rédiger l'ordonnance</h1>
                </div>

                {patient && (
                    <div style={{ background: 'var(--blue-50)', border: '1px solid var(--blue-100)', borderRadius: 'var(--radius-md)', padding: '14px 18px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '10px' }}>
                            <div>
                                <p style={{ fontSize: '11px', color: 'var(--blue-600)', fontWeight: '700', textTransform: 'uppercase' }}>Patient</p>
                                <p style={{ fontWeight: '700', color: 'var(--blue-800)' }}>{patient.prenom} {patient.nom}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '11px', color: 'var(--blue-600)', fontWeight: '700', textTransform: 'uppercase' }}>Âge</p>
                                <p style={{ fontWeight: '600', color: 'var(--blue-800)' }}>
                                {/* Bug B7 fix : calcul d'âge correct (mois/jour inclus) */}
                                {(() => {
                                    const b = new Date(patient.date_naissance);
                                    const n = new Date();
                                    let age = n.getFullYear() - b.getFullYear();
                                    if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) age--;
                                    return <>{age} ans</>;
                                })()}
                                </p>
                            </div>
                        </div>
                        {patient.medical_record && (patient.medical_record.allergies || patient.medical_record.antecedents) && (
                            <div style={{ borderTop: '1px solid var(--blue-200)', paddingTop: '10px', marginTop: '10px' }}>
                                {patient.medical_record.allergies && <p style={{ fontSize: '13px', color: 'var(--red-600)', display: 'flex', alignItems: 'center' }}><AlertTriangle className="mr-1" size={16} /> <strong>Allergies :</strong> {patient.medical_record.allergies}</p>}
                                {patient.medical_record.antecedents && <p style={{ fontSize: '13px', color: 'var(--blue-800)', display: 'flex', alignItems: 'center' }}><FileText className="mr-1" size={16} /> <strong>Antécédents :</strong> {patient.medical_record.antecedents}</p>}
                            </div>
                        )}
                    </div>
                )}

                <div style={{ marginBottom: '24px' }}>
                    <p className="section-title">Médicaments prescrits</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {meds.map((m, i) => (
                            <div key={m.id} className="card animate-fade-up" style={{ padding: '16px 18px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>Médicament n°{i + 1}</span>
                                    {meds.length > 1 && <button onClick={() => removeMed(m.id)} className="btn btn-secondary btn-sm" style={{ color: 'var(--red-600)' }}>Supprimer</button>}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
                                    <input className="input" placeholder="Nom" value={m.nom} onChange={e => updateMed(m.id, 'nom', e.target.value)} />
                                    <input className="input" placeholder="Posologie" value={m.posologie} onChange={e => updateMed(m.id, 'posologie', e.target.value)} />
                                    <input className="input" placeholder="Durée" value={m.duree} onChange={e => updateMed(m.id, 'duree', e.target.value)} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="btn btn-secondary btn-full" onClick={() => setMeds(p => [...p, newMed()])} style={{ marginTop: '10px' }}>＋ Ajouter un médicament</button>
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                    <label className="label">Instructions complémentaires</label>
                    <textarea className="input" rows={3} placeholder="Ex : Prendre avec de la nourriture..." value={instructions} onChange={e => setInstructions(e.target.value)} />
                </div>

                <button className="btn btn-primary btn-full btn-lg" onClick={handleNext}>Prévisualiser l'ordonnance →</button>
            </div>
        </div>
    );
}
