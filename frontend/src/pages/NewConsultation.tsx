import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createConsultation } from '../services/consultationService';
import { searchPatients, createPatient, type Patient } from '../services/patientService';
import { Navbar } from '../components/ui/Navbar';
import { Spinner } from '../components/ui/Spinner';

export default function NewConsultation() {
    const navigate = useNavigate();
    const location = useLocation();
    const selectedDoctor = location.state?.selectedDoctor;

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    
    // Formulaire nouveau patient
    const [newPatient, setNewPatient] = useState({
        nom: '', prenom: '', telephone: '', date_naissance: '', sexe: 'M' as 'M' | 'F',
        medical_record: { allergies: '', antecedents: '', groupe_sanguin: '' }
    });

    const [motif, setMotif] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Recherche temps réel
    useEffect(() => {
        if (searchQuery.length > 2) {
            searchPatients(searchQuery).then(setSearchResults);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery]);

    const handleSubmit = async () => {
        if (!selectedDoctor) return setError("Médecin non sélectionné");
        if (!motif) return setError("Motif obligatoire");

        setLoading(true);
        try {
            let patientId = selectedPatient?.id;

            // Si nouveau patient, on le crée d'abord
            if (isCreatingNew) {
                const created = await createPatient(newPatient);
                patientId = created.id;
            }

            if (!patientId) throw new Error("Patient manquant");

            const consultation = await createConsultation({
                medecin_id: selectedDoctor.id,
                patient_id: patientId,
                motif
            } as any);

            navigate(`/pharmacist/waiting/${consultation.id}`);
        } catch (err) {
            setError("Erreur lors de la création");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="page-content-narrow">
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', marginBottom: '20px' }}>
                    Nouvelle Consultation
                </h1>

                {/* Étape 1 : Sélection Patient */}
                <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
                    <p className="section-title">1. Sélection du Patient</p>
                    
                    {!selectedPatient && !isCreatingNew && (
                        <div>
                            <input 
                                className="input" 
                                placeholder="Rechercher par nom ou téléphone..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            <div style={{ marginTop: '10px' }}>
                                {searchResults.map(p => (
                                    <div 
                                        key={p.id} 
                                        onClick={() => setSelectedPatient(p)}
                                        style={{ padding: '10px', borderBottom: '1px solid #eee', cursor: 'pointer' }}
                                    >
                                        {p.prenom} {p.nom} - {p.telephone}
                                    </div>
                                ))}
                                <button 
                                    className="btn btn-secondary btn-sm" 
                                    style={{ marginTop: '10px', width: '100%' }}
                                    onClick={() => setIsCreatingNew(true)}
                                >
                                    + Nouveau Patient
                                </button>
                            </div>
                        </div>
                    )}

                    {selectedPatient && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ fontWeight: 'bold' }}>{selectedPatient.prenom} {selectedPatient.nom}</p>
                                <p style={{ fontSize: '12px', color: 'gray' }}>Tél: {selectedPatient.telephone}</p>
                            </div>
                            <button className="btn btn-sm" onClick={() => setSelectedPatient(null)}>Changer</button>
                        </div>
                    )}

                    {isCreatingNew && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <input className="input" placeholder="Prénom" onChange={e => setNewPatient({...newPatient, prenom: e.target.value})} />
                                <input className="input" placeholder="Nom" onChange={e => setNewPatient({...newPatient, nom: e.target.value})} />
                            </div>
                            <input className="input" placeholder="Téléphone" onChange={e => setNewPatient({...newPatient, telephone: e.target.value})} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <input className="input" type="date" onChange={e => setNewPatient({...newPatient, date_naissance: e.target.value})} />
                                <select className="input" onChange={e => setNewPatient({...newPatient, sexe: e.target.value as any})}>
                                    <option value="M">Masculin</option>
                                    <option value="F">Féminin</option>
                                </select>
                            </div>
                            <p className="section-title" style={{ marginTop: '10px' }}>Infos Médicales (Optionnel)</p>
                            <textarea 
                                className="input" 
                                placeholder="Allergies (ex: Pénicilline)" 
                                onChange={e => setNewPatient({...newPatient, medical_record: {...newPatient.medical_record, allergies: e.target.value}})} 
                            />
                            <button className="btn btn-sm" onClick={() => setIsCreatingNew(false)}>Annuler</button>
                        </div>
                    )}
                </div>

                {/* Étape 2 : Motif */}
                <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
                    <p className="section-title">2. Motif de consultation</p>
                    <textarea 
                        className="input" 
                        placeholder="Pourquoi le patient consulte-t-il ?" 
                        rows={3}
                        value={motif}
                        onChange={e => setMotif(e.target.value)}
                    />
                </div>

                {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}

                <button 
                    className="btn btn-primary btn-full btn-lg" 
                    onClick={handleSubmit}
                    disabled={loading || (!selectedPatient && !isCreatingNew)}
                >
                    {loading ? <Spinner size="sm" /> : 'Démarrer la consultation →'}
                </button>
            </div>
        </div>
    );
}
