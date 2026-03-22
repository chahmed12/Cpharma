import api from './api';
import type { Patient } from './patientService';

export type ConsultationStatus =
    'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Consultation {
    id: number;
    medecin: number;
    pharmacien: number;
    patient_details: Patient; // Nouveau champ lié
    status: ConsultationStatus;
    created_at: string;
    motif: string;
}

interface CreatePayload {
    medecin: number;
    patient_id: number;
    motif: string;
}

export async function createConsultation(payload: CreatePayload): Promise<Consultation> {
    const { data } = await api.post<Consultation>('/consultations/', payload);
    return data;
}

export async function getHistory(options?: { signal?: AbortSignal }): Promise<Consultation[]> {
    const { data } = await api.get<Consultation[]>('/consultations/', options);
    return data;
}

export async function getQueue(options?: { signal?: AbortSignal }): Promise<Consultation[]> {
    const { data } = await api.get<Consultation[]>('/consultations/queue/', options);
    return data;
}

export async function updateConsultationStatus(id: number, status: ConsultationStatus): Promise<Consultation> {
    const { data } = await api.patch<Consultation>(`/consultations/${id}/status/`, { status });
    return data;
}

export async function getConsultation(id: number, options?: { signal?: AbortSignal }): Promise<Consultation> {
    const { data } = await api.get<Consultation>(`/consultations/${id}/`, options);
    return data;
}
