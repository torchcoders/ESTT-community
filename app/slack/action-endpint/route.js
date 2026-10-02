import { NextResponse } from 'next/server';
import { getDatabase, ref, push, set, serverTimestamp, update, get } from 'firebase/database';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/lib/firebase-config';

// Initialize Firebase
let db;
try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getDatabase(app);
} catch (error) {
    console.error('Failed to initialize Firebase:', error);
}

export async function POST(req) {
    try {
        const contentType = req.headers.get('content-type') || '';
        console.log('Incoming Slack Request Content-Type:', contentType);
        
        let body;

        // 1. Handle Slack Interactive Payloads (Form Data)
        if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await req.formData();
            const payloadStr = formData.get('payload');
            console.log('Slack Payload String Found:', !!payloadStr);
            if (payloadStr) {
                body = JSON.parse(payloadStr);
            }
        } else {
            // Regular JSON (Events API)
            body = await req.json();
        }

        if (!body) {
            console.error('No body parsed from Slack request');
            return NextResponse.json({ error: 'No body' }, { status: 400 });
        }

        console.log('Slack Request Type:', body.type);

        // 2. Handle Slack URL verification challenge
        if (body.type === 'url_verification') {
            console.log('Slack URL verification challenge received');
            return new NextResponse(body.challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
        }

        // 3. Handle Interactive Button Actions
        if (body.type === 'block_actions') {
            const action = body.actions[0];
            const resourceId = action.value;
            const actionId = action.action_id;
            const slackUser = body.user.name;

            console.log(`Slack Action: ${actionId} for resource ${resourceId} by ${slackUser}`);

            if (actionId === 'approve_resource' || actionId === 'reject_resource') {
                try {
                    const isApproved = actionId === 'approve_resource';
                    
                    // Update resource status in Firebase
                    const resourceRef = ref(db, `resources/${resourceId}`);
                    
                    // First get the resource to find the authorId (for syncing author's contribution state)
                    const snapshot = await get(ref(db, `resources/${resourceId}`));
                    let authorId = null;
                    if (snapshot.exists()) {
                        authorId = snapshot.val().authorId;
                    }

                    const updateData = {
                        unverified: !isApproved,
                        status: isApproved ? 'approved' : 'rejected',
                        moderatedBy: slackUser,
                        moderatedAt: serverTimestamp()
                    };

                    await update(resourceRef, updateData);

                    // Sync with user's contribution list if author exists
                    if (authorId) {
                        await update(ref(db, `users/${authorId}/contributions/${resourceId}`), {
                            unverified: !isApproved,
                            status: isApproved ? 'approved' : 'rejected'
                        });
                    }

                    // Respond to Slack to update the message
                    const originalMessage = body.message;
                    const updatedBlocks = originalMessage.blocks.map(block => {
                        if (block.type === 'actions') {
                            return {
                                type: "section",
                                text: {
                                    type: "mrkdwn",
                                    text: isApproved 
                                        ? `*Statut:* Accès autorisé ✅ (Approuvé par ${slackUser})` 
                                        : `*Statut:* Rejeté ❌ (par ${slackUser})`
                                }
                            };
                        }
                        return block;
                    });

                    return NextResponse.json({
                        replace_original: true,
                        blocks: updatedBlocks,
                        text: `Ressource ${resourceId} : ${isApproved ? 'Approuvée' : 'Rejetée'} par ${slackUser}`
                    });

                } catch (dbError) {
                    console.error('Firebase update error:', dbError);
                    return NextResponse.json({ text: `Erreur lors de la mise à jour de ${resourceId} : ${dbError.message}` });
                }
            }
        }

        // 4. Handle Message commands (e.g. "hide test-ID")
        if (body.type === 'event_callback' && body.event?.type === 'message' && !body.event.bot_id) {
            const text = body.event.text || '';
            const slackUser = body.event.user;
            
            // Simple regex to match "hide [ID]" or "approver [ID]"
            // Using "approver" as requested by the user's plan prompt
            const hideMatch = text.match(/^hide\s+([a-zA-Z0-9_-]+)/i);
            const approveMatch = text.match(/^approver\s+([a-zA-Z0-9_-]+)/i);

            if (hideMatch || approveMatch) {
                const isApproved = !!approveMatch;
                const resourceId = isApproved ? approveMatch[1] : hideMatch[1];
                
                console.log(`Slack Message Command: ${isApproved ? 'Approve' : 'Hide'} resource ${resourceId} by ${slackUser}`);

                try {
                    const resourceRef = ref(db, `resources/${resourceId}`);
                    const snapshot = await get(resourceRef);

                    if (!snapshot.exists()) {
                        console.error(`Resource ${resourceId} not found for moderation message`);
                        // We don't have a response_url here to easily reply if not a slash command, 
                        // but we can log it.
                    } else {
                        const authorId = snapshot.val().authorId;
                        const updateData = {
                            unverified: !isApproved,
                            status: isApproved ? 'approved' : 'rejected',
                            moderatedBy: slackUser,
                            moderatedAt: serverTimestamp()
                        };

                        await update(resourceRef, updateData);

                        if (authorId) {
                            await update(ref(db, `users/${authorId}/contributions/${resourceId}`), {
                                unverified: !isApproved,
                                status: isApproved ? 'approved' : 'rejected'
                            });
                        }
                        console.log(`Successfully ${isApproved ? 'approved' : 'hidden'} resource ${resourceId}`);
                    }
                } catch (dbError) {
                    console.error('Firebase update error from message command:', dbError);
                }
            }
        }

        // 5. Handle regular Events (for logging/audit)
        console.log('Slack event received:', body);

        // Store the event in Firebase for audit/debug
        try {
            const eventRef = ref(db, 'slack_events');
            const newEventRef = push(eventRef);
            await set(newEventRef, {
                ...body,
                receivedAt: serverTimestamp(),
            });

            return NextResponse.json({ success: true }, { status: 200 });
        } catch (dbError) {
            console.error('Firebase error saving Slack event:', dbError);
            return NextResponse.json({ success: false, error: 'Database error' }, { status: 200 });
        }

    } catch (error) {
        console.error('Error processing Slack event:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ message: 'Slack action-endpint (receiver) is active.' }, { status: 200 });
}
