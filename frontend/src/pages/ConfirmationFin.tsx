import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import {
    getPaymentByConsultation,
    confirmPayment,
    type Payment
} from '../services/paymentService';
import { RecuPDF } from '../components/prescription/RecuPDF';

export default function ConfirmationFin() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [payment, setPayment] = useState<Payment | null>(null);
    const [loading, setLoading] = useState(true);
    const [confirmed, setConfirmed] = useState(false);

    useEffect(() => {
        getPaymentByConsultation(Number(id))
            .then(setPayment)
            .finally(() => setLoading(false));
    }, [id]);

    const handleConfirm = async () => {
        if (!payment) return;
        const updated = await confirmPayment(payment.id);
        setPayment(updated);
        setConfirmed(true);

        // Génère et télécharge le reçu automatiquement
        const blob = await pdf(<RecuPDF payment={updated} />).toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recu_consultation_${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) return <div className="p-8 text-center">Chargement...</div>;
    if (!payment) return null;

    return (
        <div className="max-w-lg mx-auto p-6">
            <h1 className="text-2xl font-bold mb-2">Consultation terminée</h1>
            <p className="text-gray-500 mb-6">Patient : {payment.patient_nom}</p>

            {/* Carte paiement */}
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-6">
                <p className="text-sm text-green-700 font-semibold mb-1">
                    Montant à collecter auprès du patient
                </p>
                <p className="text-4xl font-bold text-green-800">
                    {payment.montant_total} DA
                </p>
                <p className="text-xs text-green-600 mt-2">
                    Dont {payment.honoraires_medecin} DA reversés à Dr. {payment.medecin_nom}
                </p>
            </div>

            {!confirmed ? (
                <button
                    onClick={handleConfirm}
                    className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-green-700"
                >
                    ✓ Confirmer le paiement en espèces
                </button>
            ) : (
                <div className="text-center">
                    <p className="text-green-600 font-bold text-xl mb-4">
                        ✅ Paiement confirmé — Reçu téléchargé
                    </p>
                    <button
                        onClick={() => navigate('/pharmacist/dashboard')}
                        className="text-blue-600 underline"
                    >
                        Retour au tableau de bord
                    </button>
                </div>
            )}
        </div>
    );
}