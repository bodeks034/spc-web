import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('recharts')) return 'vendor-recharts';
          if (id.includes('xlsx')) return 'vendor-xlsx';
          if (id.includes('html5-qrcode')) return 'vendor-qrcode';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
          return 'vendor';
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
  // Opciona jača obfuskacija (npm i -D vite-plugin-javascript-obfuscator):
  // plugins: [react(), obfuscator({ apply: 'build' })],
})

