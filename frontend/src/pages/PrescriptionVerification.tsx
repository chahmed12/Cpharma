import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { verifyPrescription } from '../services/prescriptionService';
import { verifySignature } from '../services/cryptoService';
import { Navbar } from '../components/ui/Navbar';
import { Spinner } from '../components/ui/Spinner';

export default function PrescriptionVerification() {
    const { hash } = useParams<{ hash: string }>();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
    const [prescription, setPrescription] = useState<any>(null);
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        if (hash) {
            verifyPrescription(hash)
                .then(async data => {
                    // Bug ORD-3 fix : Re-vérifier la signature cryptographique LOCALEMENT au lieu de faire confiance aveuglément au backend
                    const isValidLocally = await verifySignature(
                        data.medecin_public_key,
                        data.signature,
                        data.ordonnance_data
                    );

                    if (!isValidLocally) {
                        setStatus('invalid');
                        return;
                    }
                    
                    setPrescription(data);
                    setStatus('valid');
                })
                .catch(() => setStatus('invalid'));
        }
    }, [hash]);

    const handleConfirm = async () => {
        setConfirming(true);
        const consultationId = prescription?.ordonnance_data?.consultation_id;
        navigate(`/pharmacist/confirm/${consultationId}`);
    };

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="page-content-narrow">

                {/* Loading */}
                {status === 'loading' && (
                    <div style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: '16px', paddingTop: '60px',
                    }}>
                        <Spinner size="lg" dark />
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                            Vérification de la signature RSA...
                        </p>
                    </div>
                )}

                {/* Résultat invalide */}
                {status === 'invalid' && (
                    <div className="animate-fade-up">
                        <div style={{
                            background: 'var(--red-50)',
                            border: '2px solid var(--red-200)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '40px', textAlign: 'center',
                            marginBottom: '24px',
                        }}>
                            <div style={{
                                fontSize: '48px', marginBottom: '12px',
                            }}>❌</div>
                            <p style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '20px', fontWeight: '700',
                                color: 'var(--red-600)', marginBottom: '8px',
                            }}>
                                Ordonnance invalide
                            </p>
                            <p style={{ color: 'var(--red-600)', fontSize: '14px' }}>
                                La signature numérique est incorrecte ou le document a été altéré.
                                Ne pas délivrer les médicaments.
                            </p>
                        </div>
                        <button
                            className="btn btn-secondary btn-full"
                            onClick={() => navigate('/pharmacist/dashboard')}
                        >
                            Retour au tableau de bord
                        </button>
                    </div>
                )}

                {/* Résultat valide */}
                {status === 'valid' && (
                    <div className="animate-fade-up">

                        {/* Badge valide */}
                        <div style={{
                            background: 'var(--green-50)',
                            border: '2px solid var(--green-100)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '28px', textAlign: 'center',
                            marginBottom: '24px',
                        }}>
                            <div style={{ fontSize: '40px', marginBottom: '8px' }}>✅</div>
                            <p style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '18px', fontWeight: '700',
                                color: 'var(--green-700)', marginBottom: '4px',
                            }}>
                                Signature valide
                            </p>
                            <p style={{ fontSize: '13px', color: 'var(--green-600)' }}>
                                L'authenticité de cette ordonnance est confirmée.
                            </p>
                        </div>

                        {/* Ordonnance complète */}
                        {prescription && (
                            <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    marginBottom: '16px', paddingBottom: '14px',
                                    borderBottom: '1px solid var(--border)',
                                }}>
                                    <div>
                                        <p style={{ fontWeight: '700', fontSize: '14px' }}>
                                            {prescription.ordonnance_data?.medecin_nom}
                                        </p>
                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            Patient : {prescription.ordonnance_data?.patient?.nom} {prescription.ordonnance_data?.patient?.prenom}
                                        </p>
                                    </div>
                                    <span className="badge badge-paid">Signée</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {prescription.ordonnance_data?.medicaments?.map((m: any, i: number) => (
                                        <div key={i} style={{
                                            padding: '10px 12px',
                                            background: 'var(--bg-subtle)',
                                            borderRadius: 'var(--radius-sm)',
                                        }}>
                                            <p style={{ fontWeight: '600', fontSize: '13px' }}>{m.nom}</p>
                                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                {[m.posologie, m.duree].filter(Boolean).join(' · ')}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Bouton confirmer la délivrance */}
                        <button
                            className="btn btn-success btn-full btn-lg"
                            onClick={handleConfirm}
                            disabled={confirming}
                        >
                            {confirming
                                ? (<><Spinner size="sm" /> Traitement...</>)
                                : '✓ Confirmer la délivrance des médicaments →'
                            }
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}