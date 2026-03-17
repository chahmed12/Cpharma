import api from './api';

export interface MedicalRecord {
    allergies: string;
    antecedents: string;
    groupe_sanguin: string;
    poids?: number;
    taille?: number;
}

export interface Patient {
    id: number;
    nom: string;
    prenom: string;
    telephone: string;
    date_naissance: string;
    sexe: 'M' | 'F';
    medical_record?: MedicalRecord;
}

export async function searchPatients(query: string): Promise<Patient[]> {
    const { data } = await api.get<Patient[]>(`/patients/?search=${query}`);
    return data;
}

export async function createPatient(payload: Partial<Patient>): Promise<Patient> {
    const { data } = await api.post<Patient>('/patients/', payload);
    return data;
}

export async function getMedicalRecord(patientId: number): Promise<MedicalRecord> {
    const { data } = await api.get<MedicalRecord>(`/patients/${patientId}/medical_record/`);
    return data;
}
