import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import {
    getPaymentByConsultation,
    confirmPayment,
    type Payment
} from '../services/paymentService';
import { RecuPDF } from '../components/prescription/RecuPDF';
import { Navbar } from '../components/ui/Navbar';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../hooks/useToast';

export default function ConfirmationFin() {
    const { id }     = useParams<{ id: string }>();
    const navigate   = useNavigate();
    const [payment, setPayment]     = useState<Payment | null>(null);
    const [loading, setLoading]     = useState(true);
    const [confirmed, setConfirmed] = useState(false);
    const toast = useToast().toast;

    useEffect(() => {
        const controller = new AbortController();
        getPaymentByConsultation(Number(id), { signal: controller.signal })
            .then(setPayment)
            .catch(err => {
                if (err.name === 'CanceledError') return;
                toast('Impossible de charger les données de paiement.', 'error');
            })
            .finally(() => setLoading(false));
            
        return () => controller.abort();
    }, [id, toast]);

    const handleConfirm = async () => {
        if (!payment) return;
        try {
            const updated = await confirmPayment(payment.id);
            setPayment(updated);
            setConfirmed(true);

            // Génère et télécharge le reçu PDF
            const blob = await pdf(<RecuPDF payment={updated} />).toBlob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `recu_consultation_${id}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast("Erreur lors de la confirmation du paiement.", "error");
        }
    };


    if (loading) return <Spinner center dark size="lg" label="Chargement du paiement..." />;

    if (!payment) return (
        <div className="page-wrapper">
            <Navbar />
            <div className="page-content-narrow" style={{ paddingTop: '48px', textAlign: 'center' }}>
                <p style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</p>
                <p style={{ fontWeight: '600', marginBottom: '8px' }}>
                    Paiement introuvable.
                </p>
                <button className="btn btn-secondary" onClick={() => navigate('/pharmacist/dashboard')}>
                    Retour au tableau de bord
                </button>
            </div>
        </div>
    );

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="page-content-narrow">

                <div className="animate-fade-up" style={{ marginBottom: '28px' }}>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
                        Consultation terminée
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Patient : <strong>{payment.patient_nom}</strong>
                    </p>
                </div>

                {/* Carte montant */}
                <div style={{
                    background: 'var(--green-50)',
                    border: '2px solid var(--green-100)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '28px 24px',
                    marginBottom: '24px',
                    textAlign: 'center',
                }}>
                    <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--green-700)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                        Montant à collecter auprès du patient
                    </p>
                    <p style={{ fontSize: '42px', fontWeight: '800', color: 'var(--green-800)', lineHeight: '1' }}>
                        {payment.montant_total} <span style={{ fontSize: '20px' }}>DA</span>
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--green-600)', marginTop: '10px' }}>
                        Dont <strong>{payment.honoraires_medecin} DA</strong> reversés à Dr. {payment.medecin_nom}
                    </p>
                </div>

                {!confirmed ? (
                    <button
                        className="btn btn-primary btn-full btn-lg"
                        style={{ background: 'var(--green-600)', borderColor: 'var(--green-600)' }}
                        onClick={handleConfirm}
                    >
                        ✓ Confirmer le paiement en espèces
                    </button>
                ) : (
                    <div style={{ textAlign: 'center', paddingTop: '12px' }}>
                        <p style={{ fontSize: '20px', fontWeight: '700', color: 'var(--green-600)', marginBottom: '16px' }}>
                            ✅ Paiement confirmé — Reçu téléchargé
                        </p>
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate('/pharmacist/dashboard')}
                        >
                            Retour au tableau de bord
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}