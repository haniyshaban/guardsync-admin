import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  // Avoid Vite pre-bundling a stale optimized react-leaflet build that can
  // incorrectly render Context as a Consumer (causing: "render2 is not a function").
  optimizeDeps: {
    exclude: ["react-leaflet", "@react-leaflet/core", "leaflet"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
