import Image from 'next/image';
import Link from 'next/link';
import { getClubPath } from '@/lib/clubUtils';


export default function ClubCard({ club }) {
    const truncateDescription = (text, maxLength = 100) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    };

    return (
        <Link href={getClubPath(club)} className="h-full">
            <div className="group flex flex-col sm:flex-row items-center sm:items-start gap-3 md:gap-4 p-3 md:p-5 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors cursor-pointer h-full text-center sm:text-left">
                <div className="relative w-10 h-10 md:w-14 md:h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border">
                    {club.logo ? (
                        <Image
                            src={club.logo}
                            alt={`${club.name} logo`}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div
                            className="w-full h-full flex items-center justify-center text-lg md:text-xl font-bold"
                            style={{ color: club.themeColor || '#64748b' }}
                        >
                            {club.name?.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center justify-center sm:justify-start gap-1 md:gap-2 mb-1">
                        <h3 className="text-xs md:text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {club.name}
                        </h3>
                        {club.verified && (
                            <div className="group relative flex items-center">
                                <span
                                    className="material-symbols-outlined select-none text-blue-500"
                                    style={{ fontVariationSettings: "'FILL' 1", fontSize: '14px' }}
                                >
                                    verified
                                </span>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                    Club Vérifié
                                </div>
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] md:text-sm text-muted-foreground line-clamp-2 md:line-clamp-3">
                        {truncateDescription(club.description, 80)}
                    </p>
                </div>
            </div>
        </Link>
    );
}
