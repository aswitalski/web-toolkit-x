import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const resolve = path => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      toolkit: resolve(
        mode === 'release' ? '../dist/release/index.js' : '../src/index.ts',
      ),
    },
  },
}))
