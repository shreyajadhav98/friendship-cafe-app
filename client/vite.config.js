import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5021',
      '/generated-qr': 'http://localhost:5021',
      '/socket.io': {
        target: 'http://localhost:5021',
        ws: true
      }
    }
  }
});
