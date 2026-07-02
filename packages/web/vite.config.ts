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
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'radix-ui': ['@radix-ui/react-checkbox', '@radix-ui/react-collapsible', '@radix-ui/react-context-menu', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-label', '@radix-ui/react-scroll-area', '@radix-ui/react-select', '@radix-ui/react-separator', '@radix-ui/react-slot', '@radix-ui/react-switch', '@radix-ui/react-tooltip'],
          'recharts': ['recharts'],
        },
      },
    },
    outDir: '../../dist/service/src/static',
    // Clean stale assets instead of piling them up across builds.
    emptyOutDir: true,
  },
}))
