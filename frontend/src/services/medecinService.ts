import api from './api';

export type DoctorStatus = 'ONLINE' | 'BUSY' | 'OFFLINE';

export interface Doctor {
    id: number;
    nom: string;
    prenom: string;
    specialite: string;
    status: DoctorStatus;
}

// Pharmacien : liste des médecins disponibles (ONLINE)
export async function getAvailableDoctors(): Promise<Doctor[]> {
    const { data } = await api.get<Doctor[]>('/doctors');
    return data;
}

// src/services/medecinService.ts

export async function updateDoctorStatus(status: 'ONLINE' | 'OFFLINE' | 'BUSY') {
    const { data } = await api.patch('/doctors/status/', { status }); // ← slash final
    return data;
}



export async function updateDoctorPublicKey(publicKey: string) {
    await api.patch('/doctors/public-key/', { public_key: publicKey });
}

