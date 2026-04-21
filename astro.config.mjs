// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://yujenlin5210.github.io',
  integrations: [react(), mdx()],

  vite: {
    plugins: [tailwindcss()],
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined;
            }

            if (id.includes('@react-three/fiber') || id.includes('@react-three/drei')) {
              return 'vendor-r3f';
            }

            if (id.includes('three')) {
              return 'vendor-three';
            }

            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }

            if (
              id.includes('/react/') ||
              id.includes('react-dom') ||
              id.includes('scheduler') ||
              id.includes('@nanostores/react') ||
              id.includes('/nanostores/')
            ) {
              return 'vendor-react';
            }

            return undefined;
          }
        }
      }
    }
  }
});
