import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), vue()],
  resolve: {
    alias: {
      react: fileURLToPath(new URL('./node_modules/react', import.meta.url)),
      'react-dom': fileURLToPath(new URL('./node_modules/react-dom', import.meta.url)),
      '@react-three/fiber': fileURLToPath(
        new URL('./node_modules/@react-three/fiber', import.meta.url),
      ),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', '@react-three/fiber'],
  },
})
