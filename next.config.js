/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    // react-dsfr requires this for server components compatibility
    serverComponentsExternalPackages: ['@codegouvfr/react-dsfr'],
  },
  // On sert l'app derrière un ingress nginx qui gère déjà la compression/TLS
  poweredByHeader: false,
};

module.exports = nextConfig;
