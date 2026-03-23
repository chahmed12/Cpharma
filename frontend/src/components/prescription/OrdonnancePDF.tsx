import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { OrdonnanceData } from '../../pages/PrescriptionForm';

const S = StyleSheet.create({
    page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11 },
    header: { borderBottom: '2 solid #2563eb', paddingBottom: 12, marginBottom: 20 },
    title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#1e40af' },
    subtitle: { fontSize: 10, color: '#64748b', marginTop: 2 },
    section: { marginBottom: 16 },
    label: { fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
    medRow: { flexDirection: 'row', borderBottom: '0.5 solid #e2e8f0', paddingVertical: 6 },
    medNom: { flex: 2, fontFamily: 'Helvetica-Bold' },
    medDetail: { flex: 1, color: '#475569' },
    footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTop: '1 solid #e2e8f0', paddingTop: 8, fontSize: 8, color: '#94a3b8' },
});

export function OrdonnancePDF({ data }: { data: OrdonnanceData }) {
    return (
        <Document>
            <Page size="A4" style={S.page}>
                <View style={S.header}>
                    <Text style={S.title}>ORDONNANCE MÉDICALE</Text>
                    <Text style={S.subtitle}>
                        Dr. {data.medecin_nom} — {new Date(data.date).toLocaleDateString('fr-FR')}
                    </Text>
                </View>

                <View style={S.section}>
                    <Text style={S.label}>Patient</Text>
                    <Text>{data.patient.prenom} {data.patient.nom}</Text>
                </View>

                <View style={S.section}>
                    <Text style={S.label}>Prescription</Text>
                    {data.medicaments.map((m, i) => (
                        <View key={i} style={S.medRow}>
                            <Text style={S.medNom}>{m.nom}</Text>
                            <Text style={S.medDetail}>{m.posologie}</Text>
                            <Text style={S.medDetail}>{m.duree}</Text>
                        </View>
                    ))}
                </View>

                {data.instructions && (
                    <View style={S.section}>
                        <Text style={S.label}>Instructions</Text>
                        <Text>{data.instructions}</Text>
                    </View>
                )}

                <View style={S.footer}>
                    <Text>Document généré par Cpharma — Signé numériquement (RSA-PSS / SHA-256)</Text>
                </View>
            </Page>
        </Document>
    );
}
