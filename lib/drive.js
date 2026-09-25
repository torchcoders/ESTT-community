/**
 * Storage Helper - Migrated from Supabase to Google Drive
 * This helper uses the backend /api/upload-drive route
 */

/**
 * Uploads a file to the centralized Google Drive storage via the backend API.
 * @param {File} file - The file object from an input element.
 * @returns {Promise<{publicUrl: string, id: string}>}
 */
export async function uploadResourceFile(file, metadata = {}, onProgress = null, user = null) {
    if (!file) throw new Error('Aucun fichier fourni');
    if (!user) throw new Error('Vous devez être connecté pour envoyer un fichier.');

    const idToken = await user.getIdToken();

    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);

        if (metadata.fieldName) formData.append('fieldName', metadata.fieldName);
        if (metadata.semester) formData.append('semester', metadata.semester);
        if (metadata.moduleName) formData.append('moduleName', metadata.moduleName);
        if (metadata.professorName) formData.append('professorName', metadata.professorName);
        if (metadata.displayTitle) formData.append('displayTitle', metadata.displayTitle);
        if (metadata.isBugReport) formData.append('isBugReport', 'true');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload-drive');
        xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);

        if (onProgress) {
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    onProgress(percentComplete);
                }
            };
        }

        xhr.onload = () => {
            const response = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve({
                    publicUrl: response.publicUrl,
                    id: response.id,
                    raw: response
                });
            } else {
                reject(new Error(response.details || response.error || 'Erreur lors de l’upload sur Google Drive'));
            }
        };

        xhr.onerror = () => reject(new Error('Erreur réseau'));
        xhr.send(formData);
    });
}

/**
 * Compatibility helper for existing code that uses shareFileAndSaveToFirebase
 * (Though most components call uploadResourceFile directly)
 */
export async function shareFileAndSaveToFirebase({ file, title, description }) {
    const uploaded = await uploadResourceFile(file);

    // The actual database saving is usually handled by the component after upload,
    // but we can implement it here if needed to match lib/supabase.js exactly.
    // For now, let's keep it simple as the components handle push() to Firebase.
    return {
        url: uploaded.publicUrl,
        id: uploaded.id,
        ...uploaded
    };
}
