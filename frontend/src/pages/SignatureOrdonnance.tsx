import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { submitPrescription } from '../services/prescriptionService';
import { signData, getSHA256Hash } from '../services/cryptoService';
import { Navbar } from '../components/ui/Navbar';
import { Spinner } from '../components/ui/Spinner';
import { pdf } from '@react-pdf/renderer';
import { OrdonnancePDF } from '../components/prescription/OrdonnancePDF';

export default function SignatureOrdonnance() {
    const location = useLocation();
    const navigate = useNavigate();
    const data = location.state as any;
    const [status, setStatus] = useState<'idle' | 'signing' | 'done' | 'error'>('idle');
    const [keyPair, setKeyPair] = useState<CryptoKeyPair | null>(null);

    useEffect(() => {
        if (!data) {
            navigate('/doctor/dashboard');
            return;
        }
        // Simulation de récupération de clé (en réel : IndexedDB)
        window.crypto.subtle.generateKey(
            { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
            true, ["sign", "verify"]
        ).then(setKeyPair);
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

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="page-content-narrow">
                <div className="animate-fade-up" style={{ marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Signer l'ordonnance</h1>
                </div>

                <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
                    <p><strong>Patient :</strong> {data.patient?.nom}</p>
                    <p><strong>Médecin :</strong> {data.medecin_nom}</p>
                    <hr style={{ margin: '16px 0' }} />
                    <p style={{ fontSize: '14px' }}>{data.medicaments?.length} médicament(s) prescrit(s)</p>
                </div>

                <button
                    className={`btn btn-full btn-lg ${status === 'done' ? 'btn-success' : 'btn-primary'}`}
                    onClick={handleSign}
                    disabled={status === 'signing' || status === 'done' || !keyPair}
                >
                    {status === 'signing' ? <Spinner size="sm" /> : '🔐 Signer numériquement'}
                    {status === 'done' && ' ✓ Signé'}
                </button>
                {status === 'error' && <p style={{ color: 'red', marginTop: '10px' }}>Échec de la signature.</p>}
            </div>
        </div>
    );
}
