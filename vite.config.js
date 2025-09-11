import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import manifest from './vite-plugin-manifest'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), manifest([`*://${process.env.VITE_UPLOAD_API_PREFIX}/*`])],
  publicDir: './public',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, './popup.html'),
        background: resolve(__dirname, './src/background.js'),
      },
      output: {
        entryFileNames: '[name].js',
        // assetFileNames: '[name][extname]',
      }
    }
  }
})
