import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import generouted from '@generouted/react-router/plugin'

export default defineConfig(({ command }) => ({
  // Production assets are served under /static/ (see server.ts) so CSS url() refs
  // (@font-face) and chunk imports resolve to /static/assets/…. Dev stays at / so
  // http://localhost:7749/ serves the app normally.
  base: command === 'build' ? '/static/' : '/',
  plugins: [react(), generouted()],
  resolve: {
    alias: {
      '~': '/src',
    },
  },
  server: {
    port: 7749,
    proxy: {
      '/api': {
        target: 'http://localhost:9981',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Single CSS bundle so the hardcoded /static/index.css link (server.ts) always
    // resolves to the full Tailwind output.
    cssCodeSplit: false,
    rollupOptions: {
      input: './src/index.tsx',
      output: {
        entryFileNames: 'index.js',
        // CSS -> a single predictable index.css; fonts/images keep real names+extensions
        // (forcing everything to 'index.css' collided fonts into numbered .css files).
        assetFileNames: (info) => {
          const name = info.name ?? ''
          if (name.endsWith('.css'))
            return 'index.css'
          return 'assets/[name]-[hash][extname]'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        // Path-based so it survives installer layout changes (the previous
        // package-name map silently leaked react-dom into index.js after the
        // pnpm -> npm move).
        manualChunks(id: string) {
          if (!id.includes('node_modules'))
            return
          if (/node_modules\/(?:recharts|d3-[^/]+|victory-vendor)\//.test(id))
            return 'recharts'
          if (id.includes('node_modules/@radix-ui/'))
            return 'radix-ui'
          if (/node_modules\/(?:react|react-dom|react-router|react-router-dom|scheduler)\//.test(id))
            return 'react-vendor'
        },
      },
    },
    outDir: '../../dist/service/src/static',
    // Clean stale assets instead of piling them up across builds.
    emptyOutDir: true,
  },
}))
