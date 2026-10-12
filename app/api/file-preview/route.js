import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const maxDuration = 60;

const MAX_URL_LENGTH = 2048;
const MAX_WIDTH = 4096;
const ENV_KEY = process.env.APYHUB_API_KEY;

async function generatePreview(url, width) {
    const res = await fetch('https://api.eu.apyhub.com/apyhub/generate-png-preview/url/link', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ENV_KEY,
        },
        body: JSON.stringify({ url, width }),
    });

    if (!res.ok) {
        let detail = '';
        try {
            const err = await res.json();
            detail = err.message || err.error || '';
        } catch {}
        throw new Error(`ApyHub preview failed (${res.status}): ${detail}`);
    }

    const data = await res.json();
    return data.previewImage;
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const fileUrl = searchParams.get('url');
        const rawWidth = searchParams.get('width');

        if (!fileUrl) {
            return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
        }

        if (!/^https?:\/\//i.test(fileUrl) || fileUrl.length > MAX_URL_LENGTH) {
            return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
        }

        if (!ENV_KEY) {
            return NextResponse.json({ error: 'Preview not configured' }, { status: 500 });
        }

        let width = 1200;
        if (rawWidth) {
            const parsed = Number.parseInt(rawWidth, 10);
            if (Number.isFinite(parsed) && parsed > 0 && parsed <= MAX_WIDTH) {
                width = parsed;
            }
        }

        const previewImage = await generatePreview(fileUrl, width);
        if (!previewImage) {
            return NextResponse.json({ error: 'Preview generation failed' }, { status: 502 });
        }

        return NextResponse.json(
            { previewImage, previewGeneratedAt: new Date().toISOString() },
            {
                status: 200,
                headers: { 'Cache-Control': 'public, max-age=3600' },
            }
        );
    } catch (error) {
        console.error('Preview generation error:', error);
        return NextResponse.json({ error: 'Preview generation failed' }, { status: 502 });
    }
}