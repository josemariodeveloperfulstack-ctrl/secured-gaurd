import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
// import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const plugins = [
    react(),
    // ...(mode === 'development' ? [componentTagger()] : []),
    VitePWA({
      registerType: 'autoUpdate', // Atualiza automaticamente no background
      devOptions: {
        // Service worker desabilitado em desenvolvimento.
        // SW em dev causava o problema de "página com dados antigos" porque
        // servia bundles em cache mesmo após HMR/rebuilds.
        enabled: false,
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
            src: '/logo-sistema.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/logo-sistema.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/logo-sistema.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Evita que o SW intercepte navegações que devem ir direto à rede.
        navigateFallback: null,
        navigateFallbackDenylist: [/^\/api/, /^\/ws/, /^\/email-marketing/],
        runtimeCaching: [
          // NUNCA cachear chamadas de API — sempre buscar do backend.
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
            options: {
              cacheName: 'api-no-cache',
            },
          },
          // WebSocket / SSE
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/ws'),
            handler: 'NetworkOnly',
            options: {
              cacheName: 'ws-no-cache',
            },
          },
          // Bundles JS: NetworkFirst com janela curta (1h) para que novas
          // versões sejam pegas rapidamente após deploy.
          {
            urlPattern: /\.js$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'js-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60, // 1 hora
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // CSS pode ser cacheado de forma mais agressiva (StaleWhileRevalidate)
          {
            urlPattern: /\.css$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'css-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24, // 24h
              },
            },
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}']
      }
    }),
  ];

  const httpsConfig = (() => {
    if (process.env.VITE_USE_HTTPS === 'false') return undefined;
    try {
      const certDir = path.resolve(process.cwd(), "certs");
      const keyPath = path.join(certDir, "localhost-key.pem");
      const certPath = path.join(certDir, "localhost.pem");
      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        return {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        };
      }
      return undefined;
    } catch {
      return undefined;
    }
  })();

  return {
    server: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: false,
      https: httpsConfig,
      hmr: httpsConfig
        ? {
            protocol: 'wss',
            host: 'localhost',
            port: 3000,
            overlay: false,
          }
        : {
            overlay: false,
            clientPort: 3000,
          },
      proxy: {
        '/api': {
          target: 'http://localhost:8083',
          changeOrigin: true,
          secure: false,
          timeout: 120000,
          proxyTimeout: 120000,
        },
        '/ws': {
          target: 'http://localhost:8083',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        // Imagens dos e-mails de marketing (classpath static no backend)
        '/email-marketing': {
          target: 'http://localhost:8083',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins,
    build: {
      // Melhorar geração de chunks para evitar problemas de carregamento
      sourcemap: false, // Desabilitar sourcemaps em produção para reduzir tamanho
      minify: 'terser', // Usar terser para melhor minificação
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
        },
      },
      rollupOptions: {
        output: {
          // Garantir nomes de arquivos consistentes
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          // Melhorar code splitting
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
            'websocket': ['@stomp/stompjs'],

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
          // Melhorar tratamento de chunks dinâmicos
          experimentalMinChunkSize: 20000, // 20KB mínimo por chunk
        },
      },
      // Aumentar timeout para builds grandes
      chunkSizeWarningLimit: 2000,
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
