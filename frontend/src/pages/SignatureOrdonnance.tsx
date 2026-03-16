import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PDFViewer, pdf } from '@react-pdf/renderer';
import { OrdonnancePDF } from '../components/prescription/OrdonnancePDF';
import { submitPrescription } from '../services/prescriptionService';
import {
    importPrivateKey, signData,
    generateKeyPair, exportPublicKey, exportPrivateKey
} from '../services/cryptoService';
import { updateDoctorPublicKey } from '../services/medecinService';
import type { OrdonnanceData } from './PrescriptionForm';

export default function SignatureOrdonnance() {
    const location = useLocation();
    const navigate = useNavigate();
    const ordonnance: OrdonnanceData = location.state?.ordonnance;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSign = async () => {
        setLoading(true);
        setError('');
        try {
            // ① Récupérer ou générer la clé privée
            let privateKey: CryptoKey;
            const storedKey = localStorage.getItem('doctor_private_key');

            if (storedKey) {
                privateKey = await importPrivateKey(storedKey);
            } else {
                // Premier login : générer la paire et envoyer la clé publique
                const pair = await generateKeyPair();
                const pubB64 = await exportPublicKey(pair.publicKey);
                const privB64 = await exportPrivateKey(pair.privateKey);
                await updateDoctorPublicKey(pubB64);
                localStorage.setItem('doctor_private_key', privB64);
                privateKey = pair.privateKey;
            }

            // ② Signer les données de l'ordonnance
            const { signature, hash } = await signData(privateKey, ordonnance);

            // ③ Générer le PDF en blob
            const blob = await pdf(<OrdonnancePDF data={ordonnance} />).toBlob();

            // ④ Envoyer au backend (multipart : JSON + PDF + signature)
            await submitPrescription({
                ordonnance, signature, hash, pdfBlob: blob
            });

            navigate('/doctor/dashboard');

        } catch (e) {
            setError('Erreur lors de la signature. Vérifiez votre connexion.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen">
            <div className="p-4 bg-white border-b flex justify-between items-center">
                <h1 className="text-xl font-bold">Aperçu de l'ordonnance</h1>
                <div className="flex gap-3">
                    {error && <span className="text-red-500 text-sm">{error}</span>}
                    <button
                        onClick={handleSign}
                        disabled={loading}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                    >
                        {loading ? 'Signature en cours...' : '✍ Signer et Envoyer'}
                    </button>
                </div>
            </div>

            {/* Aperçu PDF en temps réel */}
            <PDFViewer className="flex-1 w-full">
                <OrdonnancePDF data={ordonnance} />
            </PDFViewer>
        </div>
    );
}