import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "static-pages",
      apply: "build",
      writeBundle({ dir = "dist" }) {
        copyFileSync(resolve(dir, "index.html"), resolve(dir, "404.html"));
        const index = readFileSync(resolve(dir, "index.html"), "utf8");
        for (const [path, title, description] of [
          ["dynamical-systems", "Dynamical systems &amp; strange attractors | Dot / Lab", "Explore eight dynamical systems with live equations, parameter controls, and standalone React TSX export."],
          ["loaders", "Dot loaders for AI interfaces | Dot / Lab", "Nine animated states in a 27-dot cube. Customize motion, color, spacing, and viewing angle, then export a standalone React loader."],
        ]) {
          mkdirSync(resolve(dir, path), { recursive: true });
          const html = index
            .replaceAll("Dot / Lab — Dot animations for React", title)
            .replaceAll("20 free dot animations for React. Customize color, speed, and density, then copy or download the component.", description)
            .replaceAll('"https://dotlab.grantpedersen.com/"', `"https://dotlab.grantpedersen.com/${path}/"`);
          writeFileSync(resolve(dir, path, "index.html"), html);
        }
      },
    },
  ],
});
