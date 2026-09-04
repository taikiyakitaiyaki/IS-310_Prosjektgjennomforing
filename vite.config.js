import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
  /* The OpenAI Sites plugin is gone along with .openai/hosting.json, which it
     read at the end of every build. The site publishes through GitHub Pages
     (see .github/workflows/pages.yml). */
  plugins: [react(), sitesStaticWorker()],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('unicornstudio')) return 'unicorn'
          /* The ridge scene is only fetched near its own section, so three and
             its renderer stay out of the entry chunk. */
          if (id.includes('node_modules/three/') || id.includes('@react-three/')) return 'three'
          /* The scroll and animation runtime, cached on its own between
             deploys that only touch the site's code. */
          if (id.includes('node_modules/gsap') || id.includes('node_modules/@gsap/') || id.includes('node_modules/lenis'))
            return 'motion'
          return undefined
        },
      },
    },
  },
})
