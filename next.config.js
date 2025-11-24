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
    
    // pdfjs-dist removed - now using pdf-parse for serverless compatibility
    
    return config;
  },
};

module.exports = nextConfig;
