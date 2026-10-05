import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.spec.ts', 'test/functional/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    globals: true,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      // npm test runs Chromium, npm run test:browsers all of them
      instances: [{ browser: 'chromium' }, { browser: 'firefox' }],
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
    },
  },
})
