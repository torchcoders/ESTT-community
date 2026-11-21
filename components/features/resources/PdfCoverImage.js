'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';

// ─── URL helpers ──────────────────────────────────────────────────────────────

/**
 * Extract a Google Drive file ID from any Drive/Docs share URL.
 * Handles:
 *   https://drive.google.com/file/d/FILE_ID/view
 *   https://drive.google.com/open?id=FILE_ID
 *   https://drive.google.com/uc?id=FILE_ID
 *   https://docs.google.com/(document|presentation|spreadsheets)/d/FILE_ID/...
 */
function extractDriveId(url) {
    // /file/d/ID or /document/d/ID etc.
    const pathMatch = url.match(/\/(?:file|document|presentation|spreadsheets|forms)\/d\/([a-zA-Z0-9_-]+)/);
    if (pathMatch) return pathMatch[1];

    // ?id=ID or &id=ID
    try {
        const id = new URL(url).searchParams.get('id');
        if (id) return id;
    } catch { /* ignore */ }

    return null;
}

/** True for any Google Drive / Docs share URL */
function isGoogleDriveUrl(url) {
    return /drive\.google\.com|docs\.google\.com/.test(url);
}

/** True if the URL path ends with .pdf (before query/hash) */
function endsWithPdf(url) {
    try {
        return new URL(url).pathname.toLowerCase().endsWith('.pdf');
    } catch {
        return url.toLowerCase().includes('.pdf');
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * PdfCoverImage
 *
 * Renders a visual preview of the first page of a PDF resource.
 *
 * Strategy:
 *  1. Google Drive URLs  → Drive thumbnail API  (`<img>` — no pdfjs, no CORS)
 *  2. Direct PDF URLs    → proxy through /api/pdf-thumbnail → pdfjs canvas
 *  3. Anything else      → placeholder icon
 *
 * @param {string}  pdfUrl     Direct URL to the PDF or a Google Drive share link
 * @param {string}  [alt]      Alt text for accessibility
 * @param {string}  [className] Extra wrapper classes
 */
export default function PdfCoverImage({ pdfUrl, alt = 'Couverture du document', className = '' }) {
    const canvasRef = useRef(null);
    // 'idle' | 'drive' | 'loading' | 'done' | 'error'
    const [status, setStatus] = useState('idle');
    const [driveThumbUrl, setDriveThumbUrl] = useState(null);

    useEffect(() => {
        if (!pdfUrl) { setStatus('error'); return; }

        // ── Branch 1: Google Drive ───────────────────────────────────────────
        if (isGoogleDriveUrl(pdfUrl)) {
            const id = extractDriveId(pdfUrl);
            if (id) {
                // Drive thumbnail API: returns a JPEG of page 1, public, no auth needed for public files
                setDriveThumbUrl(`https://drive.google.com/thumbnail?id=${id}&sz=w480`);
                setStatus('drive');
            } else {
                setStatus('error');
            }
            return;
        }

        // ── Branch 2: Direct PDF URL ─────────────────────────────────────────
        // Route through our server proxy to bypass browser CORS restrictions.
        let cancelled = false;

        const render = async () => {
            setStatus('loading');
            try {
                const pdfjsLib = await import('pdfjs-dist');

                // Use unpkg so the worker version always matches the installed package version.
                // CDNJS does not carry pdfjs-dist v4+ reliably.
                pdfjsLib.GlobalWorkerOptions.workerSrc =
                    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

                const proxyUrl = `https://estt.ma/api/pdf-thumbnail?url=${encodeURIComponent(pdfUrl)}`;

                const loadingTask = pdfjsLib.getDocument({ url: proxyUrl });
                const pdf = await loadingTask.promise;
                if (cancelled) return;

                const page = await pdf.getPage(1);
                if (cancelled) return;

                const canvas = canvasRef.current;
                if (!canvas) return;

                // Scale to container width
                const containerWidth = canvas.parentElement?.clientWidth || 320;
                const viewport = page.getViewport({ scale: 1 });
                const scale = containerWidth / viewport.width;
                const scaledViewport = page.getViewport({ scale });

                canvas.width = scaledViewport.width;
                canvas.height = scaledViewport.height;

                const ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;

                if (!cancelled) setStatus('done');
            } catch (err) {
                if (!cancelled) {
                    console.warn('[PdfCoverImage] render failed:', err?.message);
                    setStatus('error');
                }
            }
        };

        render();
        return () => { cancelled = true; };
    }, [pdfUrl]);

    return (
        <div
            className={`relative w-full overflow-hidden rounded-t-xl bg-muted ${className}`}
            style={{ aspectRatio: '16/9' }}
        >
            {/* ── Shimmer while pdfjs is rendering ── */}
            {status === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
                    <FileText className="w-8 h-8 text-muted-foreground/30" />
                </div>
            )}

            {/* ── Idle (before effect fires) ── */}
            {status === 'idle' && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <FileText className="w-8 h-8 text-muted-foreground/30" />
                </div>
            )}

            {/* ── Error / unavailable placeholder ── */}
            {status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/70">
                    <FileText className="w-10 h-10 text-muted-foreground/40" />
                    <span className="text-[10px] text-muted-foreground/60 font-medium tracking-wide">
                        Aperçu non disponible
                    </span>
                </div>
            )}

            {/* ── Google Drive thumbnail (<img>) ── */}
            {status === 'drive' && driveThumbUrl && (
                <img
                    src={driveThumbUrl}
                    alt={alt}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                    onLoad={() => { /* already visible */ }}
                    onError={() => setStatus('error')}
                />
            )}

            {/* ── pdfjs canvas (direct PDF) ── */}
            <canvas
                ref={canvasRef}
                aria-label={alt}
                className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-300 ${
                    status === 'done' ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
            />
        </div>
    );
}
