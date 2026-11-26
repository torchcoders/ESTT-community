import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { generateSubmissionReactPDF, generateAllResponsesReactPDF, generateAttendanceReactPDF, generatePostReactPDF } from './communityPdfReact';
import { generateCertificateReactPDF } from './generateCertificateReactPDF';

const loadImage = (url) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
});

const addWatermark = async (doc) => {
    try {
        const shapeUrl = '/icons/shape.png' ;
        const img = await loadImage(shapeUrl);
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const watermarkWidth = pageWidth * 0.7;
        const watermarkHeight = (img.height * watermarkWidth) / img.width;

        const x = (pageWidth - watermarkWidth) / 2;
        const y = (pageHeight - watermarkHeight) / 2;

        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.05 }));
        doc.addImage(img, 'PNG', x, y, watermarkWidth, watermarkHeight);
        doc.restoreGraphicsState();
    } catch (err) {
        console.log("Watermark error", err);
    }
};

export const getCertificateSignature = (memberData, clubInfo) => {
    const hashSeed = `${memberData.id}-${clubInfo.id}-${memberData.joinedAt || '2024'}-ESTT-SECURE`;
    let hash = 0;
    for (let i = 0; i < hashSeed.length; i++) {
        hash = ((hash << 5) - hash) + hashSeed.charCodeAt(i);
        hash |= 0;
    }
    return `ESTT-MEM-${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`;
};

export const generateCertificateJsPDF = async (memberData, clubInfo) => {
    try {
        // Landscape orientation (297x210 mm)
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const width = 297;
        const height = 210;

        // --- Colors & Styling ---
        const primaryColorHex = clubInfo?.themeColor || '#64748b';
        let r = 100, g = 116, b = 139;
        if (primaryColorHex.startsWith('#')) {
            const hex = primaryColorHex.replace('#', '');
            if (hex.length === 6) {
                r = parseInt(hex.substring(0, 2), 16) || 100;
                g = parseInt(hex.substring(2, 4), 16) || 116;
                b = parseInt(hex.substring(4, 6), 16) || 139;
            }
        }

        // --- 1. Ornate Border ---
        doc.setDrawColor(r, g, b);
        doc.setLineWidth(1.5);
        doc.rect(10, 10, width - 20, height - 20); // Outer border
        doc.setLineWidth(0.5);
        doc.rect(12, 12, width - 24, height - 24); // Inner subtle border

        // Corner Decorations (Simple circles for aesthetic)
        const corners = [[10, 10], [width - 10, 10], [10, height - 10], [width - 10, height - 10]];
        corners.forEach(([cx, cy]) => {
            doc.setFillColor(r, g, b);
            doc.circle(cx, cy, 3, 'F');
        });

        // --- 2. Background Texture / Subtlety ---
        await addWatermark(doc);
        doc.setFillColor(252, 252, 252);
        doc.rect(12.5, 12.5, width - 25, height - 25, 'F');

        // Club Logo (Center Top)
        if (clubInfo?.logo) {
            try {
                const img = await loadImage(clubInfo.logo);
                doc.addImage(img, 'PNG', (width / 2) - 15, 20, 30, 30);
            } catch (imgErr) {
                console.log("Could not load club logo for certificate", imgErr);
            }
        }

        // ESTT Community Logo (Bottom Left) icon-512x512-nobg.png
        try {
            const defaultLogoUrl = '/icons/icon-512x512-nobg.png';
            const webImg = await loadImage(defaultLogoUrl);
            doc.addImage(webImg, 'PNG', 20, height - 40, 20, 20);
        } catch (err) {
            console.log("Could not load website logo", err);
        }

        // --- 4. Main Text Content ---
        doc.setTextColor(15, 23, 42); // slate-900

        // "CERTIFICAT D'ADHÉSION"
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(40);
        const certTitle = "CERTIFICAT D'ADHÉSION";
        doc.text(certTitle, width / 2, 75, { align: 'center' });

        // Divider
        doc.setDrawColor(r, g, b);
        doc.setLineWidth(1);
        doc.line((width / 2) - 40, 82, (width / 2) + 40, 82);

        // "Ce certificat est fièrement décerné à"
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(16);
        doc.setTextColor(71, 85, 105); // slate-600
        doc.text("Ce certificat est fièrement décerné à", width / 2, 95, { align: 'center' });

        // Member Name
        doc.setFontSize(32);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(r, g, b);
        const memberName = memberData.name || 'Membre du Club';
        doc.text(memberName.toUpperCase(), width / 2, 110, { align: 'center' });

        // "Pour son adhésion officielle au club"
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(16);
        doc.setTextColor(71, 85, 105);
        doc.text("En reconnaissance de son adhésion officielle au club", width / 2, 125, { align: 'center' });

        // Club Name
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(clubInfo.name || 'ESTT Club', width / 2, 140, { align: 'center' });

        // --- 5. Footer Details ---

        // Date
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const joinDate = new Date(memberData.joinedAt || Date.now()).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        doc.text(`Fait le : ${joinDate}`, width / 2, 160, { align: 'center' });

        // Signatures (President)
        doc.setFontSize(10);
        doc.text("Président(e) du Club", 230, 180, { align: 'center' });
        doc.setLineWidth(0.5);
        doc.line(200, 175, 260, 175);

        // --- 6. Digital Signature & Verification ---

        // Use the exported helper for signature
        const signatureCode = getCertificateSignature(memberData, clubInfo);

        // Display Signature Code
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(`Signature Numérique : ${signatureCode}`, 20, height - 15);

        // QR Code for Verification
        const verificationUrl = `${window.location.origin}/clubs/${clubInfo.id}/certificate/${memberData.id}`;
        try {
            const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
                errorCorrectionLevel: 'M',
                margin: 1,
                color: {
                    dark: primaryColorHex,
                    light: '#ffffff'
                }
            });
            doc.addImage(qrDataUrl, 'PNG', width - 40, height - 40, 20, 20);
            doc.setFontSize(7);
            doc.text("Scannez pour vérifier", width - 30, height - 15, { align: 'center' });
        } catch (qrErr) {
            console.error("Error generating QR code for certificate:", qrErr);
        }

        // --- Save PDF ---
        const safeName = memberName.replace(/\s+/g, '_');
        doc.save(`Certificat_${safeName}.pdf`);
        return true;

    } catch (error) {
        console.error("Erreur lors de la génération du certificat:", error);
        throw error;
    }
};

export const generateCertificate = async (memberData, clubInfo) => {
    try {
        return await generateCertificateReactPDF(memberData, clubInfo);
    } catch (reactPdfErr) {
        console.warn("React-PDF certificate generation failed, attempting jsPDF fallback:", reactPdfErr);
        return await generateCertificateJsPDF(memberData, clubInfo);
    }
};

export const generatePDF = (data, type, clubInfo, selectedForm = null) => generateSubmissionReactPDF(data, type, clubInfo, selectedForm);
export const generateAllFormResponsesPDF = (submissions, form, clubInfo) => generateAllResponsesReactPDF(submissions, form, clubInfo);
export const generateAttendanceList = (participants, eventInfo, clubInfo) => generateAttendanceReactPDF(participants, eventInfo, clubInfo);
export const generatePostPDF = (post, clubInfo) => generatePostReactPDF(post, clubInfo);
