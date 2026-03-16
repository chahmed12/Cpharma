import api from './api';

export type ConsultationStatus =
    'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Patient {
    nom: string;
    age?: number;
    sexe?: 'M' | 'F';
    motif: string;
}

export interface Consultation {
    id: number;
    medecin_id: number;
    patient: Patient;
    status: ConsultationStatus;
    created_at: string;
}

interface CreatePayload {
    medecin_id: number;
    patient_nom: string;
    patient_age: number;
    patient_motif: string;
    patient_sexe: 'M' | 'F';
}

// Pharmacien crée une nouvelle consultation
export async function createConsultation(
    payload: CreatePayload
): Promise<Consultation> {
    const { data } = await api.post<Consultation>('/consultations/', payload);
    return data;
}

// Récupère la file d'attente du médecin connecté
export async function getQueue(): Promise<Consultation[]> {
    const { data } = await api.get<Consultation[]>('/consultations/queue/');
    return data;
}

// Met à jour le statut d'une consultation (ACTIVE, COMPLETED…)
export async function updateConsultationStatus(
    id: number,
    status: ConsultationStatus
): Promise<Consultation> {
    const { data } = await api.patch<Consultation>(
        `/consultations/${id}/status/`,
        { status }
    );
    return data;
}

// Récupère une consultation par son id
export async function getConsultation(id: number): Promise<Consultation> {
    const { data } = await api.get<Consultation>(`/consultations/${id}/`);
    return data;
}