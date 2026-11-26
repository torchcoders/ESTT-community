import QRCode from 'qrcode';
import { downloadReactPdf, imageDataUrl } from './reactPdfDownload';

export async function generateRewardCodesPDF(codes) {
    const { RewardCodesPosterPDF } = await import('@/components/pdf/RewardCodesPosterPDF');
    const [esttLogo, uniLogo] = await Promise.all([
        imageDataUrl('/icons/icon-192x192-maskable.png'),
        imageDataUrl('/assets/images/uni_logo.png'),
    ]);
    const pages = [];
    for (let offset = 0; offset < codes.length; offset += 10) {
        const id = `qr${Math.floor(100000 + Math.random() * 900000)}`;
        const base = `https://estt.ma/?from=${id}`;
        const qr = await QRCode.toDataURL(base, { margin: 1, width: 400 });
        const pageCodes = await Promise.all(codes.slice(offset, offset + 10).map(async item => ({
            code: item.code,
            reward: String(item.reward || '').includes('month') ? `ESTTPlus+ ${String(item.reward).split('_')[1]?.replace('m', ' M') || ''}` : 'ESTTPlus+',
            qr: await QRCode.toDataURL(`${base}&code=${encodeURIComponent(item.code)}`, { margin: 1, width: 120 }),
        })));
        pages.push({ qr, codes: pageCodes });
    }
    return downloadReactPdf(RewardCodesPosterPDF, { pages, esttLogo, uniLogo }, 'Affiche_QR_Codes.pdf');
}
