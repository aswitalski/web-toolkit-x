import fs from 'node:fs'
import { defineConfig } from 'tsdown'

const { version } = JSON.parse(fs.readFileSync('package.json', 'utf8'))

export default defineConfig(({ watch }) => {
  // watching builds for development, a single run builds the release
  const outDir = watch ? 'dist/dev' : 'dist/release'
  return [
    {
      // ES module with type declarations, the package entry
      entry: { index: 'src/index.ts' },
      format: 'esm',
      platform: 'browser',
      target: 'es2024',
      outDir,
      sourcemap: true,
      // declaration maps lead editors to the TypeScript sources
      dts: { sourcemap: true },
      // the global declared by the classic script, imports from index.d.ts
      copy: 'src/global.d.ts',
      // the package checks look at the release files
      publint: !watch,
      attw: !watch && { profile: 'esm-only' },
    },
    {
      // Classic script exposing the toolkit global
      entry: { [`toolkit-${version}`]: 'src/release.ts' },
      format: 'iife',
      platform: 'browser',
      target: 'es2024',
      outDir,
      sourcemap: true,
      dts: false,
      clean: false,
      hash: false,
      outputOptions: { entryFileNames: '[name].js' },
    },
  ]
})
