import React from 'react';
import QRCode from 'qrcode';
import { ClubCertificatePDF } from '@/components/pdf/ClubCertificatePDF';
import { getCertificateSignature } from '@/lib/pdfUtils';

/**
 * Helper to fetch and convert an image URL or relative path into a Base64 Data URL.
 * Ensures local and remote images render smoothly without CORS or path resolution issues.
 */
const loadImageAsDataUrl = async (url) => {
    if (!url) return null;
    if (url.startsWith('data:')) return url;
    try {
        const fullUrl = url.startsWith('/') && typeof window !== 'undefined'
            ? `${window.location.origin}${url}`
            : url;
        const res = await fetch(fullUrl);
        if (!res.ok) return null;
        const blob = await res.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
};

/**
 * Generates and downloads a modern, high-definition Certificate of Membership PDF
 * using @react-pdf/renderer.
 */
export async function generateCertificateReactPDF(memberData, clubInfo) {
    if (typeof window === 'undefined') {
        throw new Error('generateCertificateReactPDF must be called in a browser environment.');
    }

    // Dynamically import @react-pdf/renderer to avoid SSR bloat and hydration issues
    const { pdf } = await import('@react-pdf/renderer');

    const primaryColor = clubInfo?.themeColor || '#1e3a8a';
    const signatureCode = getCertificateSignature(memberData, clubInfo);
    const verificationUrl = `${window.location.origin}/clubs/${clubInfo?.id}/certificate/${memberData?.id}`;

    // Generate high-resolution QR code as Data URL
    let qrCodeUrl = null;
    try {
        qrCodeUrl = await QRCode.toDataURL(verificationUrl, {
            errorCorrectionLevel: 'H',
            margin: 1,
            color: {
                dark: primaryColor.startsWith('#') ? primaryColor : '#0f172a',
                light: '#ffffff',
            },
        });
    } catch (e) {
        console.warn('Could not generate QR code for certificate:', e);
    }

    // Pre-load images in parallel
    const [clubLogoUrl, schoolLogoUrl, watermarkUrl] = await Promise.all([
        clubInfo?.logo ? loadImageAsDataUrl(clubInfo.logo) : Promise.resolve(null),
        loadImageAsDataUrl('/assets/images/uni_logo.png')
            .then((res) => res || loadImageAsDataUrl('/icons/icon-512x512-nobg.png')),
        loadImageAsDataUrl('/icons/shape.png'),
    ]);

    const formattedDate = new Date(memberData?.joinedAt || Date.now()).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    const docElement = React.createElement(ClubCertificatePDF, {
        member: memberData,
        club: clubInfo,
        signatureCode,
        qrCodeUrl,
        clubLogoUrl,
        schoolLogoUrl,
        watermarkUrl,
        formattedDate,
    });

    const blob = await pdf(docElement).toBlob();
    const url = URL.createObjectURL(blob);
    const safeName = (memberData?.name || 'Membre').replace(/\s+/g, '_');
    const fileName = `Certificat_${safeName}.pdf`;

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Revoke after a short delay to allow browser download to start
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 10000);

    return true;
}
