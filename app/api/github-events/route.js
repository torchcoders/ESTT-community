import { NextResponse } from 'next/server';
import { getDatabase, ref, set, serverTimestamp } from 'firebase/database';
import { initializeApp, getApps, getApp } from 'firebase/app';
import crypto from 'crypto';
import { firebaseConfig } from '@/lib/firebase-config';

// Initialize Firebase
let db;
try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getDatabase(app);
} catch (error) {
    console.error('Failed to initialize Firebase:', error);
}

// GitHub webhook secret from environment variables
const GITHUB_WEBHOOK_SECRET =  'ak04pzxzikfdr6I0L6z3zx9VKLm1';

// Function to verify GitHub webhook signature
function verifyGitHubSignature(req, secret) {
    const signature = req.headers.get('x-hub-signature-256');
    
    if (!signature) {
        return false;
    }

    // The signature format is: sha256=<hex_digest>
    const [algorithm, hash] = signature.split('=');
    
    if (algorithm !== 'sha256') {
        return false;
    }

    return true; // Signature header exists and uses correct algorithm
}

// Async function to verify signature with body
async function verifyWebhookSignature(req, secret) {
    const signature = req.headers.get('x-hub-signature-256');
    
    if (!signature) {
        console.warn('Missing signature header');
        return false;
    }

    const [algorithm, providedHash] = signature.split('=');
    
    if (algorithm !== 'sha256') {
        console.warn('Invalid signature algorithm');
        return false;
    }

    // Clone the request to get the body
    const body = await req.text();
    
    // Compute the expected signature
    const computedHash = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

    // Compare signatures
    const isValid = computedHash === providedHash;
    
    if (!isValid) {
        console.warn('Signature mismatch - webhook verification failed');
    }

    return isValid;
}

export async function OPTIONS(req) {
    return NextResponse.json(
        { message: 'OK' },
        {
            status: 200,
            headers: {
                'Allow': 'GET, POST, OPTIONS',
                'Content-Type': 'application/json',
            },
        }
    );
}

export async function POST(req) {
    try {
        // Verify GitHub webhook signature
        const isValidSignature = await verifyWebhookSignature(req, GITHUB_WEBHOOK_SECRET);
        
        if (!isValidSignature) {
            console.warn('Webhook signature verification failed');
            return NextResponse.json(
                { error: 'Unauthorized - Invalid signature' },
                { status: 401 }
            );
        }

        // Now get the body again for processing
        const payload = await req.json();

        // Verify it's a release event
        if (payload && payload.action && (payload.action === 'published' || payload.action === 'released') && payload.release) {
            const release = payload.release;

            // Extract relevant release information
            const releaseData = {
                tagName: release.tag_name,
                name: release.name || release.tag_name,
                body: release.body || '',
                url: release.html_url,
                createdAt: release.created_at,
                publishedAt: release.published_at,
                author: release.author?.login || 'Unknown',
                prerelease: release.prerelease,
                draft: release.draft,
                savedAt: serverTimestamp(),
            };

            // Save to Firebase Realtime Database
            // Store the latest release and also keep a history
            try {
                // Save as latest release
                await set(ref(db, 'releases/latest'), releaseData);

                // Also save to history with timestamp as key
                const timestamp = new Date().getTime();
                await set(ref(db, `releases/history/${timestamp}`), releaseData);

                console.log(`Release saved: ${release.tag_name}`);

                return NextResponse.json(
                    { success: true, message: 'Release data saved successfully', tagName: release.tag_name },
                    { status: 200 }
                );
            } catch (dbError) {
                console.error('Firebase error:', dbError);
                return NextResponse.json(
                    { error: 'Failed to save to database', details: dbError.message },
                    { status: 500 }
                );
            }
        } else {
            // Not a release event we care about
            return NextResponse.json(
                { success: true, message: 'Event ignored - not a release publication event' },
                { status: 200 }
            );
        }
    } catch (error) {
        console.error('Error processing GitHub webhook:', error);
        return NextResponse.json(
            { error: 'Failed to process webhook', details: error.message },
            { status: 500 }
        );
    }
}

// Add a GET endpoint for testing
export async function GET(req) {
    return NextResponse.json(
        { message: 'GitHub Events webhook endpoint. Send POST requests from GitHub.' },
        { status: 200 }
    );
}
 