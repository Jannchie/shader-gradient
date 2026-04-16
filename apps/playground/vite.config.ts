import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [react(), vue()],
  resolve: {
    alias: {
      '@shader-gradient/core': fileURLToPath(
        new URL('../../packages/core/src/index.ts', import.meta.url),
      ),
      '@shader-gradient/react': fileURLToPath(
        new URL('../../packages/react/src/index.tsx', import.meta.url),
      ),
      '@shader-gradient/vue': fileURLToPath(
        new URL('../../packages/vue/src/index.ts', import.meta.url),
      ),
      'react': fileURLToPath(new URL('node_modules/react', import.meta.url)),
      'react-dom': fileURLToPath(new URL('node_modules/react-dom', import.meta.url)),
      '@react-three/fiber': fileURLToPath(
        new URL('node_modules/@react-three/fiber', import.meta.url),
      ),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', '@react-three/fiber'],
  },
})
