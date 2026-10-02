import localFont from 'next/font/local';
import Script from 'next/script';
import './globals.css';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FloatingAssistant from '@/components/layout/FloatingAssistant';
import { AuthProvider } from '@/context/AuthContext';
import AuthGuard from '@/components/providers/AuthGuard';
import { DialogProvider } from '@/context/DialogContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ThemeProvider } from '@/components/providers/theme-provider';
import LocalDevServiceWorkerCleanup from '@/components/providers/LocalDevServiceWorkerCleanup';
import { defaultMetadata } from '@/lib/metadata';

const canela = localFont({
    src: '../public/fonts/Canela-Medium.woff2', // Assuming this path, verified in globals.css
    variable: '--font-canela',
});

export const metadata = {
    ...defaultMetadata,
    openGraph: {
        type: 'website',
        locale: 'fr_FR',
        url: 'https://www.estt.ma',
        siteName: 'EST Tétouan - Ressources Étudiants',
        title: 'EST Tétouan - Ressources Étudiants',
        description: 'Plateforme collaborative de partage de ressources académiques pour les étudiants de l\'EST Tétouan',
        images: [
            {
                url: 'https://estt.ma/favicon.ico',
                width: 1200,
                height: 630,
                alt: 'EST Tétouan Community',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'EST Tétouan - Ressources Étudiants',
        description: 'Plateforme collaborative de partage de ressources académiques pour les étudiants de l\'EST Tétouan',
        images: ['https://www.estt.ma/favicon.ico'],
    },
};

const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': 'EST Tétouan - Ressources Étudiants',
    'alternateName': ['EST Tétouan', 'EST Tétouan Community'],
    'url': 'https://www.estt.ma/',
};

export default function RootLayout({ children }) {
    return (
        <html lang="fr" suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`,
                    }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
                />
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#2563eb" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="ESTT" />
                <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
                <link
                    rel="stylesheet"
                    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
                />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap" rel="stylesheet" />
                <link href="https://fonts.googleapis.com/css2?family=Lateef:wght@200;300;400;500;600;700;800&display=swap" rel="stylesheet" />
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=verified" />
            </head>
            <body className={`font-sans ${canela.variable} antialiased`} suppressHydrationWarning={true}>
                <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
                    <DialogProvider>
                        <AuthProvider>
                            <AuthGuard>
                                <NotificationProvider>
                                    <LocalDevServiceWorkerCleanup />
                                    <Header />
                                    {children}
                                    <Footer />
                                    <FloatingAssistant />
                                    <div id="spinner-overlay" className="spinner-overlay hidden" aria-hidden="true">
                                        <div className="spinner" role="status" aria-label="Chargement"></div>
                                    </div>
                                </NotificationProvider>
                            </AuthGuard>
                        </AuthProvider>
                    </DialogProvider>
                </ThemeProvider>

                <Script 
                    id="bmc-widget"
                    src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js"
                    data-name="BMC-Widget"
                    data-cfasync="false"
                    data-id="abdelhakim.sahifa"
                    data-description="Support me on Buy me a coffee!"
                    data-message="Soutenir notre communauté !"
                    data-color="#5F7FFF"
                    data-position="Left"
                    data-x_margin="18"
                    data-y_margin="18"
                    strategy="lazyOnload"
                />
            </body>
        </html>
    );
}
