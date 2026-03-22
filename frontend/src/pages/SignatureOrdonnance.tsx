import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { submitPrescription } from '../services/prescriptionService';
import { loadOrGenerateKeyPair, signData, getSHA256Hash } from '../services/cryptoService';
import { Navbar } from '../components/ui/Navbar';
import { Spinner } from '../components/ui/Spinner';
import { pdf } from '@react-pdf/renderer';
import { OrdonnancePDF } from '../components/prescription/OrdonnancePDF';
import api from '../services/api';

export default function SignatureOrdonnance() {
    const location = useLocation();
    const navigate = useNavigate();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = location.state as any;
    const [status, setStatus] = useState<'idle' | 'loading-key' | 'signing' | 'done' | 'error'>('loading-key');
    const [keyPair, setKeyPair] = useState<CryptoKeyPair | null>(null);
    const [keyError, setKeyError] = useState('');

    useEffect(() => {
        if (!data) {
            navigate('/doctor/dashboard');
            return;
        }
        // Charger la clé depuis IndexedDB (ou la générer si première fois)
        loadOrGenerateKeyPair().then(async ({ keyPair: kp, publicKeyB64 }) => {
            setKeyPair(kp);
            // Toujours uploader ou rafraîchir la clé publique sur le backend (évite désync IndexedDB vs Backend DB)
            try {
                await api.patch('/doctors/public-key/', { public_key: publicKeyB64 });
            } catch (e) {
                console.warn("Impossible d'uploader la clé publique:", e);
            }
            setStatus('idle');
        }).catch(e => {
            console.error("Erreur chargement clé PKI:", e);
            setKeyError("Impossible de charger la clé de signature. Réessayez.");
            setStatus('error');
        });
    }, [data, navigate]);

    const handleSign = async () => {
        if (!keyPair || !data) return;
        setStatus('signing');
        try {
            const ordonnanceData = {
                consultation_id: data.consultation_id,
                patient: data.patient,
                medicaments: data.medicaments,
                instructions: data.instructions,
                medecin_nom: data.medecin_nom,
                date: new Date().toISOString()
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pdfBlob = await pdf(<OrdonnancePDF data={ordonnanceData as any} />).toBlob();
            const hash = await getSHA256Hash(pdfBlob);
            const signature = await signData(keyPair.privateKey, ordonnanceData);

            await submitPrescription({
                ordonnance: ordonnanceData,
                signature,
                hash,
                pdfBlob
            });

            setStatus('done');
            setTimeout(() => navigate('/doctor/dashboard'), 2000);
        } catch (e) {
            console.error("Erreur signature:", e);
            setStatus('error');
        }
    };

    if (!data) return null;

    const isLoading = status === 'loading-key';
    const isSigning = status === 'signing';
    const isDone    = status === 'done';
    const isError   = status === 'error';

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="page-content-narrow">
                <div className="animate-fade-up" style={{ marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Signer l'ordonnance</h1>
                    {isLoading && (
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
                            🔑 Chargement de la clé de signature...
                        </p>
                    )}
                </div>

                <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
                    <p><strong>Patient :</strong> {data.patient?.nom} {data.patient?.prenom}</p>
                    <p><strong>Médecin :</strong> {data.medecin_nom}</p>
                    <hr style={{ margin: '16px 0' }} />
                    <p style={{ fontSize: '14px' }}>{data.medicaments?.length} médicament(s) prescrit(s)</p>
                    {!isLoading && !isError && (
                        <p style={{ fontSize: '12px', color: 'var(--green-600)', marginTop: '8px' }}>
                            ✅ Clé RSA chargée — Prêt à signer
                        </p>
                    )}
                </div>

                {keyError && (
                    <div className="alert alert-error" style={{ marginBottom: '16px' }}>{keyError}</div>
                )}

                <button
                    className={`btn btn-full btn-lg ${isDone ? 'btn-success' : 'btn-primary'}`}
                    onClick={handleSign}
                    disabled={isSigning || isDone || isLoading || isError}
                >
                    {isLoading && <><Spinner size="sm" /> Chargement de la clé...</>}
                    {isSigning && <><Spinner size="sm" /> Signature en cours...</>}
                    {isDone && '✓ Ordonnance signée — Redirection...'}
                    {isError && '⛔ Erreur — Rechargez la page'}
                    {status === 'idle' && '🔐 Signer numériquement'}
                </button>
            </div>
        </div>
    );
}
