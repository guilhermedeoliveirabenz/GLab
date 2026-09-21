import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const suppressViteHmrPlugin = (): Plugin => ({
  name: 'suppress-vite-hmr',
  transformIndexHtml: {
    order: 'pre',
    handler() {
      return [
        {
          tag: 'script',
          injectTo: 'head-prepend',
          children: `(function(){
  try {
    const OWS = window.WebSocket;
    if (OWS) {
      window.WebSocket = function(u, p) {
        if (typeof u === 'string' && (u.includes('token=') || u.includes('vite-hmr') || p === 'vite-hmr')) {
          const f = new EventTarget();
          f.url = u; f.protocols = p; f.readyState = 1; f.OPEN = 1; f.CLOSED = 3; f.CONNECTING = 0; f.CLOSING = 2;
          f.send = function() {};
          f.close = function() { f.readyState = 3; f.dispatchEvent(new Event('close')); };
          setTimeout(function() { f.dispatchEvent(new Event('open')); }, 0);
          return f;
        }
        return new OWS(u, p);
      };
      window.WebSocket.prototype = OWS.prototype;
      window.WebSocket.CONNECTING = OWS.CONNECTING;
      window.WebSocket.OPEN = OWS.OPEN;
      window.WebSocket.CLOSING = OWS.CLOSING;
      window.WebSocket.CLOSED = OWS.CLOSED;
    }
    const oe = console.error;
    console.error = function(...a) {
      if (a.some(x => typeof x === 'string' && (x.includes('[vite]') || x.includes('failed to connect to websocket')))) return;
      oe.apply(console, a);
    };
    const ow = console.warn;
    console.warn = function(...a) {
      if (a.some(x => typeof x === 'string' && x.includes('[vite]'))) return;
      ow.apply(console, a);
    };
    window.addEventListener('error', function(e) {
      if (e && ((e.message && e.message.includes('[vite]')) || (e.filename && e.filename.includes('@vite/client')))) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    }, true);
    window.addEventListener('unhandledrejection', function(e) {
      if (e && e.reason && String(e.reason).includes('[vite]')) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    }, true);
  } catch (_e) {}
})();`,
        },
      ];
    },
  },
});

export default defineConfig(() => {
  return {
    plugins: [
      suppressViteHmrPlugin(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'GestLab - Gestão de Laboratórios',
          short_name: 'GestLab',
          description: 'Sistema completo de agendamento e gerenciamento de laboratórios de informática escolares.',
          theme_color: '#2563eb',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: false,
    },
  };
});
