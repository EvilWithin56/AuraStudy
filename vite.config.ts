import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load environment variables based on mode (development/production)
  // The third argument '' loads all env vars, not just VITE_ prefixed ones
  // Fix: Use '.' instead of process.cwd() to resolve TS error "Property 'cwd' does not exist on type 'Process'"
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    base: '/',
    build: {
      outDir: 'dist',
    },
    // CRITICAL: This replaces `process.env.API_KEY` in your code with the actual string value during the build.
    // It checks GEMINI_API_KEY (as documented), then VITE_GEMINI_API_KEY (standard Vite), then API_KEY, then falls back to empty string.
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || env.API_KEY || '')
    }
  };
});