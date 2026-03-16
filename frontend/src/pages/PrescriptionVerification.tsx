import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { verifyPrescription } from '../services/prescriptionService';
import { verifySignature } from '../services/cryptoService';
import { SignatureViewer } from '../components/prescription/SignatureViewer';

export default function PrescriptionVerification() {
    const { hash } = useParams<{ hash: string }>();
    const [result, setResult] = useState<{ isValid: boolean; data: unknown } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function verify() {
            try {
                // 1. Récupère ordonnance + signature + clé publique du médecin
                const prescription = await verifyPrescription(hash!);

                // 2. Vérifie la signature côté client (double vérification)
                const isValid = await verifySignature(
                    prescription.medecin_public_key,
                    prescription.signature,
                    prescription.ordonnance_data
                );

                setResult({ isValid, data: prescription });
            } catch {
                setResult({ isValid: false, data: null });
            } finally {
                setLoading(false);
            }
        }
        verify();
    }, [hash]);

    if (loading) return <div className="p-8 text-center">Vérification en cours...</div>;
    if (!result) return null;

    const p = result.data as any;

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Vérification de l'ordonnance</h1>

            <SignatureViewer
                isValid={result.isValid}
                medecinNom={p?.ordonnance_data?.medecin_nom ?? ''}
                date={p?.ordonnance_data?.date ?? ''}
                hash={p?.sha256_hash ?? ''}
            />

            {result.isValid && (
                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                    <h2 className="font-bold mb-3">Médicaments prescrits</h2>
                    {p?.ordonnance_data?.medicaments?.map((m: any, i: number) => (
                        <div key={i} className="flex justify-between py-2 border-b">
                            <span className="font-medium">{m.nom}</span>
                            <span className="text-gray-500">{m.posologie} — {m.duree}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}