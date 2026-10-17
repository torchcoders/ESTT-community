import { baseLayout } from './layout';
import { emailStyles } from './styles';

export const clubRequestApprovedEmail = (clubName, logoUrl, clubId, clubSlug) => {
    const content = `
        <h1 style="${emailStyles.h1}">Félicitations ! Votre club est approuvé.</h1>
        
        <p style="${emailStyles.paragraph}">
            Bonne nouvelle : l'administration a accepté la création de votre club <strong>${clubName}</strong>. Votre espace est maintenant actif !
        </p>
        
        <div style="${emailStyles.highlightBox}; text-align: center; padding: 28px 24px;">
            ${logoUrl ? `<img src="${logoUrl}" alt="${clubName}" style="${emailStyles.clubLogo}">` : ''}
            <h2 style="${emailStyles.h2}; margin-top: 5px;">${clubName}</h2>
            <span style="color: #059669; background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700;">Statut : ACTIF</span>
        </div>
        
        <h2 style="${emailStyles.h2}">Vous pouvez dès maintenant :</h2>
        
        <ul style="padding-left: 20px; color: #334155; margin: 0 0 16px 0;">
            <li style="margin-bottom: 6px;">Gérer vos membres et votre organigramme</li>
            <li style="margin-bottom: 6px;">Publier des événements et des actualités</li>
            <li>Créer des formulaires et votre billetterie</li>
        </ul>
        
        <p style="${emailStyles.paragraph}">
            Prenez quelques minutes pour compléter la page du club (description, logo, réseaux) et invitez vos premiers membres : une bonne vitrine attirera plus de monde !
        </p>
        
        <div style="text-align: center;">
            <a href="https://estt.ma/clubs/${clubSlug || clubId}" style="${emailStyles.button}">Accéder à mon club</a>
        </div>
    `;
    return baseLayout(content);
};