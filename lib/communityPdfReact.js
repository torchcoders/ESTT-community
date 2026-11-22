import QRCode from 'qrcode';
import { downloadReactPdf, imageDataUrl, safePdfName } from './reactPdfDownload';

const assets = async (clubInfo) => {
    const [clubLogo, platformLogo, watermark] = await Promise.all([
        imageDataUrl(clubInfo?.logo),
        imageDataUrl('/icons/icon-512x512-nobg.png'),
        imageDataUrl('/icons/shape.png'),
    ]);
    const theme = clubInfo?.themeColor;
    return { clubLogo, platformLogo, watermark, accent: /^#[0-9a-f]{6}$/i.test(theme || '') ? theme : '#64748b' };
};

const dateNow = () => new Date().toLocaleString('fr-FR');

const makeQr = async (value, accent) => {
    try {
        return await QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 1, color: { dark: accent, light: '#ffffff' } });
    } catch (error) {
        console.warn('Could not generate PDF QR code:', error);
        return null;
    }
};

export async function generateSubmissionReactPDF(data, type, clubInfo, selectedForm) {
    const { SubmissionPDF } = await import('@/components/pdf/CommunityPDFs');
    const prepared = await assets(clubInfo);
    const title = type === 'join' ? "Demande d'adhésion" : 'Soumission de formulaire';
    const rows = type === 'join' ? [
        ['Nom complet', data.name], ['Email', data.email], ['Téléphone', data.phone], ['Motivations', data.reason],
        ...Object.entries(data.answers || {}).map(([id, answer]) => [
            clubInfo?.joinFormQuestions?.find(q => String(q.id) === id)?.label || `Question ${id}`, answer,
        ]),
    ] : selectedForm?.fields?.length ? selectedForm.fields.map(field => [field.label, data.data?.[field.id]])
        : Object.entries(data.data || {});
    const submissionDate = new Date(data.submittedAt || Date.now()).toLocaleString('fr-FR');
    const qr = await makeQr(JSON.stringify({ id: data.id, club: clubInfo?.name, type, date: submissionDate }), prepared.accent);
    return downloadReactPdf(SubmissionPDF, {
        title, clubName: clubInfo?.name || 'Club', rows,
        metadata: [['ID', data.id || 'N/A'], ['Date', submissionDate], ...(type === 'form' && selectedForm ? [['Formulaire', selectedForm.title]] : [])],
        qr, generated: dateNow(), ...prepared,
    }, `${type === 'join' ? 'Adhesion' : 'Formulaire'}_${safePdfName(data.id || 'Export')}.pdf`);
}

export async function generateAllResponsesReactPDF(submissions, form, clubInfo) {
    const { AllFormResponsesPDF } = await import('@/components/pdf/CommunityPDFs');
    return downloadReactPdf(AllFormResponsesPDF, {
        submissions: submissions || [], fields: form?.fields || [], formTitle: form?.title || 'Formulaire',
        clubName: clubInfo?.name || 'Club', generated: dateNow(), ...await assets(clubInfo),
    }, `Formulaire_${safePdfName(form?.title || 'Export')}_toutes-les-reponses.pdf`);
}

export async function generateAttendanceReactPDF(participants, eventInfo, clubInfo) {
    const { AttendancePDF } = await import('@/components/pdf/CommunityPDFs');
    return downloadReactPdf(AttendancePDF, {
        participants: participants || [], event: eventInfo, clubName: clubInfo?.name || 'Club', generated: dateNow(),
        ...await assets(clubInfo),
    }, `Presence_${safePdfName(eventInfo.title)}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function generatePostReactPDF(post, clubInfo) {
    const { PostPDF } = await import('@/components/pdf/CommunityPDFs');
    const prepared = await assets(clubInfo);
    const postUrl = `${window.location.origin}/clubs/${encodeURIComponent(clubInfo.id)}/posts/${encodeURIComponent(post.id)}`;
    const [postImage, qr] = await Promise.all([imageDataUrl(post.image), makeQr(postUrl, prepared.accent)]);
    const instagram = clubInfo?.socialLinks?.instagram?.replace(/^(https?:\/\/(www\.)?)?instagram\.com\//, '').replace(/^@/, '');
    return downloadReactPdf(PostPDF, {
        post, clubName: clubInfo?.name || 'ESTT Club', postImage, qr, instagram,
        generated: dateNow(), ...prepared,
    }, `${safePdfName(post.title || 'Publication')}.pdf`);
}
