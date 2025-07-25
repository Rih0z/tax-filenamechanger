import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  root: path.resolve(__dirname, './src/renderer'),
  build: {
    outDir: path.resolve(__dirname, './dist/renderer'),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, './src/renderer/index.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@shared': path.resolve(__dirname, './src/shared')
    }
  },
  server: {
    port: 3000,
    strictPort: true
  }
});