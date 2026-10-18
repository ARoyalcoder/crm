import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Dev only: the browser calls /api on the Vite origin and Vite forwards it, so no CORS is involved.
  const apiTarget = env.DEV_API_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'vendor-react'
              }
              if (id.includes('@tanstack/react-query') || id.includes('@tanstack/react-table')) {
                return 'vendor-tanstack'
              }
              if (id.includes('framer-motion') || id.includes('gsap')) {
                return 'vendor-animation'
              }
              if (id.includes('recharts') || id.includes('d3-')) {
                return 'vendor-charts'
              }
              if (id.includes('three')) {
                return 'vendor-three'
              }
              if (id.includes('@radix-ui') || id.includes('lucide-react')) {
                return 'vendor-ui'
              }
            }
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
      },
    },
  }
})
