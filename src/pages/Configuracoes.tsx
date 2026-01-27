import { useState, useEffect } from "react";
import { supabase } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Key, Globe, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Configuracoes() {
  const [baseUrl, setBaseUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const { toast } = useToast();

  // Carrega as configurações salvas ao abrir a tela
  useEffect(() => {
    const savedUrl = localStorage.getItem("onclick_base_url");
    const savedToken = localStorage.getItem("onclick_api_token");
    if (savedUrl) setBaseUrl(savedUrl);
    if (savedToken) setApiToken(savedToken);
  }, []);

  const handleSave = () => {
    if (!baseUrl || !apiToken) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha a URL base e o Token da API.",
      });
      return;
    }

    // Salva no navegador
    localStorage.setItem("onclick_base_url", baseUrl);
    localStorage.setItem("onclick_api_token", apiToken);

    toast({
      title: "Configurações salvas",
      description: "As credenciais foram atualizadas.",
    });
  };

  const handleTestConnection = async () => {
    if (!baseUrl || !apiToken) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha os campos antes de testar." });
      return;
    }

    setIsTesting(true);
    setConnectionStatus("idle");
    
    // Salva antes de testar para garantir que a função use os dados novos
    localStorage.setItem("onclick_base_url", baseUrl);
    localStorage.setItem("onclick_api_token", apiToken);

    try {
      console.log("Iniciando teste de conexão...");
      const { data, error } = await supabase.functions.invoke('onclick-proxy', {
        body: { action: 'GET_PRODUCTS' }, // Tenta buscar produtos para ver se a chave funciona
        headers: {
          'x-onclick-url': baseUrl,
          'x-onclick-token': apiToken
        }
      });

      if (error) throw error;

      // Se a API retornou erro (ex: 401 Unauthorized), o proxy retorna sucesso HTTP mas com json de erro ou vazio
      if (data && (data.error || data.message)) {
         throw new Error(data.error || data.message);
      }

      setConnectionStatus("success");
      toast({
        title: "Sucesso!",
        description: "Conexão com o Onclick estabelecida.",
      });

    } catch (error: any) {
      console.error("Erro no teste:", error);
      setConnectionStatus("error");
      toast({
        variant: "destructive",
        title: "Falha na conexão",
        description: error.message || "Verifique a URL e o Token.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Configurações" description="Integração Onclick ERP" />

      <div className="grid gap-6 max-w-2xl">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" /> Credenciais da API
            </CardTitle>
            <CardDescription>
              Dados de conexão com o Onclick.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="baseUrl">URL Base da API</Label>
              <Input
                id="baseUrl"
                placeholder="Ex: https://api.onclick.com.br/api/v1"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiToken">Token de Acesso (API Key)</Label>
              <Input
                id="apiToken"
                type="password"
                placeholder="Cole seu Token aqui"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground text-yellow-600">
                Atenção: Não use sua senha de login. Use a chave gerada no ERP.
              </p>
            </div>

            {connectionStatus !== "idle" && (
              <div className={cn("flex items-center gap-2 p-3 rounded-lg", connectionStatus === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                {connectionStatus === "success" ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span className="font-medium">
                  {connectionStatus === "success" ? "Conectado com sucesso!" : "Falha na conexão."}
                </span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} variant="outline">Salvar</Button>
              <Button onClick={handleTestConnection} disabled={isTesting}>
                {isTesting ? <Loader2 className="animate-spin mr-2" /> : "Testar Conexão"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}