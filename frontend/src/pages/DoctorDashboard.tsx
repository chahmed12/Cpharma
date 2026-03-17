import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getQueue,
    updateConsultationStatus,
    type Consultation,
} from '../services/consultationService';
import { updateDoctorStatus } from '../services/medecinService';
import { useSocket } from '../hooks/useSocket';
import { Navbar } from '../components/ui/Navbar';

export default function DoctorDashboard() {
    const navigate = useNavigate();
    const [queue, setQueue] = useState<Consultation[]>([]);
    const [loading, setLoading] = useState(true);
    const [myStatus, setMyStatus] = useState<'ONLINE' | 'OFFLINE'>('OFFLINE');
    const [toggling, setToggling] = useState(false);

    useEffect(() => {
        getQueue().then(setQueue).finally(() => setLoading(false));
    }, []);

    useSocket('new_patient', (data) => {
        setQueue(prev => [data as Consultation, ...prev]);
    });

    const toggleStatus = async () => {
        const next = myStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
        setToggling(true);
        try {
            await updateDoctorStatus(next);
            setMyStatus(next);
        } finally {
            setToggling(false);
        }
    };

    const acceptConsultation = async (id: number) => {
        await updateConsultationStatus(id, 'ACTIVE');
        setQueue(prev => prev.filter(c => c.id !== id));
        navigate(`/doctor/video/${id}`);
    };

    const isOnline = myStatus === 'ONLINE';

    // Helper pour calculer l'âge
    const getAge = (dateNaissance: string) => {
        return new Date().getFullYear() - new Date(dateNaissance).getFullYear();
    };

    return (
        <div className="page-wrapper">
            <Navbar />
            <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px' }}>

                {/* Header + toggle statut */}
                <div className="animate-fade-up" style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', marginBottom: '36px',
                    flexWrap: 'wrap', gap: '16px',
                }}>
                    <div>
                        <h1 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '26px', fontWeight: '700',
                            marginBottom: '6px',
                        }}>Mon espace</h1>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                            {queue.length === 0
                                ? 'Aucun patient en attente'
                                : `${queue.length} patient${queue.length > 1 ? 's' : ''} en attente`
                            }
                        </p>
                    </div>

                    {/* Toggle statut */}
                    <button
                        onClick={toggleStatus}
                        disabled={toggling}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '12px 20px',
                            border: `2px solid ${isOnline ? 'var(--green-100)' : 'var(--border)'}`,
                            borderRadius: 'var(--radius-md)',
                            background: isOnline ? 'var(--green-50)' : 'var(--bg-card)',
                            cursor: toggling ? 'wait' : 'pointer',
                            transition: 'all .25s',
                            fontFamily: 'var(--font-body)',
                            boxShadow: 'var(--shadow-sm)',
                        }}
                    >
                        {/* Indicateur lumineux */}
                        <div style={{
                            width: '10px', height: '10px',
                            borderRadius: '50%',
                            background: isOnline ? 'var(--green-500)' : 'var(--text-muted)',
                            boxShadow: isOnline
                                ? '0 0 8px rgba(34,197,94,.6)'
                                : 'none',
                            transition: 'all .25s',
                            flexShrink: 0,
                        }} />
                        <div>
                            <p style={{
                                fontWeight: '700', fontSize: '13px',
                                color: isOnline ? 'var(--green-700)' : 'var(--text-secondary)',
                                margin: 0, lineHeight: '1.3',
                            }}>
                                {isOnline ? 'En ligne' : 'Hors ligne'}
                            </p>
                            <p style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                margin: 0, lineHeight: '1.3',
                            }}>
                                {isOnline ? 'Cliquer pour passer hors ligne' : 'Cliquer pour être disponible'}
                            </p>
                        </div>
                    </button>
                </div>

                {/* File d'attente */}
                <section>
                    <div style={{
                        display: 'flex', alignItems: 'center',
                        gap: '10px', marginBottom: '14px',
                    }}>
                        <p className="section-title" style={{ margin: 0 }}>File d'attente</p>
                        {queue.length > 0 && (
                            <span style={{
                                background: 'var(--blue-600)',
                                color: '#fff',
                                fontSize: '11px', fontWeight: '700',
                                padding: '2px 8px',
                                borderRadius: '20px',
                            }}>
                                {queue.length}
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {loading
                            ? [1, 2].map(i => (
                                <div key={i} className="card"
                                    style={{ padding: '18px 20px', display: 'flex', gap: '14px', alignItems: 'center' }}>
                                    <div className="skeleton" style={{ width: '44px', height: '44px', flexShrink: 0, borderRadius: '12px' }} />
                                    <div style={{ flex: 1 }}>
                                        <div className="skeleton" style={{ width: '55%', height: '15px', marginBottom: '8px' }} />
                                        <div className="skeleton" style={{ width: '80%', height: '12px' }} />
                                    </div>
                                    <div className="skeleton" style={{ width: '90px', height: '36px', borderRadius: '8px' }} />
                                </div>
                            ))
                            : queue.length === 0
                                ? (
                                    <div className="card-flat" style={{
                                        padding: '48px', textAlign: 'center',
                                    }}>
                                        <p style={{ fontSize: '36px', marginBottom: '10px' }}>✅</p>
                                        <p style={{
                                            fontWeight: '600', marginBottom: '4px',
                                        }}>
                                            Aucun patient en attente
                                        </p>
                                        <p style={{
                                            fontSize: '13px', color: 'var(--text-muted)',
                                        }}>
                                            Passez en ligne pour recevoir des consultations
                                        </p>
                                    </div>
                                )
                                : queue.map((c, i) => (
                                    <div
                                        key={c.id}
                                        className={`card animate-fade-up delay-${(i % 4) + 1}`}
                                        style={{
                                            padding: '18px 20px',
                                            display: 'flex', alignItems: 'center', gap: '16px',
                                        }}
                                    >
                                        {/* Avatar patient */}
                                        <div style={{
                                            width: '44px', height: '44px', flexShrink: 0,
                                            background: 'var(--green-50)',
                                            border: '1px solid var(--green-100)',
                                            borderRadius: '12px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '20px',
                                        }}>
                                            {c.patient_details.sexe === 'F' ? '👩' : '👨'}
                                        </div>

                                        {/* Infos patient */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{
                                                fontWeight: '700', fontSize: '15px',
                                                marginBottom: '3px',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>
                                                {c.patient_details.prenom} {c.patient_details.nom}
                                                {c.patient_details.date_naissance && (
                                                    <span style={{ fontWeight: '400', color: 'var(--text-muted)', fontSize: '13px', marginLeft: '8px' }}>
                                                        {getAge(c.patient_details.date_naissance)} ans
                                                    </span>
                                                )}
                                            </p>
                                            <p style={{
                                                fontSize: '13px', color: 'var(--text-secondary)',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>
                                                {c.motif}
                                            </p>
                                        </div>

                                        {/* Bouton accepter */}
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => acceptConsultation(c.id)}
                                            style={{ flexShrink: 0 }}
                                        >
                                            Accepter →
                                        </button>
                                    </div>
                                ))
                        }
                    </div>
                </section>

            </div>
        </div>
    );
}
