import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb, requireAuthenticatedUser } from '@/lib/firebase-admin';

export async function POST(req) {
    try {
        const user = await requireAuthenticatedUser(req);

        await getAdminAuth().deleteUser(user.uid);
        await getAdminDb().ref(`users/${user.uid}`).remove();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Delete account API]', error);

        if (error.code?.startsWith('auth/')) {
            return NextResponse.json({ error: 'Authentification invalide.' }, { status: 401 });
        }

        return NextResponse.json({ error: 'La suppression du compte a échoué.' }, { status: 500 });
    }
}