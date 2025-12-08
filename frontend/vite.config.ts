import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
// import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const plugins = [
    react(),
    // ...(mode === 'development' ? [componentTagger()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      manifest: {
        name: 'Secured Guard - Sistema de Segurança',
        short_name: 'Secured Guard',
        description: 'Sistema completo de gestão de segurança patrimonial',
        theme_color: '#dc2626',
        background_color: '#1f2937',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        skipWaiting: true,
        clientsClaim: true
      }
    }),
  ];

  return {
    server: {
      host: "0.0.0.0", // Permite acesso de qualquer IP na rede
      port: 3000,
      strictPort: false, // Permite usar outra porta se 3000 estiver ocupada
      hmr: {
        overlay: false, // Desabilita overlay de erros HMR
        // Configurar HMR para funcionar com IP externo
        clientPort: 3000,
      },
      proxy: {
        '/api': {
          target: 'http://localhost:8083',
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        },
        '/ws': {
          target: 'http://localhost:8083',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
    plugins,
    build: {
      chunkSizeWarningLimit: 1000, // 1MB - mais restritivo
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React
            'react-vendor': ['react', 'react-dom'],
            
            // UI Libraries
            'radix-ui': [
              '@radix-ui/react-dialog', 
              '@radix-ui/react-dropdown-menu', 
              '@radix-ui/react-select',
              '@radix-ui/react-toast',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-accordion',
              '@radix-ui/react-alert-dialog',
              '@radix-ui/react-avatar',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-collapsible',
              '@radix-ui/react-context-menu',
              '@radix-ui/react-hover-card',
              '@radix-ui/react-label',
              '@radix-ui/react-menubar',
              '@radix-ui/react-navigation-menu',
              '@radix-ui/react-popover',
              '@radix-ui/react-progress',
              '@radix-ui/react-radio-group',
              '@radix-ui/react-scroll-area',
              '@radix-ui/react-separator',
              '@radix-ui/react-slider',
              '@radix-ui/react-slot',
              '@radix-ui/react-switch',
              '@radix-ui/react-tabs',
              '@radix-ui/react-toggle',
              '@radix-ui/react-toggle-group'
            ],
            
            // Icons
            'lucide': ['lucide-react'],
            
            // Charts
            'charts': ['chart.js', 'react-chartjs-2', 'recharts'],
            
            // Forms
            'forms': ['react-hook-form', '@hookform/resolvers', 'yup', 'zod'],
            
            // Data fetching
            'query': ['@tanstack/react-query', '@tanstack/react-table'],
            
            // Utils
            'utils': ['axios', 'date-fns', 'clsx', 'tailwind-merge', 'class-variance-authority'],
            
            // Animations
            'animations': ['framer-motion', 'gsap'],
            
            // PDF
            'pdf': ['html2pdf.js', 'pdf-lib'],
            
            // WebSocket
            'websocket': ['@stomp/stompjs', 'sockjs-client'],
            
            // Other UI
            'ui-other': [
              'sonner', 
              'vaul', 
              'cmdk', 
              'input-otp', 
              'react-currency-input-field',
              'react-datepicker',
              'react-day-picker',
              'react-resizable-panels',
              'embla-carousel-react'
            ]
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom"],
    },
    define: {
      global: 'window',
    },
  };
});
