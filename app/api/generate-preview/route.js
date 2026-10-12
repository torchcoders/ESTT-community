import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { extractDriveFileId, downloadFile, persistToImgBB } from '@/lib/previewUtils';

export const maxDuration = 120;

async function generatePdfPreview(buffer) {
    const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    const page = await pdf.getPage(1);
    
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = await import('canvas');
    const canvasInstance = canvas.createCanvas(viewport.width, viewport.height);
    const context = canvasInstance.getContext('2d');
    
    await page.render({
        canvasContext: context,
        viewport: viewport,
    }).promise;
    
    return canvasInstance.toBuffer('image/png');
}

async function generateWordPreview(buffer) {
    const mammoth = await import('mammoth');
    const result = await mammoth.convertToHtml({ buffer });
    const html = result.value;
    
    const canvas = await import('canvas');
    const canvasInstance = canvas.createCanvas(1200, 630);
    const context = canvasInstance.getContext('2d');
    
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 1200, 630);
    
    context.font = '24px Arial';
    context.fillStyle = '#333333';
    context.textAlign = 'center';
    context.fillText('Document Word - Aperçu de la première page', 600, 200);
    
    const textLines = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 200);
    context.font = '18px Arial';
    context.fillText(textLines, 600, 300);
    
    return canvasInstance.toBuffer('image/png');
}

async function generateImagePreview(buffer) {
    const canvas = await import('canvas');
    const image = await canvas.loadImage(buffer);
    
    const maxWidth = 1200;
    const maxHeight = 630;
    let { width, height } = image;
    
    if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
    }
    
    const canvasInstance = canvas.createCanvas(width, height);
    const context = canvasInstance.getContext('2d');
    context.drawImage(image, 0, 0, width, height);
    
    return canvasInstance.toBuffer('image/png');
}

async function generatePreviewFromBuffer(buffer, contentType, fileName) {
    if (contentType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
        return await generatePdfPreview(buffer);
    }
    
    if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        contentType === 'application/msword' ||
        fileName.toLowerCase().endsWith('.docx') ||
        fileName.toLowerCase().endsWith('.doc')) {
        return await generateWordPreview(buffer);
    }
    
    if (contentType.startsWith('image/') || 
        ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].some(ext => fileName.toLowerCase().endsWith(ext))) {
        return await generateImagePreview(buffer);
    }
    
    const canvas = await import('canvas');
    const canvasInstance = canvas.createCanvas(1200, 630);
    const context = canvasInstance.getContext('2d');
    
    context.fillStyle = '#f3f4f6';
    context.fillRect(0, 0, 1200, 630);
    context.font = '24px Arial';
    context.fillStyle = '#6b7280';
    context.textAlign = 'center';
    context.fillText(`${fileName}`, 600, 315);
    
    return canvasInstance.toBuffer('image/png');
}

export async function POST(req) {
    try {
        const { fileUrl, resourceId } = await req.json();

        if (!fileUrl) {
            return NextResponse.json({ error: 'Missing fileUrl parameter' }, { status: 400 });
        }

        if (!/^https?:\/\//i.test(fileUrl) || fileUrl.length > 2048) {
            return NextResponse.json({ error: 'Invalid fileUrl' }, { status: 400 });
        }

        // Handle Google Drive URLs using the file proxy
        let downloadUrl = fileUrl;
        const driveFileId = extractDriveFileId(fileUrl);
        if (driveFileId) {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://estt.ma';
            downloadUrl = `${baseUrl}/api/file-proxy?download=1&url=${encodeURIComponent(fileUrl)}`;
        }

        console.log('[Generate Preview] Downloading file from:', downloadUrl);
        const { blob, fileName, contentType } = await downloadFile(downloadUrl);
        
        console.log('[Generate Preview] Generating preview for:', fileName, contentType);
        const buffer = await blob.arrayBuffer();
        const previewBuffer = await generatePreviewFromBuffer(Buffer.from(buffer), contentType, fileName);
        
        console.log('[Generate Preview] Persisting to ImgBB...');
        const permanentUrl = await persistToImgBB(previewBuffer);
        console.log('[Generate Preview] ImgBB returned:', permanentUrl);

        if (resourceId) {
            const adminDb = getAdminDb();
            await adminDb.ref(`resources/${resourceId}`).update({
                previewImageUrl: permanentUrl,
                previewSource: 'local',
                previewGeneratedAt: Date.now(),
                previewStatus: 'ready',
            });
        }

        return NextResponse.json({ previewImageUrl: permanentUrl });
    } catch (error) {
        console.error('Preview generation error:', error);
        return NextResponse.json({ error: error.message || 'Preview generation failed' }, { status: 502 });
    }
}