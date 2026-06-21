import vue from '@vitejs/plugin-vue2';
import { defineConfig, loadEnv } from 'vite';

const path = require('path');

// https://vitejs.dev/config/
export default defineConfig(({ _, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      vue(),
      // DEV ONLY: serve the repo's i18n/en.json for /api/lang/en so new UI
      // strings hot-reload without rebuilding the (prebuilt) backend image.
      // configureServer never runs in `vite build`, so this is dev-only.
      {
        name: 'dev-serve-local-i18n',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url && req.url.startsWith('/api/lang/en')) {
              try {
                const file = path.resolve(__dirname, '../i18n/en.json');
                const data = JSON.parse(require('fs').readFileSync(file, 'utf-8'));
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ data }));
                return;
              } catch (e) {
                // On any error, fall through to the normal backend proxy.
              }
            }
            next();
          });
        },
      },
    ],
    base: '/admin',
    mode,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        bulma: require.resolve('bulma/bulma.sass'),
      },
    },
    build: {
      assetsDir: 'static',
    },
    server: {
      port: env.LISTMONK_FRONTEND_PORT || 8080,
      proxy: {
        '^/$': {
          target: env.LISTMONK_API_URL || 'http://127.0.0.1:9000',
        },
        '^/(api|webhooks|subscription|public|health)': {
          target: env.LISTMONK_API_URL || 'http://127.0.0.1:9000',
        },
        '^/admin/login': {
          target: env.LISTMONK_API_URL || 'http://127.0.0.1:9000',
        },
        '^/(admin\/custom\.(css|js))': {
          target: env.LISTMONK_API_URL || 'http://127.0.0.1:9000',
        },
      },
    },
  };
});
