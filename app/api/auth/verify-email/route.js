
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyEmailTemplate } from '@/lib/email-templates';

export async function POST(req) {
    try {
        const { action, uid, email, firstName, code: userCode } = await req.json();

        if (!uid || !email) {
            return NextResponse.json({ error: 'Missing uid or email' }, { status: 400 });
        }

        if (action === 'send') {
            // 1. Generate 6-digit code
            const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

            // 2. Save to RTDB
            await getAdminDb().ref(`emailVerifications/${uid}`).set({
                code: generatedCode,
                expiresAt,
                email
            });

            // 3. Send email
            const html = verifyEmailTemplate(firstName || 'Étudiant', generatedCode);
            
            // We can call our own API or use nodemailer. Calling our API is easier to keep logic separated.
            const emailRes = await fetch(`${new URL(req.url).origin}/api/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: email,
                    subject: 'Vérifiez votre adresse email - ESTT Community',
                    html
                })
            });

            const emailData = await emailRes.json();
            if (!emailData.success) {
                throw new Error(emailData.error || 'Failed to send email');
            }

            return NextResponse.json({ success: true, message: 'Code envoyé' });
        } 
        
        if (action === 'verify') {
            if (!userCode) {
                return NextResponse.json({ error: 'Code manquant' }, { status: 400 });
            }

            // 1. Get code from RTDB
            const verificationRef = getAdminDb().ref(`emailVerifications/${uid}`);
            const snapshot = await verificationRef.once('value');

            if (!snapshot.exists()) {
                return NextResponse.json({ error: 'Aucun code en cours. Veuillez en demander un nouveau.' }, { status: 400 });
            }

            const data = snapshot.val();

            // 2. Check expiry
            if (Date.now() > data.expiresAt) {
                await verificationRef.remove();
                return NextResponse.json({ error: 'Code expiré. Veuillez en demander un nouveau.' }, { status: 400 });
            }

            // 3. Check code
            if (data.code !== userCode) {
                return NextResponse.json({ error: 'Code incorrect' }, { status: 400 });
            }

            // 4. Success! Update user profile
            await getAdminDb().ref(`users/${uid}`).update({
                verifiedEmail: true,
                verifiedAt: Date.now()
            });

            // 5. Cleanup
            await verificationRef.remove();

            return NextResponse.json({ success: true, message: 'Email vérifié avec succès' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Verify Email API Error:', error);
        return NextResponse.json({ error: 'Une erreur est survenue lors de la vérification' }, { status: 500 });
    }
}
