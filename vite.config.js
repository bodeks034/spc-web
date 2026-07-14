import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

/** Escape path sep for both Win and POSIX in module ids. */
const nm = (pkgName) => new RegExp(`[\\\\/]node_modules[\\\\/]${pkgName}([\\\\/]|$)`)

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  build: {
    sourcemap: false,
    // DejaVu PDF font chunk (~2 MB) is one module; cannot be split further.
    chunkSizeWarningLimit: 2000,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: nm('(?:react-dom|react|scheduler)') },
            { name: 'vendor-recharts', test: nm('recharts') },
            { name: 'vendor-xlsx', test: nm('xlsx') },
            { name: 'vendor-qrcode', test: nm('(?:html5-qrcode|qrcode)') },
            { name: 'vendor-supabase', test: nm('@supabase') },
            { name: 'vendor-pdf', test: nm('(?:jspdf|html2canvas)') },
          ],
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
