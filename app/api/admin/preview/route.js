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
        const { action, resourceId, fileUrl, previewImageUrl } = await req.json();

        console.log('[Local Preview] Request:', { action, resourceId, fileUrl: fileUrl?.substring(0, 100) });

        if (!resourceId) {
            return NextResponse.json({ error: 'Missing resourceId' }, { status: 400 });
        }

        const adminDb = getAdminDb();
        const ref = adminDb.ref(`resources/${resourceId}`);

        if (action === 'generate') {
            if (!fileUrl) {
                return NextResponse.json({ error: 'Missing fileUrl' }, { status: 400 });
            }

            await ref.update({ previewStatus: 'pending', previewGeneratedAt: Date.now() });

            try {
                console.log('[Local Preview] Processing file:', fileUrl);
                
                let downloadUrl = fileUrl;
                const driveFileId = extractDriveFileId(fileUrl);
                if (driveFileId) {
                    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://estt.ma';
                    downloadUrl = `${baseUrl}/api/file-proxy?download=1&url=${encodeURIComponent(fileUrl)}`;
                }
                
                console.log('[Local Preview] Downloading file from:', downloadUrl);
                const { blob, fileName, contentType } = await downloadFile(downloadUrl);
                
                console.log('[Local Preview] Generating preview for:', fileName, contentType);
                const buffer = await blob.arrayBuffer();
                const previewBuffer = await generatePreviewFromBuffer(Buffer.from(buffer), contentType, fileName);
                
                console.log('[Local Preview] Persisting to ImgBB...');
                const permanentUrl = await persistToImgBB(previewBuffer);
                console.log('[Local Preview] ImgBB returned:', permanentUrl);

                await ref.update({
                    previewImageUrl: permanentUrl,
                    previewSource: 'local',
                    previewGeneratedAt: Date.now(),
                    previewStatus: 'ready',
                });

                console.log('[Local Preview] Successfully saved to RTDB');
                return NextResponse.json({ previewImageUrl: permanentUrl });
            } catch (err) {
                console.error('[Local Preview] Generation failed:', err);
                await ref.update({ previewStatus: 'failed', previewError: err.message });
                return NextResponse.json({ error: `Generation failed: ${err.message}` }, { status: 502 });
            }
        }

        if (action === 'upload') {
            if (!previewImageUrl) {
                return NextResponse.json({ error: 'Missing previewImageUrl' }, { status: 400 });
            }

            await ref.update({
                previewImageUrl: previewImageUrl,
                previewSource: 'imgbb',
                previewGeneratedAt: Date.now(),
                previewStatus: 'ready',
            });
            return NextResponse.json({ success: true });
        }

        if (action === 'delete') {
            await ref.update({
                previewImageUrl: null,
                previewSource: null,
                previewGeneratedAt: null,
                previewStatus: null,
            });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('[Local Preview] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Operation failed', stack: error.stack }, { status: 500 });
    }
}