/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: { paddingTop: 35, paddingHorizontal: 40, fontFamily: 'Helvetica', color: '#1e293b', alignItems: 'center' },
    logos: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logo: { width: 75, height: 75, objectFit: 'contain' },
    title: { fontFamily: 'Helvetica-Bold', fontSize: 26, marginTop: -51 },
    description: { width: 385, textAlign: 'center', fontSize: 11, lineHeight: 1.5, color: '#64748b', marginTop: 36 },
    divider: { width: 360, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginVertical: 18 },
    reward: { fontFamily: 'Helvetica-Bold', fontSize: 22, color: '#4f46e5', marginBottom: 12 },
    explainer: { fontSize: 12, color: '#475569', textAlign: 'center', marginBottom: 18 },
    stepsTitle: { fontFamily: 'Helvetica-Bold', fontSize: 15, marginBottom: 9 },
    steps: { width: 440, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 7, padding: 15, alignItems: 'center' },
    step: { fontSize: 11, color: '#475569', marginBottom: 6 },
    qrFrame: { marginTop: 26, padding: 10, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6 },
    qr: { width: 155, height: 155 },
    scan: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: '#4f46e5', marginTop: 12 },
    cut: { position: 'absolute', bottom: 167, left: 0, right: 0, borderTopWidth: 1, borderTopColor: '#64748b', borderStyle: 'dashed', textAlign: 'center', color: '#94a3b8', fontSize: 8, paddingTop: 4 },
    tabs: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 165, flexDirection: 'row' },
    tab: { width: '10%', height: '100%', borderRightWidth: 1, borderRightColor: '#94a3b8', borderStyle: 'dashed', alignItems: 'center', paddingTop: 12 },
    tabQr: { width: 44, height: 44, marginBottom: 10 },
    codeLabel: { fontSize: 8, color: '#64748b', marginBottom: 5 },
    code: { fontFamily: 'Helvetica-Bold', fontSize: 13 },
    tabReward: { fontSize: 7, textAlign: 'center', color: '#4f46e5', marginTop: 7, paddingHorizontal: 2 },
});

export function RewardCodesPosterPDF({ pages, esttLogo, uniLogo }) {
    return <Document title="Affiche QR Codes ESTTPlus+" author="ESTT Community">
        {pages.map((page, index) => <Page key={index} size="A4" style={styles.page}>
            <View style={styles.logos}>
                {esttLogo ? <Image src={esttLogo} style={styles.logo} /> : <View style={styles.logo} />}
                {uniLogo ? <Image src={uniLogo} style={styles.logo} /> : <View style={styles.logo} />}
            </View>
            <Text style={styles.title}>ESTT Community</Text>
            <Text style={styles.description}>La plateforme d&apos;entraide 100% étudiants de l&apos;ESTT. Retrouvez vos cours, les clubs, les actualités et participez à la vie de votre école.</Text>
            <View style={styles.divider} />
            <Text style={styles.reward}>Débloquez votre ESTTPlus+</Text>
            <Text style={styles.explainer}>Obtenez un badge VIP exclusif sur votre profil public avec un des codes ci-dessous !</Text>
            <Text style={styles.stepsTitle}>Comment profiter de votre cadeau ?</Text>
            <View style={styles.steps}>
                <Text style={styles.step}>1. Détachez un des codes en bas de cette page.</Text>
                <Text style={styles.step}>2. Scannez le QR code pour ouvrir la plateforme.</Text>
                <Text style={styles.step}>3. Saisissez votre code pour récupérer votre avantage !</Text>
            </View>
            <View style={styles.qrFrame}><Image src={page.qr} style={styles.qr} /></View>
            <Text style={styles.scan}>SCANNEZ-MOI</Text>
            <Text style={styles.cut}>----------------------- COUPER ICI -----------------------</Text>
            <View style={styles.tabs}>
                {page.codes.map((item, codeIndex) => <View key={`${item.code}-${codeIndex}`} style={styles.tab}>
                    <Image src={item.qr} style={styles.tabQr} />
                    <Text style={styles.codeLabel}>CODE</Text>
                    <Text style={styles.code}>{item.code}</Text>
                    <Text style={styles.tabReward}>{item.reward}</Text>
                </View>)}
            </View>
        </Page>)}
    </Document>;
}
