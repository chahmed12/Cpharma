import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    getQueue,
    getHistory,
    updateConsultationStatus,
    type Consultation,
} from '../services/consultationService';
import { updateDoctorStatus, getDoctorStatus } from '../services/medecinService';
import { getDoctorRevenues, type RevenusData } from '../services/paymentService';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/ui/Navbar';
import { CheckCircle, User, Settings, TrendingUp } from 'lucide-react';
import { getAge, formatCurrency } from '../utils/date';
import { useToast } from '../hooks/useToast';

export default function DoctorDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const toast = useToast().toast;
    const [queue, setQueue] = useState<Consultation[]>([]);
    const [history, setHistory] = useState<Consultation[]>([]);
    const [revenues, setRevenues] = useState<RevenusData | null>(null);
    const [loading, setLoading] = useState(true);
    const [myStatus, setMyStatus] = useState<'ONLINE' | 'OFFLINE' | 'BUSY'>('OFFLINE');
    const [toggling, setToggling] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [showRevenus, setShowRevenus] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Load essential data first (queue + status)
    useEffect(() => {
        const controller = new AbortController();
        Promise.all([
            getQueue({ signal: controller.signal }),
            getDoctorStatus({ signal: controller.signal }),
        ])
            .then(([q, s]) => {
                setQueue(q);
                if (s === 'ONLINE' || s === 'OFFLINE') setMyStatus(s);
                else if (s === 'BUSY') setMyStatus('OFFLINE');
            })
            .catch(err => {
                if (err.name === 'CanceledError') return;
                console.error(err);
                toast('Erreur lors du chargement.', 'error');
            })
            .finally(() => setLoading(false));

        return () => controller.abort();
    }, [toast]);

    // Load secondary data lazily when needed
    useEffect(() => {
        const controller = new AbortController();
        
        const promises: Promise<unknown>[] = [];
        if (showRevenus && !revenues) {
            promises.push(getDoctorRevenues({ signal: controller.signal }));
        } else {
            promises.push(Promise.resolve(null));
        }
        
        if (showHistory && history.length === 0) {
            promises.push(
                getHistory({ signal: controller.signal, params: { status: 'COMPLETED,CANCELLED' } })
            );
        } else {
            promises.push(Promise.resolve(null));
        }

        Promise.all(promises)
            .then(([r, h]) => {
                if (r) setRevenues(r as RevenusData);
                if (h) setHistory((h as { results: Consultation[] }).results);
            })
            .catch(err => {
                if (err.name !== 'CanceledError') console.error(err);
            });

        return () => controller.abort();
    }, [showRevenus, showHistory, revenues, history.length]);

    useSocket('new_patient', (data) => {
        const c = data as Consultation;
        if (c?.id && c?.patient_details) {
            setQueue(prev => [c, ...prev]);
        }
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
        setActionLoading(id);
        try {
            await updateConsultationStatus(id, 'ACTIVE');
            setQueue(prev => prev.filter(c => c.id !== id));
            toast('Consultation acceptée !', 'success');
            navigate(`/doctor/video/${id}`);
        } catch {
            toast('Erreur lors de l\'acceptation de la consultation.', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const refuseConsultation = async (id: number) => {
        toast('Consultation refusée.', 'info');
        try {
            await updateConsultationStatus(id, 'CANCELLED');
            setQueue(prev => prev.filter(c => c.id !== id));
            toast('Consultation refusée.', 'success');
        } catch {
            toast('Erreur lors du refus de la consultation.', 'error');
        }
    };

    const isOnline = myStatus === 'ONLINE';

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {user?.photo_url && (
                            <img 
                                src={user.photo_url} 
                                alt="Profil médecin"
                                style={{
                                    width: '64px', height: '64px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '2px solid var(--border)',
                                }}
                            />
                        )}
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
                    </div>

                    <Link
                        to="/doctor/profile"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 16px', borderRadius: '8px',
                            border: '1.5px solid var(--border)',
                            background: 'var(--bg-card)', color: 'var(--text-secondary)',
                            textDecoration: 'none', fontSize: '14px',
                            transition: 'border-color .2s',
                        }}
                    >
                        <Settings size={16} />
                        Modifier mon profil
                    </Link>

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
                        <div style={{
                            width: '10px', height: '10px',
                            borderRadius: '50%',
                            background: isOnline ? 'var(--green-500)' : 'var(--text-muted)',
                            boxShadow: isOnline ? '0 0 8px rgba(34,197,94,.6)' : 'none',
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
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.3' }}>
                                {isOnline ? 'Cliquer pour passer hors ligne' : 'Cliquer pour être disponible'}
                            </p>
                        </div>
                    </button>
                </div>

                {/* File d'attente */}
                <section style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <p className="section-title" style={{ margin: 0 }}>File d'attente</p>
                        {queue.length > 0 && (
                            <span style={{
                                background: 'var(--blue-600)', color: '#fff',
                                fontSize: '11px', fontWeight: '700',
                                padding: '2px 8px', borderRadius: '20px',
                            }}>
                                {queue.length}
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {loading ? (
                            [1, 2].map(i => (
                                <div key={i} className="card queue-item">
                                    <div className="skeleton" style={{ width: '44px', height: '44px', flexShrink: 0, borderRadius: '12px' }} />
                                    <div style={{ flex: 1 }}>
                                        <div className="skeleton" style={{ width: '55%', height: '15px', marginBottom: '8px' }} />
                                        <div className="skeleton" style={{ width: '80%', height: '12px' }} />
                                    </div>
                                    <div className="skeleton" style={{ width: '90px', height: '36px', borderRadius: '8px' }} />
                                </div>
                            ))
                        ) : queue.length === 0 ? (
                            <div className="card-flat" style={{ padding: '48px', textAlign: 'center' }}>
                                <CheckCircle size={48} className="text-green-500 mx-auto" style={{ marginBottom: '10px' }} />
                                <p style={{ fontWeight: '600', marginBottom: '4px' }}>Aucun patient en attente</p>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Passez en ligne pour recevoir des consultations</p>
                            </div>
                        ) : (
                            queue.map((c, i) => (
                                <div key={c.id} className={`card animate-fade-up delay-${(i % 4) + 1}`}
                                    style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{
                                        width: '44px', height: '44px', flexShrink: 0,
                                        background: 'var(--green-50)', border: '1px solid var(--green-100)',
                                        borderRadius: '12px', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <User size={24} className={c.patient_details.sexe === 'F' ? 'text-pink-500' : 'text-blue-500'} />
                                    </div>
                                    <div className="queue-item-content">
                                        <p style={{ fontWeight: '700', fontSize: '15px', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {c.patient_details.prenom} {c.patient_details.nom}
                                            {c.patient_details.date_naissance && (
                                                <span style={{ fontWeight: '400', color: 'var(--text-muted)', fontSize: '13px', marginLeft: '8px' }}>
                                                    {getAge(c.patient_details.date_naissance)} ans
                                                </span>
                                            )}
                                        </p>
                                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {c.motif}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                        <button 
                                            className="btn btn-danger" 
                                            onClick={() => refuseConsultation(c.id)}
                                            style={{ padding: '8px 16px', fontSize: '13px' }}
                                            disabled={actionLoading !== null}
                                        >
                                            Refuser
                                        </button>
                                        <button 
                                            className="btn btn-primary" 
                                            onClick={() => acceptConsultation(c.id)}
                                            disabled={actionLoading !== null}
                                        >
                                            {actionLoading === c.id ? '...' : 'Accepter →'}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Revenus — lazy loaded */}
                <section style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <p className="section-title" style={{ margin: 0 }}>Mes revenus</p>
                        <Link
                            to="/doctor/finances"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '6px 12px', borderRadius: '6px',
                                background: 'var(--bg-subtle)', color: 'var(--blue-600)',
                                textDecoration: 'none', fontSize: '13px', fontWeight: '600',
                            }}
                        >
                            <TrendingUp size={14} />
                            Détails
                        </Link>
                    </div>
                    {!showRevenus ? (
                        <button 
                            className="btn btn-secondary"
                            onClick={() => setShowRevenus(true)}
                        >
                            Charger mes revenus
                        </button>
                    ) : !revenues ? (
                        <p style={{ color: 'var(--text-muted)' }}>Chargement...</p>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
                                <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Total net encaissé</p>
                                <p style={{ fontSize: '28px', fontWeight: '800', color: 'var(--green-700)', lineHeight: '1' }}>{formatCurrency(revenues.total_net)} <span style={{ fontSize: '14px' }}>DNT</span></p>
                            </div>
                            <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
                                <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Consultations payées</p>
                                <p style={{ fontSize: '28px', fontWeight: '800', color: 'var(--blue-600)', lineHeight: '1' }}>{revenues.nb_consultations}</p>
                            </div>
                        </div>
                    )}
                </section>

                {/* Historique — lazy loaded */}
                <section>
                    <p className="section-title">Consultations récentes</p>
                    {!showHistory ? (
                        <button 
                            className="btn btn-secondary"
                            onClick={() => setShowHistory(true)}
                        >
                            Charger l'historique
                        </button>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {!revenues && history.length === 0 && (
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Chargement...</p>
                            )}
                            {history.length === 0 && revenues && (
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Aucune consultation terminée.</p>
                            )}
                            {history.slice(0, 5).map(c => (
                            <div key={c.id} className="card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>
                                        {c.patient_details.prenom} {c.patient_details.nom}
                                    </p>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.motif}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {new Date(c.created_at).toLocaleDateString('fr-FR')}
                                    </p>
                                    <span style={{
                                        fontSize: '11px', fontWeight: '600', padding: '2px 8px',
                                        borderRadius: '20px',
                                        background: c.status === 'COMPLETED' ? 'var(--green-50)' : 'var(--bg-subtle)',
                                        color: c.status === 'COMPLETED' ? 'var(--green-700)' : 'var(--text-muted)',
                                    }}>
                                        {c.status === 'COMPLETED' ? 'Terminée' : 'Annulée'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    )}
                </section>

            </div>
        </div>
    );
}
