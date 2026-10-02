import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

// Edge Functions use node:test; execute their .mjs suites with node --test.
export default mergeConfig(viteConfig, defineConfig({
  test: { include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'] },
}));
