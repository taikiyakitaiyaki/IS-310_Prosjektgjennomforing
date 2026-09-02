import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sites } from '@openai/sites-vite-plugin'

const sitesStaticWorker = () => ({
  name: 'sites-static-worker',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'server/index.js',
      source: `const INDEX_PATH = '/index.html'

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request)

    if (
      response.status === 404 &&
      request.method === 'GET' &&
      (request.headers.get('accept') || '').includes('text/html')
    ) {
      return env.ASSETS.fetch(new Request(new URL(INDEX_PATH, request.url), request))
    }

    return response
  },
}
`,
    })
  },
})

// Relative base so the built site works from any sub-path (GitHub Pages, etc.)
export default defineConfig({
  base: './',
  plugins: [react(), sites(), sitesStaticWorker()],
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
