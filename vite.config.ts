import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "404-page",
      apply: "build",
      writeBundle({ dir = "dist" }) {
        copyFileSync(resolve(dir, "index.html"), resolve(dir, "404.html"));
      },
    },
  ],
});
