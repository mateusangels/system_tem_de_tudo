import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Nota: PWA (vite-plugin-pwa) foi REMOVIDO temporariamente porque o
// Service Worker estava servindo bundle antigo do cache depois de cada build,
// causando bugs persistentes (campos novos não eram enviados, etc).
// Pra reativar no futuro, basta voltar com `VitePWA({...})` no array de plugins
// e re-incluir `vite-plugin-pwa` no import.

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    laravel({
      input: ["resources/js/main.tsx"],
      refresh: true,
    }),
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./resources/js"),
    },
  },
}));
