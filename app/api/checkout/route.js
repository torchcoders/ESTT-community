
import { NextResponse } from 'next/server';
import { createCheckout } from '@/lib/lemonsqueezy';

export async function POST(req) {
    try {
        const body = await req.json();
        const { type = 'ticket', price, userEmail } = body;

        let productName, successUrl, cancelUrl, customData;

        if (type === 'ad') {
            const { adId, adTitle } = body;
            if (!adId || !price || !adTitle) {
                return NextResponse.json({ error: 'Missing ad details' }, { status: 400 });
            }
            productName = `Publicité ESTT: ${adTitle}`;
            successUrl = `${req.nextUrl.origin}/ads-portal/dashboard?success=true`;
            cancelUrl = `${req.nextUrl.origin}/ads-portal/dashboard?canceled=true`;
            customData = { adId };
        } else {
            // Default to Ticket
            const { ticketId, clubId, clubSlug, eventId, eventName } = body;
            if (!ticketId || !price || !eventName) {
                return NextResponse.json({ error: 'Missing ticket details' }, { status: 400 });
            }
            productName = `Billet: ${eventName}`;
            successUrl = `${req.nextUrl.origin}/tickets/${ticketId}?order_id=[order_id]&success=true`;
            cancelUrl = `${req.nextUrl.origin}/clubs/${clubSlug || clubId}/events/${eventId}/registration?canceled=true`;
            customData = { ticketId, clubId, eventId };
        }

        const checkout = await createCheckout({
            type,
            price,
            productName,
            successUrl,
            cancelUrl,
            userEmail,
            customData,
        });

        return NextResponse.json({ url: checkout.url });
    } catch (error) {
        console.error('LemonSqueezy Checkout Error:', error);
        return NextResponse.json(
            { error: 'Failed to create checkout session', details: error.message },
            { status: 500 }
        );
    }
}
