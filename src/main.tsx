import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { runBuildGuard } from "./lib/buildGuard";
import { supabase } from "@/integrations/supabase/client";

// Detecta novo deploy e força nova sessão antes de montar o React.
// Se houve mudança de build: sign-out Supabase → limpa storage → reload.
runBuildGuard(() => supabase.auth.signOut()).then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
