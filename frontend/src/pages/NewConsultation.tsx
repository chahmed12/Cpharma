import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createConsultation } from '../services/consultationService';
import { Navbar } from '../components/ui/Navbar';
import { Spinner } from '../components/ui/Spinner';

interface Doctor {
    id: number;
    nom: string;
    prenom: string;
    specialite: string;
}

export default function NewConsultation() {
    const navigate = useNavigate();
    const location = useLocation();

    // Médecin pré-sélectionné depuis PharmacistDashboard
    const selectedDoctor: Doctor | null =
        location.state?.selectedDoctor ?? null;

    const [form, setForm] = useState({
        patient_nom: '',
        patient_age: '',
        patient_motif: '',
        patient_sexe: 'M' as 'M' | 'F',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const set = (k: string, v: string) =>
        setForm(p => ({ ...p, [k]: v }));

    const handleSubmit = async () => {
        if (!form.patient_nom.trim() || !form.patient_motif.trim()) {
            setError('Le nom et le motif sont obligatoires.');
            return;
        }
        if (!selectedDoctor) {
            setError('Aucun médecin sélectionné. Retournez au tableau de bord.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            // Crée la consultation → le backend notifie le médecin via WebSocket
            const consultation = await createConsultation({
                medecin_id: selectedDoctor.id,
                patient_nom: form.patient_nom,
                patient_age: Number(form.patient_age),
                patient_motif: form.patient_motif,
                patient_sexe: form.patient_sexe,
            });

            // Redirection vers la salle d'attente
            navigate(`/pharmacist/waiting/${consultation.id}`);

        } catch {
            setError('Erreur lors de la création de la consultation.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-lg mx-auto p-6">
                <button
                    onClick={() => navigate('/pharmacist/dashboard')}
                    className="text-sm text-gray-400 hover:text-gray-600 mb-4 block"
                >
                    ← Retour au tableau de bord
                </button>

                <h1 className="text-2xl font-bold mb-2">Nouvelle consultation</h1>

                {/* Médecin sélectionné */}
                {selectedDoctor && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {selectedDoctor.prenom[0]}{selectedDoctor.nom[0]}
                        </div>
                        <div>
                            <p className="font-semibold text-blue-800">
                                Dr. {selectedDoctor.prenom} {selectedDoctor.nom}
                            </p>
                            <p className="text-sm text-blue-600">{selectedDoctor.specialite} — En ligne</p>
                        </div>
                    </div>
                )}

                {/* Formulaire patient */}
                <div className="bg-white border rounded-2xl p-6 flex flex-col gap-4">
                    <h2 className="font-semibold text-gray-700">Informations du patient</h2>

                    {/* Nom */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">
                            Nom complet *
                        </label>
                        <input
                            placeholder="Ex : Ahmed Benali"
                            value={form.patient_nom}
                            onChange={e => set('patient_nom', e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Age + Sexe */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Âge</label>
                            <input
                                type="number"
                                placeholder="35"
                                min="0" max="120"
                                value={form.patient_age}
                                onChange={e => set('patient_age', e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Sexe</label>
                            <select
                                value={form.patient_sexe}
                                onChange={e => set('patient_sexe', e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="M">Masculin</option>
                                <option value="F">Féminin</option>
                            </select>
                        </div>
                    </div>

                    {/* Motif */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">
                            Motif de consultation *
                        </label>
                        <textarea
                            placeholder="Décrire brièvement les symptômes ou la raison de la consultation..."
                            value={form.patient_motif}
                            onChange={e => set('patient_motif', e.target.value)}
                            rows={3}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2.5">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading && <Spinner size="sm" />}
                        {loading ? 'Envoi au médecin...' : 'Démarrer la consultation →'}
                    </button>
                </div>
            </div>
        </div>
    );
}