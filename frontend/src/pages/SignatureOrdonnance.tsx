import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { submitPrescription } from '../services/prescriptionService';
import { loadOrGenerateKeyPair, signData, getSHA256Hash } from '../services/cryptoService';
import { Navbar } from '../components/ui/Navbar';
import { Spinner } from '../components/ui/Spinner';
import { pdf } from '@react-pdf/renderer';
import { OrdonnancePDF } from '../components/prescription/OrdonnancePDF';
import api from '../services/api';
import { KeyRound, CheckCircle2, Lock, CheckCircle, AlertOctagon } from 'lucide-react';
import type { OrdonnanceData } from './PrescriptionForm';

interface SignaturePageState {
    consultation_id: number;
    patient: { nom: string; prenom?: string };
    medicaments: Array<{ id?: string; nom: string; posologie: string; duree?: string }>;
    instructions?: string;
    medecin_nom?: string;
    date?: string;
    prescription_id?: number;
}

const PENDING_KEY = 'pendingOrdonnance';

export default function SignatureOrdonnance() {
    const location = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'idle' | 'loading-key' | 'signing' | 'done' | 'error'>('loading-key');
    const [data, setData] = useState<SignaturePageState | null>(() => {
        const sessionData = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null');
        const state = (location.state as SignaturePageState | null) || sessionData;
        console.log('SignatureOrdonnance - location.state:', location.state);
        console.log('SignatureOrdonnance - sessionStorage:', sessionData);
        console.log('SignatureOrdonnance - resolved state:', state);
        return state || null;
    });
    const [dataLoaded, setDataLoaded] = useState(false);

    useEffect(() => {
        if (!dataLoaded) {
            const sessionData = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null');
            const state = (location.state as SignaturePageState | null) || sessionData;
            if (!state) {
                navigate('/doctor/dashboard');
                return;
            }
            setData(state);
            sessionStorage.setItem(PENDING_KEY, JSON.stringify(state));
            setDataLoaded(true);
        }
    }, [location.state, navigate, dataLoaded]);

    useEffect(() => {
        if (status === 'done') {
            sessionStorage.removeItem(PENDING_KEY);
        }
    }, [status]);

    useEffect(() => {
        if (status === 'done') {
            sessionStorage.removeItem(PENDING_KEY);
        }
    }, [status]);
    const [keyPair, setKeyPair] = useState<CryptoKeyPair | null>(null);
    const [keyError, setKeyError] = useState('');

    useEffect(() => {
        if (!data) return;
        loadOrGenerateKeyPair().then(async ({ keyPair: kp, publicKeyB64 }) => {
            setKeyPair(kp);
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
    }, [data]);

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pdfBlob = await pdf(<OrdonnancePDF data={ordonnanceData as any} />).toBlob();
            const hash = await getSHA256Hash(pdfBlob);
            const signature = await signData(keyPair.privateKey, ordonnanceData as OrdonnanceData);

            await submitPrescription({
                ordonnance: ordonnanceData as OrdonnanceData,
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
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', alignItems: 'center' }}>
                            <KeyRound className="inline mr-2 text-gray-400" size={16} /> Chargement de la clé de signature...
                        </p>
                    )}
                </div>

                <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
                    <p><strong>Patient :</strong> {data.patient?.nom} {data.patient?.prenom}</p>
                    <p><strong>Médecin :</strong> {data.medecin_nom}</p>
                    <hr style={{ margin: '16px 0' }} />
                    <p style={{ fontSize: '14px' }}>{data.medicaments?.length} médicament(s) prescrit(s)</p>
                    {!isLoading && !isError && (
                        <p style={{ fontSize: '12px', color: 'var(--green-600)', marginTop: '8px', display: 'flex', alignItems: 'center' }}>
                            <CheckCircle2 className="inline mr-2 text-green-500" size={16} /> Clé RSA chargée — Prêt à signer
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
                    {isDone && <><CheckCircle className="inline mr-2" size={18} /> Ordonnance signée — Redirection...</>}
                    {isError && <><AlertOctagon className="inline mr-2" size={18} /> Erreur — Rechargez la page</>}
                    {status === 'idle' && <><Lock className="inline mr-2" size={18} /> Signer numériquement</>}
                </button>
            </div>
        </div>
    );
}
