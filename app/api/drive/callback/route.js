import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

// HARDCODED CREDENTIALS FOR TESTING (as requested)
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_DRIVE_REDIRECT_URI;

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            CLIENT_ID,
            CLIENT_SECRET,
            REDIRECT_URI
        );

        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.refresh_token) {
            return NextResponse.json({
                error: 'No refresh token returned. Re-authorize at /api/drive/auth',
            }, { status: 400 });
        }

        // AUTOMATED: Save to Firebase so the app "just works" immediately
        await getAdminDb().ref('adminSettings/driveConfig').set({
            refreshToken: tokens.refresh_token,
            lastConfigured: Date.now(),
            configuredBy: 'auto-setup'
        });

        return new NextResponse(`
            <html>
                <body style="font-family: sans-serif; text-align: center; padding-top: 100px; background: #f9fafb;">
                    <div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                        <h1 style="color: #10b981; margin-bottom: 20px;">✓ Configuration Réussie !</h1>
                        <p style="color: #4b5563; line-height: 1.5;">Le stockage Google Drive a été configuré automatiquement dans votre base de données.</p>
                        <p style="color: #4b5563; margin-bottom: 30px;">Vous pouvez maintenant fermer cette fenêtre et commencer à uploader des fichiers.</p>
                        <button onclick="window.close()" style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; cursor: pointer;">
                            Fermer
                        </button>
                    </div>
                </body>
            </html>
        `, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });

    } catch (error) {
        console.error('OAuth Callback Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
