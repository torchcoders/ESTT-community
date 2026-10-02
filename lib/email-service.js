import nodemailer from 'nodemailer';

/**
 * Parses target recipient email(s) into an array of Brevo recipient objects.
 * Input can be string "a@b.com", "a@b.com, c@d.com", or array ["a@b.com"].
 */
function parseRecipients(to) {
    let emails = [];
    if (Array.isArray(to)) {
        emails = to;
    } else if (typeof to === 'string') {
        emails = to.split(',').map(e => e.trim()).filter(Boolean);
    }
    return emails.map(email => ({ email }));
}

/**
 * Sends transactional email via Brevo REST API v3
 */
async function sendViaBrevo({ to, subject, html, replyTo, from }) {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
        throw new Error('BREVO_API_KEY environment variable is not defined');
    }

    const defaultFromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@estt.ma';
    const defaultFromName = process.env.BREVO_FROM_NAME || 'ESTT Community';

    let sender = { name: defaultFromName, email: defaultFromEmail };
    if (from && typeof from === 'object' && from.email) {
        sender = { name: from.name || defaultFromName, email: from.email };
    } else if (typeof from === 'string' && from.includes('<')) {
        const match = from.match(/(?:"?([^"]*)"?\s)?<([^>]+)>/);
        if (match) {
            sender = { name: match[1] || defaultFromName, email: match[2] };
        }
    }

    const payload = {
        sender,
        to: parseRecipients(to),
        subject,
        htmlContent: html,
    };

    if (replyTo) {
        if (typeof replyTo === 'string') {
            payload.replyTo = { email: replyTo };
        } else if (typeof replyTo === 'object' && replyTo.email) {
            payload.replyTo = replyTo;
        }
    }

    console.log(`🚀 [EmailService] Requesting Brevo REST API (Sender: ${sender.name} <${sender.email}>)`);

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'api-key': apiKey,
            'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
        const errMsg = responseData.message || responseData.code || response.statusText;
        console.error(`❌ [EmailService] Brevo API Error Response (${response.status}):`, responseData);
        throw new Error(`Brevo API Error (${response.status}): ${errMsg}`);
    }

    console.log(`✅ [EmailService] Brevo Email Delivered Successfully! MessageId: ${responseData.messageId || 'OK'}`);

    return {
        success: true,
        provider: 'brevo',
        messageId: responseData.messageId || responseData.messageIds?.[0],
    };
}

/**
 * Sends transactional email via Legacy Gmail SMTP (Nodemailer)
 */
async function sendViaLegacySmtp({ to, subject, html, replyTo, from }) {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (!user || !pass) {
        throw new Error('SMTP_USER and SMTP_PASSWORD environment variables are required');
    }

    console.log(`🚀 [EmailService] Connecting to Gmail SMTP (User: ${user})...`);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
    });

    const mailOptions = {
        from: from || `"ESTT Community" <${user}>`,
        to,
        subject,
        html,
    };

    if (replyTo) {
        mailOptions.replyTo = replyTo;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [EmailService] Legacy Gmail SMTP Delivered Successfully! MessageId: ${info.messageId}`);

    return {
        success: true,
        provider: 'gmail_legacy',
        messageId: info.messageId,
    };
}

/**
 * Unified email sending function supporting Brevo API and Legacy Gmail SMTP.
 * Controlled by process.env.EMAIL_PROVIDER ("brevo" | "gmail" | "smtp").
 * Supports optional runtime failover if configured.
 */
export async function sendEmail({ to, subject, html, replyTo, from, provider: overrideProvider }) {
    if (!to || !subject || !html) {
        console.error('❌ [EmailService] Missing required parameters:', { to: !!to, subject: !!subject, html: !!html });
        throw new Error('Missing required fields: to, subject, html');
    }

    const provider = (
        overrideProvider ||
        process.env.EMAIL_PROVIDER ||
        (process.env.BREVO_API_KEY ? 'brevo' : 'gmail')
    ).toLowerCase();

    const allowFailover = process.env.EMAIL_FAILOVER_ENABLED !== 'false';

    console.log(`\n📧 [EmailService] Initiating Email Sending:`);
    console.log(`   - To: ${Array.isArray(to) ? to.join(', ') : to}`);
    console.log(`   - Subject: "${subject}"`);
    console.log(`   - Active Provider: ${provider.toUpperCase()}`);
    console.log(`   - Failover Enabled: ${allowFailover}`);

    if (provider === 'brevo') {
        try {
            return await sendViaBrevo({ to, subject, html, replyTo, from });
        } catch (brevoErr) {
            console.error(`❌ [EmailService] Brevo API Failed: ${brevoErr.message}`);
            if (allowFailover) {
                console.warn(`🔄 [EmailService] Failover triggered: Attempting delivery via Legacy Gmail SMTP...`);
                try {
                    return await sendViaLegacySmtp({ to, subject, html, replyTo, from });
                } catch (smtpErr) {
                    console.error(`💥 [EmailService] Legacy Gmail SMTP Failover also FAILED: ${smtpErr.message}`);
                    throw new Error(`Email delivery failed on both Brevo API (${brevoErr.message}) and Gmail SMTP (${smtpErr.message})`);
                }
            }
            throw brevoErr;
        }
    } else {
        // Legacy Gmail SMTP
        try {
            return await sendViaLegacySmtp({ to, subject, html, replyTo, from });
        } catch (smtpErr) {
            console.error(`❌ [EmailService] Legacy Gmail SMTP Failed: ${smtpErr.message}`);
            throw smtpErr;
        }
    }
}
