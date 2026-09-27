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
        mkdirSync(resolve(dir, "dynamical-systems"), { recursive: true });
        const systemsHtml = readFileSync(resolve(dir, "index.html"), "utf8")
          .replaceAll("Dot / Lab — Dot animations for React", "Dynamical systems &amp; strange attractors | Dot / Lab")
          .replaceAll("20 free dot animations for React. Customize color, speed, and density, then copy or download the component.", "Explore eight dynamical systems with live equations, parameter controls, and standalone React TSX export.")
          .replaceAll('"https://dotlab.grantpedersen.com/"', '"https://dotlab.grantpedersen.com/dynamical-systems/"');
        writeFileSync(resolve(dir, "dynamical-systems/index.html"), systemsHtml);
      },
    },
  ],
});
