import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function WAChat() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <Card className="lg:col-span-3"><CardContent className="p-4 text-sm text-muted-foreground">Lista de conversas (em construção)</CardContent></Card>
      <Card className="lg:col-span-6">
        <CardContent className="flex h-[60vh] flex-col items-center justify-center gap-2 text-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">Chat realtime — implementação na Fase 3</div>
        </CardContent>
      </Card>
      <Card className="lg:col-span-3"><CardContent className="p-4 text-sm text-muted-foreground">Painel do contato</CardContent></Card>
    </div>
  );
}
