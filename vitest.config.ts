import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/dist-electron/**'],
    coverage: {
      provider: 'v8',
      thresholds: { statements: 80, branches: 70, functions: 80, lines: 85 },
      exclude: ['dist/**', 'dist-electron/**', 'src/main.tsx', 'src/global.d.ts', 'src/shared/**', 'electron/main.ts', 'electron/preload.ts', 'electron/credential-vault.ts'],
    },
  },
});
