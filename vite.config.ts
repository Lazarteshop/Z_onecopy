import postcssCascadeLayers from '@csstools/postcss-cascade-layers';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'remove-crossorigin',
        transformIndexHtml(html) {
          return html.replace(/\s+crossorigin(?=["\s>])/g, '').replace(/crossorigin="[^"]*"/g, '');
        }
      }
    ],
    css: {
      postcss: {
        plugins: [
          postcssCascadeLayers()
        ]
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: ['chrome60', 'firefox60', 'safari11', 'edge18'],
      cssTarget: ['chrome60', 'firefox60', 'safari11', 'edge18'],
      rollupOptions: {
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith('.css')) {
              return 'style.css';
            }
            return '[name].[ext]';
          }
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
