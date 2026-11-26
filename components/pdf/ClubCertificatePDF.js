/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import {
    Document,
    Page,
    View,
    Text,
    Image,
    StyleSheet,
    Svg,
    Path,
    Circle,
    Line
} from '@react-pdf/renderer';

// Corner Ornament SVG Component
const CornerOrnament = ({ style, color = '#b45309' }) => (
    <View style={style}>
        <Svg width="32" height="32" viewBox="0 0 32 32">
            <Path
                d="M 2 2 L 30 2 L 30 6 L 6 6 L 6 30 L 2 30 Z"
                fill={color}
            />
            <Circle cx="14" cy="14" r="2.5" fill={color} />
            <Path
                d="M 10 2 L 10 10 L 2 10"
                stroke={color}
                strokeWidth="1"
                fill="none"
            />
        </Svg>
    </View>
);

// Medallion / Official Seal SVG
const OfficialSeal = ({ color = '#b45309' }) => (
    <Svg width="54" height="54" viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="46" stroke={color} strokeWidth="3" fill="#ffffff" />
        <Circle cx="50" cy="50" r="41" stroke={color} strokeWidth="1" strokeDasharray="3 2" fill="none" />
        <Circle cx="50" cy="50" r="34" stroke={color} strokeWidth="1.5" fill="#f8fafc" />
        <Path
            d="M 50 24 L 54.5 37.5 L 69 37.5 L 57.2 45.8 L 61.7 59.5 L 50 51.2 L 38.3 59.5 L 42.8 45.8 L 31 37.5 L 45.5 37.5 Z"
            fill={color}
        />
        <Path
            d="M 36 78 L 30 96 L 44 90 L 48 94 L 46 76"
            fill={color}
            opacity="0.85"
        />
        <Path
            d="M 64 78 L 70 96 L 56 90 L 52 94 L 54 76"
            fill={color}
            opacity="0.85"
        />
    </Svg>
);

// Decorative Horizontal Rule with Center Diamond
const DecorativeDivider = ({ color = '#b45309', width = 280 }) => (
    <View style={{ width, height: 16, alignItems: 'center', justifyContent: 'center', marginVertical: 4 }}>
        <Svg width={width} height="16" viewBox={`0 0 ${width} 16`}>
            <Line x1="0" y1="8" x2={width / 2 - 14} y2="8" stroke={color} strokeWidth="1" opacity="0.6" />
            <Path
                d={`M ${width / 2 - 6} 8 L ${width / 2} 3 L ${width / 2 + 6} 8 L ${width / 2} 13 Z`}
                fill={color}
            />
            <Circle cx={width / 2 - 14} cy="8" r="1.5" fill={color} />
            <Circle cx={width / 2 + 14} cy="8" r="1.5" fill={color} />
            <Line x1={width / 2 + 14} y1="8" x2={width} y2="8" stroke={color} strokeWidth="1" opacity="0.6" />
        </Svg>
    </View>
);

export function ClubCertificatePDF({
    member,
    club,
    signatureCode,
    qrCodeUrl,
    clubLogoUrl,
    schoolLogoUrl,
    watermarkUrl,
    formattedDate,
}) {
    const primaryColor = club?.themeColor || '#1e3a8a';
    const accentColor = '#b45309'; // Warm royal gold / bronze
    const memberName = (member?.name || 'Membre du Club').toUpperCase();
    const clubName = club?.name || 'Club ESTT';

    const styles = StyleSheet.create({
        page: {
            width: '100%',
            height: '100%',
            padding: 16,
            backgroundColor: '#ffffff',
            position: 'relative',
            fontFamily: 'Helvetica',
        },
        outerBorder: {
            flex: 1,
            borderWidth: 2,
            borderColor: accentColor,
            borderStyle: 'solid',
            padding: 4,
            position: 'relative',
        },
        innerBorder: {
            flex: 1,
            borderWidth: 1,
            borderColor: 'rgba(180, 83, 9, 0.45)',
            borderStyle: 'solid',
            padding: 16,
            position: 'relative',
            backgroundColor: '#fafbfc',
            justifyContent: 'space-between',
        },
        // Corners
        cornerTL: { position: 'absolute', top: -1, left: -1 },
        cornerTR: { position: 'absolute', top: -1, right: -1, transform: 'rotate(90deg)' },
        cornerBL: { position: 'absolute', bottom: -1, left: -1, transform: 'rotate(270deg)' },
        cornerBR: { position: 'absolute', bottom: -1, right: -1, transform: 'rotate(180deg)' },

        // Watermark
        watermarkLayer: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.035,
        },
        watermarkImage: {
            width: 380,
            height: 380,
        },

        // Header Section
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 6,
            borderBottomWidth: 0.5,
            borderBottomColor: '#e2e8f0',
        },
        headerLogoBox: {
            width: 52,
            height: 52,
            alignItems: 'center',
            justifyContent: 'center',
        },
        headerLogo: {
            maxWidth: 50,
            maxHeight: 50,
            objectFit: 'contain',
        },
        clubLogoFrame: {
            width: 52,
            height: 52,
            borderRadius: 26,
            borderWidth: 1.5,
            borderColor: primaryColor,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            overflow: 'hidden',
        },
        headerCenter: {
            flex: 1,
            alignItems: 'center',
            paddingHorizontal: 12,
        },
        headerSupTitle: {
            fontSize: 7.5,
            letterSpacing: 1.5,
            color: '#64748b',
            textTransform: 'uppercase',
            marginBottom: 2,
        },
        headerSchoolTitle: {
            fontSize: 10,
            fontWeight: 'bold',
            letterSpacing: 1,
            color: '#0f172a',
            textTransform: 'uppercase',
            marginBottom: 2,
        },
        headerSubBadge: {
            fontSize: 7,
            letterSpacing: 1.5,
            color: accentColor,
            fontWeight: 'bold',
            textTransform: 'uppercase',
        },

        // Body Content
        bodyContent: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 4,
        },
        titleTag: {
            fontSize: 8.5,
            letterSpacing: 3,
            color: accentColor,
            fontWeight: 'bold',
            textTransform: 'uppercase',
            marginBottom: 3,
        },
        mainTitle: {
            fontSize: 28,
            fontFamily: 'Helvetica-Bold',
            letterSpacing: 3,
            color: primaryColor,
            textTransform: 'uppercase',
            textAlign: 'center',
            marginBottom: 2,
        },
        subTitle: {
            fontSize: 8.5,
            letterSpacing: 2,
            color: '#64748b',
            textTransform: 'uppercase',
            marginBottom: 8,
        },
        presentedTo: {
            fontSize: 11,
            fontFamily: 'Times-Italic',
            color: '#475569',
            marginBottom: 6,
        },
        memberName: {
            fontSize: 26,
            fontFamily: 'Helvetica-Bold',
            letterSpacing: 1.5,
            color: '#0f172a',
            textAlign: 'center',
            marginBottom: 2,
        },
        descriptionText: {
            fontSize: 10.5,
            color: '#475569',
            textAlign: 'center',
            marginTop: 4,
            marginBottom: 2,
            lineHeight: 1.4,
            maxWidth: 540,
        },
        clubNameHighlight: {
            fontSize: 14,
            fontFamily: 'Helvetica-Bold',
            color: primaryColor,
            textAlign: 'center',
            marginTop: 2,
        },

        // Footer Section
        footer: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            paddingTop: 8,
            borderTopWidth: 0.5,
            borderTopColor: '#e2e8f0',
        },
        footerLeft: {
            width: 170,
        },
        footerTextSmall: {
            fontSize: 8,
            color: '#64748b',
            lineHeight: 1.3,
        },
        footerTextBold: {
            fontSize: 8.5,
            fontFamily: 'Helvetica-Bold',
            color: '#334155',
            marginTop: 1,
        },

        footerCenter: {
            alignItems: 'center',
            justifyContent: 'center',
        },
        securityBadge: {
            backgroundColor: '#ffffff',
            borderWidth: 0.8,
            borderColor: '#cbd5e1',
            borderRadius: 4,
            paddingVertical: 2,
            paddingHorizontal: 8,
            marginTop: 4,
            alignItems: 'center',
        },
        signatureLabel: {
            fontSize: 6,
            color: '#94a3b8',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
        },
        signatureCodeText: {
            fontSize: 7.5,
            fontFamily: 'Courier',
            fontWeight: 'bold',
            color: '#1e293b',
            letterSpacing: 1,
        },

        footerRight: {
            width: 210,
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            gap: 12,
        },
        signatureArea: {
            alignItems: 'center',
            width: 130,
        },
        signatureLine: {
            width: '100%',
            height: 1,
            backgroundColor: '#94a3b8',
            marginBottom: 4,
        },
        signatureRole: {
            fontSize: 8,
            fontFamily: 'Helvetica-Bold',
            color: '#1e293b',
            textAlign: 'center',
        },
        signatureClub: {
            fontSize: 7,
            color: '#64748b',
            textAlign: 'center',
            marginTop: 1,
        },

        qrContainer: {
            alignItems: 'center',
            justifyContent: 'center',
        },
        qrImage: {
            width: 44,
            height: 44,
            borderRadius: 2,
        },
        qrLabel: {
            fontSize: 5.5,
            color: '#94a3b8',
            marginTop: 2,
            textAlign: 'center',
        },
    });

    return (
        <Document
            title={`Certificat d'adhésion - ${memberName}`}
            author="ESTT Community"
            subject={`Attestation de membre ${clubName}`}
        >
            <Page size="A4" orientation="landscape" style={styles.page}>
                <View style={styles.outerBorder}>
                    {/* Corner Ornaments */}
                    <CornerOrnament style={styles.cornerTL} color={accentColor} />
                    <CornerOrnament style={styles.cornerTR} color={accentColor} />
                    <CornerOrnament style={styles.cornerBL} color={accentColor} />
                    <CornerOrnament style={styles.cornerBR} color={accentColor} />

                    <View style={styles.innerBorder}>
                        {/* Background Watermark */}
                        {watermarkUrl && (
                            <View style={styles.watermarkLayer}>
                                <Image src={watermarkUrl} style={styles.watermarkImage} />
                            </View>
                        )}

                        {/* Top Header */}
                        <View style={styles.header}>
                            {/* School / Platform Logo */}
                            <View style={styles.headerLogoBox}>
                                {schoolLogoUrl ? (
                                    <Image src={schoolLogoUrl} style={styles.headerLogo} />
                                ) : (
                                    <View style={{ width: 40, height: 40, backgroundColor: '#f1f5f9', borderRadius: 20 }} />
                                )}
                            </View>

                            {/* Header Titles */}
                            <View style={styles.headerCenter}>
                                <Text style={styles.headerSupTitle}>
                                    Royaume du Maroc • Université Abdelmalek Essaâdi
                                </Text>
                                <Text style={styles.headerSchoolTitle}>
                                    École Supérieure de Technologie de Tétouan
                                </Text>
                                <Text style={styles.headerSubBadge}>
                                    ESTT Community • Vie Associative & Parascolaire
                                </Text>
                            </View>

                            {/* Club Logo */}
                            <View style={styles.headerLogoBox}>
                                {clubLogoUrl ? (
                                    <View style={styles.clubLogoFrame}>
                                        <Image src={clubLogoUrl} style={styles.headerLogo} />
                                    </View>
                                ) : (
                                    <View style={[styles.clubLogoFrame, { backgroundColor: primaryColor }]}>
                                        <Text style={{ fontSize: 14, color: '#ffffff', fontWeight: 'bold' }}>
                                            {clubName.slice(0, 3).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Certificate Body */}
                        <View style={styles.bodyContent}>
                            <Text style={styles.titleTag}>Attestation Officielle</Text>
                            <Text style={styles.mainTitle}>CERTIFICAT D&apos;ADHÉSION</Text>
                            <Text style={styles.subTitle}>Reconnaissance de statut de membre actif</Text>

                            <DecorativeDivider color={accentColor} width={260} />

                            <Text style={styles.presentedTo}>Ce certificat est fièrement décerné à :</Text>
                            <Text style={styles.memberName}>{memberName}</Text>

                            <DecorativeDivider color={primaryColor} width={340} />

                            <Text style={styles.descriptionText}>
                                En témoignage de son engagement, de sa participation et de son adhésion officielle au sein du club
                            </Text>
                            <Text style={styles.clubNameHighlight}>{clubName}</Text>
                        </View>

                        {/* Footer Section */}
                        <View style={styles.footer}>
                            {/* Left: Issue metadata */}
                            <View style={styles.footerLeft}>
                                <Text style={styles.footerTextSmall}>Date d&apos;attribution :</Text>
                                <Text style={styles.footerTextBold}>{formattedDate}</Text>
                                <Text style={[styles.footerTextSmall, { marginTop: 4 }]}>Lieu :</Text>
                                <Text style={styles.footerTextBold}>Tétouan, Maroc</Text>
                            </View>

                            {/* Center: Official Seal & Cryptographic ID */}
                            <View style={styles.footerCenter}>
                                <OfficialSeal color={accentColor} />
                                <View style={styles.securityBadge}>
                                    <Text style={styles.signatureLabel}>Vérification Numérique</Text>
                                    <Text style={styles.signatureCodeText}>{signatureCode}</Text>
                                </View>
                            </View>

                            {/* Right: Signature & QR Code */}
                            <View style={styles.footerRight}>
                                <View style={styles.signatureArea}>
                                    <View style={styles.signatureLine} />
                                    <Text style={styles.signatureRole}>Le / La Président(e)</Text>
                                    <Text style={styles.signatureClub}>{clubName}</Text>
                                </View>

                                {qrCodeUrl && (
                                    <View style={styles.qrContainer}>
                                        <Image src={qrCodeUrl} style={styles.qrImage} />
                                        <Text style={styles.qrLabel}>Scanner pour vérifier</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                </View>
            </Page>
        </Document>
    );
}
