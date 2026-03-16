import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Payment } from '../../services/paymentService';

const S = StyleSheet.create({
    page: { padding: 48, fontFamily: 'Helvetica', fontSize: 11 },
    header: { borderBottom: '2 solid #16a34a', paddingBottom: 16, marginBottom: 24 },
    title: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#15803d' },
    sub: { fontSize: 10, color: '#64748b', marginTop: 3 },
    row: {
        flexDirection: 'row', justifyContent: 'space-between',
        paddingVertical: 8, borderBottom: '0.5 solid #e2e8f0'
    },
    rowBold: {
        flexDirection: 'row', justifyContent: 'space-between',
        paddingVertical: 10, borderTop: '2 solid #15803d', marginTop: 4
    },
    label: { color: '#475569' },
    value: { fontFamily: 'Helvetica-Bold' },
    total: { fontSize: 14, color: '#15803d', fontFamily: 'Helvetica-Bold' },
    badge: {
        backgroundColor: '#dcfce7', color: '#15803d',
        padding: '4 10', borderRadius: 4, fontSize: 10,
        fontFamily: 'Helvetica-Bold', alignSelf: 'flex-start'
    },
    footer: {
        position: 'absolute', bottom: 32, left: 48, right: 48,
        fontSize: 8, color: '#94a3b8', textAlign: 'center'
    },
});

export function RecuPDF({ payment }: { payment: Payment }) {
    const date = new Date(payment.paid_at ?? payment.created_at)
        .toLocaleString('fr-FR');

    return (
        <Document>
            <Page size="A4" style={S.page}>

                <View style={S.header}>
                    <Text style={S.title}>REÇU DE PAIEMENT</Text>
                    <Text style={S.sub}>PharmaConsult — Téléconsultation médicale</Text>
                    {/* Correction ici ↓ */}
                    <Text style={[S.sub, { marginTop: 8 }]}>Référence : {payment.id} — {date}</Text>
                </View>

                {/* Statut */}
                <Text style={S.badge}>✓ PAYÉ</Text>

                {/* Infos consultation */}
                <View style={{ marginTop: 20, marginBottom: 20 }}>
                    <View style={S.row}>
                        <Text style={S.label}>Patient</Text>
                        <Text style={S.value}>{payment.patient_nom}</Text>
                    </View>
                    <View style={S.row}>
                        <Text style={S.label}>Médecin</Text>
                        <Text style={S.value}>Dr. {payment.medecin_nom}</Text>
                    </View>
                    <View style={S.row}>
                        <Text style={S.label}>Consultation N°</Text>
                        <Text style={S.value}>{payment.consultation_id}</Text>
                    </View>
                </View>

                {/* Détail financier */}
                <View style={S.row}>
                    <Text style={S.label}>Honoraires bruts</Text>
                    <Text style={S.value}>{payment.montant_total} DA</Text>
                </View>
                <View style={S.row}>
                    <Text style={S.label}>Commission plateforme (10%)</Text>
                    {/* Correction ici ↓ */}
                    <Text style={[S.value, { color: '#ef4444' }]}>- {payment.commission} DA</Text>
                </View>
                <View style={S.rowBold}>
                    <Text style={S.total}>Net médecin</Text>
                    <Text style={S.total}>{payment.honoraires_medecin} DA</Text>
                </View>

                <Text style={S.footer}>
                    PharmaConsult — Document généré automatiquement — Non soumis à la TVA
                </Text>
            </Page>
        </Document>
    );
}