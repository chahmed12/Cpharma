/**
 * Types partagés pour les prescriptions médicales.
 */

export interface Medicament {
    id: string;
    nom: string;
    posologie: string;
    duree: string;
}

export interface PatientInfo {
    nom: string;
    prenom?: string;
    date_naissance?: string;
    motif?: string;
}

export interface OrdonnanceData {
    consultation_id: number;
    patient: PatientInfo;
    medicaments: Medicament[];
    instructions: string;
    medecin_nom: string;
    date: string;
}

export interface PrescriptionVerification {
    ordonnance_data: OrdonnanceData;
    signature: string;
    sha256_hash: string;
    is_valid: boolean;
    medecin_public_key: string;
}
