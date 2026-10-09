import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

let adminApp;

function getAdminApp() {
    if (adminApp) return adminApp;
    if (getApps().length) {
        adminApp = getApp();
        return adminApp;
    }

    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
        throw new Error('Firebase Admin credentials are not configured on the server.');
    }

    adminApp = initializeApp({
        credential: cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey,
        }),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });

    return adminApp;
}

export function getAdminAuth() {
    return getAuth(getAdminApp());
}

export function getAdminDb() {
    return getDatabase(getAdminApp());
}

export async function getAdminClubBySlug(slug) {
    if (!slug) return null;

    const database = getAdminDb();
    const directSnapshot = await database.ref(`clubs/${slug}`).once('value');
    if (directSnapshot.exists()) {
        return { id: slug, ...directSnapshot.val() };
    }

    const usernameSnapshot = await database.ref('clubs')
        .orderByChild('username')
        .equalTo(slug.toLowerCase())
        .once('value');
    const clubs = usernameSnapshot.val();
    if (!clubs) return null;

    const [id, club] = Object.entries(clubs)[0];
    return { id, ...club };
}

export async function requireAuthenticatedUser(req) {
    const authorization = req.headers.get('authorization');
    const token = authorization?.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : null;

    if (!token) {
        throw new Error('Authentication required.');
    }

    const decodedToken = await getAdminAuth().verifyIdToken(token);
    return decodedToken;
}