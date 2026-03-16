import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAvailableDoctors, type Doctor } from '../services/medecinService';
import { getQueue, type Consultation } from '../services/consultationService';
import { useSocket } from '../hooks/useSocket';
import { Navbar } from '../components/ui/Navbar';
import { Spinner } from '../components/ui/Spinner';

const STATUS_BADGE = {
    ONLINE: 'bg-green-100 text-green-700',
    BUSY: 'bg-amber-100 text-amber-700',
    OFFLINE: 'bg-gray-100 text-gray-500',
};

export default function PharmacistDashboard() {
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [history, setHistory] = useState<Consultation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getAvailableDoctors(), getQueue()]).then(([d, h]) => {
            setDoctors(d);
            setHistory(h);
        }).finally(() => setLoading(false));
    }, []);

    // Mise à jour statut médecin en temps réel via WebSocket
    useSocket('doctor_status_changed', (data) => {
        const { doctor_id, status } = data as any;
        setDoctors(prev =>
            prev.map(d => d.id === doctor_id ? { ...d, status } : d)
        );
    });

    if (loading) return (
        <div className="flex items-center justify-center h-screen">
            <Spinner size="lg" label="Chargement..." />
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-5xl mx-auto p-6">
                <h1 className="text-2xl font-bold mb-6">Tableau de bord</h1>

                {/* Médecins disponibles */}
                <section className="mb-8">
                    <h2 className="text-lg font-semibold mb-3">
                        Médecins disponibles
                        <span className="ml-2 text-sm text-green-600 font-normal">
                            {doctors.filter(d => d.status === 'ONLINE').length} en ligne
                        </span>
                    </h2>

                    {doctors.length === 0
                        ? <p className="text-gray-400 text-sm">Aucun médecin disponible</p>
                        : <div className="grid grid-cols-2 gap-3">
                            {doctors.map(doc => (
                                <div key={doc.id}
                                    className="bg-white border rounded-xl p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold">Dr. {doc.prenom} {doc.nom}</p>
                                        <p className="text-sm text-gray-400">{doc.specialite}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${(STATUS_BADGE as any)[doc.status]
                                            }`}>{doc.status}</span>
                                        {doc.status === 'ONLINE' && (
                                            <button
                                                onClick={() => navigate(
                                                    '/pharmacist/new-consultation',
                                                    { state: { selectedDoctor: doc } }
                                                )}
                                                className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700"
                                            >
                                                Consulter
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    }
                </section>

                {/* Historique */}
                <section>
                    <h2 className="text-lg font-semibold mb-3">Consultations récentes</h2>
                    <div className="flex flex-col gap-2">
                        {history.slice(0, 5).map(c => (
                            <div key={c.id}
                                className="bg-white border rounded-xl px-4 py-3 flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-sm">{c.patient.nom}</p>
                                    <p className="text-xs text-gray-400">{c.patient.motif}</p>
                                </div>
                                <span className="text-xs text-gray-400">
                                    {new Date(c.created_at).toLocaleDateString('fr-FR')}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}