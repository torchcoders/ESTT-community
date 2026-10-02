import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const maxDuration = 60;

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

function extractFileId(url) {
    if (!url) return null;
    const m = url.match(/(?:drive\.google\.com\/file\/d\/|docs\.google\.com\/(?:presentation|document|spreadsheets|forms)\/d\/)([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
}

async function getAccessToken() {
    let refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
    if (!refreshToken) {
        const configSnap = await getAdminDb().ref('adminSettings/driveConfig').once('value');
        if (configSnap.exists()) refreshToken = configSnap.val().refreshToken;
    }
    if (!refreshToken) return null;

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token;
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const fileUrl = searchParams.get('url');
        const isDownload = searchParams.get('download') === '1';
        if (!fileUrl) {
            return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
        }

        const fileId = extractFileId(fileUrl);
        if (!fileId) {
            return NextResponse.json({ error: 'Not a Google file' }, { status: 400 });
        }

        const accessToken = await getAccessToken();
        if (!accessToken) {
            return NextResponse.json({ error: 'Drive not configured' }, { status: 500 });
        }

        const metaRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType,name`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        let buffer;
        let contentType;
        let fileName = 'download';

        if (metaRes.ok) {
            const meta = await metaRes.json();
            contentType = meta.mimeType || 'application/octet-stream';
            fileName = meta.name || 'download';

            const fileRes = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (fileRes.ok) {
                buffer = await fileRes.arrayBuffer();

                if (!isDownload && /docs\.google\.com\/document\/d\//.test(fileUrl)) {
                    const exportUrl = fileUrl.replace(/\/(edit|view|copy).*$/, '/export?format=pdf');
                    const exportRes = await fetch(exportUrl, { redirect: 'follow' });
                    if (exportRes.ok) {
                        buffer = await exportRes.arrayBuffer();
                        contentType = 'application/pdf';
                        if (!fileName.toLowerCase().endsWith('.pdf')) {
                            fileName = fileName.replace(/\.[^.]+$/, '') + '.pdf';
                        }
                    }
                }
            }
        }

        if (!buffer) {
            const pubRes = await fetch(
                `https://drive.google.com/uc?export=download&id=${fileId}`,
                { redirect: 'follow' }
            );
            if (!pubRes.ok) {
                return NextResponse.json({ error: 'File not found' }, { status: 404 });
            }
            buffer = await pubRes.arrayBuffer();
            contentType = pubRes.headers.get('content-type') || 'application/octet-stream';
            const pubCd = pubRes.headers.get('content-disposition') || '';
            const pubFn = pubCd.match(/filename="?([^";\n]+)"?/);
            if (pubFn) fileName = pubFn[1];
        }

        const encodedName = encodeURIComponent(fileName).replace(/'/g, "%27");
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename*=UTF-8''${encodedName}`,
                'Cache-Control': 'public, max-age=3600',
            },
        });

    } catch (error) {
        console.error('File proxy error:', error);
        return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
    }
}
