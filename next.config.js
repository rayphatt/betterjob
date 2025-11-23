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
    
    // Mark pdfjs-dist as external for both client and server to prevent bundling issues
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push({
        'pdfjs-dist': 'commonjs pdfjs-dist',
        'pdfjs-dist/legacy/build/pdf.js': 'commonjs pdfjs-dist/legacy/build/pdf.js',
      });
    }
    
    return config;
  },
};

module.exports = nextConfig;
