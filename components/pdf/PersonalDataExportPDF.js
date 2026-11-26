/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: { paddingTop: 62, paddingHorizontal: 42, paddingBottom: 48, fontFamily: 'Helvetica', fontSize: 9, color: '#0f172a' },
    banner: { position: 'absolute', top: 0, left: 0, right: 0, height: 43, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
    bannerText: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 15 },
    date: { color: '#64748b', marginBottom: 14 },
    photo: { width: 60, height: 60, objectFit: 'cover', marginBottom: 8 },
    heading: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: '#2563eb', marginTop: 16, marginBottom: 8, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: '#93c5fd' },
    head: { flexDirection: 'row', backgroundColor: '#2563eb', padding: 8 },
    headCell: { color: '#ffffff', fontFamily: 'Helvetica-Bold' },
    row: { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    alt: { backgroundColor: '#f8fafc' },
    cell: { color: '#334155', lineHeight: 1.35, paddingRight: 8 },
    key: { fontFamily: 'Helvetica-Bold' },
    empty: { color: '#94a3b8', fontFamily: 'Helvetica-Oblique', marginBottom: 10 },
    footer: { position: 'absolute', bottom: 16, left: 42, right: 42, textAlign: 'center', color: '#94a3b8', fontSize: 7 },
});

const valueText = (value) => value === null || value === undefined || value === '' ? '—' : String(value);
const dateText = (value) => value ? new Date(value).toLocaleDateString('fr-FR') : '—';

function DataTable({ headers, rows, widths }) {
    if (!rows.length) return <Text style={styles.empty}>Aucun élément enregistré.</Text>;
    return <View>
        <View style={styles.head} wrap={false}>{headers.map((item, index) => <Text key={index} style={[styles.headCell, { width: widths[index] }]}>{item}</Text>)}</View>
        {rows.map((row, index) => <View key={index} style={[styles.row, index % 2 === 0 && styles.alt]} wrap={false}>
            {row.map((value, cell) => <Text key={cell} style={[styles.cell, cell === 0 && styles.key, { width: widths[cell] }]}>{valueText(value)}</Text>)}
        </View>)}
    </View>;
}

export function PersonalDataExportPDF({ profile, contributions, favorites, tickets, photo, generated }) {
    const profileRows = [
        ['Prénom', profile.firstName], ['Nom', profile.lastName], ['Email', profile.email],
        ['Filière', profile.filiere?.toUpperCase()], ['Promotion', profile.startYear],
        ['Rôle', profile.role || 'Étudiant'], ['Email vérifié', profile.verifiedEmail ? 'Oui' : 'Non'],
        ['Stars reçues', profile.stars || 0], ['Inscrit le', dateText(profile.createdAt)],
        ['Abonnement', profile.subscription?.expiresAt > Date.now() ? `Actif — ${profile.subscription.type || ''}` : 'Aucun'],
    ];
    return <Document title="Export de données personnelles" author="ESTT Community">
        <Page size="A4" style={styles.page}>
            <View style={styles.banner} fixed><Text style={styles.bannerText}>ESTT Community — Export de données personnelles</Text></View>
            <Text style={styles.date}>Généré le {generated}</Text>
            {photo && <Image src={photo} style={styles.photo} />}
            <Text style={styles.heading}>Informations personnelles</Text>
            <DataTable headers={['Champ', 'Valeur']} rows={profileRows} widths={['36%', '64%']} />
            {profile.stats && <>
                <Text style={styles.heading}>Statistiques</Text>
                <DataTable headers={['Champ', 'Valeur']} rows={[
                    ['Signalements vérifiés', profile.stats.verifiedReports || 0],
                    ['Bugs résolus', profile.stats.reportedBugsFixed || 0],
                ]} widths={['36%', '64%']} />
            </>}
            <Text style={styles.heading}>Contributions ({contributions.length})</Text>
            <DataTable headers={['Titre', 'Module', 'Date']} rows={contributions.map(item => [item.title, item.module, dateText(item.timestamp)])} widths={['50%', '25%', '25%']} />
            <Text style={styles.heading}>Ressources enregistrées ({favorites.length})</Text>
            <DataTable headers={['Titre', 'Type', 'Enregistrée le']} rows={favorites.map(item => [item.title, [item.type, item.docType].filter(Boolean).join(' · '), dateText(item.createdAt)])} widths={['48%', '27%', '25%']} />
            <Text style={styles.heading}>Tickets d&apos;événements ({tickets.length})</Text>
            <DataTable headers={['Événement', 'Club', 'Statut', 'Date']} rows={tickets.map(item => [item.eventName, item.clubName, item.status === 'valid' ? 'Validé' : 'En attente', dateText(item.createdAt)])} widths={['38%', '26%', '18%', '18%']} />
            <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) =>
                `ESTT Community · Données personnelles de ${profile.firstName || ''} ${profile.lastName || ''} · Page ${pageNumber}/${totalPages} · Généré le ${generated}`
            } />
        </Page>
    </Document>;
}
