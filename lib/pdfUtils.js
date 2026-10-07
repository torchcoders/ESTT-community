import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

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

export const generatePDF = async (data, type, clubInfo, selectedForm = null) => {
    try {
        const doc = new jsPDF();

        // --- Colors & Styling Options ---
        let r = 100, g = 116, b = 139;
        const primaryColorHex = clubInfo?.themeColor || '#64748b';
        if (clubInfo?.themeColor && clubInfo.themeColor.startsWith('#')) {
            const hex = clubInfo.themeColor.replace('#', '');
            if (hex.length === 6) {
                r = parseInt(hex.substring(0, 2), 16) || 100;
                g = parseInt(hex.substring(2, 4), 16) || 116;
                b = parseInt(hex.substring(4, 6), 16) || 139;
            }
        }

        // --- 1. Header Zone ---
        await addWatermark(doc);
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(0, 0, 210, 40, 'F');

        // Club Logo (Left)
        if (clubInfo?.logo) {
            try {
                const img = await loadImage(clubInfo.logo);
                doc.addImage(img, 'PNG', 15, 10, 20, 20);
            } catch (imgErr) {
                console.log("Could not load club logo for PDF", imgErr);
            }
        }

        // Website Logo (Right)
        try {
            const defaultLogoUrl = '/icons/icon-512x512-nobg.png';
            const webImg = await loadImage(defaultLogoUrl);
            doc.addImage(webImg, 'PNG', 175, 10, 20, 20);
        } catch (err) {
            console.log("Could not load website logo", err);
        }

        // Title (Center)
        doc.setTextColor(15, 23, 42); // slate-900
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        const mainTitle = type === 'join' ? "Demande d'adhésion" : "Soumission de Formulaire";
        const titleWidth = doc.getStringUnitWidth(mainTitle) * doc.internal.getFontSize() / doc.internal.scaleFactor;
        doc.text(mainTitle, (210 - titleWidth) / 2, 20);

        // Subtitle / Club Name
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(r, g, b);
        const subTitle = clubInfo?.name || 'Club';
        const subTitleWidth = doc.getStringUnitWidth(subTitle) * doc.internal.getFontSize() / doc.internal.scaleFactor;
        doc.text(subTitle, (210 - subTitleWidth) / 2, 28);

        // --- 2. Metadata Section ---
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105); // slate-600
        const submissionDate = new Date(data.submittedAt || Date.now()).toLocaleString('fr-FR');
        doc.text(`ID: ${data.id || 'N/A'}`, 15, 50);
        doc.text(`Date: ${submissionDate}`, 15, 56);
        if (type === 'form' && selectedForm) {
            doc.text(`Formulaire: ${selectedForm.title}`, 15, 62);
        }

        // --- 3. Body Zone (Table Content) ---
        let tableData = [];

        if (type === 'join') {
            tableData = [
                ['Nom Complet', data.name || 'N/A'],
                ['Email', data.email || 'N/A'],
                ['Téléphone', data.phone || 'N/A'],
                ['Motivations', data.reason || 'N/A'],
            ];

            // Add custom answers
            if (data.answers && Object.keys(data.answers).length > 0 && clubInfo?.joinFormQuestions) {
                tableData.push([{ content: 'Réponses Complémentaires', colSpan: 2, styles: { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [15, 23, 42] } }]);

                // Try to match with questions to get labels
                Object.entries(data.answers).forEach(([qId, ans]) => {
                    const question = clubInfo.joinFormQuestions.find(q => q.id.toString() === qId.toString());
                    const label = question ? question.label : `Question ${qId}`;
                    const displayAns = typeof ans === 'boolean' ? (ans ? 'Oui' : 'Non') : (ans || 'N/A');
                    tableData.push([label, displayAns]);
                });
            }

        } else if (type === 'form') {
            if (selectedForm && selectedForm.fields) {
                tableData = selectedForm.fields.map(field => {
                    let ans = data.data?.[field.id];
                    const displayAns = typeof ans === 'boolean' ? (ans ? 'Oui' : 'Non') : (ans || '-');
                    return [field.label, displayAns];
                });
            } else {
                Object.entries(data.data || {}).forEach(([key, val]) => {
                    tableData.push([key, val?.toString() || '-']);
                });
            }
        }

        // AutoTable Generation
        autoTable(doc, {
            startY: type === 'form' && selectedForm ? 68 : 68,
            head: [['Champ', 'Valeur/Réponse']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [r, g, b], textColor: 255, fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 60, fontStyle: 'bold', textColor: [71, 85, 105] },
                1: { cellWidth: 120, textColor: [15, 23, 42] }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { top: 10, right: 15, bottom: 10, left: 15 },
            styles: { font: 'helvetica', fontSize: 10, overflow: 'linebreak', cellPadding: 4 }
        });

        // finalY unused — doc.lastAutoTable?.finalY preserved for future pagination logic

        // --- 4. Footer & QR Code ---
        const pageHeight = doc.internal.pageSize.height;

        // Footer text
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        const footerText = `Généré via ESTT Community - ${new Date().toLocaleDateString('fr-FR')}`;
        doc.text(footerText, 15, pageHeight - 15);

        // Generate QR Code
        const qrData = JSON.stringify({
            id: data.id,
            club: clubInfo?.name,
            type: type,
            date: submissionDate
        });

        try {
            const qrDataUrl = await QRCode.toDataURL(qrData, {
                errorCorrectionLevel: 'M',
                margin: 1,
                color: {
                    dark: primaryColorHex,
                    light: '#ffffff'
                }
            });

            // Add QR Code at the bottom right
            doc.addImage(qrDataUrl, 'PNG', 170, pageHeight - 35, 25, 25);
        } catch (qrErr) {
            console.error("Error generating QR code:", qrErr);
        }

        // Save PDF
        const fileName = `${type === 'join' ? 'Adhesion' : 'Formulaire'}_${data.id || 'Export'}.pdf`;
        doc.save(fileName);
        return true;

    } catch (error) {
        console.error("Erreur lors de la génération du PDF:", error);
        throw error;
    }
};

const formatPdfAnswer = (answer) => {
    if (answer === null || answer === undefined || answer === '') return '-';
    if (typeof answer === 'boolean') return answer ? 'Oui' : 'Non';
    if (Array.isArray(answer)) return answer.join(', ');
    if (typeof answer === 'object') return JSON.stringify(answer);
    return String(answer);
};

export const generateAllFormResponsesPDF = async (submissions, form, clubInfo) => {
    try {
        const doc = new jsPDF();
        const pageHeight = doc.internal.pageSize.getHeight();
        const fields = form?.fields || [];
        const nameLabels = new Set(['full name', 'nom complet', 'name', 'nom']);
        const nameField = fields.find((field) =>
            nameLabels.has(String(field.label || '').trim().toLowerCase())
        ) || fields[0];

        const addFooter = () => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(
                `Généré via ESTT Community - ${new Date().toLocaleDateString('fr-FR')}`,
                15,
                pageHeight - 10
            );
        };

        const addPageTitle = (title, subtitle = '') => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.setTextColor(15, 23, 42);
            doc.text(title, 15, 20);
            if (subtitle) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.setTextColor(71, 85, 105);
                doc.text(subtitle, 15, 28);
            }
        };

        addPageTitle(
            'Résumé des réponses',
            `${form?.title || 'Formulaire'} - ${clubInfo?.name || 'Club'}`
        );

        autoTable(doc, {
            startY: 36,
            head: [['Nom', 'Statut']],
            body: submissions.map((submission) => [
                formatPdfAnswer(submission.data?.[nameField?.id]),
                ''
            ]),
            theme: 'grid',
            headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 130 },
                1: { cellWidth: 45 }
            },
            styles: {
                font: 'helvetica',
                fontSize: 10,
                overflow: 'linebreak',
                cellPadding: 4
            },
            margin: { top: 10, right: 15, bottom: 15, left: 15 }
        });
        addFooter();

        submissions.forEach((submission, index) => {
            doc.addPage();
            addPageTitle(
                `Réponse ${index + 1}`,
                `${form?.title || 'Formulaire'}${submission.submittedAt ? ` - ${new Date(submission.submittedAt).toLocaleString('fr-FR')}` : ''}`
            );

            const tableData = fields.map((field) => [
                field.label || `Champ ${field.id}`,
                formatPdfAnswer(submission.data?.[field.id])
            ]);

            autoTable(doc, {
                startY: 36,
                head: [['Champ', 'Réponse']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold' },
                columnStyles: {
                    0: { cellWidth: 60, fontStyle: 'bold', textColor: [71, 85, 105] },
                    1: { cellWidth: 120, textColor: [15, 23, 42] }
                },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: {
                    font: 'helvetica',
                    fontSize: 10,
                    overflow: 'linebreak',
                    cellPadding: 4
                },
                margin: { top: 10, right: 15, bottom: 15, left: 15 }
            });
            addFooter();
        });

        doc.save(`Formulaire_${form?.title || 'Export'}_toutes-les-reponses.pdf`);
        return true;
    } catch (error) {
        console.error('Erreur lors de la génération du PDF des réponses:', error);
        throw error;
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

export const generateCertificate = async (memberData, clubInfo) => {
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

export const generateAttendanceList = async (participants, eventInfo, clubInfo) => {
    try {
        const doc = new jsPDF();
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

        // --- 1. Header Zone ---
        await addWatermark(doc);
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, 210, 40, 'F');

        if (clubInfo?.logo) {
            try {
                const img = await loadImage(clubInfo.logo);
                doc.addImage(img, 'PNG', 15, 10, 20, 20);
            } catch { }
        }

        try {
            const defaultLogoUrl = '/icons/icon-512x512-nobg.png';
            const webImg = await loadImage(defaultLogoUrl);
            doc.addImage(webImg, 'PNG', 175, 10, 20, 20);
        } catch { }

        // Titles
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text("LISTE DE PRÉSENCE", 105, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(r, g, b);
        doc.text(eventInfo.title.toUpperCase(), 105, 28, { align: 'center' });

        // Event Metadata
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        const eventDate = new Date(eventInfo.date).toLocaleDateString('fr-FR');
        doc.text(`Club : ${clubInfo.name}`, 15, 50);
        doc.text(`Date de l'événement : ${eventDate}`, 15, 56);
        doc.text(`Lieu : ${eventInfo.location || 'N/A'}`, 15, 62);
        doc.text(`Total participants : ${participants.length}`, 195, 62, { align: 'right' });

        // --- 2. Table of Participants ---
        const tableData = participants.map((p, idx) => [
            idx + 1,
            p.firstName ? `${p.firstName} ${p.lastName || ''}` : (p.userName || p.userEmail || 'Participant'),
            p.userEmail || p.email || '-',
            //p.status === 'valid' ? 'Validé' : 'En attente',
            p.status === 'valid' ? '' : '',
            new Date(p.createdAt).toLocaleDateString('fr-FR')
        ]);

        autoTable(doc, {
            startY: 70,
            head: [['#', 'Nom Complet', 'Email', 'Statut', 'Date Inscr.']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [r, g, b], textColor: 255, fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 60 },
                2: { cellWidth: 60 },
                3: { cellWidth: 25 },
                4: { cellWidth: 25 }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 15, right: 15 },
            styles: { fontSize: 9, cellPadding: 3 }
        });

        // --- 3. Footer ---
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Généré le ${new Date().toLocaleString('fr-FR')} - ESTT Community Admin`, 105, pageHeight - 10, { align: 'center' });

        const fileName = `Presence_${eventInfo.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        return true;

    } catch (error) {
        console.error("Attendance List PDF Error:", error);
        throw error;
    }
};

export const generatePostPDF = async (post, clubInfo) => {
    try {
        const doc = new jsPDF();
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

        const width = 210;
        const pageHeight = doc.internal.pageSize.height;

        // --- 1. Header ---
        await addWatermark(doc);
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, width, 40, 'F');

        if (clubInfo?.logo) {
            try {
                const img = await loadImage(clubInfo.logo);
                doc.addImage(img, 'PNG', 15, 10, 20, 20);
            } catch { }
        }

        try {
            const defaultLogoUrl = '/icons/icon-512x512-nobg.png';
            const webImg = await loadImage(defaultLogoUrl);
            doc.addImage(webImg, 'PNG', 175, 10, 20, 20);
        } catch { }

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(clubInfo?.name || 'ESTT Club', 105, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(r, g, b);
        const categoryLabel = post.category === 'event' ? 'Événement' : (post.category === 'announcement' ? 'Annonce' : 'Publication');
        doc.text(categoryLabel.toUpperCase(), 105, 28, { align: 'center' });

        // --- 2. Post Content ---
        let currentY = 55;

        // Title
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        const splitTitle = doc.splitTextToSize(post.title || 'Sans titre', width - 30);
        doc.text(splitTitle, 15, currentY);
        currentY += (splitTitle.length * 10) + 5;

        // Meta Info
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        const dateStr = new Date(post.createdAt).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        doc.text(`Publié le ${dateStr} • Par ${clubInfo.name}`, 15, currentY);
        currentY += 15;

        // Post Image
        if (post.image) {
            try {
                const img = await loadImage(post.image);
                const imgW = width - 30;
                const imgH = (img.height * imgW) / img.width;

                // Check if image fits on page, otherwise new page
                if (currentY + imgH > pageHeight - 60) {
                    doc.addPage();
                    await addWatermark(doc);
                    currentY = 20;
                }

                doc.addImage(img, 'JPEG', 15, currentY, imgW, imgH);
                currentY += imgH + 15;
            } catch (err) {
                console.log("Could not load post image for PDF", err);
            }
        }

        // Body Text
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const splitContent = doc.splitTextToSize(post.content || '', width - 30);

        // Handle multipage content
        for (const line of splitContent) {
            if (currentY > pageHeight - 50) {
                doc.addPage();
                await addWatermark(doc);
                currentY = 20;
            }
            doc.text(line, 15, currentY);
            currentY += 7;
        }

        // --- 3. QR Code & Footer ---
        const postUrl = `${window.location.origin}/clubs/${clubInfo.id}/posts/${post.id}`;

        try {
            const qrDataUrl = await QRCode.toDataURL(postUrl, {
                errorCorrectionLevel: 'M',
                margin: 1,
                color: {
                    dark: primaryColorHex,
                    light: '#ffffff'
                }
            });

            // Ensure footer area on the last page
            if (currentY > pageHeight - 50) {
                doc.addPage();
                await addWatermark(doc);
            }

            const footerY = pageHeight - 40;
            doc.setFillColor(248, 250, 252);
            doc.rect(0, footerY, width, 40, 'F');

            doc.addImage(qrDataUrl, 'PNG', 15, footerY + 8, 25, 25);

            doc.setFontSize(9);
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.text("Scannez pour voir en ligne", 45, footerY + 18);

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text("Retrouvez cette publication et plus encore sur ESTT Community.", 45, footerY + 24);

//            doc.text(`ID: ${post.id}`, width - 15, footerY + 20, { align: 'right' });

            // Add "Retrouvez-nous" section with Instagram if available
            if (clubInfo?.socialLinks?.instagram) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
 //               doc.text("Retrouvez-nous",  width - 15, footerY + 24, { align: 'right' });

                // Try to add Instagram icon and link
                try {
                    const instagramIconUrl = '/icons/instagram.png';
                    await loadImage(instagramIconUrl); // preload; addImage call is commented out
  //                  doc.addImage(instagramImg, 'PNG', width - 39, footerY + 20.5, 5, 5);

                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(100, 116, 139);
                    const instagramHandle = clubInfo.socialLinks.instagram.replace(/^(https?:\/\/(www\.)?)?instagram\.com\//, '');
                   console.log(clubInfo)
                    doc.text(`@${instagramHandle}`,width - 15, footerY + 24, { align: 'right' });
                } catch (instErr) {
                    console.log("Could not load Instagram icon for PDF", instErr);
                }
            }
        } catch (qrErr) {
            console.error("Error generating QR code for post PDF:", qrErr);
        }

        doc.save(`${post.title.replace(/\s+/g, '_')}.pdf`);
        return true;

    } catch (error) {
        console.error("Publication PDF Error:", error);
        throw error;
    }
};
