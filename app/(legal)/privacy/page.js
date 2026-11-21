import { PRIVACY_POLICY_LAST_UPDATED } from '@/lib/privacy-constants';

export default function PrivacyPolicy() {
    return (
        <main className="container py-20 max-w-4xl mx-auto px-4">
            <h1 className="text-4xl font-bold mb-4">Politique de confidentialité</h1>
            <p className="text-sm text-muted-foreground mb-8">Dernière mise à jour : {PRIVACY_POLICY_LAST_UPDATED}</p>

            <div className="prose prose-slate max-w-none space-y-8 text-muted-foreground">
                <section>
                    <h2 className="text-2xl font-bold text-foreground mb-4">1. Collecte des données</h2>
                    <p className="mb-3">
                        Nous collectons les informations que vous nous fournissez lors de la création de votre compte, notamment votre nom, prénom, adresse email académique, filière et année d&apos;étude.
                    </p>
                    <p>
                        De plus, <strong>pour les utilisateurs connectés uniquement</strong>, nous collectons des données télémétriques et d&apos;utilisation, à savoir les pages consultées (chemins d&apos;accès / URL) et le temps actif passé sur chacune de ces pages. Aucune donnée d&apos;activité n&apos;est enregistrée pour les utilisateurs non authentifiés ou anonymes.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-foreground mb-4">2. Utilisation des données</h2>
                    <p>Vos données sont utilisées exclusivement pour :</p>
                    <ul className="list-disc pl-6 space-y-2 mt-2">
                        <li>Gérer votre compte et vous identifier sur la plateforme.</li>
                        <li>Attribuer vos contributions (ressources académiques, projets, articles) à votre profil.</li>
                        <li>Vous permettre d&apos;échanger avec d&apos;autres étudiants via la messagerie et les espaces collaboratifs.</li>
                        <li>Mesurer et analyser l&apos;usage de la plateforme (pages les plus consultées, temps passé) afin de comprendre les besoins des étudiants et d&apos;améliorer continuellement l&apos;ergonomie et l&apos;expérience utilisateur.</li>
                        <li>Optimiser les performances et la découverte des ressources pédagogiques les plus demandées.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-foreground mb-4">3. Confidentialité des messages</h2>
                    <p>Dans le cadre de nos services de communication interne :</p>
                    <ul className="list-disc pl-6 space-y-2 mt-2">
                        <li><strong>Discussions de groupe :</strong> Les messages partagés dans les espaces de discussion communs ne sont pas chiffrés de bout en bout. En utilisant ces espaces, vous donnez expressément votre accord pour que nous puissions collecter et utiliser ces messages en vue d&apos;entraîner et d&apos;améliorer des modèles d&apos;intelligence artificielle (notamment des modèles linguistiques en darija).</li>
                        <li><strong>Messages directs (DMs) :</strong> Nous appliquons un chiffrement strict pour vos conversations privées. Nous nous engageons formellement à respecter leur totale confidentialité : nous n&apos;accédons pas à leur contenu, et nous garantissons que ces messages ne seront jamais exploités ou analysés à d&apos;autres fins.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-foreground mb-4">4. Mesure du temps d&apos;activité et amélioration de l&apos;expérience</h2>
                    <p className="mb-3">
                        Afin de proposer une plateforme toujours plus utile et fluide aux étudiants de l&apos;EST Tétouan, nous mesurons le temps actif passé sur chaque page de notre site par les utilisateurs connectés :
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Principe actif :</strong> Le temps n&apos;est comptabilisé que lorsque l&apos;onglet est actif et en cours d&apos;utilisation (les périodes d&apos;inactivité prolongée ou les onglets en arrière-plan ne sont pas comptés).</li>
                        <li><strong>Finalité pédagogique et ergonomique :</strong> Savoir quelles sections sont les plus fréquentées permet à notre équipe d&apos;enrichir en priorité les modules clés, d&apos;améliorer la navigation et de résoudre les points de friction.</li>
                        <li><strong>Accès restreint :</strong> Ces statistiques sont agrégées et accessibles uniquement aux administrateurs de la plateforme via le panneau d&apos;administration sécurisé.</li>
                        <li><strong>Non-commercialisation :</strong> Ces données ne sont ni vendues, ni louées, ni cédées à des régies publicitaires ou tiers commerciaux.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-foreground mb-4">5. Protection des données</h2>
                    <p>
                        Nous mettons en œuvre des mesures de sécurité appropriées et conformes aux meilleures pratiques (chiffrement, règles de sécurité de base de données Firebase, restrictions d&apos;accès par rôle) pour protéger vos informations personnelles contre tout accès, modification, divulgation ou destruction non autorisés.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-foreground mb-4">6. Partage des données</h2>
                    <p>
                        Nous ne vendons, n&apos;échangeons ni ne transférons vos informations personnelles identifiables à des tiers. Cela n&apos;inclut pas nos partenaires d&apos;infrastructure de confiance (comme Firebase / Google Cloud Platform) indispensables au fonctionnement technique de notre plateforme, sous réserve qu&apos;ils respectent des obligations strictes de confidentialité et de sécurité.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-foreground mb-4">7. Vos droits</h2>
                    <p>
                        Conformément à la réglementation en vigueur relative à la protection des données personnelles, vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression de vos données personnelles. Vous pouvez exercer ces droits à tout moment en nous contactant ou via les paramètres de votre profil utilisateur.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-foreground mb-4">8. Modifications et notification</h2>
                    <p>
                        Nous pouvons modifier ou mettre à jour la présente politique de confidentialité. En cas de modification substantielle, une boîte de dialogue d&apos;information vous sera présentée sur la plateforme lors de votre prochaine visite pour recueillir votre prise de connaissance. Une fois validée, elle ne s&apos;affichera plus jusqu&apos;à la prochaine mise à jour majeure.
                    </p>
                </section>
            </div>
        </main>
    );
}
