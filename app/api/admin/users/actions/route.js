import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb, requireAuthenticatedUser } from '@/lib/firebase-admin';

async function requireAdmin(req) {
    const decodedToken = await requireAuthenticatedUser(req);
    const snapshot = await getAdminDb().ref(`users/${decodedToken.uid}`).once('value');
    const profile = snapshot.val();

    if (!profile || profile.role !== 'admin') {
        const error = new Error('Accès réservé aux administrateurs.');
        error.status = 403;
        throw error;
    }

    return decodedToken;
}

export async function POST(req) {
    try {
        const admin = await requireAdmin(req);
        const { uid, action, reason, durationDays, role } = await req.json().catch(() => ({}));

        if (!uid || !action) {
            return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 });
        }

        if ((action === 'ban' || action === 'delete' || action === 'setRole') && uid === admin.uid) {
            return NextResponse.json(
                { error: 'Vous ne pouvez pas effectuer cette action sur votre propre compte.' },
                { status: 400 }
            );
        }

        const adminAuth = getAdminAuth();
        const adminDb = getAdminDb();

        if (action === 'setRole') {
            if (!['admin', 'moderator', 'student'].includes(role)) {
                return NextResponse.json({ error: 'Rôle invalide.' }, { status: 400 });
            }

            await adminDb.ref(`users/${uid}`).update({ role });
            return NextResponse.json({ success: true });
        }

        if (action === 'ban') {
            const bannedUntil = durationDays ? Date.now() + Number(durationDays) * 24 * 60 * 60 * 1000 : null;

            if (!durationDays) {
                await adminAuth.updateUser(uid, { disabled: true });
            }

            await adminDb.ref(`users/${uid}`).update({
                banned: true,
                banReason: reason || '',
                bannedAt: Date.now(),
                bannedUntil,
                bannedBy: admin.uid,
            });

            return NextResponse.json({ success: true });
        }

        if (action === 'unban') {
            await adminAuth.updateUser(uid, { disabled: false });
            await adminDb.ref(`users/${uid}`).update({
                banned: null,
                banReason: null,
                bannedAt: null,
                bannedUntil: null,
                bannedBy: null,
            });

            return NextResponse.json({ success: true });
        }

        if (action === 'delete') {
            try {
                await adminAuth.deleteUser(uid);
            } catch (error) {
                if (error.code !== 'auth/user-not-found') {
                    throw error;
                }
            }

            await adminDb.ref(`users/${uid}`).remove();
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });
    } catch (error) {
        console.error('[Admin users action API]', error);

        if (error.status) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        if (error.message === 'Authentication required.' || error.code?.startsWith('auth/')) {
            return NextResponse.json({ error: 'Authentification requise ou invalide.' }, { status: 401 });
        }

        return NextResponse.json({ error: 'L’action a échoué.' }, { status: 500 });
    }
}
