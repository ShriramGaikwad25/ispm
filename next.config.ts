import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  async redirects() {
    return [
      {
        source: "/non-human-identity-1/lookups",
        destination: "/settings/gateway/nhi-settings",
        permanent: false,
      },
      {
        source: "/non-human-identity-1/emergency",
        destination: "/non-human-identity/request-access",
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Add empty turbopack config to silence warnings
  turbopack: {},
  // Keep webpack config for ag-grid externals (needed for SSR)
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude ag-grid from server-side rendering
      config.externals = config.externals || [];
      config.externals.push({
        'ag-grid-react': 'ag-grid-react',
        'ag-grid-community': 'ag-grid-community',
        'ag-grid-enterprise': 'ag-grid-enterprise',
      });
    }
    return config;
  },
};

export default nextConfig;
