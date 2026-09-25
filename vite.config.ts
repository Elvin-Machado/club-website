import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  server: { proxy: { '/api': 'http://127.0.0.1:3001' } },
  build: {
    target: 'es2022',
    rollupOptions: { output: { manualChunks: isSsrBuild ? undefined : { three: ['three'] } } },
  },
}));
