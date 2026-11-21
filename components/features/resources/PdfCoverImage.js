'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';

/**
 * PdfCoverImage
 * Renders the first page of a remote PDF as a cover image using pdfjs-dist.
 * Falls back to a placeholder icon if the PDF can't be loaded (CORS, network, etc.)
 *
 * @param {string}  pdfUrl  - The direct URL to the PDF file
 * @param {string}  [alt]   - Alt text for accessibility
 * @param {string}  [className] - Extra classes for the wrapper
 */
export default function PdfCoverImage({ pdfUrl, alt = 'Couverture du document', className = '' }) {
    const canvasRef = useRef(null);
    const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'done' | 'error'

    useEffect(() => {
        if (!pdfUrl) {
            setStatus('error');
            return;
        }

        let cancelled = false;

        const render = async () => {
            setStatus('loading');
            try {
                // Dynamically import pdfjs-dist to keep it out of the initial bundle
                const pdfjsLib = await import('pdfjs-dist');

                // Point the worker to the bundled worker from node_modules
                // Using a CDN worker avoids bundler issues with the worker file
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

                const loadingTask = pdfjsLib.getDocument({
                    url: pdfUrl,
                    // Allow cross-origin; server must send CORS headers
                    withCredentials: false,
                });

                const pdf = await loadingTask.promise;
                if (cancelled) return;

                const page = await pdf.getPage(1);
                if (cancelled) return;

                const canvas = canvasRef.current;
                if (!canvas) return;

                // Scale to fill the container width (canvas will be max 400 px wide)
                const containerWidth = canvas.parentElement?.clientWidth || 300;
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
                    console.warn('[PdfCoverImage] Failed to render PDF cover:', err?.message);
                    setStatus('error');
                }
            }
        };

        render();
        return () => { cancelled = true; };
    }, [pdfUrl]);

    return (
        <div className={`relative w-full overflow-hidden rounded-t-xl bg-muted ${className}`} style={{ aspectRatio: '4/3' }}>
            {/* Skeleton / loading shimmer */}
            {status === 'loading' && (
                <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
                    <FileText className="w-8 h-8 text-muted-foreground/40" />
                </div>
            )}

            {/* Error / fallback placeholder */}
            {status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/60">
                    <FileText className="w-10 h-10 text-muted-foreground/50" />
                    <span className="text-[10px] text-muted-foreground/60 font-medium">Aperçu non disponible</span>
                </div>
            )}

            {/* Rendered canvas */}
            <canvas
                ref={canvasRef}
                aria-label={alt}
                className={`w-full h-full object-cover transition-opacity duration-300 ${status === 'done' ? 'opacity-100' : 'opacity-0'}`}
                style={{ display: 'block' }}
            />
        </div>
    );
}
