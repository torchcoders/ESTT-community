import React from 'react';
import QRCode from 'qrcode';

const imageAsDataUrl = async (source) => {
  if (!source) return null;
  if (source.startsWith('data:')) return source;

  try {
    const url = source.startsWith('/') ? `${window.location.origin}${source}` : source;
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!['image/png', 'image/jpeg'].includes(blob.type)) return null;

    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Could not load project PDF image:', error);
    return null;
  }
};

/** Generate and download the student project dossier. */
export async function generateProjectPDF(project) {
  if (!project) return;
  if (typeof window === 'undefined') {
    throw new Error('generateProjectPDF must be called in a browser environment.');
  }

  const [{ pdf }, { ProjectDossierPDF }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/pdf/ProjectDossierPDF'),
  ]);

  const [coverImageUrl, watermarkUrl, brandIconUrl] = await Promise.all([
    imageAsDataUrl(project.coverImage),
    imageAsDataUrl('/icons/shape.png'),
    imageAsDataUrl('/icons/icon-96x96.png'),
  ]);

  let qrCodeUrl = null;
  if (project.id) {
    try {
      qrCodeUrl = await QRCode.toDataURL(
        `${window.location.origin}/projects/${encodeURIComponent(project.id)}`,
        { errorCorrectionLevel: 'M', margin: 1, color: { dark: '#3b82f6', light: '#ffffff' } }
      );
    } catch (error) {
      console.warn('Could not generate project QR code:', error);
    }
  }

  const generatedDate = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const pdfElement = React.createElement(ProjectDossierPDF, {
    project, coverImageUrl, watermarkUrl, brandIconUrl, qrCodeUrl, generatedDate,
  });
  const blob = await pdf(pdfElement).toBlob();
  const url = URL.createObjectURL(blob);
  const safeName = String(project.title || 'export').replace(/[\\/:*?"<>|\x00-\x1f]/g, '').trim().replace(/\s+/g, '_') || 'export';
  const link = document.createElement('a');
  link.href = url;
  link.download = `Projet_${safeName}.pdf`;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  return true;
}
