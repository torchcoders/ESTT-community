import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils';
import { Gem, User, SmilePlus, Trash2, MoreHorizontal, AlertTriangle, X, Reply, Flag, FileText, Video, Link as LinkIcon, ArrowRight, BookOpen, Users, CheckCheck, Calendar, MapPin, Clock, CalendarDays, Loader2 } from 'lucide-react';
import { db, ref, get } from '@/lib/firebase';
import { ESTT_AI_AGENT_ID } from '@/lib/estt-ai';

const COMMON_EMOJIS = ['❤️', '😂', '👍', '🔥', '😮'];

export default function ChatBubble({ message, isOwn, onReact, onDelete, onReply, currentUserId, profile: externalProfile, isContinuation, isLastInGroup, profiles = {}, readStatuses = {} }) {
    const [showPicker, setShowPicker] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showSeenBy, setShowSeenBy] = useState(false);
    const [eventDetails, setEventDetails] = useState(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [attendees, setAttendees] = useState([]);
    const [clubInfo, setClubInfo] = useState(null);
    const [resourceDataList, setResourceDataList] = useState({});
    const [loadingResources, setLoadingResources] = useState({});

    const { id, userId, text, timestamp, reactions, profile: messageProfile, isDeleted, replyTo, imageUrl, sharedResource, sharedResourceIds, sharedEvent, type, stickerUrl } = message;
    const profile = externalProfile || messageProfile;
    const { firstName, lastName, photoUrl, verifiedEmail, role, subscription } = profile || {};
    const profileHref = profile?.profileHref === undefined ? `/profile/${userId}` : profile.profileHref;
    const isMarkdownMessage = profile?.isAiAssistant || userId === ESTT_AI_AGENT_ID;

    const formattedTime = new Date(timestamp).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).toUpperCase();

    // Permissions logic
    const isSubscribed = subscription?.expiresAt && subscription.expiresAt > Date.now();
    const isAdmin = role === 'admin';
    // canEdit — kept for future use (currently only canDelete and canReport are active)
    // const canEdit = isOwn;
    const canDelete = isOwn;
    const canReport = !isOwn;

    const handleLoadEvent = async (e) => {
        // Prevent clicking the bubble or link before data is ready
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (eventDetails || isDetailLoading || !sharedEvent?.clubId || !sharedEvent?.id) return;

        try {
            setIsDetailLoading(true);
            const eventRef = ref(db, `clubs/${sharedEvent.clubId}/events/${sharedEvent.id}`);
            const snapshot = await get(eventRef);

            if (snapshot.exists()) {
                const data = snapshot.val();
                setEventDetails(data);

                // Load attendees (Social Proof)
                try {
                    const attendeesRef = ref(db, `eventAttendees/${sharedEvent.id}`);
                    const attendeesSnap = await get(attendeesRef);
                    if (attendeesSnap.exists()) {
                        const attendeesList = Object.keys(attendeesSnap.val());
                        setAttendees(attendeesList);
                    }
                } catch (attErr) {
                    console.error('Failed to load attendees:', attErr);
                }

                // Load Club Info
                try {
                    const clubRef = ref(db, `clubs/${sharedEvent.clubId}`);
                    const clubSnap = await get(clubRef);
                    if (clubSnap.exists()) {
                        const cData = clubSnap.val();
                        setClubInfo({
                            name: cData.name,
                            logo: cData.logo
                        });
                    }
                } catch (clubErr) {
                    console.error('Failed to load club info:', clubErr);
                }
            } else {
                setLoadError(true);
            }
        } catch (error) {
            console.error('Failed to load event details:', error);
            setLoadError(true);
        } finally {
            setIsDetailLoading(false);
        }
    };

    // Auto-load if the data was somehow already partially there (backwards compatibility)
    useEffect(() => {
        if (sharedEvent?.title && !eventDetails) {
            setEventDetails(sharedEvent);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sharedEvent]);

    // Multiple Resources Loader
    useEffect(() => {
        if (!sharedResourceIds || sharedResourceIds.length === 0) return;

        sharedResourceIds.forEach(async (resId) => {
            if (resourceDataList[resId] || loadingResources[resId]) return;

            try {
                setLoadingResources(prev => ({ ...prev, [resId]: true }));
                const resRef = ref(db, `resources/${resId}`);
                const snap = await get(resRef);
                if (snap.exists()) {
                    setResourceDataList(prev => ({ ...prev, [resId]: snap.val() }));
                }
            } catch (err) {
                console.error(`Failed to load resource ${resId}:`, err);
            } finally {
                setLoadingResources(prev => ({ ...prev, [resId]: false }));
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sharedResourceIds]);

    // Reactions logic
    const reactionList = reactions ? Object.entries(reactions).map(([emoji, users]) => ({
        emoji,
        count: Object.keys(users).length,
        hasReacted: users[currentUserId] === true
    })) : [];

    const scrollToMessage = (msgId) => {
        const element = document.getElementById(`msg-${msgId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-2', 'ring-blue-400', 'ring-offset-2');
            setTimeout(() => {
                element.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-2');
            }, 2000);
        }
    };

    // Seen By logic
    const readers = Object.entries(readStatuses || {})
        .filter(([uid, status]) => {
            // Check if user has read this message (id compare works for Firebase push IDs)
            return uid !== userId && status.lastMessageId >= id;
        })
        .map(([uid, status]) => ({
            ...(profiles?.[uid] || {}),
            seenAt: status.timestamp
        }))
        .filter(p => p.firstName);

    const markdownComponents = {
        p: ({ children }) => <p className="mb-3 last:mb-0 whitespace-pre-wrap">{children}</p>,
        strong: ({ children }) => <strong className="font-black">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-5">{children}</ol>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        h1: ({ children }) => <h1 className="mb-3 text-lg font-black leading-tight">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-3 text-base font-black leading-tight">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-2 text-sm font-black uppercase tracking-wide">{children}</h3>,
        a: ({ href, children }) => (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                    "font-bold underline decoration-2 underline-offset-2 hover:decoration-4 transition-all",
                    isOwn ? "text-white" : "text-primary"
                )}
            >
                {children}
            </a>
        ),
        code: ({ className, children }) => {
            const isInline = !className || !className.startsWith('language-');
            if (isInline) {
                return (
                    <code
                        className={cn(
                            "rounded-md px-1.5 py-0.5 font-mono text-[0.92em]",
                            isOwn ? "bg-white/15 text-white" : "bg-slate-900/5 text-foreground dark:bg-white/10 dark:text-foreground"
                        )}
                    >
                        {children}
                    </code>
                );
            }

            return (
                <code className={cn("block font-mono text-[13px] md:text-[14px]", isOwn ? "text-white" : "text-slate-50", className)}>
                    {children}
                </code>
            );
        },
        pre: ({ children }) => (
            <pre
                className={cn(
                    "my-3 overflow-x-auto rounded-2xl p-3 md:p-4 text-[13px] leading-relaxed",
                    isOwn ? "bg-black/15 text-white" : "bg-slate-900 text-slate-50"
                )}
            >
                {children}
            </pre>
        ),
        blockquote: ({ children }) => (
            <blockquote
                className={cn(
                    "my-3 border-l-2 pl-3 italic",
                    isOwn ? "border-white/40 text-white/90" : "border-border text-muted-foreground"
                )}
            >
                {children}
            </blockquote>
        ),
        hr: () => <hr className={cn("my-4 border-t", isOwn ? "border-white/20" : "border-border")} />,
        table: ({ children }) => <div className="my-3 overflow-x-auto"><table className="min-w-full border-collapse text-sm">{children}</table></div>,
        thead: ({ children }) => <thead className={isOwn ? "bg-white/10" : "bg-muted"}>{children}</thead>,
        th: ({ children }) => <th className={cn("border px-3 py-2 text-left font-black", isOwn ? "border-white/15" : "border-border")}>{children}</th>,
        td: ({ children }) => <td className={cn("border px-3 py-2 align-top", isOwn ? "border-white/15" : "border-border")}>{children}</td>,
    };

    return (
        <div
            id={`msg-${id}`}
            className={cn(
                "flex w-full group relative transition-all duration-200",
                isLastInGroup ? "mb-6" : "mb-1",
                isOwn ? "justify-end" : "justify-start"
            )}
        >
            <div className={cn(
                "flex max-w-[85%] md:max-w-[75%]",
                isOwn ? "flex-row-reverse" : "flex-row"
            )}>
                {/* Avatar Column */}
                <div className={cn(
                    "flex-shrink-0 flex flex-col justify-end pb-1",
                    isOwn ? "ml-2 md:ml-3" : "mr-2 md:mr-3"
                )}>
                    {!isContinuation ? (
                        profileHref ? (
                            <Link
                                href={profileHref}
                                className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden bg-muted border border-border hover:opacity-80 transition-opacity"
                            >
                                {photoUrl ? (
                                    <Image
                                        src={photoUrl}
                                        alt={firstName || 'User'}
                                        width={40}
                                        height={40}
                                        className="object-cover w-full h-full"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                        <User className="w-5 h-5 md:w-6 md:h-6" />
                                    </div>
                                )}
                            </Link>
                        ) : (
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden bg-muted border border-border">
                                {photoUrl ? (
                                    <Image
                                        src={photoUrl}
                                        alt={firstName || 'User'}
                                        width={40}
                                        height={40}
                                        className="object-cover w-full h-full"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                        <User className="w-5 h-5 md:w-6 md:h-6" />
                                    </div>
                                )}
                            </div>
                        )
                    ) : (
                        <div className="w-8 md:w-10" /> /* Spacer for alignment */
                    )}
                </div>

                {/* Content */}
                <div className={cn(
                    "flex flex-col relative",
                    isOwn ? "items-end" : "items-start"
                )}>
                    {/* Name & Badges (Only if not continuation) */}
                    {!isContinuation && (
                        profileHref ? (
                            <Link
                                href={profileHref}
                                className={cn(
                                    "flex items-center gap-1 mb-1 md:mb-1.5 hover:opacity-80 transition-opacity",
                                    isOwn ? "flex-row-reverse" : "flex-row"
                                )}
                            >
                                <span className="text-[13px] md:text-sm font-bold text-foreground">
                                    {firstName} {lastName}
                                </span>

                                {verifiedEmail && (
                                    <div className="relative flex items-center">
                                        <span
                                            className={cn(
                                                "material-symbols-outlined select-none !text-[11px] md:!text-[12px]",
                                                isAdmin ? "text-yellow-500" : "text-emerald-500"
                                            )}
                                            style={{
                                                fontVariationSettings: "'FILL' 1"
                                            }}
                                        >
                                            verified
                                        </span>
                                    </div>
                                )}

                                {isSubscribed && (
                                    <div className="bg-gradient-to-r from-violet-600 to-indigo-500 p-0.5 rounded-sm shadow-sm flex items-center justify-center">
                                        <Gem className="!w-1.5 !h-1.5 md:!w-2 md:!h-2 text-white" />
                                    </div>
                                )}
                            </Link>
                        ) : (
                            <div
                                className={cn(
                                    "flex items-center gap-1 mb-1 md:mb-1.5",
                                    isOwn ? "flex-row-reverse" : "flex-row"
                                )}
                            >
                                <span className="text-[13px] md:text-sm font-bold text-foreground">
                                    {firstName} {lastName}
                                </span>

                                {verifiedEmail && (
                                    <div className="relative flex items-center">
                                        <span
                                            className={cn(
                                                "material-symbols-outlined select-none !text-[11px] md:!text-[12px]",
                                                isAdmin ? "text-yellow-500" : "text-emerald-500"
                                            )}
                                            style={{
                                                fontVariationSettings: "'FILL' 1"
                                            }}
                                        >
                                            verified
                                        </span>
                                    </div>
                                )}

                                {isSubscribed && (
                                    <div className="bg-gradient-to-r from-violet-600 to-indigo-500 p-0.5 rounded-sm shadow-sm flex items-center justify-center">
                                        <Gem className="!w-1.5 !h-1.5 md:!w-2 md:!h-2 text-white" />
                                    </div>
                                )}
                            </div>
                        )
                    )}

                    {/* Bubble Container (for Reaction Picker overlap) */}
                    <div className="relative group/bubble">
                        {/* Bubble */}
                        <div className={cn(
                            "rounded-[18px] md:rounded-2xl text-[14px] md:text-[15px] leading-relaxed relative shadow-sm transition-all overflow-hidden border",
                            type === 'sticker'
                                ? "bg-transparent border-transparent shadow-none"
                                : isDeleted
                                    ? "bg-muted text-muted-foreground border-border italic px-4 py-2 md:px-6 md:py-3.5"
                                    : isOwn
                                        ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-500 shadow-sm"
                                        : "bg-muted text-foreground border-border/50",
                            isOwn && !isContinuation && "rounded-tr-none",
                            !isOwn && !isContinuation && "rounded-tl-none"
                        )}>
                            {/* Reply Quote Block */}
                            {replyTo && !isDeleted && (
                                <button
                                    onClick={() => scrollToMessage(replyTo.id)}
                                    className={cn(
                                        "w-full text-left border-b px-4 py-1.5 md:px-5 md:py-2.5 mb-1 group/reply transition-all block",
                                        isOwn
                                            ? "bg-black/10 border-black/5 hover:bg-black/20 text-white"
                                            : "bg-card/50 border-border/50 hover:bg-card/80"
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <div className={cn(
                                            "w-0.5 h-3 rounded-full",
                                            isOwn ? "bg-white/50" : "bg-blue-500"
                                        )} />
                                        <span className={cn(
                                            "text-[10px] md:text-[11px] font-black uppercase tracking-wider",
                                            isOwn ? "text-blue-100" : "text-blue-600"
                                        )}>
                                            {replyTo.userName}
                                        </span>
                                    </div>
                                    <p className={cn(
                                        "text-[12px] md:text-[13px] line-clamp-1 italic",
                                        isOwn ? "text-blue-50/70" : "text-muted-foreground"
                                    )}>
                                        {replyTo.text || "Message supprimé"}
                                    </p>
                                </button>
                            )}

                            {type === 'sticker' && stickerUrl && !isDeleted ? (
                                <div className="p-0 select-none animate-in zoom-in-50 duration-300">
                                    <img
                                        src={stickerUrl}
                                        alt="Sticker"
                                        className="w-[120px] md:w-[180px] h-auto object-contain transition-transform hover:scale-110 active:scale-95 cursor-default"
                                        loading="lazy"
                                    />
                                </div>
                            ) : (
                                <>
                                    {imageUrl && !isDeleted && (
                                        <div className={cn(
                                            "relative overflow-hidden border-b border-black/5",
                                            text ? "mb-1" : ""
                                        )}>
                                            <Link
                                                href={imageUrl}
                                                target="_blank"
                                                className="block group/img relative"
                                            >
                                                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors z-10 flex items-center justify-center">
                                                    <span className="opacity-0 group-hover/img:opacity-100 text-white text-[10px] font-bold uppercase tracking-wider bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm transition-all transform scale-90 group-hover/img:scale-100">
                                                        Voir en grand
                                                    </span>
                                                </div>
                                                <img
                                                    src={imageUrl}
                                                    alt="Chat attachment"
                                                    className="max-w-[240px] md:max-w-[400px] max-h-[300px] md:max-h-[450px] w-auto h-auto object-contain block mx-auto rounded-lg"
                                                />
                                            </Link>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Shared Resource Card */}
                            {sharedResource && <ResourceCard resource={{ id: sharedResource.id, ...sharedResource }} isOwn={isOwn} />}

                            {/* Multiple Shared Resource Cards */}
                            {sharedResourceIds && sharedResourceIds.length > 0 && (
                                <div className="space-y-2 p-1.5">
                                    {sharedResourceIds.map(resId => {
                                        const res = resourceDataList[resId];
                                        const isLoading = loadingResources[resId];
                                        if (isLoading) return <ResourceCardSkeleton key={resId} isOwn={isOwn} />;
                                        if (!res) return null;
                                        return <ResourceCard key={resId} resource={{ id: resId, ...res }} isOwn={isOwn} />;
                                    })}
                                </div>
                            )}

                            {/* Shared Event Card (Lazy Loaded) */}
                            {sharedEvent && (
                                <div className={cn(
                                    "p-1 md:p-1.5",
                                    text ? "mb-1" : ""
                                )}>
                                    {!eventDetails && !loadError ? (
                                        <button
                                            onClick={handleLoadEvent}
                                            disabled={isDetailLoading}
                                            className={cn(
                                                "w-full group/event relative overflow-hidden rounded-2xl border transition-all duration-300 text-left",
                                                isOwn
                                                    ? "bg-white/10 border-white/20 hover:bg-white/20"
                                                    : "bg-muted border-border hover:bg-muted hover:border-primary/20"
                                            )}
                                        >
                                            <div className="p-4 md:p-5 flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover/event:scale-110",
                                                        isOwn ? "bg-white/20" : "bg-primary/10"
                                                    )}>
                                                        {isDetailLoading ? (
                                                            <Loader2 className={cn("w-6 h-6 animate-spin", isOwn ? "text-white" : "text-primary")} />
                                                        ) : (
                                                            <CalendarDays className={cn("w-6 h-6", isOwn ? "text-white" : "text-primary")} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className={cn("text-xs font-black uppercase tracking-widest mb-0.5", isOwn ? "text-white" : "text-foreground")}>
                                                            Événement Partagé
                                                        </h4>
                                                        <p className={cn("text-[11px] font-bold opacity-70", isOwn ? "text-white/80" : "text-muted-foreground")}>
                                                            {isDetailLoading ? "Chargement..." : "Cliquez pour voir les détails"}
                                                        </p>
                                                    </div>
                                                </div>
                                                {!isDetailLoading && (
                                                    <ArrowRight className={cn("w-5 h-5 transition-transform group-hover/event:translate-x-1", isOwn ? "text-white/40" : "text-muted-foreground")} />
                                                )}
                                            </div>
                                        </button>
                                    ) : loadError ? (
                                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 dark:bg-red-500/15 dark:border-red-500/30 dark:text-red-300">
                                            <AlertTriangle className="w-5 h-5 shrink-0" />
                                            <p className="text-xs font-bold">Cet événement n&apos;est plus disponible.</p>
                                        </div>
                                    ) : (
                                        <Link
                                            href={clubInfo ? `${getClubPath(clubInfo)}/events/${sharedEvent.id}/registration` : `/clubs/${sharedEvent.clubId}/events/${sharedEvent.id}/registration`}
                                            className="block w-full max-w-[280px] md:max-w-none group/event bg-card border border-border/60 rounded-2xl overflow-hidden hover:border-blue-400/30 transition-all shadow-md active:scale-[0.98]"
                                        >
                                            {eventDetails.imageUrl && (
                                                <div className="w-full h-32 md:h-40 overflow-hidden relative border-b border-border">
                                                    <img
                                                        src={eventDetails.imageUrl}
                                                        alt={eventDetails.title}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover/event:scale-110"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                                </div>
                                            )}
                                            <div className="p-4 md:p-6">
                                                <div className="flex items-start gap-4 mb-4">
                                                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl border border-border/50 overflow-hidden shrink-0 shadow-sm bg-card p-1">
                                                        {clubInfo?.logo || eventDetails.clubLogo ? (
                                                            <img src={clubInfo?.logo || eventDetails.clubLogo} alt="" className="w-full h-full object-contain" />
                                                        ) : (
                                                            <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                                                                <CalendarDays className="w-6 h-6" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full dark:text-blue-300 dark:bg-blue-500/15">
                                                                {clubInfo?.name || eventDetails.clubName || "Club"}
                                                            </span>
                                                            <span className={cn(
                                                                "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                                                (eventDetails.isPaid || (eventDetails.price && Number(eventDetails.price) > 0)) ? "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40" : "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40"
                                                            )}>
                                                                {(eventDetails.isPaid || (eventDetails.price && Number(eventDetails.price) > 0)) ? `${eventDetails.price} DH` : 'Gratuit'}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-[14px] md:text-lg font-black text-foreground group-hover/event:text-blue-600 transition-colors line-clamp-2 leading-tight">
                                                            {eventDetails.title}
                                                        </h4>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-muted/50 border border-border/50">
                                                    <div className="space-y-0.5 md:space-y-1">
                                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Date</p>
                                                        <p className="text-[11px] md:text-sm font-bold text-foreground flex items-center gap-1.5 min-w-0">
                                                            <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5 text-blue-500 shrink-0" />
                                                            <span className="truncate">
                                                                {new Date(eventDetails.date || eventDetails.eventDate || eventDetails.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                                            </span>
                                                        </p>
                                                    </div>
                                                    <div className="space-y-0.5 md:space-y-1">
                                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Lieu</p>
                                                        <p className="text-[11px] md:text-sm font-bold text-foreground flex items-center gap-1.5 min-w-0">
                                                            <MapPin className="w-3 h-3 md:w-3.5 md:h-3.5 text-rose-500 shrink-0" />
                                                            <span className="truncate">{eventDetails.location || 'EST Tech'}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                {/* Social Proof (Attendees from chat) */}
                                                {attendees.length > 0 && (
                                                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                                                        <div className="flex -space-x-2 md:-space-x-2.5 overflow-hidden">
                                                            {attendees.slice(0, 5).map((uid, _i) => {
                                                                const p = profiles[uid];
                                                                if (!p) return null;
                                                                return (
                                                                    <div
                                                                        key={uid}
                                                                        className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white dark:border-border bg-muted flex items-center justify-center shrink-0 shadow-sm transition-transform hover:z-10 hover:scale-110"
                                                                        title={`${p.firstName} ${p.lastName}`}
                                                                    >
                                                                        {p.photoUrl ? (
                                                                            <img src={p.photoUrl} alt="" className="w-full h-full object-cover rounded-full" />
                                                                        ) : (
                                                                            <span className="text-[10px] font-bold text-muted-foreground">{p.firstName?.[0]}</span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                            {attendees.length > 5 && (
                                                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white dark:border-border bg-slate-800 flex items-center justify-center shrink-0 z-10">
                                                                    <span className="text-[9px] md:text-[10px] font-black text-white">+{attendees.length - 5}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                            {attendees.length} inscrit{attendees.length > 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="bg-muted border-t border-border px-4 md:px-6 py-3.5 md:py-4 flex items-center justify-between group-hover/event:bg-blue-50/50 transition-colors dark:group-hover/event:bg-blue-500/10">
                                                <span className="text-[10px] md:text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5 text-blue-500" /> {eventDetails.time || 'Non spécifié'}
                                                </span>
                                                <span className="text-[11px] md:text-sm font-black text-blue-600 flex items-center gap-1.5 group-hover/event:translate-x-1 transition-transform">
                                                    Participer <ArrowRight className="w-4 h-4" />
                                                </span>
                                            </div>
                                        </Link>
                                    )}
                                </div>
                            )}

                            {/* Text Content */}
                            {(text || isDeleted) && (
                                <div className={cn(
                                    !isDeleted && (imageUrl || sharedResource || (sharedResourceIds && sharedResourceIds.length > 0) || sharedEvent ? "px-4 pb-3 pt-1 md:px-6 md:pb-4 md:pt-2" : "px-4 py-2 md:px-6 md:py-3.5")
                                )}>
                                    {isDeleted ? (
                                        <span className="italic opacity-60">Ce message a été supprimé</span>
                                    ) : (
                                        (() => {
                                            if (!text) return null;
                                            if (isMarkdownMessage) {
                                                const cleanText = (() => {
                                                    const trimmed = text.trim();
                                                    const firstFence = trimmed.indexOf("```");
                                                    if (firstFence === -1) return trimmed;

                                                    // ── Step 1: Unwrap outer code fence ──
                                                    // Gemini sometimes wraps the entire response in ```text ... ``` or ``` ... ```
                                                    if (firstFence === 0) {
                                                        const lastFence = trimmed.lastIndexOf("```");
                                                        if (lastFence > 3) {
                                                            const blockRaw = trimmed.substring(3, lastFence);
                                                            const fenceCount = (blockRaw.match(/```/g) || []).length;
                                                            let outerLang = "";
                                                            const langMatch = blockRaw.match(/^(\w+)\n/);
                                                            if (langMatch) outerLang = langMatch[1];
                                                            const isOuterText = /^(text|txt)?$/i.test(outerLang);

                                                            if (isOuterText) {
                                                                // Text-type outer fence — always unwrap
                                                                let content = blockRaw;
                                                                if (langMatch) content = blockRaw.substring(langMatch[0].length);
                                                                return content.trim();
                                                            } else if (fenceCount >= 2) {
                                                                // Non-text outer fence with inner fences — unwrap
                                                                let content = blockRaw;
                                                                if (langMatch) content = blockRaw.substring(langMatch[0].length);
                                                                return content.trim();
                                                            }
                                                        }
                                                    }

                                                    // ── Step 2: Handle heading-inside-code-block splitting ──
                                                    const lastFence = trimmed.lastIndexOf("```");
                                                    if (firstFence === lastFence) return trimmed;
                                                    const before = trimmed.substring(0, firstFence);
                                                    const blockRaw = trimmed.substring(firstFence + 3, lastFence);
                                                    const after = trimmed.substring(lastFence + 3);
                                                    const fenceCount = (blockRaw.match(/```/g) || []).length;
                                                    let outerLang = "";
                                                    const langMatch = blockRaw.match(/^(\w+)\n/);
                                                    if (langMatch) outerLang = langMatch[1];
                                                    if (fenceCount % 2 === 0 && fenceCount > 0) return trimmed;
                                                    if (fenceCount === 0 && !/^###\s|^\*\*|^\*\s/m.test(blockRaw)) return trimmed;
                                                    if (fenceCount === 0) return before + blockRaw + after;
                                                    let blockContent = blockRaw;
                                                    if (langMatch) blockContent = blockRaw.substring(langMatch[0].length);
                                                    const innerParts = blockContent.split("```");
                                                    let result = before;
                                                    for (let i = 0; i < innerParts.length; i++) {
                                                        const part = innerParts[i];
                                                        if (i % 2 === 0) {
                                                            const hi = part.search(/^###\s/m);
                                                            if (hi > 0) {
                                                                const cp = part.substring(0, hi).trimEnd();
                                                                if (cp.trim()) result += "```" + outerLang + "\n" + cp + "\n```\n";
                                                                result += part.substring(hi);
                                                            } else { result += part; }
                                                        } else {
                                                            let lang = "", code = part;
                                                            const nl = part.indexOf("\n");
                                                            if (nl !== -1) { const f = part.substring(0, nl).trim(); if (/^[a-zA-Z]+$/.test(f)) { lang = f; code = part.substring(nl + 1); } }
                                                            const hi = code.search(/^###\s/m);
                                                            if (hi > 0) {
                                                                const co = code.substring(0, hi).trimEnd();
                                                                if (co.trim()) result += "```" + (lang || outerLang) + "\n" + co + "\n```\n";
                                                                result += code.substring(hi);
                                                            } else {
                                                                result += "```" + (lang || outerLang) + "\n" + code + "```\n";
                                                            }
                                                        }
                                                    }
                                                    return result + after;
                                                })();
                                                return (
                                                    <div className="markdown-message">
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm, remarkMath]}
                                                            rehypePlugins={[rehypeKatex]}
                                                            components={markdownComponents}
                                                        >
                                                            {cleanText}
                                                        </ReactMarkdown>
                                                    </div>
                                                );
                                            }
                                            // Unified regex for mentions and URLs
                                            const parts = text.split(/((?:@\w+_\w+)|(?:https?:\/\/[^\s]+))/g);
                                            return parts.map((part, index) => {
                                                if (part.startsWith('@') && part.includes('_')) {
                                                    return (
                                                        <span
                                                            key={index}
                                                            className={cn(
                                                                "font-bold px-1.5 py-0.5 rounded-md mx-0.5 inline-block transition-all",
                                                                isOwn
                                                                    ? "bg-white/20 text-white shadow-sm ring-1 ring-white/10"
                                                                    : "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/5"
                                                            )}
                                                        >
                                                            {part}
                                                        </span>
                                                    );
                                                }
                                                if (part.startsWith('http')) {
                                                    return (
                                                        <a
                                                            key={index}
                                                            href={part}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={cn(
                                                                "font-bold underline decoration-2 underline-offset-2 hover:decoration-4 transition-all mx-0.5",
                                                                isOwn ? "text-white" : "text-primary"
                                                            )}
                                                        >
                                                            {part}
                                                        </a>
                                                    );
                                                }
                                                return part;
                                            });
                                        })()
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Actions (Only if not deleted) */}
                        {!isDeleted && (
                            <div className={cn(
                                "absolute top-1/2 -translate-y-1/2 flex items-center gap-1 transition-all z-10",
                                isOwn ? "-left-8 md:-left-20" : "-right-8 md:-right-20",
                                "opacity-0 group-hover/bubble:opacity-100",
                                (showPicker || showMenu) && "opacity-100"
                            )}>
                                {/* Reaction Picker Trigger */}
                                <button
                                    onClick={() => {
                                        setShowPicker(!showPicker);
                                        setShowMenu(false);
                                    }}
                                    className={cn(
                                        "w-8 h-8 rounded-full bg-card shadow-lg flex items-center justify-center border border-border transition-all",
                                        showPicker ? "text-blue-500 ring-2 ring-blue-50" : "text-muted-foreground hover:text-blue-500"
                                    )}
                                >
                                    <SmilePlus className="w-4 h-4" />
                                </button>

                                {/* More Actions Trigger */}
                                <div className="relative">
                                    <button
                                        onClick={() => {
                                            setShowMenu(!showMenu);
                                            setShowPicker(false);
                                        }}
                                        className={cn(
                                            "w-8 h-8 rounded-full bg-card shadow-lg flex items-center justify-center border border-border transition-all",
                                            showMenu ? "text-foreground ring-2 ring-border" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>

                                    {/* Actions Dropdown */}
                                    {showMenu && (
                                        <div className={cn(
                                            "absolute bottom-full mb-3 w-40 bg-card rounded-xl shadow-2xl border border-border py-1.5 z-40 animate-in fade-in zoom-in duration-200",
                                            isOwn ? "right-0" : "left-0"
                                        )}>
                                            <button
                                                onClick={() => {
                                                    onReply(message);
                                                    setShowMenu(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                                            >
                                                <Reply className="w-4 h-4" />
                                                Répondre
                                            </button>

                                            {canDelete && (
                                                <button
                                                    onClick={() => {
                                                        setShowDeleteConfirm(true);
                                                        setShowMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors dark:text-red-400 dark:hover:bg-red-500/10"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Supprimer
                                                </button>
                                            )}

                                            {isOwn && (
                                                <>
                                                    <div className="h-px bg-muted my-1 mx-2" />
                                                    <button
                                                        onClick={() => {
                                                            setShowSeenBy(true);
                                                            setShowMenu(false);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                                                    >
                                                        <Users className="w-4 h-4" />
                                                        Qui a vu ?
                                                    </button>
                                                </>
                                            )}

                                            {canReport && (
                                                <>
                                                    <div className="h-px bg-muted my-1 mx-2" />
                                                    <button
                                                        onClick={() => setShowMenu(false)} // Placeholder
                                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                                                    >
                                                        <Flag className="w-4 h-4" />
                                                        Signaler
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Emoji Picker Popover */}
                        {showPicker && (
                            <div className={cn(
                                "absolute bottom-full mb-3 p-1.5 bg-card rounded-full shadow-2xl border border-border flex items-center gap-1 z-30 animate-in fade-in zoom-in duration-200",
                                isOwn ? "right-0" : "left-0"
                            )}>
                                {COMMON_EMOJIS.map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => {
                                            onReact(emoji);
                                            setShowPicker(false);
                                        }}
                                        className="w-10 h-10 flex items-center justify-center text-xl hover:bg-muted rounded-full transition-colors active:scale-90"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Custom Delete Confirmation Modal */}
                    {showDeleteConfirm && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                            {/* Backdrop */}
                            <div
                                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                                onClick={() => setShowDeleteConfirm(false)}
                            />

                            {/* Dialog Content */}
                            <div className="relative w-full max-w-sm bg-card rounded-3xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
                                <div className="p-8 text-center">
                                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 dark:bg-red-500/15">
                                        <AlertTriangle className="w-8 h-8 text-red-500" />
                                    </div>
                                    <h3 className="text-xl font-black text-foreground mb-2">Supprimer le message ?</h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        Cette action est irréversible. Le contenu sera remplacé par un message système.
                                    </p>
                                </div>
                                <div className="flex border-t border-border">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex-1 px-6 py-4 text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
                                    >
                                        Garder
                                    </button>
                                    <button
                                        onClick={() => {
                                            onDelete();
                                            setShowDeleteConfirm(false);
                                        }}
                                        className="flex-1 px-6 py-4 text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors"
                                    >
                                        Supprimer
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Reaction Chips */}
                    {reactionList.length > 0 && !isDeleted && (
                        <div className={cn(
                            "flex flex-wrap gap-1.5 mt-2",
                            isOwn ? "justify-end" : "justify-start"
                        )}>
                            {reactionList.map(({ emoji, count, hasReacted }) => (
                                <button
                                    key={emoji}
                                    onClick={() => onReact(emoji)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-medium transition-all border",
                                        hasReacted
                                            ? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-500/15 dark:border-blue-500/40 dark:text-blue-300"
                                            : "bg-card border-border text-muted-foreground hover:border-border"
                                    )}
                                >
                                    <span>{emoji}</span>
                                    <span>{count}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Timestamp & Seen Status */}
                    <div className={cn(
                        "transition-all duration-200 overflow-hidden flex items-center gap-2",
                        isLastInGroup ? "max-h-10 opacity-100" : "max-h-0 opacity-0 group-hover:max-h-10 group-hover:opacity-100"
                    )}>
                        <span className="text-[10px] font-medium text-muted-foreground mt-2 block uppercase tracking-wider">
                            {formattedTime}
                        </span>
                        {isOwn && readers.length > 0 && (
                            <div className="flex items-center gap-0.5 text-blue-500 mt-2">
                                <CheckCheck className="w-3 h-3" />
                                <span className="text-[10px] font-bold">{readers.length}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Seen By Modal */}
            {showSeenBy && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                        onClick={() => setShowSeenBy(false)}
                    />

                    <div className="relative w-full max-w-sm bg-card rounded-2xl border border-border overflow-hidden">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h3 className="font-bold text-foreground text-sm">Vues par</h3>
                            <button
                                onClick={() => setShowSeenBy(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto p-2">
                            {readers.length === 0 ? (
                                <div className="py-8 text-center text-muted-foreground text-sm">
                                    Aucune vue pour le moment
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {readers.map((p, idx) => {
                                        const seenTime = p.seenAt ? new Date(p.seenAt).toLocaleTimeString('fr-FR', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        }) : '';

                                        return (
                                            <div
                                                key={p.uid || idx}
                                                className="flex items-center justify-between p-3"
                                            >
                                                <span className="font-medium text-foreground text-[14px]">
                                                    {p.firstName} {p.lastName}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                                                    {seenTime}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ResourceCard({ resource, isOwn: _isOwn }) {
    return (
        <div className="p-0.5">
            <Link
                href={`/resource/${resource.id}`}
                className="block w-full max-w-[260px] md:max-w-none group/resource bg-card/60 backdrop-blur-sm border border-border/60 rounded-xl overflow-hidden hover:bg-card hover:border-primary/30 transition-all shadow-sm"
            >
                <div className="flex items-start gap-3 md:gap-4 p-3 md:p-5">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground group-hover/resource:bg-primary/10 group-hover/resource:text-primary transition-colors shrink-0">
                        {resource.type === 'pdf' ? <FileText className="w-5 h-5 md:w-6 md:h-6" /> :
                            resource.type === 'video' ? <Video className="w-5 h-5 md:w-6 md:h-6" /> :
                                resource.type === 'link' ? <LinkIcon className="w-5 h-5 md:w-6 md:h-6" /> :
                                    <BookOpen className="w-5 h-5 md:w-6 md:h-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] md:text-base font-bold text-foreground group-hover/resource:text-primary transition-colors line-clamp-2 leading-tight md:leading-snug">
                            {resource.title}
                        </p>
                        <p className="text-[10px] md:text-xs text-muted-foreground mt-1 md:mt-1.5 truncate">
                            {resource.module || 'Ressource'} • {resource.professor || 'Professeur'}
                        </p>
                    </div>
                </div>
                <div className="bg-muted/50 border-t border-border/50 px-3 md:px-5 py-2 md:py-2.5 flex items-center justify-between group-hover/resource:bg-primary/5 transition-colors">
                    <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{resource.type || 'Fichier'}</span>
                    <span className="text-[10px] md:text-xs font-bold text-primary flex items-center gap-1 group-hover/resource:underline">
                        Voir ressource <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    </span>
                </div>
            </Link>
        </div>
    );
}

function ResourceCardSkeleton({ isOwn: _isOwn }) {
    return (
        <div className="p-0.5 animate-pulse">
            <div className="w-full h-24 bg-card/40 border border-border/50 rounded-xl" />
        </div>
    );
}
