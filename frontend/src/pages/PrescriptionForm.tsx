import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export interface Medicament {
    nom: string;
    posologie: string;
    duree: string;
}

export interface OrdonnanceData {
    consultation_id: number;
    medecin_nom: string;
    patient_nom: string;
    medicaments: Medicament[];
    instructions: string;
    date: string;
}

const emptyMed = (): Medicament =>
    ({ nom: '', posologie: '', duree: '' });

export default function PrescriptionForm() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [medicaments, setMedicaments] = useState<Medicament[]>([emptyMed()]);
    const [instructions, setInstructions] = useState('');
    const [patientNom, setPatientNom] = useState('');

    const updateMed = (i: number, field: keyof Medicament, val: string) => {
        setMedicaments(prev => prev.map((m, idx) =>
            idx === i ? { ...m, [field]: val } : m
        ));
    };

    const handleSubmit = () => {
        const ordonnance: OrdonnanceData = {
            consultation_id: Number(id),
            medecin_nom: `${user?.prenom} ${user?.nom}`,
            patient_nom: patientNom,
            medicaments: medicaments.filter(m => m.nom.trim()),
            instructions,
            date: new Date().toISOString(),
        };
        // Passe les données à SignatureOrdonnance via state
        navigate(`/doctor/sign/${id}`, { state: { ordonnance } });
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Rédiger l'ordonnance</h1>

            <input
                placeholder="Nom du patient"
                value={patientNom}
                onChange={e => setPatientNom(e.target.value)}
                className="w-full border rounded p-2 mb-4"
            />

            {medicaments.map((m, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                    <input placeholder="Médicament" value={m.nom}
                        onChange={e => updateMed(i, 'nom', e.target.value)}
                        className="border rounded p-2" />
                    <input placeholder="Posologie" value={m.posologie}
                        onChange={e => updateMed(i, 'posologie', e.target.value)}
                        className="border rounded p-2" />
                    <input placeholder="Durée" value={m.duree}
                        onChange={e => updateMed(i, 'duree', e.target.value)}
                        className="border rounded p-2" />
                </div>
            ))}

            <button onClick={() => setMedicaments(p => [...p, emptyMed()])}
                className="text-blue-600 text-sm mb-4 block">
                + Ajouter un médicament
            </button>

            <textarea
                placeholder="Instructions supplémentaires..."
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                className="w-full border rounded p-2 mb-4 h-24"
            />

            <button
                onClick={handleSubmit}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
            >
                Aperçu et Signature →
            </button>
        </div>
    );
}