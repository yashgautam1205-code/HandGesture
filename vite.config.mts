import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "copy-vehicle-catalogue",
      apply: "build",
      async closeBundle() {
        const outputDirectory = path.join(projectRoot, "dist", "vehicles");
        await mkdir(outputDirectory, { recursive: true });
        await copyFile(
          path.join(projectRoot, "src", "vehicles", "manifest.json"),
          path.join(outputDirectory, "manifest.json"),
        );
      },
    },
  ],
  test: {
    environment: "node",
  },
  build: {
    chunkSizeWarningLimit: 700,
  },
});
