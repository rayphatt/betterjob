/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Handle canvas and other Node.js-specific modules
    if (!isServer) {
      // Use null-loader for canvas in client-side builds
      config.module.rules.push({
        test: /canvas/,
        use: 'null-loader',
      });

      // Set fallbacks for Node.js modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    // Exclude pdfjs-dist from server builds (we only use it client-side for PDF parsing)
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'pdfjs-dist': false,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;
