import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths, so the build works from any folder (e.g. GitHub Pages' /gameofcheeses/).
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
