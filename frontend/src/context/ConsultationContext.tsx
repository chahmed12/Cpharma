import { createContext, useState, useContext, type ReactNode } from 'react';
import type { ConsultationStatus } from '../services/consultationService';

interface ConsultationState {
    consultationId: number | null;
    status: ConsultationStatus | null;
    patientNom: string | null;
    setConsultation: (id: number, nom: string) => void;
    setStatus: (s: ConsultationStatus) => void;
    reset: () => void;
}

const ConsultationContext = createContext<ConsultationState>(null!);

export function ConsultationProvider({ children }: { children: ReactNode }) {
    const [consultationId, setConsultationId] = useState<number | null>(null);
    const [status, setStatus] = useState<ConsultationStatus | null>(null);
    const [patientNom, setPatientNom] = useState<string | null>(null);

    return (
        <ConsultationContext.Provider value={{
            consultationId, status, patientNom,
            setConsultation: (id, nom) => {
                setConsultationId(id); setPatientNom(nom);
            },
            setStatus,
            reset: () => {
                setConsultationId(null);
                setStatus(null);
                setPatientNom(null);
            },
        }}>
            {children}
        </ConsultationContext.Provider>
    );
}

export const useConsultation = () => useContext(ConsultationContext);