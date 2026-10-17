import { getAdminDb } from '@/lib/firebase-admin';

const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
const TTL_MS = 24 * 60 * 60 * 1000;
const IMGBB_TIMEOUT = 30000; // 30 seconds

export async function persistToImgBB(buffer, retries = 2) {
    if (!IMGBB_API_KEY) {
        throw new Error('NEXT_PUBLIC_IMGBB_API_KEY not configured');
    }

    const blob = new Blob([buffer], { type: 'image/png' });
    const formData = new FormData();
    formData.append('image', blob);

    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), IMGBB_TIMEOUT);

        try {
            const uploadRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const data = await uploadRes.json();
            if (!data.success) throw new Error(data.error?.message || 'ImgBB upload failed');
            return data.data.url;
        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                if (attempt === retries) throw new Error('ImgBB upload timeout (30s)');
                console.log(`ImgBB timeout, retrying... (${attempt + 1}/${retries})`);
                await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                continue;
            }
            if (attempt === retries) throw err;
            console.log(`ImgBB error, retrying... (${attempt + 1}/${retries}):`, err.message);
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
    }
}

export function extractDriveFileId(url) {
    if (!url) return null;
    const m = url.match(/(?:drive\.google\.com\/file\/d\/|docs\.google\.com\/(?:presentation|document|spreadsheets|forms)\/d\/)([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
}

export async function downloadFile(fileUrl) {
    const res = await fetch(fileUrl, { redirect: 'follow' });
    if (!res.ok) throw new Error(`Failed to download file: ${res.status}`);
    const blob = await res.blob();
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = res.headers.get('content-disposition') || '';
    let fileName = 'file';
    const cdMatch = contentDisposition.match(/filename="?([^";\n]+)"?/);
    if (cdMatch) fileName = cdMatch[1];
    else {
        const ext = contentType.split('/')[1] || 'bin';
        fileName = `file.${ext}`;
    }
    return { blob, fileName, contentType };
}

export async function ensurePreviewImage(resourceId, resource) {
    const adminDb = getAdminDb();
    const ref = adminDb.ref(`resources/${resourceId}`);

    const snap = await ref.once('value');
    const existing = snap.val() || {};

    if (existing.previewStatus === 'ready' &&
        existing.previewImageUrl &&
        Date.now() - (existing.previewGeneratedAt || 0) < TTL_MS) {
        return existing.previewImageUrl;
    }

    await ref.update({
        previewStatus: 'pending',
        previewGeneratedAt: Date.now(),
    });

    try {
        const fileUrl = resource.url || resource.link || resource.file;
        if (!fileUrl) throw new Error('No source file URL');

        // This should call the local preview generation endpoint
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://estt.ma';
        const res = await fetch(`${baseUrl}/api/generate-preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileUrl, resourceId }),
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Preview generation failed');
        }
        
        const data = await res.json();
        return data.previewImageUrl;
    } catch (err) {
        await ref.update({ previewStatus: 'failed' });
        console.error(`Preview generation failed for ${resourceId}:`, err);
        throw err;
    }
}

export async function setManualPreview(resourceId, imageFile) {
    const adminDb = getAdminDb();
    const ref = adminDb.ref(`resources/${resourceId}`);

    await ref.update({ previewStatus: 'pending', previewGeneratedAt: Date.now() });

    try {
        if (!IMGBB_API_KEY) throw new Error('NEXT_PUBLIC_IMGBB_API_KEY not configured');

        const formData = new FormData();
        formData.append('image', imageFile);

        const uploadRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData,
        });

        const data = await uploadRes.json();
        if (!data.success) throw new Error(data.error?.message || 'ImgBB upload failed');

        await ref.update({
            previewImageUrl: data.data.url,
            previewSource: 'imgbb',
            previewGeneratedAt: Date.now(),
            previewStatus: 'ready',
        });

        return data.data.url;
    } catch (err) {
        await ref.update({ previewStatus: 'failed' });
        throw err;
    }
}