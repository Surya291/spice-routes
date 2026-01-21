import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: true,
    // Proxy API requests to vercel dev server (if running)
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // If API is not available, the error will be handled in api-client
      },
    },
  },
});
