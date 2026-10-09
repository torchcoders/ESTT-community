// Club utility functions
import { db, ref, get, set, push, update } from './firebase';
import { uploadResourceFile } from './supabase';

/**
 * Upload club image (logo or member photo) to Supabase Storage
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} - The public URL of the uploaded image
 */
export async function uploadClubImage(file) {
    if (!file) {
        throw new Error('No file provided');
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload a JPG, PNG, or WebP image.');
    }

    // Validate file size (max 5MB for images)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        throw new Error('File size exceeds 5MB limit.');
    }

    try {
        console.log('Uploading club image:', {
            name: file.name,
            type: file.type,
            size: file.size
        });

        const result = await uploadResourceFile(file);

        if (!result || !result.publicUrl) {
            throw new Error('Upload succeeded but no public URL was returned');
        }

        console.log('Upload successful:', result.publicUrl);
        return result.publicUrl;
    } catch (error) {
        console.error('Upload error details:', error);

        // Provide more specific error messages
        if (error.message?.includes('exceeded')) {
            throw new Error('Storage quota exceeded. Please contact the administrator.');
        } else if (error.message?.includes('permission')) {
            throw new Error('Permission denied. The storage bucket may not be configured correctly.');
        } else if (error.statusCode === 400) {
            throw new Error('Invalid upload request. Please check the file format and try again.');
        } else if (error.statusCode === 401 || error.statusCode === 403) {
            throw new Error('Authentication error. Please refresh the page and try again.');
        } else {
            throw new Error(`Upload failed: ${error.message || 'Unknown error'}`);
        }
    }
}

/**
 * Check if a user email is in the club's organizational chart
 * @param {string} userEmail - The user's email address
 * @param {Object} club - The club object with organizationalChart
 * @returns {boolean} - True if user is listed in the club's organizational chart
 */
export function isClubAdmin(userEmail, club) {
    if (!userEmail || !club || !club.organizationalChart) return false;

    const normalizedEmail = userEmail.toLowerCase().trim();
    const orgChart = club.organizationalChart;

    // Check all positions in the organizational chart
    for (const position of Object.values(orgChart)) {
        if (position && position.email && position.email.toLowerCase().trim() === normalizedEmail) {
            return true;
        }

    }

    return false;
}

/**
 * Resolve a club route segment to its Firebase record.
 * Existing ID-based URLs remain valid; new URLs can use the club username.
 * @param {string} slug - Club ID or username
 * @returns {Promise<Object|null>} Club data including its Firebase ID
 */
export async function getClubBySlug(slug) {
    if (!db || !slug) return null;

    const directSnap = await get(ref(db, `clubs/${slug}`));
    if (directSnap.exists()) {
        return { id: slug, ...directSnap.val() };
    }

    const clubsSnap = await get(ref(db, 'clubs'));
    if (!clubsSnap.exists()) return null;

    const clubEntry = Object.entries(clubsSnap.val()).find(([, club]) =>
        club?.username?.toLowerCase() === slug.toLowerCase()
    );

    return clubEntry ? { id: clubEntry[0], ...clubEntry[1] } : null;
}

export function getClubPath(club) {
    return `/clubs/${encodeURIComponent(club?.username || club?.id)}`;
}

/**
 * Create a club from an approved request
 * @param {string} requestId - The ID of the club request
 * @returns {Promise<string>} - The ID of the newly created club
 */
export async function createClubFromRequest(requestId) {
    if (!db) throw new Error('Firebase not initialized');

    // Get the request data
    const requestRef = ref(db, `clubRequests/${requestId}`);
    const requestSnap = await get(requestRef);

    if (!requestSnap.exists()) {
        throw new Error('Club request not found');
    }

    const requestData = requestSnap.val();

    // Create the club
    const clubsRef = ref(db, 'clubs');
    const newClubRef = push(clubsRef);

    const clubData = {
        name: requestData.clubName,
        description: requestData.description,
        logo: requestData.logoUrl,
        verified: true, // Auto-verify when created by admin
        createdAt: Date.now(),
        organizationalChart: requestData.organizationalChart,
        members: requestData.members || []
    };

    await set(newClubRef, clubData);

    // Update the request status
    await update(requestRef, {
        status: 'approved',
        approvedAt: Date.now(),
        clubId: newClubRef.key
    });

    // Send Approval Email (Background)
    (async () => {
        try {
            console.log("Starting club approval background email send...");
            const { clubRequestApprovedEmail } = await import('@/lib/email-templates');
            console.log("Email template imported.");

            const html = clubRequestApprovedEmail(requestData.clubName, requestData.logoUrl, newClubRef.key);

            // Send to requestor
            if (requestData.requestedBy) {
                console.log(`Sending approval email to: ${requestData.requestedBy}`);
                const response = await fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: requestData.requestedBy,
                        subject: `Demande approuvée : ${requestData.clubName}`,
                        html: html
                    })
                });
                console.log("Email fetch response status:", response.status);
            } else {
                console.warn("No requestedBy email found in request data.");
            }
        } catch (err) {
            console.error("Failed to send club approval email:", err);
        }
    })();

    return newClubRef.key;
}

/**
 * Validate club request data
 * @param {Object} requestData - The club request data to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateClubRequest(requestData) {
    const errors = [];

    if (!requestData.clubName || requestData.clubName.trim().length < 3) {
        errors.push('Club name must be at least 3 characters long');
    }

    if (!requestData.description || requestData.description.trim().length < 20) {
        errors.push('Description must be at least 20 characters long');
    }

    if (!requestData.logoUrl) {
        errors.push('Club logo is required');
    }

    if (!requestData.organizationalChart || Object.keys(requestData.organizationalChart).length === 0) {
        errors.push('At least one organizational chart position is required');
    }

    // Validate organizational chart positions
    if (requestData.organizationalChart) {
        for (const [position, data] of Object.entries(requestData.organizationalChart)) {
            if (!data.name || !data.email || !data.role) {
                errors.push(`Position "${position}" is missing required fields (name, email, or role)`);
            }

            if (data.email && !data.email.endsWith('@etu.uae.ac.ma')) {
                errors.push(`Email "${data.email}" must be a valid @etu.uae.ac.ma address`);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Format organizational chart data for display
 * @param {Object} orgChartData - The organizational chart data
 * @returns {Array} - Array of positions sorted by hierarchy
 */
export function formatOrgChart(orgChartData) {
    if (!orgChartData) return [];

    // Define hierarchy order
    const hierarchyOrder = [
        'president',
        'vicePresident',
        'secretary',
        'treasurer',
        'technicalLead',
        'communicationLead',
        'eventCoordinator'
    ];

    const positions = [];

    // Add positions in hierarchy order
    for (const key of hierarchyOrder) {
        if (orgChartData[key]) {
            positions.push({
                key,
                ...orgChartData[key]
            });
        }
    }

    // Add any remaining positions not in the hierarchy order
    for (const [key, data] of Object.entries(orgChartData)) {
        if (!hierarchyOrder.includes(key)) {
            positions.push({
                key,
                ...data
            });
        }
    }

    return positions;
}

/**
 * Get user initials from name for avatar fallback
 * @param {string} name - The user's full name
 * @returns {string} - Initials (max 2 characters)
 */
export function getInitials(name) {
    if (!name) return '??';

    const parts = name.trim().split(' ');
    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
