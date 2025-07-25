import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'crypto';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Custom hash function for better compatibility
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    proxy: {
      // Proxy API requests to the backend server
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        // Rewrite path to remove the /api prefix if needed
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
