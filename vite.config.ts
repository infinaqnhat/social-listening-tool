import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/social-listening-tool/',
  build: { outDir: 'dist' },
  plugins: [react()],
})
