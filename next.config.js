const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'turndown'],
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fnaiedociknutdxoezhn.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'img.medi1news.com',
      },
    ],
  },
  async redirects() {
    return [
      // Redirect old domain to new domain
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'estt.ma',
          },
        ],
        destination: 'https://estt.ma/:path*',
        permanent: true,
      },
      // Redirect old .html URLs to new routes
      {
        source: '/index.html',
        destination: '/',
        permanent: true,
      },
      {
        source: '/blog.html',
        destination: '/blog',
        permanent: true,
      },
      {
        source: '/browse.html',
        destination: '/browse',
        permanent: true,
      },
      {
        source: '/contribute.html',
        destination: '/contribute',
        permanent: true,
      },
      {
        source: '/login.html',
        destination: '/login',
        permanent: true,
      },
      {
        source: '/signup.html',
        destination: '/signup',
        permanent: true,
      },
      {
        source: '/profile.html',
        destination: '/profile',
        permanent: true,
      },
      {
        source: '/admin.html',
        destination: '/admin',
        permanent: true,
      },
      {
        source: '/article.html',
        destination: '/blog',
        permanent: true,
      },
      {
        source: '/write-article.html',
        destination: '/blog/write',
        permanent: true,
      },
      {
        source: '/thanks.html',
        destination: '/thanks',
        permanent: true,
      },
      {
        source: '/theme.html',
        destination: '/theme',
        permanent: true,
      },
      // New redirects for reorganization
      {
        source: '/view-ads/:path*',
        destination: '/ads-portal/:path*',
        permanent: true,
      },
      {
        source: '/conditions-d-utilisation',
        destination: '/terms',
        permanent: true,
      },
      {
        source: '/politique-de-confidentialite',
        destination: '/privacy',
        permanent: true,
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
