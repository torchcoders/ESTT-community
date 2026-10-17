'use client';

import { useState, useEffect, useMemo } from 'react';
import { db, ref, get } from '@/lib/firebase';
import { getClubPath } from '@/lib/clubUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    CalendarDays,
    LayoutList,
    CalendarRange,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Search,
    Calendar,
    Clock,
    Ticket,
    X,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// ─── Constants ──────────────────────────────────────────────────────────────

const FREE_PAID = [
    { value: 'all', label: 'Gratuit & Payant' },
    { value: 'free', label: 'Gratuit' },
    { value: 'paid', label: 'Payant' },
];



const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

function startOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 Sun
    const diff = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

function eventDate(event) {
    // prefer explicit date field, then eventDate, fall back to createdAt
    if (event.date) return new Date(event.date);
    if (event.eventDate) return new Date(event.eventDate);
    return new Date(event.createdAt);
}

function isPaid(event) {
    return !!event.isPaid || (event.price && Number(event.price) > 0);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ClubAvatar({ club, size = 'sm' }) {
    const sz = size === 'sm' ? 'w-5 h-5' : 'w-8 h-8';
    if (club?.logo) {
        return (
            <div className={cn('rounded-full overflow-hidden shrink-0 border border-white shadow-sm', sz)}>
                <Image src={club.logo} alt={club.name} width={32} height={32} className="object-cover w-full h-full" />
            </div>
        );
    }
    return (
        <div
            className={cn('rounded-full flex items-center justify-center shrink-0 text-white font-bold text-[10px] shadow-sm', sz)}
            style={{ backgroundColor: club?.themeColor || '#64748b' }}
        >
            {club?.name?.charAt(0).toUpperCase()}
        </div>
    );
}



function PriceBadge({ event }) {
    if (isPaid(event)) {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40">
                <Ticket className="w-2.5 h-2.5" />
                {event.price ? `${event.price} MAD` : 'Payant'}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border bg-green-50 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/40">
            Gratuit
        </span>
    );
}

// Event card for list view
function EventCard({ event }) {
    const date = eventDate(event);
    const isPast = date < new Date();
    return (
        <Link
            href={getClubPath({ username: event.clubUsername, id: event.clubId }) + `/events/${event.id}/registration`}
            className={cn(
                'group flex gap-3 p-3 sm:p-4 rounded-xl border transition-all hover:shadow-md hover:border-primary/40 bg-card',
                isPast ? 'opacity-60' : ''
            )}
        >
            {/* Date badge */}
            <div
                className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex flex-col items-center justify-center text-white shadow-sm"
                style={{ backgroundColor: event.clubThemeColor || '#64748b' }}
            >
                <span className="text-[9px] font-bold uppercase opacity-80">{MONTHS_FR[date.getMonth()].slice(0, 3)}</span>
                <span className="text-xl sm:text-2xl font-black leading-none">{date.getDate()}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mb-1">
                    <PriceBadge event={event} />
                    {event.location && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted rounded-md px-2 py-0.5">
                            <i className="fa-solid fa-location-dot text-[9px]" />
                            {event.location}
                        </span>
                    )}
                </div>
                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 text-sm">
                    {event.title}
                </h3>
                {event.description && (
                    <p className="text-muted-foreground text-xs line-clamp-1 mt-0.5">{event.description}</p>
                )}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <ClubAvatar club={{ logo: event.clubLogo, name: event.clubName, themeColor: event.clubThemeColor }} />
                    <span className="text-xs text-muted-foreground font-medium truncate max-w-[120px] sm:max-w-none">{event.clubName}</span>
                    <span className="text-muted-foreground hidden sm:inline">·</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        {event.time && <span className="ml-1">{event.time}</span>}
                    </span>
                </div>
            </div>

            {event.imageUrl && (
                <div className="hidden sm:block relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden shrink-0 bg-muted">
                    <Image src={event.imageUrl} alt={event.title} fill className="object-cover" />
                </div>
            )}
        </Link>
    );
}

// Dot cluster for a single calendar day
function DayDots({ events, max = 3 }) {
    const visible = events.slice(0, max);
    const rest = events.length - max;
    return (
        <div className="flex flex-wrap gap-0.5 mt-0.5">
            {visible.map((e, i) => (
                <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: e.clubThemeColor || '#64748b' }}
                />
            ))}
            {rest > 0 && <span className="text-[8px] text-muted-foreground leading-none">+{rest}</span>}
        </div>
    );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({ events, currentDate, onSelectDay, selectedDay }) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Build calendar grid: Mon–Sun
    const firstDay = new Date(year, month, 1);
    const startDow = firstDay.getDay(); // 0=Sun
    // Offset to monday-based grid
    const offset = startDow === 0 ? 6 : startDow - 1;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;

    const cells = [];
    for (let i = 0; i < totalCells; i++) {
        const dayNum = i - offset + 1;
        if (dayNum < 1 || dayNum > daysInMonth) {
            cells.push(null);
        } else {
            cells.push(new Date(year, month, dayNum));
        }
    }

    const today = new Date();

    const eventsForDay = (day) => {
        if (!day) return [];
        return events.filter(e => isSameDay(eventDate(e), day));
    };

    return (
        <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
            {/* Header row */}
            <div className="grid grid-cols-7 border-b border-border">
                {DAYS_FR.map(d => (
                    <div key={d} className="py-2 text-center text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                        <span className="hidden sm:inline">{d}</span>
                        <span className="sm:hidden">{d[0]}</span>
                    </div>
                ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7">
                {cells.map((day, idx) => {
                    if (!day) {
                        return <div key={idx} className="min-h-[56px] sm:min-h-[80px] md:min-h-[100px] border-b border-r border-border bg-muted/40" />;
                    }
                    const dayEvents = eventsForDay(day);
                    const isToday = isSameDay(day, today);
                    const isSelected = selectedDay && isSameDay(day, selectedDay);
                    const isPast = day < today && !isToday;
                    const isLastCol = (idx + 1) % 7 === 0;
                    const isLastRow = idx >= cells.length - 7;

                    return (
                        <button
                            key={idx}
                            onClick={() => onSelectDay(day)}
                            className={cn(
                                'min-h-[56px] sm:min-h-[80px] md:min-h-[100px] text-left p-1 sm:p-1.5 md:p-2 border-b border-r border-border transition-colors w-full',
                                isLastCol ? 'border-r-0' : '',
                                isLastRow ? 'border-b-0' : '',
                                isSelected ? 'bg-primary/5 ring-2 ring-inset ring-primary/30' : 'hover:bg-muted',
                                isPast ? 'opacity-50' : '',
                            )}
                        >
                            <span className={cn(
                                'inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 text-[10px] sm:text-xs font-semibold rounded-full',
                                isToday ? 'bg-primary text-white' : 'text-foreground'
                            )}>
                                {day.getDate()}
                            </span>
                            <DayDots events={dayEvents} max={2} />
                            {dayEvents.length > 0 && (
                                <span className="hidden md:block text-[9px] text-muted-foreground mt-0.5">
                                    {dayEvents.length} év.
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ events, currentDate, onSelectDay: _onSelectDay, selectedDay: _selectedDay }) {
    const weekStart = startOfWeek(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const today = new Date();

    // On mobile we show only Mon-Fri (first 5 days) to save space; user can still scroll
    return (
        <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
            {/* Horizontal scroll wrapper for mobile */}
            <div className="overflow-x-auto">
                <div className="min-w-[560px]">
                    <div className="grid grid-cols-7 border-b border-border">
                        {days.map((day, idx) => {
                            const isToday = isSameDay(day, today);
                            return (
                                <div
                                    key={idx}
                                    className={cn(
                                        'py-2 sm:py-3 px-1 text-center border-r border-border last:border-r-0',
                                        isToday ? 'bg-primary/5' : ''
                                    )}
                                >
                                    <span className="text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                                        {DAYS_FR[idx]}
                                    </span>
                                    <div className={cn(
                                        'mx-auto mt-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold',
                                        isToday ? 'bg-primary text-white' : 'text-foreground'
                                    )}>
                                        {day.getDate()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="grid grid-cols-7 min-h-[240px]">
                        {days.map((day, idx) => {
                            const dayEvents = events.filter(e => isSameDay(eventDate(e), day));
                            const isToday = isSameDay(day, today);
                            return (
                                <div
                                    key={idx}
                                    className={cn(
                                        'border-r border-border last:border-r-0 p-1 sm:p-1.5 md:p-2 space-y-1',
                                        isToday ? 'bg-primary/5' : ''
                                    )}
                                >
                                    {dayEvents.map((event, eIdx) => (
                                        <Link
                                            key={eIdx}
                                            href={getClubPath({ username: event.clubUsername, id: event.clubId }) + `/posts/${event.id}`}
                                            className="block"
                                        >
                                            <div
                                                className="text-[9px] sm:text-[10px] font-semibold text-white rounded-md px-1 sm:px-1.5 py-0.5 sm:py-1 line-clamp-2 hover:opacity-90 transition-opacity cursor-pointer"
                                                style={{ backgroundColor: event.clubThemeColor || '#64748b' }}
                                                title={event.title}
                                            >
                                                {event.title}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Day Panel (for month view) ───────────────────────────────────────────────

function DayPanel({ day, events, onClose }) {
    if (!day) return null;
    const dayEvents = events.filter(e => isSameDay(eventDate(e), day));
    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground">
                    {day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
                    <X className="w-4 h-4" />
                </Button>
            </div>
            {dayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aucun événement ce jour.</p>
            ) : (
                <div className="space-y-3">
                    {dayEvents.map(event => (
                        <EventCard key={event.id + event.clubId} event={event} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EventsCalendarPage() {
    const [allEvents, setAllEvents] = useState([]);
    const [clubs, setClubs] = useState([]);
    const [loading, setLoading] = useState(true);

    // View state
    const [view, setView] = useState('list'); // 'month' | 'week' | 'list'
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);

    // Filters
    const [search, setSearch] = useState('');
    const [filterClub, setFilterClub] = useState('all');
    const [filterPaid, setFilterPaid] = useState('all');

    useEffect(() => {
        fetchAllEvents();
    }, []);

    const fetchAllEvents = async () => {
        if (!db) { setLoading(false); return; }
        try {
            // 1. Fetch all clubs
            const clubsSnap = await get(ref(db, 'clubs'));
            if (!clubsSnap.exists()) { setLoading(false); return; }

            const clubsData = clubsSnap.val();
            const clubsArray = Object.entries(clubsData).map(([id, data]) => ({ id, ...data }));
            setClubs(clubsArray);

            // 2. Fetch events from clubs/{clubId}/events in parallel
            const eventsPromises = clubsArray.map(async (club) => {
                try {
                    const eventsSnap = await get(ref(db, `clubs/${club.id}/events`));
                    if (!eventsSnap.exists()) return [];
                    return Object.entries(eventsSnap.val())
                        .map(([id, data]) => ({
                            id,
                            ...data,
                            clubId: club.id,
                            clubName: club.name,
                            clubLogo: club.logo || null,
                            clubThemeColor: club.themeColor || '#64748b',
                            clubUsername: club.username,
                        }))
                        // Only show published events
                        .filter(e => !e.status || e.status === 'published');
                } catch {
                    return [];
                }
            });

            const results = await Promise.all(eventsPromises);
            const merged = results
                .flat()
                .sort((a, b) => eventDate(a) - eventDate(b)); // soonest first
            setAllEvents(merged);
        } catch (err) {
            console.error('Error fetching events:', err);
        } finally {
            setLoading(false);
        }
    };

    // ── Derived filtered events ────────────────────────────────────────────

    const filteredEvents = useMemo(() => {
        return allEvents.filter(event => {
            if (filterClub !== 'all' && event.clubId !== filterClub) return false;
            if (filterPaid === 'free' && isPaid(event)) return false;
            if (filterPaid === 'paid' && !isPaid(event)) return false;
            if (search.trim()) {
                const q = search.toLowerCase();
                if (
                    !event.title?.toLowerCase().includes(q) &&
                    !event.clubName?.toLowerCase().includes(q) &&
                    !event.description?.toLowerCase().includes(q) &&
                    !event.location?.toLowerCase().includes(q)
                ) return false;
            }
            return true;
        });
    }, [allEvents, filterClub, filterPaid, search]);

    // ── Navigation ─────────────────────────────────────────────────────────

    const navigate = (dir) => {
        if (view === 'month') {
            setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + dir, 1));
        } else if (view === 'week') {
            setCurrentDate(d => addDays(d, dir * 7));
        }
        setSelectedDay(null);
    };

    const goToday = () => {
        setCurrentDate(new Date());
        setSelectedDay(null);
    };

    // Period label
    const periodLabel = useMemo(() => {
        if (view === 'month') {
            return `${MONTHS_FR[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        }
        if (view === 'week') {
            const ws = startOfWeek(currentDate);
            const we = addDays(ws, 6);
            return `${ws.getDate()} ${MONTHS_FR[ws.getMonth()].slice(0, 3)} – ${we.getDate()} ${MONTHS_FR[we.getMonth()].slice(0, 3)} ${we.getFullYear()}`;
        }
        return '';
    }, [view, currentDate]);

    const clearFilters = () => {
        setFilterClub('all');
        setFilterType('all');
        setFilterPaid('all');
        setSearch('');
    };

    const hasFilters = filterClub !== 'all' || filterPaid !== 'all' || !!search.trim();

    // ── Split events for list view: upcoming + past ───────────────────────
    const now = new Date();
    const upcomingEvents = filteredEvents.filter(e => eventDate(e) >= now).sort((a, b) => eventDate(a) - eventDate(b));
    const pastEvents = filteredEvents.filter(e => eventDate(e) < now).sort((a, b) => eventDate(b) - eventDate(a));

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <main className="min-h-screen bg-gradient-to-b from-muted to-card">
            {/* ── Hero Header ── */}
            <section className="bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white dark:from-blue-950/50 dark:via-indigo-950/30 dark:to-card border-b">
                <div className="container py-8 md:py-12 px-4 md:px-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 md:mb-3">
                                <div className="p-1.5 sm:p-2 bg-primary/10 rounded-xl">
                                    <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                                </div>
                                <span className="text-xs font-bold uppercase text-primary tracking-wider">Calendrier</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold tracking-tight mb-1 md:mb-2">
                                Événements & Activités
                            </h1>
                            <p className="text-muted-foreground text-xs sm:text-sm md:text-base">
                                Tous les événements des clubs ESTT réunis en un seul endroit.
                            </p>
                        </div>

                        {/* Stats — always inline, compact on mobile */}
                        {!loading && (
                            <div className="flex gap-3 sm:gap-4 shrink-0">
                                <div className="text-center">
                                    <div className="text-xl sm:text-2xl font-black text-primary">{upcomingEvents.length}</div>
                                    <div className="text-[10px] sm:text-xs text-muted-foreground font-medium">À venir</div>
                                </div>
                                <div className="w-px bg-muted" />
                                <div className="text-center">
                                    <div className="text-xl sm:text-2xl font-black text-foreground">{clubs.length}</div>
                                    <div className="text-[10px] sm:text-xs text-muted-foreground font-medium">Clubs</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── Main Content ── */}
            <section className="container py-8 px-4 md:px-6">
                {/* ── Controls bar ── */}
                <div className="flex flex-col gap-3 mb-6">
                    {/* Top row: Search + View toggle */}
                    <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher un événement..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9 h-9 bg-card w-full"
                            />
                        </div>

                        {/* View toggle */}
                        <div className="flex items-center gap-0.5 p-1 bg-muted rounded-xl shrink-0">
                            {[
                                { id: 'list', icon: LayoutList, label: 'Liste' },
                                { id: 'month', icon: CalendarDays, label: 'Mois' },
                                { id: 'week', icon: CalendarRange, label: 'Sem.' },
                            ].map(({ id, icon: Icon, label }) => (
                                <button
                                    key={id}
                                    onClick={() => { setView(id); setSelectedDay(null); }}
                                    className={cn(
                                        'flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all',
                                        view === id
                                            ? 'bg-card text-primary shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    <span className="hidden xs:inline sm:inline">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Filters: 2-col grid on mobile, flex-wrap on larger screens */}
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 items-center">
                        {/* Club filter */}
                        <Select value={filterClub} onValueChange={setFilterClub}>
                            <SelectTrigger className="h-8 text-xs bg-card w-full sm:w-auto sm:min-w-[140px]">
                                <SelectValue placeholder="Club" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les clubs</SelectItem>
                                {clubs.map(club => (
                                    <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Free/Paid filter */}
                        <Select value={filterPaid} onValueChange={setFilterPaid}>
                            <SelectTrigger className="h-8 text-xs bg-card w-full sm:w-auto sm:min-w-[130px]">
                                <SelectValue placeholder="Tarif" />
                            </SelectTrigger>
                            <SelectContent>
                                {FREE_PAID.map(t => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Reset + count — spans full width on mobile */}
                        <div className="col-span-2 sm:col-span-1 flex items-center gap-2">
                            {hasFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="h-8 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                    <X className="w-3 h-3" />
                                    Réinitialiser
                                </Button>
                            )}
                            {!loading && (
                                <span className="ml-auto text-xs text-muted-foreground">
                                    {filteredEvents.length} év.
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Calendar navigation (month/week only) */}
                    {(view === 'month' || view === 'week') && (
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0 shrink-0">
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-xs sm:text-sm font-bold text-foreground flex-1 text-center truncate">{periodLabel}</span>
                            <Button variant="outline" size="sm" onClick={() => navigate(1)} className="h-8 w-8 p-0 shrink-0">
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={goToday} className="h-8 text-xs shrink-0">
                                Auj.
                            </Button>
                        </div>
                    )}
                </div>

                {/* ── Loading ── */}
                {loading && (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}

                {/* ── Content by view ── */}
                {!loading && (
                    <>
                        {/* LIST VIEW */}
                        {view === 'list' && (
                            <div className="space-y-8">
                                {/* Upcoming */}
                                <div>
                                    <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-primary" />
                                        À venir
                                        <Badge variant="secondary" className="text-xs">{upcomingEvents.length}</Badge>
                                    </h2>
                                    {upcomingEvents.length === 0 ? (
                                        <div className="text-center py-12 border border-dashed border-border rounded-2xl">
                                            <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                                            <p className="text-muted-foreground text-sm">Aucun événement à venir</p>
                                            {hasFilters && (
                                                <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                                                    Effacer les filtres
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {upcomingEvents.map(event => (
                                                <EventCard key={event.id + event.clubId} event={event} />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Past events */}
                                {pastEvents.length > 0 && (
                                    <div>
                                        <h2 className="text-lg font-bold text-muted-foreground mb-4 flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            Passés
                                            <Badge variant="outline" className="text-xs text-muted-foreground">{pastEvents.length}</Badge>
                                        </h2>
                                        <div className="space-y-3">
                                            {pastEvents.slice(0, 10).map(event => (
                                                <EventCard key={event.id + event.clubId} event={event} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* MONTH VIEW */}
                        {view === 'month' && (
                            <div className="space-y-4">
                                <MonthView
                                    events={filteredEvents}
                                    currentDate={currentDate}
                                    selectedDay={selectedDay}
                                    onSelectDay={day => setSelectedDay(prev => prev && isSameDay(prev, day) ? null : day)}
                                />
                                {selectedDay && (
                                    <DayPanel
                                        day={selectedDay}
                                        events={filteredEvents}
                                        onClose={() => setSelectedDay(null)}
                                    />
                                )}
                                {/* Legend */}
                                {clubs.length > 0 && (
                                    <div className="flex flex-wrap gap-3 pt-2">
                                        {clubs.slice(0, 8).map(club => (
                                            <div key={club.id} className="flex items-center gap-1.5">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full"
                                                    style={{ backgroundColor: club.themeColor || '#64748b' }}
                                                />
                                                <span className="text-xs text-muted-foreground">{club.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* WEEK VIEW */}
                        {view === 'week' && (
                            <div className="space-y-4">
                                <WeekView
                                    events={filteredEvents}
                                    currentDate={currentDate}
                                    selectedDay={selectedDay}
                                    onSelectDay={day => setSelectedDay(prev => prev && isSameDay(prev, day) ? null : day)}
                                />
                                {/* Legend */}
                                {clubs.length > 0 && (
                                    <div className="flex flex-wrap gap-3 pt-2">
                                        {clubs.slice(0, 8).map(club => (
                                            <div key={club.id} className="flex items-center gap-1.5">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full"
                                                    style={{ backgroundColor: club.themeColor || '#64748b' }}
                                                />
                                                <span className="text-xs text-muted-foreground">{club.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Empty week message */}
                                {filteredEvents.filter(e => {
                                    const ws = startOfWeek(currentDate);
                                    const we = addDays(ws, 6);
                                    const d = eventDate(e);
                                    return d >= ws && d <= we;
                                }).length === 0 && (
                                        <div className="text-center py-8 border border-dashed border-border rounded-2xl">
                                            <p className="text-muted-foreground text-sm">Aucun événement cette semaine</p>
                                        </div>
                                    )}
                            </div>
                        )}
                    </>
                )}
            </section>
        </main>
    );
}
