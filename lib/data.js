export const db = {
    fields: [
        {
            id: 'ia',
            name: 'Intelligence Artificielle',
            icon: 'fa-brain',
            description: 'Techniques d\'IA, Big Data, machine learning, data science.'
        },
        {
            id: 'casi',
            name: 'Cybersécurité et audit des systèmes d\'information',
            icon: 'fa-shield-alt',
            description: 'Sécurité des réseaux, cryptographie, audit SI et protection des données.'
        },
        {
            id: 'insem',
            name: 'Industrie Navale : Systèmes Électriques et Maintenance',
            icon: 'fa-ship',
            description: 'Électricité navale, maintenance, propulsion, instrumentation marine.'
        },
        {
            id: 'idd',
            name: 'Informatique & Développement Digital',
            icon: 'fa-laptop-code',
            description: 'Dév. web, Big Data, cloud, digitalisation, IA et numérique.'
        },
        {
            id: 'idbi',
            name: 'Ingénierie des Données & Business Intelligence',
            icon: 'fa-database',
            description: 'Business Intelligence, Big Data, DataOps, Analytique.',
            semesters: ['S1', 'S2']
        },
        {
            id: 'imn',
            name: 'Ingénierie en Mécatronique Navale',
            icon: 'fa-cogs',
            description: 'CAO Navale, Automatique, Systèmes de Propulsion, Maintenance.',
            semesters: ['S1', 'S2']
        }
    ],

    semesters: ['S1', 'S2', 'S3', 'S4'],

    modules: {
        // Intelligence Artificielle
        'ia-S1': [
            { id: 'ia_m1', name: 'Architecture des Ordinateurs et Systèmes d\'Exploitation' },
            { id: 'ia_m2', name: 'Algorithmes et Programmation Python' },
            { id: 'ia_m3', name: 'Mathématiques pour l\'Apprentissage Automatique 1' },
            { id: 'ia_m4', name: 'Réseaux & Sécurité Informatique' },
            { id: 'ia_m5', name: 'Probabilités et Statistiques pour la Science des Données' },
            { id: 'ia_m6', name: 'Langues et Techniques de Communication 1' },
            { id: 'ia_m7', name: 'MTU et Développement Personnel' }
        ],
        'ia-S2': [
            { id: 'ia_m8', name: 'Introduction à l\'Intelligence Artificielle' },
            { id: 'ia_m9', name: 'Algorithmes et Structures de Données' },
            { id: 'ia_m10', name: 'Modélisation des Systèmes d\'Information et DB' },
            { id: 'ia_m11', name: 'Mathématiques pour l\'Apprentissage Automatique 2' },
            { id: 'ia_m12', name: 'Introduction à DevOps' },
            { id: 'ia_m13', name: 'Langues et Techniques de Communication 2' },
            { id: 'ia_m14', name: 'Compétences Numériques' }
        ],
        'ia-S3': [
            { id: 'ia_m15', name: 'Techniques du Web et Architectures Distribuées' },
            { id: 'ia_m16', name: 'Big Data & Bases de Données NoSQL' },
            { id: 'ia_m17', name: 'Science des Données Appliquées' },
            { id: 'ia_m18', name: 'Apprentissage Automatique' },
            { id: 'ia_m19', name: 'MLOps: CI/CD pour l\'Apprentissage Automatique' },
            { id: 'ia_m20', name: 'Python Avancé' },
            { id: 'ia_m21', name: 'Apprentissage Profond et Vision par Ordinateur' }
        ],
        'ia-S4': [
            { id: 'ia_m22', name: 'Introduction à l\'IA Embarquée' },
            { id: 'ia_m23', name: 'Communication et Culture de l\'Entreprise' },
            { id: 'ia_m24', name: 'Informatique en Nuage' },
            { id: 'ia_m25', name: 'IA Générative et Agents Intelligents' },
            { id: 'ia_m26', name: 'Projet de fin d\'études (PFE)' },
            { id: 'ia_m27', name: 'Stage d\'initiation & Stage technique' }
        ],

        // Cybersécurité (CASI)
        'casi-S1': [
            { id: 'casi_m1', name: 'Mathématiques pour la Cybersécurité' },
            { id: 'casi_m2', name: 'Algorithmes et Programmation Python' },
            { id: 'casi_m3', name: 'Fondamentaux des réseaux et protocoles sécurisés' },
            { id: 'casi_m4', name: 'Système de gestion de base de données (SGBD)' },
            { id: 'casi_m5', name: 'Architecture des ordinateurs et systèmes d\'exploitation' },
            { id: 'casi_m6', name: 'Langues et Techniques de Communication 1' },
            { id: 'casi_m7', name: 'Power Skills : Méthodologie de Travail Universitaire' }
        ],
        'casi-S2': [
            { id: 'casi_m8', name: 'Programmation C' },
            { id: 'casi_m9', name: 'Cryptographie appliquée' },
            { id: 'casi_m10', name: 'Administration Windows server' },
            { id: 'casi_m11', name: 'POO et Programmation Python' },
            { id: 'casi_m12', name: 'Sécurité des réseaux' },
            { id: 'casi_m13', name: 'Langues et Techniques de Communication 2' },
            { id: 'casi_m14', name: 'Power Skills : Culture Digitale' }
        ],
        'casi-S3': [
            { id: 'casi_m15', name: 'Tests d\'intrusion' },
            { id: 'casi_m16', name: 'Introduction à l\'analyse de logs' },
            { id: 'casi_m17', name: 'Sécurité des applications web' },
            { id: 'casi_m18', name: 'Introduction au SOC et à la supervision de sécurité' },
            { id: 'casi_m19', name: 'Audit des SI : méthodologies et outils' },
            { id: 'casi_m20', name: 'Introduction à l\'Organisation et à la Gestion des Entreprises' },
            { id: 'casi_m21', name: 'Power Skills: Culture and Art Skills' }
        ],
        'casi-S4': [
            { id: 'casi_m22', name: 'Veille Technologique et Innovation Numérique' },
            { id: 'casi_m23', name: 'Introduction au cloud sécurisé et sauvegardes' },
            { id: 'casi_m24', name: 'Introduction à l\'Intelligence Artificielle' },
            { id: 'casi_m25', name: 'Power Skills : Développement personnel' },
            { id: 'casi_m26', name: 'Projet de fin d\'études (PFE)' },
            { id: 'casi_m27', name: 'Stage d\'initiation & Stage technique' }
        ],

        // Industrie Navale (INSEM)
        'insem-S1': [
            { id: 'insem_m1', name: 'Mathématiques I' },
            { id: 'insem_m2', name: 'Bases de l\'électricité' },
            { id: 'insem_m3', name: 'Physique de base' },
            { id: 'insem_m4', name: 'Environnement maritime & architecture du navire' },
            { id: 'insem_m5', name: 'Mécanique du point & pneumatique' },
            { id: 'insem_m6', name: 'Compétences numériques pour le monde professionnel' },
            { id: 'insem_m7', name: 'Langues et techniques de communication I' }
        ],
        'insem-S2': [
            { id: 'insem_m8', name: 'Électrotechnique' },
            { id: 'insem_m9', name: 'Mécanique des fluides & hydraulique' },
            { id: 'insem_m10', name: 'Mathématiques II' },
            { id: 'insem_m11', name: 'Électronique' },
            { id: 'insem_m12', name: 'Conception assistée par ordinateur' },
            { id: 'insem_m13', name: 'Algorithmique & programmation' },
            { id: 'insem_m14', name: 'Langues et techniques de communication II' }
        ],
        'insem-S3': [
            { id: 'insem_m15', name: 'Systèmes embarqués et informatique industrielle' },
            { id: 'insem_m16', name: 'Électronique de puissance & automatique' },
            { id: 'insem_m17', name: 'Systèmes de propulsion' },
            { id: 'insem_m18', name: 'Électricité à bord' },
            { id: 'insem_m19', name: 'Automatismes et circuits logiques programmables' },
            { id: 'insem_m20', name: 'IA pour l\'industrie et les systèmes intelligents' },
            { id: 'insem_m21', name: 'Science des matériaux au service de l\'industrie navale' }
        ],
        'insem-S4': [
            { id: 'insem_m22', name: 'Stratégies de maintenance et GMAO' },
            { id: 'insem_m23', name: 'Réseau électrique Naval et sécurité électrique' },
            { id: 'insem_m24', name: 'Sécurité maritime & normes' },
            { id: 'insem_m25', name: 'Communication technique et professionnelle' },
            { id: 'insem_m26', name: 'Projet de fin d\'études (PFE)' },
            { id: 'insem_m27', name: 'Stage d\'initiation & Stage technique' }
        ],

        // Informatique & Dév Digital (IDD)
        'idd-S1': [
            { id: 'idd_m1', name: 'Langues & Techniques de Communication 1' },
            { id: 'idd_m2', name: 'Python 1: Algorithmes & Programmation' },
            { id: 'idd_m3', name: 'Architecture des ordinateurs & Systèmes d\'exploitation' },
            { id: 'idd_m4', name: 'Réseaux & Sécurité Informatique' },
            { id: 'idd_m5', name: 'Introduction aux statistiques et probabilités' },
            { id: 'idd_m6', name: 'Mathématiques pour machine learning' },
            { id: 'idd_m7', name: 'Culture Digitale' }
        ],
        'idd-S2': [
            { id: 'idd_m8', name: 'Python 2 : Algorithmes et Structures de Données' },
            { id: 'idd_m9', name: 'Bases de Données : Modélisation des Systèmes d\'Information et SGBD Relationnel' },
            { id: 'idd_m10', name: 'Visualisation de Données' },
            { id: 'idd_m11', name: 'Introduction à l\'IA' },
            { id: 'idd_m12', name: 'Introduction à DevOps' },
            { id: 'idd_m13', name: 'Langues & Techniques de Communication 2' },
            { id: 'idd_m14', name: 'Programmation C/C++' }
        ],
        'idd-S3': [
            { id: 'idd_m15', name: 'Gestion de Projets Data & UML' },
            { id: 'idd_m16', name: 'Fondamentaux Big Data' },
            { id: 'idd_m17', name: 'Initiation à la réalité virtuelle et augmentée' },
            { id: 'idd_m18', name: 'Techniques Web & Architectures Distribuées' },
            { id: 'idd_m19', name: 'IA Avancée' },
            { id: 'idd_m20', name: 'Bases de Données Avancées' },
            { id: 'idd_m21', name: 'Entrepreneuriat & Digitalisation' }
        ],
        'idd-S4': [
            { id: 'idd_m22', name: 'Informatique Décisionnelle' },
            { id: 'idd_m23', name: 'Fondamentaux Cloud Computing' },
            { id: 'idd_m24', name: 'Applications de l\'IA' },
            { id: 'idd_m25', name: 'Analyse Web' },
            { id: 'idd_m26', name: 'Projet de fin d\'études (PFE)' },
            { id: 'idd_m27', name: 'Stage d\'initiation & Stage technique' }
        ],

        // Ingénierie des Données & Business Intelligence (IDBI)
        'idbi-S1': [
            { id: 'idbi_m1', name: 'Systèmes de Bases de Données Avancés' },
            { id: 'idbi_m2', name: 'Architectures des Systèmes de Données' },
            { id: 'idbi_m3', name: 'Big Data et Programmation Distribuée' },
            { id: 'idbi_m4', name: 'Ingénierie des Pipelines et DataOps' },
            { id: 'idbi_m5', name: 'Statistiques et Machine Learning pour la Data' },
            { id: 'idbi_m6', name: 'Communication Professionnelle et Anglais Technique' },
            { id: 'idbi_m7', name: 'Entrepreneuriat et Innovation Numérique' }
        ],
        'idbi-S2': [
            { id: 'idbi_m8', name: 'Business Intelligence et Analytique Prédictive' },
            { id: 'idbi_m9', name: 'Visualisation des Données et Data Storytelling' },
            { id: 'idbi_m10', name: 'Ingénierie Cloud et Intelligence Artificielle' },
            { id: 'idbi_m11', name: 'Gouvernance des Données et Éthique de l’IA' }
        ],

        // Ingénierie en Mécatronique Navale (IMN)
        'imn-S1': [
            { id: 'imn_m1', name: 'Construction et CAO Navale' },
            { id: 'imn_m2', name: 'Automatique et Informatique Industrielle' },
            { id: 'imn_m3', name: 'Matériaux Fonctionnels et Résistance des Matériaux (RDM)' },
            { id: 'imn_m4', name: 'Électricité à Bord et Instrumentation' },
            { id: 'imn_m5', name: 'Maintenance et Sécurité Navale' },
            { id: 'imn_m6', name: 'Culture d\'Entreprise et Entrepreneuriat' },
            { id: 'imn_m7', name: 'Systèmes de Propulsion et Transmission' }
        ],
        'imn-S2': [
            { id: 'imn_m8', name: 'Fabrication Mécanique et FAO' },
            { id: 'imn_m9', name: 'Robotique et Automatisme Naval' },
            { id: 'imn_m10', name: 'Productique et Management de la Qualité' },
            { id: 'imn_m11', name: 'Hydraulique Navale et Machines de Bord' }
        ]
    },

    resources: {}
};
