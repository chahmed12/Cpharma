import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQueue, updateConsultationStatus, type Consultation }
    from '../services/consultationService';
import { updateDoctorStatus } from '../services/medecinService';
import { useSocket } from '../hooks/useSocket';
import { Navbar } from '../components/ui/Navbar';
import { Spinner } from '../components/ui/Spinner';
import { RevenusSection } from '../components/ui/RevenusSection';

export default function DoctorDashboard() {
    const navigate = useNavigate();
    const [queue, setQueue] = useState<Consultation[]>([]);
    const [loading, setLoading] = useState(true);
    const [myStatus, setMyStatus] = useState<'ONLINE' | 'OFFLINE'>('OFFLINE');

    useEffect(() => {
        getQueue().then(setQueue).finally(() => setLoading(false));
    }, []);

    // Nouveau patient entrant via WebSocket
    useSocket('new_patient', (data) => {
        const c = data as Consultation;
        setQueue(prev => [c, ...prev]);
    });

    const toggleStatus = async () => {
        const next = myStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
        await updateDoctorStatus(next);
        setMyStatus(next);
    };

    const acceptConsultation = async (id: number) => {
        await updateConsultationStatus(id, 'ACTIVE');
        setQueue(p => p.filter(c => c.id !== id));
        navigate(`/doctor/video/${id}`);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-5xl mx-auto p-6">

                {/* En-tête + toggle statut */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Tableau de bord</h1>
                    <button
                        onClick={toggleStatus}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${myStatus === 'ONLINE'
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                    >
                        {myStatus === 'ONLINE' ? '● En ligne' : '○ Hors ligne'}
                    </button>
                </div>

                {/* File d'attente */}
                <section className="mb-8">
                    <h2 className="text-lg font-semibold mb-3">
                        File d'attente
                        <span className="ml-2 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                            {queue.length}
                        </span>
                    </h2>

                    {loading
                        ? <Spinner />
                        : queue.length === 0
                            ? <p className="text-gray-400 text-sm">Aucun patient en attente</p>
                            : <div className="flex flex-col gap-3">
                                {queue.map(c => (
                                    <div key={c.id}
                                        className="bg-white border rounded-xl p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold">{c.patient.nom}</p>
                                            <p className="text-sm text-gray-400">{c.patient.motif}</p>
                                        </div>
                                        <button
                                            onClick={() => acceptConsultation(c.id)}
                                            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700"
                                        >
                                            Accepter
                                        </button>
                                    </div>
                                ))}
                            </div>
                    }
                </section>

                {/* Revenus (composant phase ⑤) */}
                <RevenusSection />

            </div>
        </div>
    );
}