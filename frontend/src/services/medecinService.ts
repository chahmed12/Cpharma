import api from './api';

export type DoctorStatus = 'ONLINE' | 'BUSY' | 'OFFLINE';

export interface Doctor {
    id: number;
    nom: string;
    prenom: string;
    specialite: string;
    status: DoctorStatus;
    tarif_consultation?: string; // ex: "50.00"
}

// Pharmacien : liste des médecins disponibles (ONLINE)
export async function getAvailableDoctors(options?: { signal?: AbortSignal }): Promise<Doctor[]> {
    const { data } = await api.get<Doctor[]>('/doctors/', options);
    return data;
}

// src/services/medecinService.ts

export async function getDoctorStatus(options?: { signal?: AbortSignal }): Promise<'ONLINE' | 'OFFLINE' | 'BUSY'> {
    const { data } = await api.get<{ status: 'ONLINE' | 'OFFLINE' | 'BUSY' }>('/doctors/status/', options);
    return data.status;
}

export async function updateDoctorStatus(status: 'ONLINE' | 'OFFLINE' | 'BUSY') {
    const { data } = await api.patch('/doctors/status/', { status }); // ← slash final
    return data;
}



export async function updateDoctorPublicKey(publicKey: string) {
    await api.patch('/doctors/public-key/', { public_key: publicKey });
}

