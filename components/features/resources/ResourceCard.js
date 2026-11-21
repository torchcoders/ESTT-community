'use client';

import Link from 'next/link';
import { FileText, Video, ImageIcon, Link as LinkIcon, Globe, User, Star, ArrowRight, Loader2, ListPlus, X, BookOpen } from 'lucide-react';
import PdfCoverImage from '@/components/features/resources/PdfCoverImage';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureProtocol(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
}

function isUrlPdf(url) {
    if (!url) return false;
    if (/drive\.google\.com|docs\.google\.com/.test(url)) return true;
    try {
        return new URL(url).pathname.toLowerCase().endsWith('.pdf');
    } catch {
        return url.toLowerCase().includes('.pdf');
    }
}

function getResourceIcon(type) {
    switch (type) {
        case 'pdf':   return <FileText className="w-5 h-5" />;
        case 'video': return <Video className="w-5 h-5" />;
        case 'image': return <ImageIcon className="w-5 h-5" />;
        case 'link':  return <LinkIcon className="w-5 h-5" />;
        case 'html':  return <Globe className="w-5 h-5" />;
        default:      return <FileText className="w-5 h-5" />;
    }
}

function RatingStars({ resource }) {
    const average = resource.ratingAverage;
    const count   = resource.ratingCount || 0;
    if (!average || count === 0) return null;
    const rounded = Math.round(average * 10) / 10;
    return (
        <div className="flex items-center gap-1 mt-1.5">
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((v) => (
                    <Star
                        key={v}
                        className={`w-3 h-3 ${v <= Math.round(average) ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`}
                    />
                ))}
            </div>
            <span className="text-[11px] text-muted-foreground">
                {rounded.toFixed(1)} ({count})
            </span>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * ResourceCard
 *
 * Universal card component used on /browse, /my-list, /search, homepage, and profile pages.
 *
 * Props:
 *   resource        – resource object { id, title, type, docType, url/link/file, professor, ... }
 *   isFav           – whether the resource is in the user's list
 *   togglingFav     – resourceId currently being toggled (shows spinner)
 *   onToggleFav     – (e, resource) => void
 *   onRemove        – (e, resourceId) => void
 *   showModule      – boolean: display module identifier/name
 *   showDescription – boolean: display description if present
 *   footerLeft      – optional custom JSX for the left side of the footer
 *   className       – extra wrapper class names
 */
export default function ResourceCard({
    resource,
    isFav           = false,
    togglingFav     = null,
    onToggleFav     = null,
    onRemove        = null,
    showModule      = false,
    showDescription = false,
    footerLeft      = null,
    className       = '',
}) {
    if (!resource) return null;

    const rawUrl   = resource.url || resource.link || resource.file;
    const validUrl = rawUrl ? ensureProtocol(rawUrl) : null;
    const isPdf    = (resource.type === 'pdf' || isUrlPdf(validUrl)) && !!validUrl;
    const resourceId = resource.id || resource.resourceId;

    return (
        <Link
            href={`/resource/${resourceId}`}
            className={`group flex flex-col h-full border border-border rounded-xl hover:border-primary/50 transition-all hover:shadow-md bg-card cursor-pointer overflow-hidden ${className}`}
        >
            {/* ── PDF 16:9 cover preview ── */}
            {isPdf && (
                <div className="relative">
                    <PdfCoverImage pdfUrl={validUrl} alt={resource.title} />
                    {/* Badges overlaid on top of the cover */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                        {resource.type && (
                            <span className="text-[10px] font-bold uppercase py-0.5 px-1.5 bg-background/90 backdrop-blur-sm text-foreground rounded shadow-sm">
                                {resource.type}
                            </span>
                        )}
                        {resource.docType && (
                            <span className="text-[10px] font-bold uppercase py-0.5 px-1.5 bg-primary text-primary-foreground rounded shadow-sm">
                                {resource.docType}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* ── Card body ── */}
            <div className="flex flex-col flex-1 p-5">
                <div className="flex items-start gap-3 mb-3">
                    <div className="p-2.5 bg-muted rounded-xl text-muted-foreground shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        {getResourceIcon(resource.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                            {resource.title || 'Ressource'}
                        </h3>

                        <div className="flex flex-col mt-1.5 gap-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                                {resource.professor && (
                                    <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {resource.professor}
                                    </span>
                                )}
                                {showModule && (resource.module || resource.moduleId) && (
                                    <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                                        <BookOpen className="w-3 h-3" />
                                        {resource.module || resource.moduleId}
                                    </span>
                                )}
                                {/* Only show badges here for non-PDF (PDFs show them on top of the cover) */}
                                {!isPdf && (
                                    <>
                                        {resource.type && (
                                            <span className="text-[10px] font-bold uppercase py-0.5 px-1.5 bg-muted text-muted-foreground rounded">
                                                {resource.type}
                                            </span>
                                        )}
                                        {resource.docType && (
                                            <span className="text-[10px] font-bold uppercase py-0.5 px-1.5 bg-primary/10 text-primary rounded">
                                                {resource.docType}
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                            <RatingStars resource={resource} />
                        </div>
                    </div>
                </div>

                {showDescription && resource.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                        {resource.description}
                    </p>
                )}

                {/* ── Footer ── */}
                <div className="mt-auto pt-4 border-t border-border flex items-center justify-between gap-2">
                    {/* Left side action or info */}
                    {onRemove ? (
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(e, resourceId); }}
                            disabled={togglingFav === resourceId}
                            className="text-xs font-bold flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-500 transition-colors dark:bg-red-500/15 dark:text-red-300 dark:hover:bg-red-500/25"
                        >
                            {togglingFav === resourceId
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <X className="w-3 h-3" />
                            }
                            Retirer
                        </button>
                    ) : onToggleFav ? (
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFav(e, resource); }}
                            disabled={togglingFav === resourceId}
                            className={`text-xs font-bold flex items-center gap-1 px-2.5 py-1 rounded-full transition-colors ${
                                isFav
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-muted text-muted-foreground hover:bg-primary/5 hover:text-primary'
                            }`}
                        >
                            {togglingFav === resourceId
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <ListPlus className="w-3 h-3" />
                            }
                            {isFav ? 'Dans ma liste' : 'Ajouter à ma liste'}
                        </button>
                    ) : footerLeft ? (
                        footerLeft
                    ) : (
                        <span />
                    )}

                    {/* Right side: open link */}
                    {validUrl ? (
                        <span className="text-xs font-bold text-primary group-hover:underline flex items-center gap-1 bg-primary/5 px-2.5 py-1 rounded-full whitespace-nowrap">
                            Ouvrir <ArrowRight className="w-3 h-3" />
                        </span>
                    ) : (
                        <span className="text-xs text-muted-foreground">Non disponible</span>
                    )}
                </div>
            </div>
        </Link>
    );
}
