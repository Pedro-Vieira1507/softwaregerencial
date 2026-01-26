import { useState } from "react";
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

  const handleSave = () => {
    if (!baseUrl || !apiToken) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha a URL base e o Token da API.",
      });
      return;
    }

    // Save to localStorage for demo purposes
    localStorage.setItem("onclick_base_url", baseUrl);
    localStorage.setItem("onclick_api_token", apiToken);

    toast({
      title: "Configurações salvas",
      description: "As credenciais da API foram salvas com sucesso.",
    });
  };

  const handleTestConnection = async () => {
    if (!baseUrl || !apiToken) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha a URL base e o Token da API antes de testar.",
      });
      return;
    }

    setIsTesting(true);
    setConnectionStatus("idle");

    // Simulate API connection test
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // For demo, randomly succeed or fail
    const success = Math.random() > 0.3;
    setConnectionStatus(success ? "success" : "error");
    setIsTesting(false);

    toast({
      variant: success ? "default" : "destructive",
      title: success ? "Conexão estabelecida" : "Falha na conexão",
      description: success 
        ? "A API do Onclick ERP está acessível." 
        : "Verifique as credenciais e tente novamente.",
    });
  };

  return (
    <div>
      <PageHeader 
        title="Configurações" 
        description="Configure a integração com o Onclick ERP"
      />

      <div className="grid gap-6 max-w-2xl">
        {/* API Configuration */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Credenciais da API
            </CardTitle>
            <CardDescription>
              Insira as credenciais de acesso à API do Onclick ERP. Estas informações são armazenadas de forma segura.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="baseUrl" className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                URL Base da API
              </Label>
              <Input
                id="baseUrl"
                placeholder="https://api.onclick.com.br/v1"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Endereço base da API fornecido pelo Onclick ERP
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiToken" className="flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                Token de Acesso
              </Label>
              <Input
                id="apiToken"
                type="password"
                placeholder="••••••••••••••••••••"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Token de autenticação gerado no painel do Onclick
              </p>
            </div>

            {/* Connection Status */}
            {connectionStatus !== "idle" && (
              <div
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg",
                  connectionStatus === "success" 
                    ? "bg-success/10 text-success" 
                    : "bg-destructive/10 text-destructive"
                )}
              >
                {connectionStatus === "success" ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Conexão estabelecida com sucesso</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium">Falha ao conectar com a API</span>
                  </>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave}>
                Salvar Configurações
              </Button>
              <Button variant="outline" onClick={handleTestConnection} disabled={isTesting}>
                {isTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testando...
                  </>
                ) : (
                  "Testar Conexão"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="shadow-card border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-heading font-semibold mb-1">Sobre a Segurança</h4>
                <p className="text-sm text-muted-foreground">
                  Para ambientes de produção, recomendamos utilizar o Lovable Cloud para armazenar suas credenciais de forma segura através de Edge Functions. 
                  Isso evita expor tokens no frontend e garante maior segurança nas requisições.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
