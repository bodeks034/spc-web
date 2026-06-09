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
  },
  // Opciona jača obfuskacija (npm i -D vite-plugin-javascript-obfuscator):
  // plugins: [react(), obfuscator({ apply: 'build' })],
})

