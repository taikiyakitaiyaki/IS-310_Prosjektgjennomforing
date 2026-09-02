import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sites } from '@openai/sites-vite-plugin'

// Relative base so the built site works from any sub-path (GitHub Pages, etc.)
export default defineConfig({
  base: './',
  plugins: [react(), sites()],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        // Rolldown expects a function here. Keeping the creative stack split
        // lets the document and Unicorn landing paint before our WebGL world.
        manualChunks(id) {
          if (id.includes('three') || id.includes('@react-three')) return 'three'
          if (id.includes('gsap') || id.includes('motion') || id.includes('lenis')) return 'motion'
          return undefined
        },
      },
    },
  },
})
