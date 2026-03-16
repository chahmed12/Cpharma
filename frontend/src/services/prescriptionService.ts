import api from './api';
import type { OrdonnanceData } from '../pages/PrescriptionForm';

interface SubmitPayload {
    ordonnance: OrdonnanceData;
    signature: string;
    hash: string;
    pdfBlob: Blob;
}

// Médecin soumet l'ordonnance signée
export async function submitPrescription({
    ordonnance, signature, hash, pdfBlob
}: SubmitPayload) {
    const form = new FormData();
    form.append('ordonnance_data', JSON.stringify(ordonnance));
    form.append('signature', signature);
    form.append('sha256_hash', hash);
    form.append('pdf', pdfBlob, 'ordonnance.pdf');

    const { data } = await api.post('/prescriptions/', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
}

// Pharmacien vérifie une ordonnance via son hash
export async function verifyPrescription(hash: string) {
    const { data } = await api.get(`/prescriptions/verify/${hash}/`);
    return data;
}