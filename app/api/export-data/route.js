import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminDb, requireAuthenticatedUser } from '@/lib/firebase-admin';

export async function POST(req) {
    try {
        const user = await requireAuthenticatedUser(req);
        const profile = await getAdminDb().ref(`users/${user.uid}`).once('value');
        const profileData = profile.exists() ? profile.val() : {};
        const uid = user.uid;
        const firstName = profileData.firstName || 'Utilisateur';
        const email = user.email || profileData.email || '';
        const username = email.split('@')[0] || uid;

        if (!email) {
            return NextResponse.json({ error: 'Adresse email introuvable.' }, { status: 400 });
        }

        // ── 1. Generate a cryptographically secure one-time token ─────────
        const token     = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

        // ── 2. Persist token in Firebase ──────────────────────────────────
        await getAdminDb().ref(`dataExports/${token}`).set({
            uid,
            email,
            firstName: firstName || 'Utilisateur',
            username:  username  || uid,
            createdAt: Date.now(),
            expiresAt,
            used: false,
        });

        // ── 3. Build download URL ─────────────────────────────────────────
        const baseUrl     = process.env.NEXT_PUBLIC_SITE_URL || 'https://estt.ma';
        const downloadUrl = `${baseUrl}/download-export/${token}`;

        return NextResponse.json({ success: true, downloadUrl });

    } catch (error) {
        console.error('[export-data] Error:', error);
        return NextResponse.json(
            { error: 'Export failed', details: error.message },
            { status: 500 }
        );
    }
}

