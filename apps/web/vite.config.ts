import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// `pnpm dev` runs this alongside `wrangler dev` (port 8787); /api goes to the Worker.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8787" },
  },
});
