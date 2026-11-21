/**
 * Utility functions for user activity tracking and analytics.
 */

/**
 * Sanitizes a URL pathname for use as a Firebase Realtime Database key.
 * Firebase keys cannot contain: . $ # [ ] /
 *
 * @param {string} path - The URL pathname (e.g. '/resources/s1')
 * @returns {string} Safe database key
 */
export function pathToKey(path) {
    if (!path || path === '/' || path === '') return 'root';
    return path
        .replace(/^\/+/, '')
        .replace(/[\/\.#$\[\]]/g, '__');
}

/**
 * Recovers a URL pathname from a sanitized Firebase key.
 *
 * @param {string} key - Sanitized database key
 * @returns {string} Approximate pathname
 */
export function keyToPath(key) {
    if (!key || key === 'root') return '/';
    return '/' + key.replace(/__/g, '/');
}

/**
 * Formats a duration in seconds into a clean human-readable string.
 * Examples: '45s', '3m 12s', '2h 45m', '34h 10m'
 *
 * @param {number} totalSeconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export function formatDuration(totalSeconds) {
    const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    if (sec === 0) return '0s';

    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const remainingSeconds = sec % 60;

    if (hours > 0) {
        if (minutes === 0) return `${hours}h`;
        return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
        if (remainingSeconds === 0) return `${minutes}m`;
        return `${minutes}m ${remainingSeconds}s`;
    }

    return `${remainingSeconds}s`;
}

/**
 * Formats a duration in seconds with full hour, minute, and second precision.
 * Example: '1h 24m 35s'
 *
 * @param {number} totalSeconds - Duration in seconds
 * @returns {string} Formatted detailed duration
 */
export function formatDurationDetailed(totalSeconds) {
    const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const remainingSeconds = sec % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
    parts.push(`${remainingSeconds}s`);

    return parts.join(' ');
}

/**
 * Formats a timestamp into a relative or friendly localized string.
 *
 * @param {number|string|Date} timestamp
 * @returns {string}
 */
export function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Inconnue';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Inconnue';

    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) return "À l'instant";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Il y a ${diffDays} j`;

    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Exports activity data into a downloadable CSV file.
 *
 * @param {Array} usersActivity - Array of user activity objects
 * @param {Array} pagesActivity - Array of page activity objects
 */
export function exportActivityReportCSV(usersActivity = [], pagesActivity = []) {
    const lines = [];

    // Header section: Users
    lines.push('--- ACTIVITE UTILISATEURS ---');
    lines.push(['ID Utilisateur', 'Nom', 'Email', 'Filiere', 'Temps Total (s)', 'Temps Formate', 'Pages Vues', 'Page n°1', 'Temps Page n°1', 'Derniere Activite'].map(v => `"${v}"`).join(','));
    usersActivity.forEach(u => {
        lines.push([
            u.id || '',
            u.displayName || '',
            u.email || '',
            u.filiere || '',
            u.totalTime || 0,
            formatDurationDetailed(u.totalTime || 0),
            u.pageViews || 0,
            u.topPage || '-',
            formatDuration(u.topPageTime || 0),
            u.lastActive ? new Date(u.lastActive).toISOString() : ''
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    });

    lines.push('');
    // Header section: Pages (excluding /admin)
    lines.push('--- ACTIVITE PAGES ---');
    lines.push(['Chemin (Path)', 'Temps Total (s)', 'Temps Formate', 'Visites Totales', 'Temps Moyen / Visite (s)', 'Derniere Visite'].map(v => `"${v}"`).join(','));
    pagesActivity
        .filter(p => !p.path || !p.path.startsWith('/admin'))
        .forEach(p => {
            const avg = p.visits > 0 ? Math.round((p.totalTime || 0) / p.visits) : 0;
            lines.push([
                p.path || '',
                p.totalTime || 0,
                formatDurationDetailed(p.totalTime || 0),
                p.visits || 0,
                avg,
                p.lastActive ? new Date(p.lastActive).toISOString() : ''
            ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
        });

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `estt-activity-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
