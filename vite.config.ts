import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1200,
    // IMPORTANTE: NÃO usar manualChunks customizado.
    // Forçar React/reactflow/etc em chunks separados causava
    // "Cannot read properties of undefined (reading 'useState')"
    // em produção, pois um vendor podia executar antes do chunk do React.
    // Deixamos o Rollup/Vite gerar o chunking padrão (seguro e ordenado).
  },
}));
