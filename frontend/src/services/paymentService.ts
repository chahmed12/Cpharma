import api from './api';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

export interface Payment {
    id: number;
    consultation_id: number;
    montant_total: string;   // ex: "50.00"
    commission: string;   // ex: "5.00"
    honoraires_medecin: string;   // ex: "45.00"
    status: PaymentStatus;
    medecin_nom: string;
    patient_nom: string;
    created_at: string;
    paid_at: string | null;
}

export interface RevenusData {
    total_brut: string;
    total_net: string;
    nb_consultations: number;
    paiements: Payment[];
}

// Récupère le paiement lié à une consultation
export async function getPaymentByConsultation(
    consultationId: number,
    options?: { signal?: AbortSignal }
): Promise<Payment> {
    const { data } = await api.get<Payment>(
        `/payments/consultation/${consultationId}/`,
        options
    );
    return data;
}

// Pharmacien confirme le paiement en espèces
export async function confirmPayment(
    paymentId: number
): Promise<Payment> {
    const { data } = await api.patch<Payment>(
        `/payments/${paymentId}/confirm/`
    );
    return data;
}

// Médecin consulte ses revenus (tableau de bord)
export async function getDoctorRevenues(options?: { signal?: AbortSignal }): Promise<RevenusData> {
    const { data } = await api.get<RevenusData>('/payments/revenus/', options);
    return data;
}

// Note: le téléchargement du reçu est géré côté client via @react-pdf/renderer dans ConfirmationFin.tsx