/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import {
  getProjectCategoryLabel,
  getProjectDifficultyLabel,
  getProjectStatusLabel,
  getProjectVoteModeLabel,
} from '@/lib/projects';

const blue = '#3b82f6';
const dark = '#0f172a';
const mid = '#475569';
const light = '#64748b';
const border = '#e2e8f0';

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingHorizontal: 43, paddingBottom: 92, fontFamily: 'Helvetica', color: dark, fontSize: 10, backgroundColor: '#ffffff' },
  watermark: { position: 'absolute', top: 218, left: 95, width: 405, height: 405, opacity: 0.045 },
  brand: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  brandIcon: { width: 30, height: 30, marginRight: 9 },
  brandName: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: blue },
  brandSub: { fontSize: 8, color: light, marginTop: 2 },
  coverImage: { width: '100%', height: 245, objectFit: 'cover', marginBottom: 25, borderRadius: 5 },
  eyebrow: { fontSize: 8, color: blue, fontFamily: 'Helvetica-Bold', letterSpacing: 2, marginBottom: 8 },
  coverTitle: { fontSize: 24, fontFamily: 'Helvetica-Bold', lineHeight: 1.18, marginBottom: 12 },
  rule: { height: 1, backgroundColor: border, marginBottom: 14 },
  badge: { alignSelf: 'flex-start', backgroundColor: blue, color: '#ffffff', fontSize: 8, fontFamily: 'Helvetica-Bold', paddingVertical: 5, paddingHorizontal: 11, borderRadius: 4, marginBottom: 11 },
  meta: { fontSize: 9, color: light, lineHeight: 1.5, marginBottom: 13 },
  excerpt: { color: mid, fontSize: 10, lineHeight: 1.5, marginBottom: 19 },
  metrics: { flexDirection: 'row', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: border, borderRadius: 5, paddingVertical: 13, marginBottom: 14 },
  metric: { flex: 1, paddingHorizontal: 8, alignItems: 'center' },
  metricBorder: { borderRightWidth: 1, borderRightColor: border },
  metricLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: light, marginBottom: 6 },
  metricValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  tags: { fontSize: 9, color: light, lineHeight: 1.5 },
  heading: { fontSize: 17, fontFamily: 'Helvetica-Bold', paddingBottom: 9, borderBottomWidth: 2, borderBottomColor: blue, marginBottom: 17 },
  subheading: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 18, marginBottom: 9 },
  tableHeader: { flexDirection: 'row', backgroundColor: blue, padding: 10 },
  tableHeadText: { color: '#ffffff', fontSize: 9, fontFamily: 'Helvetica-Bold' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: border, paddingVertical: 9, paddingHorizontal: 10 },
  alternateRow: { backgroundColor: '#f8fafc' },
  tableKey: { width: '31%', color: light, fontFamily: 'Helvetica-Bold', paddingRight: 10 },
  tableValue: { width: '69%', color: mid },
  paragraph: { color: mid, fontSize: 10, lineHeight: 1.55, marginBottom: 8 },
  listItem: { flexDirection: 'row', marginBottom: 9, minHeight: 14 },
  bullet: { width: 16, color: blue, fontFamily: 'Helvetica-Bold' },
  listText: { flex: 1, color: mid, lineHeight: 1.45 },
  empty: { color: light, fontSize: 9, marginBottom: 11 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 43, backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: border },
  qr: { width: 40, height: 40, marginRight: 8 },
  footerText: { fontSize: 7.5, color: light },
  footerRight: { flex: 1, textAlign: 'right', fontSize: 8, color: light },
});

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

function PageFurniture({ watermarkUrl, qrCodeUrl, generatedDate }) {
  return (
    <>
      {watermarkUrl && <Image src={watermarkUrl} style={styles.watermark} fixed />}
      <View style={styles.footer} fixed>
        {qrCodeUrl && <Image src={qrCodeUrl} style={styles.qr} />}
        <Text style={styles.footerText}>{qrCodeUrl ? 'Scanner pour accéder au projet' : 'ESTT Community'}</Text>
        <Text style={styles.footerRight}>Généré le {generatedDate} — ESTT Community</Text>
      </View>
    </>
  );
}

function SectionList({ title, items }) {
  return (
    <View>
      <Text style={styles.subheading}>{title}</Text>
      {items.length ? items.map((item, index) => (
        <View style={styles.listItem} key={`${title}-${index}`} wrap={false}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.listText}>{String(item)}</Text>
        </View>
      )) : <Text style={styles.empty}>Aucun élément renseigné.</Text>}
    </View>
  );
}

export function ProjectDossierPDF({ project, coverImageUrl, watermarkUrl, brandIconUrl, qrCodeUrl, generatedDate }) {
  const description = project.description || project.summary || 'Aucune description disponible.';
  const requirements = Array.isArray(project.requirements) ? project.requirements : [];
  const criteria = Array.isArray(project.evaluationCriteria) ? project.evaluationCriteria : [];
  const tags = Array.isArray(project.tags) ? project.tags : [];
  const submissionCount = project.submissionCount ?? project.submissions?.length ?? 0;
  const rows = [
    ['Titre', project.title || 'N/A'],
    ['Auteur', project.authorName || 'N/A'],
    ['Catégorie', getProjectCategoryLabel(project.category)],
    ['Difficulté', getProjectDifficultyLabel(project.difficulty)],
    ['Mode de vote', getProjectVoteModeLabel(project.voteMode)],
    ['Créé le', formatDate(project.createdAt)],
    ['Date limite', project.deadline ? formatDate(project.deadline) : 'Aucune'],
    ['Statut', getProjectStatusLabel(project.status)],
  ];

  return (
    <Document title={`Dossier projet - ${project.title || 'Projet'}`} author="ESTT Community" subject="Dossier de projet étudiant">
      <Page size="A4" style={styles.page}>
        <PageFurniture watermarkUrl={watermarkUrl} qrCodeUrl={qrCodeUrl} generatedDate={generatedDate} />
        <View style={styles.brand}>
          {brandIconUrl && <Image src={brandIconUrl} style={styles.brandIcon} />}
          <View><Text style={styles.brandName}>ESTT Community</Text><Text style={styles.brandSub}>Dossier de projet étudiant</Text></View>
        </View>
        {coverImageUrl && <Image src={coverImageUrl} style={styles.coverImage} />}
        <Text style={styles.eyebrow}>PROJET ÉTUDIANT</Text>
        <Text style={styles.coverTitle}>{project.title || 'Projet'}</Text>
        <View style={styles.rule} />
        <Text style={styles.badge}>{getProjectStatusLabel(project.status).toUpperCase()}</Text>
        <Text style={styles.meta}>Par {project.authorName || 'Étudiant ESTT'}  •  {getProjectCategoryLabel(project.category)}  •  Niveau : {getProjectDifficultyLabel(project.difficulty)}</Text>
        <Text style={styles.excerpt}>{description.length > 320 ? `${description.slice(0, 320).trimEnd()}…` : description}</Text>
        <View style={styles.metrics} wrap={false}>
          {[
            ['SOUMISSIONS', String(submissionCount)],
            ['MODE DE VOTE', getProjectVoteModeLabel(project.voteMode)],
            ['DATE LIMITE', project.deadline ? formatDate(project.deadline) : 'Aucune'],
          ].map(([label, value], index) => (
            <View key={label} style={[styles.metric, index < 2 && styles.metricBorder]}>
              <Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text>
            </View>
          ))}
        </View>
        {tags.length > 0 && <Text style={styles.tags}>{tags.map((tag) => `#${tag}`).join('   ')}</Text>}
      </Page>

      <Page size="A4" style={styles.page}>
        <PageFurniture watermarkUrl={watermarkUrl} qrCodeUrl={qrCodeUrl} generatedDate={generatedDate} />
        <Text style={styles.heading}>Détails du projet</Text>
        <View style={styles.tableHeader} wrap={false}>
          <Text style={[styles.tableHeadText, styles.tableKey]}>PROPRIÉTÉ</Text>
          <Text style={[styles.tableHeadText, styles.tableValue]}>VALEUR</Text>
        </View>
        {rows.map(([label, value], index) => (
          <View key={label} style={[styles.tableRow, index % 2 === 0 && styles.alternateRow]} wrap={false}>
            <Text style={styles.tableKey}>{label}</Text><Text style={styles.tableValue}>{String(value)}</Text>
          </View>
        ))}
        <Text style={styles.subheading}>Description complète</Text>
        <Text style={styles.paragraph}>{description}</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <PageFurniture watermarkUrl={watermarkUrl} qrCodeUrl={qrCodeUrl} generatedDate={generatedDate} />
        <Text style={styles.heading}>Attendus &amp; critères d&apos;évaluation</Text>
        <SectionList title="Attendus" items={requirements} />
        <SectionList title="Critères d'évaluation" items={criteria} />
        {tags.length > 0 && <View><Text style={styles.subheading}>Tags</Text><Text style={styles.tags}>{tags.map((tag) => `#${tag}`).join('   ')}</Text></View>}
      </Page>
    </Document>
  );
}
