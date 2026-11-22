import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Allowlist of trusted hosts we're willing to proxy PDF bytes from
const ALLOWED_HOSTS = [
    'firebasestorage.googleapis.com',
    'fnaiedociknutdxoezhn.supabase.co',
    'storage.googleapis.com',
    'drive.google.com',
    'docs.google.com',
];

function isAllowedUrl(urlStr) {
    try {
        const { hostname, pathname } = new URL(urlStr);
        // Allow any URL whose host is in the allowlist
        if (ALLOWED_HOSTS.some((h) => hostname === h || hostname.endsWith('.' + h))) return true;
        // Allow any URL that looks like a direct PDF file (ends with .pdf)
        if (pathname.toLowerCase().endsWith('.pdf')) return true;
        return false;
    } catch {
        return false;
    }
}

/**
 * GET /api/pdf-thumbnail?url=<encoded-pdf-url>
 *
 * Fetches a PDF server-side (no CORS restriction on the server) and streams
 * the raw bytes back to the browser with a permissive CORS header so that
 * pdfjs-dist running in the browser can render it.
 *
 * We only proxy URLs from trusted hosts to prevent this becoming an open proxy.
 */
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const rawUrl = searchParams.get('url');

    if (!rawUrl) {
        return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    let decodedUrl;
    try {
        decodedUrl = decodeURIComponent(rawUrl);
    } catch {
        return NextResponse.json({ error: 'Invalid url encoding' }, { status: 400 });
    }

    if (!isAllowedUrl(decodedUrl)) {
        return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
    }

    try {
        const upstream = await fetch(decodedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ESTTCommunity/1.0)',
            },
            // Follow redirects (Firebase Storage uses signed-URL redirects)
            redirect: 'follow',
        });

        if (!upstream.ok) {
            return NextResponse.json({ error: 'Upstream error', status: upstream.status }, { status: 502 });
        }

        const buffer = await upstream.arrayBuffer();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                // Allow pdfjs running on any origin (same-site) to read the bytes
                'Access-Control-Allow-Origin': '*',
                // Cache aggressively – PDF covers don't change often
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
            },
        });
    } catch (err) {
        console.error('[pdf-thumbnail] proxy error:', err);
        return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
    }
}
