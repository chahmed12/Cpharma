import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/ui/Navbar';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../hooks/useToast';
import { getDoctorRevenues, type RevenusData, downloadPaymentsCsv, downloadInvoice, type Payment } from '../services/paymentService';
import { ArrowLeft, Download, FileText, TrendingUp, Calendar, CreditCard } from 'lucide-react';

export default function DoctorFinances() {
    const navigate = useNavigate();
    const toast = useToast().toast;
    const [loading, setLoading] = useState(true);
    const [revenues, setRevenues] = useState<RevenusData | null>(null);

    useEffect(() => {
        getDoctorRevenues()
            .then(setRevenues)
            .catch(() => toast('Erreur lors du chargement des revenus', 'error'))
            .finally(() => setLoading(false));
    }, []);

    const groupByMonth = (payments: Payment[]) => {
        const grouped: Record<string, Payment[]> = {};
        payments.forEach(p => {
            const date = new Date(p.created_at);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(p);
        });
        return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
    };

    const formatMonth = (key: string) => {
        const [year, month] = key.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Spinner />
        </div>
    );

    const totalBrut = parseFloat(revenues?.total_brut || '0');
    const totalNet = parseFloat(revenues?.total_net || '0');
    const commission = totalBrut - totalNet;
    const tauxCommission = totalBrut > 0 ? (commission / totalBrut * 100).toFixed(1) : '15';

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
            <Navbar />
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
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

                <div className="animate-fade-up" style={{ marginBottom: '32px' }}>
                    <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '28px', fontWeight: '700', marginBottom: '8px',
                        display: 'flex', alignItems: 'center', gap: '12px',
                    }}>
                        <TrendingUp size={28} />
                        Mes Finances
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Suivi de vos revenus et historique de vos paiements
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                    <div className="card animate-fade-up" style={{ padding: '24px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px', color: 'var(--green-600)' }}>
                            <CreditCard size={20} />
                            <span style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: '600' }}>Total encaissé</span>
                        </div>
                        <p style={{ fontSize: '32px', fontWeight: '800', color: 'var(--green-700)', margin: 0 }}>
                            {totalNet.toFixed(2)} <span style={{ fontSize: '16px', fontWeight: '400' }}>DNT</span>
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Net versé sur votre compte</p>
                    </div>

                    <div className="card animate-fade-up delay-1" style={{ padding: '24px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px', color: 'var(--blue-600)' }}>
                            <TrendingUp size={20} />
                            <span style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: '600' }}>Brut consultations</span>
                        </div>
                        <p style={{ fontSize: '32px', fontWeight: '800', color: 'var(--blue-700)', margin: 0 }}>
                            {totalBrut.toFixed(2)} <span style={{ fontSize: '16px', fontWeight: '400' }}>DNT</span>
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Montant total des consultations</p>
                    </div>

                    <div className="card animate-fade-up delay-3" style={{ padding: '24px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px', color: 'var(--purple-600)' }}>
                            <Calendar size={20} />
                            <span style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: '600' }}>Consultations</span>
                        </div>
                        <p style={{ fontSize: '32px', fontWeight: '800', color: 'var(--purple-700)', margin: 0 }}>
                            {revenues?.nb_consultations || 0}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Téléconsultations payées</p>
                    </div>
                </div>

                <div className="card animate-fade-up" style={{ padding: '20px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Documents comptables</h3>
                        <button
                            onClick={downloadPaymentsCsv}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Download size={16} />
                            Exporter tout (CSV)
                        </button>
                    </div>
                </div>

                <div className="animate-fade-up">
                    <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                        Historique des paiements
                    </h2>

                    {!revenues?.paiements?.length ? (
                        <div className="card-flat" style={{ padding: '48px', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-muted)' }}>Aucun paiement enregistré pour le moment</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {groupByMonth(revenues.paiements).map(([monthKey, payments]) => {
                                const monthBrut = payments.reduce((sum: number, p: Payment) => sum + parseFloat(p.montant_total), 0);
                                const monthNet = payments.reduce((sum: number, p: Payment) => sum + parseFloat(p.honoraires_medecin), 0);

                                return (
                                    <div key={monthKey} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                                        <div style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '16px 20px', background: 'var(--bg-subtle)',
                                            borderBottom: '1px solid var(--border)',
                                        }}>
                                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', textTransform: 'capitalize' }}>
                                                {formatMonth(monthKey)}
                                            </h3>
                                            <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
                                                <span style={{ color: 'var(--green-600)', fontWeight: '600' }}>
                                                    Net: {monthNet.toFixed(2)} DNT
                                                </span>
                                                <span style={{ color: 'var(--text-muted)' }}>
                                                    Brut: {monthBrut.toFixed(2)} DNT
                                                </span>
                                                <span style={{ color: 'var(--text-muted)' }}>
                                                    {payments.length} consultation{payments.length > 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ padding: '12px' }}>
                                            {payments.map((p: Payment, i: number) => (
                                                <div key={p.id} style={{
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    padding: '12px', borderBottom: i < payments.length - 1 ? '1px solid var(--border)' : 'none',
                                                }}>
                                                    <div>
                                                        <p style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>
                                                            {p.patient_nom || 'Patient inconnu'}
                                                        </p>
                                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                            {new Date(p.created_at).toLocaleDateString('fr-FR', {
                                                                day: 'numeric', month: 'short', year: 'numeric'
                                                            })}
                                                            {' - '}
                                                            Consultation #{p.consultation_id}
                                                        </p>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ fontWeight: '700', fontSize: '15px', color: 'var(--green-700)', marginBottom: '2px' }}>
                                                            +{parseFloat(p.honoraires_medecin).toFixed(2)} DNT
                                                        </p>
                                                        <button
                                                            onClick={() => downloadInvoice(p.id)}
                                                            style={{
                                                                background: 'none', border: 'none', cursor: 'pointer',
                                                                color: 'var(--blue-600)', fontSize: '11px',
                                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                            }}
                                                        >
                                                            <FileText size={12} />
                                                            Facture
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
