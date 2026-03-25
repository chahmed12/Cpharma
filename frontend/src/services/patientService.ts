import api from './api';
import type { PaginatedResponse } from './api';

export interface MedicalRecord {
    allergies: string;
    antecedents: string;
    groupe_sanguin: string;
    poids?: number;
    taille?: number;
    derniere_mise_a_jour?: string;
}

export interface Patient {
    id: number;
    nom: string;
    prenom: string;
    telephone: string;
    date_naissance: string;
    sexe: 'M' | 'F';
    adresse?: string;
    medical_record?: MedicalRecord;
}

export async function searchPatients(query: string): Promise<Patient[]> {
    const { data } = await api.get<PaginatedResponse<Patient>>('/patients/', { params: { search: query } });
    return data.results;
}

export async function createPatient(payload: Partial<Patient>): Promise<Patient> {
    const { data } = await api.post<Patient>('/patients/', payload);
    return data;
}

export async function getMedicalRecord(patientId: number): Promise<MedicalRecord> {
    const { data } = await api.get<MedicalRecord>(`/patients/${patientId}/medical_record/`);
    return data;
}
