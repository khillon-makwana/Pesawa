import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/*
 * Vitest does not read the `@/` path alias from tsconfig, and component tests
 * import real modules through it. Type-only `@/` imports worked before this
 * file existed because types are erased before anything runs.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
});
