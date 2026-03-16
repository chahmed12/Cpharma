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
    const { data } = await api.get<Doctor[]>('/doctors/online/');
    return data;
}

// Médecin : met à jour son propre statut
export async function updateDoctorStatus(
    status: DoctorStatus
): Promise<void> {
    await api.patch('/doctors/status/', { status });
}



export async function updateDoctorPublicKey(publicKey: string) {
    await api.patch('/doctors/public-key/', { public_key: publicKey });
}