import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { alphaTab as alphaTabVite } from "@coderline/alphatab-vite";
import path from "path";
const rawPort = process.env.PORT ?? "3000";
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    svelte(),
    alphaTabVite(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  optimizeDeps: {
    exclude: ["@coderline/alphatab"],
  },
  root: path.resolve(process.cwd()),
  build: {
    outDir: path.resolve(process.cwd(), "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: { strict: true },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
