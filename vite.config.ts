import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: "app",
  base: process.env.GRL_PAGES ? "/GRL/" : "/",
  resolve: { alias: { grl: resolve(__dirname, "src/index.ts") } },
  plugins: [react()],
  build: { outDir: "../dist-app", emptyOutDir: true },
});
