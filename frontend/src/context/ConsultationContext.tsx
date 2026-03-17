import { createContext, useState, useContext, useMemo, type ReactNode } from 'react';
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

    const value = useMemo(() => ({
        consultationId, status, patientNom,
        setConsultation: (id: number, nom: string) => {
            setConsultationId(id);
            setPatientNom(nom);
        },
        setStatus,
        reset: () => {
            setConsultationId(null);
            setStatus(null);
            setPatientNom(null);
        },
    }), [consultationId, status, patientNom]);

    return (
        <ConsultationContext.Provider value={value}>
            {children}
        </ConsultationContext.Provider>
    );
}

export const useConsultation = () => useContext(ConsultationContext);
