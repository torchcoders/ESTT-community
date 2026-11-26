import { downloadReactPdf, imageDataUrl } from './reactPdfDownload';

export async function generatePersonalDataExportPDF({ profile, contributions, favorites, tickets, filename }) {
    const { PersonalDataExportPDF } = await import('@/components/pdf/PersonalDataExportPDF');
    const photo = await imageDataUrl(profile.photoUrl);
    return downloadReactPdf(PersonalDataExportPDF, {
        profile, contributions: contributions || [], favorites: favorites || [], tickets: tickets || [], photo,
        generated: new Date().toLocaleString('fr-FR'),
    }, filename);
}
