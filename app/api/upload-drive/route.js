import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { getAdminDb, requireAuthenticatedUser } from '@/lib/firebase-admin';

export const maxDuration = 60;

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_DRIVE_REDIRECT_URI;

const CACHE_PATH = 'adminSettings/driveFolders';

async function getCachedFolderId(cacheKey) {
    try {
        const snap = await getAdminDb().ref(`${CACHE_PATH}/${cacheKey}`).once('value');
        if (snap.exists()) return snap.val();
    } catch (e) {}
    return null;
}

async function setCachedFolderId(cacheKey, folderId) {
    try {
        await getAdminDb().ref(`${CACHE_PATH}/${cacheKey}`).set(folderId);
    } catch (e) {}
}

async function findOrCreateFolder(drive, name, parentId, cacheKey) {
    const fullCacheKey = cacheKey || `${parentId || 'root'}/${name}`;
    const cached = await getCachedFolderId(fullCacheKey);
    if (cached) return cached;

    const q = `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false${parentId ? ` and '${parentId}' in parents` : ''}`;

    const response = await drive.files.list({
        q,
        fields: 'files(id, name)',
        spaces: 'drive',
    });

    if (response.data.files && response.data.files.length > 0) {
        const id = response.data.files[0].id;
        await setCachedFolderId(fullCacheKey, id);
        return id;
    }

    const fileMetadata = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : [],
    };

    const folder = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id',
    });

    const id = folder.data.id;
    await setCachedFolderId(fullCacheKey, id);
    return id;
}

export async function POST(req) {
    try {
        await requireAuthenticatedUser(req);
        const formData = await req.formData();
        const file = formData.get('file');

        const fieldName = formData.get('fieldName');
        const semester = formData.get('semester');
        const moduleName = formData.get('moduleName');
        const professorName = formData.get('professorName');
        const isBugReport = formData.get('isBugReport') === 'true';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        let refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

        if (!refreshToken) {
            const configSnap = await getAdminDb().ref('adminSettings/driveConfig').once('value');
            if (configSnap.exists()) {
                refreshToken = configSnap.val().refreshToken;
            }
        }

        if (!refreshToken) {
            return NextResponse.json({
                error: 'Drive non configuré.',
                details: 'L\'administrateur doit visiter /api/drive/auth pour lier son compte.'
            }, { status: 500 });
        }

        const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
        oauth2Client.setCredentials({ refresh_token: refreshToken });

        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        let targetFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

        if (isBugReport) {
            try {
                targetFolderId = await findOrCreateFolder(drive, 'Bug Reports', targetFolderId, `bug-reports`);
            } catch (folderErr) {
                console.warn('Bug Reports folder creation error:', folderErr);
            }
        } else if (fieldName && semester && moduleName) {
            try {
                const profFolder = (!professorName || professorName === 'non-specifie') ? 'Autres' : professorName;

                const fieldFolderId = await findOrCreateFolder(drive, fieldName, targetFolderId, `field/${fieldName}`);
                const semesterFolderId = await findOrCreateFolder(drive, semester, fieldFolderId, `field/${fieldName}/${semester}`);
                const moduleFolderId = await findOrCreateFolder(drive, moduleName, semesterFolderId, `field/${fieldName}/${semester}/${moduleName}`);
                targetFolderId = await findOrCreateFolder(drive, profFolder, moduleFolderId, `field/${fieldName}/${semester}/${moduleName}/${profFolder}`);
            } catch (folderErr) {
                console.warn('Folder creation error, falling back to root:', folderErr);
            }
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const stream = require('stream');
        const bufferStream = new stream.PassThrough();
        bufferStream.end(buffer);

        const originalName = file.name;
        const extension = originalName.includes('.') ? originalName.split('.').pop() : '';
        const displayName = formData.get('displayTitle');
        const finalFileName = displayName ? `${displayName}.${extension}` : originalName;

        const fileMetadata = {
            name: finalFileName,
            parents: targetFolderId ? [targetFolderId] : [],
        };

        const media = {
            mimeType: file.type,
            body: bufferStream,
        };

        const driveResponse = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink, webContentLink',
        });

        const uploadedFile = driveResponse.data;

        try {
            await drive.permissions.create({
                fileId: uploadedFile.id,
                requestBody: { role: 'reader', type: 'anyone' },
            });
        } catch (pErr) { console.warn('Permission error:', pErr); }

        return NextResponse.json({
            success: true,
            id: uploadedFile.id,
            name: uploadedFile.name,
            publicUrl: uploadedFile.webViewLink,
            downloadUrl: uploadedFile.webContentLink,
        });

    } catch (error) {
        console.error('Drive Upload Error:', error);
        return NextResponse.json({
            error: 'Upload failed',
            details: error.message
        }, { status: 500 });
    }
}
