import React from 'react';

export const safePdfName = (value) => String(value || 'Export')
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '').trim().replace(/\s+/g, '_') || 'Export';

export async function imageDataUrl(source) {
    if (!source) return null;
    if (source.startsWith('data:')) return source;
    try {
        const url = source.startsWith('/') ? `${window.location.origin}${source}` : source;
        const response = await fetch(url);
        if (!response.ok) return null;
        const blob = await response.blob();
        if (blob.type === 'image/webp') {
            const objectUrl = URL.createObjectURL(blob);
            try {
                const image = await new Promise((resolve, reject) => {
                    const element = new window.Image();
                    element.onload = () => resolve(element);
                    element.onerror = reject;
                    element.src = objectUrl;
                });
                const canvas = document.createElement('canvas');
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                canvas.getContext('2d').drawImage(image, 0, 0);
                return canvas.toDataURL('image/png');
            } finally {
                URL.revokeObjectURL(objectUrl);
            }
        }
        if (!['image/png', 'image/jpeg'].includes(blob.type)) return null;
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.warn('Could not load PDF image:', error);
        return null;
    }
}

export async function downloadReactPdf(Component, props, fileName) {
    if (typeof window === 'undefined') throw new Error('PDF downloads require a browser.');
    const { pdf } = await import('@react-pdf/renderer');
    const blob = await pdf(React.createElement(Component, props)).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    try { link.click(); } finally {
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    return true;
}
