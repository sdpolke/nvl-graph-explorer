import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Resolve configuration
  resolve: {
    alias: {
      'neo4j-driver': path.resolve(__dirname, 'node_modules/neo4j-driver/lib/browser/neo4j-web.esm.min.js'),
    },
    conditions: ['browser', 'module', 'import', 'default'],
  },
  
  // Worker configuration for neo4j-driver
  worker: {
    format: 'es',
  },
  
  // Test configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  
  // Build optimizations
  build: {
    // Target modern browsers for better optimization
    target: 'es2015',
    
    // Enable minification
    minify: 'esbuild', // Use esbuild for faster builds
    
    // CommonJS options
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    
    // Rollup options for code splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'neo4j-vendor': ['neo4j-driver'],
          'nvl-vendor': ['@neo4j-nvl/react'],
        },
        
        // Asset file naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.');
          const ext = info?.[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/woff|woff2|eot|ttf|otf/i.test(ext || '')) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        
        // Chunk file naming
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    
    // Source maps for production debugging (optional)
    sourcemap: false,
    
    // CSS code splitting
    cssCodeSplit: true,
  },
  
  // Server configuration for development
  server: {
    port: 3000,
    open: true,
    cors: true,
    fs: {
      // Allow serving files from neo4j-driver
      allow: ['..'],
    },
  },
  
  // Preview server configuration
  preview: {
    port: 3000,
    open: true,
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', '@neo4j-nvl/react', 'neo4j-driver'],
    esbuildOptions: {
      // Define global for CommonJS compatibility
      define: {
        global: 'globalThis',
      },
      // Target ES2020 for better compatibility
      target: 'es2020',
    },
  },
  
  // Define global for runtime
  define: {
    'process.env': {},
    global: 'globalThis',
  },
})
