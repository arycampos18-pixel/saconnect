import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const publicEnv = {
    VITE_SUPABASE_URL: env.VITE_SUPABASE_URL || "https://ktwdgnkurtalclsgxfov.supabase.co",
    VITE_SUPABASE_PUBLISHABLE_KEY:
      env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0d2Rnbmt1cnRhbGNsc2d4Zm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2ODEzOTEsImV4cCI6MjA5MzI1NzM5MX0.8gJkKBMuSBWamNE27uXF3k1ZcQ98dO18o6eQlBdvXTw",
    VITE_SUPABASE_PROJECT_ID: env.VITE_SUPABASE_PROJECT_ID || "ktwdgnkurtalclsgxfov",
    // Proxy path para OTP da pesquisa pública. Vazio = chama Supabase direto (pode falhar por CORS/rede).
    VITE_PUBLIC_OTP_SEND_URL: env.VITE_PUBLIC_OTP_SEND_URL || "",
  };

  const supabaseOrigin = (publicEnv.VITE_SUPABASE_URL || "").replace(/\/$/, "");

  return {
    define: {
      // Variáveis de ambiente públicas (Supabase + proxy OTP)
      ...Object.fromEntries(
        Object.entries(publicEnv).map(([key, value]) => [
          `import.meta.env.${key}`,
          JSON.stringify(value),
        ]),
      ),
      // Timestamp do build — muda a cada deploy; usado pelo buildGuard para
      // detectar novo deploy e forçar nova sessão no browser.
      __BUILD_EPOCH__: JSON.stringify(Date.now()),
    },
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      // Com VITE_PUBLIC_OTP_SEND_URL=/api/public-enviar-otp no .env, o dev server
      // encaminha para a Edge Function (evita "Failed to fetch" a *.supabase.co).
      proxy:
        supabaseOrigin.startsWith("http")
          ? {
              "/api/public-enviar-otp": {
                target: supabaseOrigin,
                changeOrigin: true,
                secure: true,
                rewrite: () => "/functions/v1/public-enviar-otp",
              },
            }
          : undefined,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react-router-dom",
        "@supabase/supabase-js",
        "@tanstack/react-query",
        "lucide-react",
        "sonner",
        "zod",
        "date-fns",
        "recharts",
      ],
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
  };
});
