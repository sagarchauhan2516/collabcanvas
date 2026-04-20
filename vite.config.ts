import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // In production (Firebase Hosting), we need to point at the Cloud Run backend.
  // VITE_API_BASE_URL can be set at build time or defaults to the Cloud Run URL.
  const apiBase = env.VITE_API_BASE_URL || 'https://collabcanvas-63809580057.us-central1.run.app';

  return {
    plugins: [react(), tailwindcss()],
    define: {
      // Expose the backend URL to the client bundle
      __API_BASE_URL__: JSON.stringify(mode === 'production' ? apiBase : ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: false,
    },
  };
});
