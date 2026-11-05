import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BACKEND_URL lets Docker / Codespaces point the dev-server proxy at the
// backend container (http://server:3001). Local development keeps the
// default http://localhost:3001, so `npm run dev` is unchanged.
// https://vitejs.dev/config/
const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
