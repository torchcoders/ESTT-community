/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: { paddingTop: 42, paddingHorizontal: 42, paddingBottom: 58, fontFamily: 'Helvetica', fontSize: 10, color: '#0f172a' },
    watermark: { position: 'absolute', top: 240, left: 115, width: 360, height: 360, opacity: 0.04 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    logo: { width: 36, height: 36, objectFit: 'contain' },
    headerMiddle: { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
    title: { fontFamily: 'Helvetica-Bold', fontSize: 17, textAlign: 'center' },
    subtitle: { color: '#64748b', marginTop: 5, textAlign: 'center' },
    section: { fontFamily: 'Helvetica-Bold', fontSize: 13, marginTop: 18, marginBottom: 10, color: '#1e293b' },
    meta: { color: '#475569', lineHeight: 1.5, marginBottom: 4 },
    tableHead: { flexDirection: 'row', padding: 9, marginTop: 12 },
    tableHeadText: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 9 },
    row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingVertical: 8, paddingHorizontal: 9 },
    alternate: { backgroundColor: '#f8fafc' },
    cell: { fontSize: 9, lineHeight: 1.35, paddingRight: 8 },
    label: { fontFamily: 'Helvetica-Bold', color: '#475569' },
    body: { color: '#334155', fontSize: 11, lineHeight: 1.55, marginTop: 12 },
    postTitle: { fontFamily: 'Helvetica-Bold', fontSize: 23, marginTop: 13, marginBottom: 8 },
    postImage: { width: '100%', maxHeight: 330, objectFit: 'contain', marginTop: 18 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, minHeight: 42, paddingHorizontal: 42, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
    footerQr: { width: 34, height: 34, marginRight: 9 },
    footerText: { flex: 1, color: '#94a3b8', fontSize: 8 },
});

export const pdfText = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
    if (Array.isArray(value)) return value.map(pdfText).join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

export const pdfDate = (value, includeTime = false) => {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) return '-';
    return includeTime ? date.toLocaleString('fr-FR') : date.toLocaleDateString('fr-FR');
};

function Furniture({ title, subtitle, accent, clubLogo, platformLogo, watermark, qr, footerText }) {
    return <>
        {watermark && <Image src={watermark} style={styles.watermark} fixed />}
        <View style={styles.header}>
            <View style={{ width: 36 }}>{clubLogo && <Image src={clubLogo} style={styles.logo} />}</View>
            <View style={styles.headerMiddle}>
                <Text style={styles.title}>{title}</Text>
                <Text style={[styles.subtitle, { color: accent }]}>{subtitle}</Text>
            </View>
            <View style={{ width: 36 }}>{platformLogo && <Image src={platformLogo} style={styles.logo} />}</View>
        </View>
        <View style={styles.footer} fixed>
            {qr && <Image src={qr} style={styles.footerQr} />}
            <Text style={styles.footerText}>{footerText}</Text>
            <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages} · ESTT Community`} />
        </View>
    </>;
}

function Table({ headers, rows, widths, accent = '#64748b' }) {
    return <View>
        <View style={[styles.tableHead, { backgroundColor: accent }]} wrap={false}>
            {headers.map((header, index) => <Text key={index} style={[styles.tableHeadText, { width: widths[index] }]}>{header}</Text>)}
        </View>
        {rows.map((row, index) => <View key={index} style={[styles.row, index % 2 === 0 && styles.alternate]} wrap={false}>
            {row.map((value, cellIndex) => <Text key={cellIndex} style={[styles.cell, cellIndex === 0 && styles.label, { width: widths[cellIndex] }]}>{pdfText(value)}</Text>)}
        </View>)}
    </View>;
}

export function SubmissionPDF({ title, clubName, rows, metadata, accent, clubLogo, platformLogo, watermark, qr, generated }) {
    return <Document title={`${title} - ${clubName}`} author="ESTT Community">
        <Page size="A4" style={styles.page}>
            <Furniture title={title} subtitle={clubName} accent={accent} clubLogo={clubLogo} platformLogo={platformLogo} watermark={watermark} qr={qr} footerText={`Généré le ${generated}`} />
            {metadata.map(([key, value]) => <Text key={key} style={styles.meta}>{key} : {pdfText(value)}</Text>)}
            <Table headers={['Champ', 'Valeur / réponse']} rows={rows} widths={['36%', '64%']} accent={accent} />
        </Page>
    </Document>;
}

export function AllFormResponsesPDF({ submissions, formTitle, clubName, fields, accent, clubLogo, platformLogo, watermark, generated }) {
    const nameField = fields.find(field => ['full name', 'nom complet', 'name', 'nom'].includes(String(field.label || '').trim().toLowerCase())) || fields[0];
    return <Document title={`Réponses - ${formTitle}`} author="ESTT Community">
        <Page size="A4" style={styles.page}>
            <Furniture title="Résumé des réponses" subtitle={`${formTitle} · ${clubName}`} accent={accent} clubLogo={clubLogo} platformLogo={platformLogo} watermark={watermark} footerText={`Généré le ${generated}`} />
            <Table headers={['Nom', 'Statut']} rows={submissions.map(submission => [submission.data?.[nameField?.id], ' '])} widths={['75%', '25%']} accent={accent} />
        </Page>
        {submissions.map((submission, index) => <Page key={submission.id || index} size="A4" style={styles.page}>
            <Furniture title={`Réponse ${index + 1}`} subtitle={`${formTitle} · ${pdfDate(submission.submittedAt, true)}`} accent={accent} clubLogo={clubLogo} platformLogo={platformLogo} watermark={watermark} footerText={`Généré le ${generated}`} />
            <Table headers={['Champ', 'Réponse']} rows={fields.map(field => [field.label || `Champ ${field.id}`, submission.data?.[field.id]])} widths={['36%', '64%']} accent={accent} />
        </Page>)}
    </Document>;
}

export function AttendancePDF({ participants, event, clubName, accent, clubLogo, platformLogo, watermark, generated }) {
    const rows = participants.map((person, index) => [
        index + 1,
        person.firstName ? `${person.firstName} ${person.lastName || ''}`.trim() : person.userName || person.userEmail || 'Participant',
        person.userEmail || person.email || '-',
        ' ',
        pdfDate(person.createdAt),
    ]);
    return <Document title={`Liste de présence - ${event.title}`} author="ESTT Community">
        <Page size="A4" style={styles.page}>
            <Furniture title="LISTE DE PRÉSENCE" subtitle={event.title || 'Événement'} accent={accent} clubLogo={clubLogo} platformLogo={platformLogo} watermark={watermark} footerText={`Généré le ${generated}`} />
            <Text style={styles.meta}>Club : {clubName}</Text>
            <Text style={styles.meta}>Date de l&apos;événement : {pdfDate(event.date)}</Text>
            <Text style={styles.meta}>Lieu : {event.location || '-'}</Text>
            <Text style={styles.meta}>Total participants : {participants.length}</Text>
            <Table headers={['#', 'Nom complet', 'Email', 'Statut', 'Date inscr.']} rows={rows} widths={['6%', '29%', '34%', '14%', '17%']} accent={accent} />
        </Page>
    </Document>;
}

export function PostPDF({ post, clubName, accent, clubLogo, platformLogo, watermark, postImage, qr, generated, instagram }) {
    const category = post.category === 'event' ? 'Événement' : post.category === 'announcement' ? 'Annonce' : 'Publication';
    return <Document title={post.title || 'Publication'} author="ESTT Community">
        <Page size="A4" style={styles.page}>
            <Furniture title={clubName} subtitle={category.toUpperCase()} accent={accent} clubLogo={clubLogo} platformLogo={platformLogo} watermark={watermark} qr={qr} footerText={qr ? 'Scannez pour voir en ligne' : `Généré le ${generated}`} />
            <Text style={styles.postTitle}>{post.title || 'Sans titre'}</Text>
            <Text style={styles.meta}>Publié le {pdfDate(post.createdAt)} · Par {clubName}</Text>
            {postImage && <Image src={postImage} style={styles.postImage} />}
            <Text style={styles.body}>{post.content || ''}</Text>
            {instagram && <Text style={styles.meta}>Instagram : @{instagram}</Text>}
        </Page>
    </Document>;
}
