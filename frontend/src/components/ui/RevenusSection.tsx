import { useEffect, useState } from 'react';
import { getDoctorRevenues, type RevenusData } from '../../services/paymentService';
import { PaymentCard } from './PaymentCard';

export function RevenusSection() {
    const [data, setData] = useState<RevenusData | null>(null);

    useEffect(() => {
        getDoctorRevenues().then(setData);
    }, []);

    if (!data) return null;

    return (
        <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Mes revenus</h2>

            {/* Statistiques globales */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white border rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">
                        {data.total_net} DA
                    </p>
                    <p className="text-sm text-gray-400 mt-1">Net total</p>
                </div>
                <div className="bg-white border rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">
                        {data.nb_consultations}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">Consultations</p>
                </div>
                <div className="bg-white border rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-gray-500">
                        {data.total_brut} DA
                    </p>
                    <p className="text-sm text-gray-400 mt-1">Brut total</p>
                </div>
            </div>

            {/* Liste des paiements */}
            <div className="flex flex-col gap-3">
                {data.paiements.map(p => (
                    <PaymentCard key={p.id} payment={p} />
                ))}
            </div>
        </div>
    );
}