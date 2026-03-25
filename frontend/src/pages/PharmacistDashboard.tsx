import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAvailableDoctors, type Doctor, type DoctorStatus }
    from '../services/medecinService';
import { getHistory, type Consultation }
    from '../services/consultationService';
import { useSocket } from '../hooks/useSocket';
import { Navbar } from '../components/ui/Navbar';
import { Stethoscope } from 'lucide-react';

// ── Composant skeleton card ────────────────────────
function SkeletonCard() {
    return (
        <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div className="skeleton" style={{ width: '44px', height: '44px', borderRadius: '12px' }} />
                <div className="skeleton" style={{ width: '70px', height: '22px', borderRadius: '20px' }} />
            </div>
            <div className="skeleton" style={{ width: '70%', height: '16px', marginBottom: '8px' }} />
            <div className="skeleton" style={{ width: '50%', height: '12px', marginBottom: '16px' }} />
            <div className="skeleton" style={{ width: '100%', height: '36px', borderRadius: '8px' }} />
        </div>
    );
}

// ── Carte médecin ──────────────────────────────────
function DoctorCard({ doc, index, onStart }: {
    doc: Doctor; index: number; onStart: (doc: Doctor) => void;
}) {
    const isOnline = doc.status === 'ONLINE';
    const isBusy = doc.status === 'BUSY';
    const delayClass = `delay-${(index % 4) + 1}`;
    const badgeClass = isOnline
        ? 'badge badge-online'
        : isBusy ? 'badge badge-busy' : 'badge badge-offline';
    const badgeText = isOnline ? 'Disponible'
        : isBusy ? 'Occupé' : 'Hors ligne';

    return (
        <div className={`card animate-fade-up ${delayClass}`}
            style={{ padding: '20px' }}>

            {/* Header carte — avatar + badge */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '14px',
            }}>
                {/* Avatar : photo si disponible, sinon initiales */}
                {doc.photo ? (
                    <img
                        src={doc.photo}
                        alt={`Dr. ${doc.prenom} ${doc.nom}`}
                        style={{
                            width: '44px', height: '44px', flexShrink: 0,
                            borderRadius: '12px', objectFit: 'cover',
                            border: '2px solid var(--border)',
                        }}
                    />
                ) : (
                    <div style={{
                        width: '44px', height: '44px',
                        background: 'linear-gradient(135deg, var(--blue-600), #6366f1)',
                        borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: '700', fontSize: '15px',
                        flexShrink: 0,
                    }}>
                        {(doc.prenom?.[0] || '?')}{(doc.nom?.[0] || '?')}
                    </div>
                )}

                {/* Badge statut */}{/* Point pulsant pour online */}
                <span className={badgeClass}>
                    {isOnline && (

                        < span style={{
                            display: 'inline-block',
                            width: '6px', height: '6px',
                            borderRadius: '50%',
                            background: 'var(--green-600)',
                            boxShadow: '0 0 0 2px rgba(22,163,74,.3)',
                            animation: 'pulse 2s infinite',
                        }} />
                    )}
                    {badgeText}
                </span>
            </div>

            {/* Nom + spécialité */}
            <p style={{
                fontWeight: '700', fontSize: '15px',
                color: 'var(--text-primary)', marginBottom: '3px',
            }}>
                Dr. {doc.prenom} {doc.nom}
            </p>
            <p style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
                marginBottom: '8px',
            }}>
                {doc.specialite}
            </p>
            {/* Bug B4 fix : afficher le tarif pour informer le patient */}
            <p style={{
                fontSize: '12px',
                fontWeight: '700',
                color: 'var(--green-700)',
                background: 'var(--green-50)',
                borderRadius: '6px',
                padding: '4px 10px',
                display: 'inline-block',
                marginBottom: '16px',
            }}>
                {doc.tarif_consultation ? `${doc.tarif_consultation} DNT / consultation` : 'Tarif non défini'}
            </p>

            {/* Bouton action */}
            {isOnline ? (
                <button
                    className="btn btn-primary btn-full"
                    onClick={() => onStart(doc)}
                >
                    Démarrer une consultation →
                </button>
            ) : (
                <button
                    className="btn btn-secondary btn-full"
                    disabled
                >
                    {isBusy ? 'En consultation...' : 'Non disponible'}
                </button>
            )}
        </div>
    );
}

// ── Page principale ────────────────────────────────
export default function PharmacistDashboard() {
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [history, setHistory] = useState<Consultation[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        const opts = { signal: controller.signal };
        setLoading(true);
        Promise.all([getAvailableDoctors(1, opts), getHistory(opts)]).then(([d, h]) => {
            setDoctors(d.results);
            setHasMore(!!d.next);
            // Bug #11 : n'afficher que les consultations terminées / annulées
            setHistory(h.results.filter((c: Consultation) =>
                c.status === 'COMPLETED' || c.status === 'CANCELLED'
            ));
        })
        .catch(err => {
            if (err.name === 'CanceledError') return;
            console.error(err);
        })
        .finally(() => setLoading(false));
        
        return () => controller.abort();
    }, []);

    const loadMoreDoctors = async () => {
        if (!hasMore || loadingMore) return;
        setLoadingMore(true);
        try {
            const nextPage = page + 1;
            const res = await getAvailableDoctors(nextPage);
            setDoctors(prev => [...prev, ...res.results]);
            setHasMore(!!res.next);
            setPage(nextPage);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingMore(false);
        }
    };

    // Redirection automatique quand l'ordonnance est prête
    useSocket('prescription_ready', (data: unknown) => {
        const payload = data as { hash?: string };
        if (payload.hash) {
            navigate(`/pharmacist/verify/${payload.hash}`);
        }
    });

    // ecouter les changements de statut des médecins
    useSocket('doctor_status_changed', (data) => {
        const payload = data as { doctor_id: number; status: DoctorStatus };
        if (payload?.doctor_id && payload?.status) {
            setDoctors(prev =>
                prev.map(d => d.id === payload.doctor_id ? { ...d, status: payload.status } : d)
            );
        }
    });

    const onlineCount = doctors.filter(d => d.status === 'ONLINE').length;

    const startConsultation = (doc: Doctor) =>
        navigate('/pharmacist/new-consultation', { state: { selectedDoctor: doc } });

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="page-content">

                {/* Header page */}
                <div className="animate-fade-up"
                    style={{ marginBottom: '32px' }}>
                    <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '26px', fontWeight: '700',
                        marginBottom: '6px',
                    }}>
                        Tableau de bord
                    </h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        {loading ? 'Chargement...' : (
                            <>
                                <span style={{ color: 'var(--green-600)', fontWeight: '600' }}>
                                    {onlineCount} médecin{onlineCount !== 1 ? 's' : ''} disponible{onlineCount !== 1 ? 's' : ''}
                                </span>
                                {' '}en ce moment
                            </>
                        )}
                    </p>
                </div>

                {/* Section médecins */}
                <section style={{ marginBottom: '48px' }}>
                    <p className="section-title">Médecins disponibles</p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
                        {loading ? (
                            <div key="docs-loading" style={{ display: 'contents' }}>
                                {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                            </div>
                        ) : doctors.length === 0 ? (
                            <div key="docs-empty" className="card-flat" style={{ padding: '48px', textAlign: 'center', gridColumn: '1 / -1' }}>
                                <Stethoscope size={48} className="text-gray-400 mx-auto" style={{ marginBottom: '10px' }} />
                                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Aucun médecin enregistré pour le moment</p>
                            </div>
                        ) : (
                            <div key="docs-loaded" style={{ display: 'contents' }}>
                                {doctors.map((doc, i) => <DoctorCard key={doc.id} doc={doc} index={i} onStart={startConsultation} />)}
                            </div>
                        )}
                    </div>

                    {hasMore && (
                        <div style={{ textAlign: 'center', marginTop: '24px' }}>
                            <button 
                                className="btn btn-secondary" 
                                onClick={loadMoreDoctors} 
                                disabled={loadingMore}
                            >
                                {loadingMore ? 'Chargement...' : 'Voir plus de médecins'}
                            </button>
                        </div>
                    )}
                </section>

                {/* Section historique */}
                <section>
                    <p className="section-title">Consultations récentes</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {history.length === 0 && !loading && (
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                Aucune consultation pour le moment.
                            </p>
                        )}
                        {history.slice(0, 5).map(c => (
                            <div key={c.id} className="card" style={{
                                padding: '14px 18px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <div>
                                    <p style={{
                                        fontWeight: '600', fontSize: '14px',
                                        marginBottom: '2px',
                                    }}>
                                        {c.patient_details.prenom} {c.patient_details.nom}
                                    </p>
                                    <p style={{
                                        fontSize: '12px', color: 'var(--text-muted)',
                                    }}>
                                        {c.motif}
                                    </p>
                                </div>
                                <p style={{
                                    fontSize: '12px', color: 'var(--text-muted)',
                                }}>
                                    {new Date(c.created_at).toLocaleDateString('fr-FR')}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

            </div>
        </div>
    );
}

/* Ajouter dans index.css :
@keyframes pulse {
  0%,100% { box-shadow: 0 0 0 2px rgba(22,163,74,.3); }
  50%      { box-shadow: 0 0 0 5px rgba(22,163,74,.1); }
} */