import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/malloy-try/" : "/",
  plugins: [react()],
  define: {
    "process.env": {},
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
});
