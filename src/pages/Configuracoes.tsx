import { useState, useEffect } from "react";
import { supabase } from "@/lib/utils"; // Confirme se o seu import correto não seria "@/lib/supabase"
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Truck, CheckCircle2, XCircle, Loader2, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Configuracoes() {
  // --- Estados Onclick ---
  const [baseUrl, setBaseUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");

  // --- Estados Intelipost ---
  const [intelipostUrl, setIntelipostUrl] = useState("https://api.intelipost.com.br/api/v1/");
  const [intelipostKey, setIntelipostKey] = useState("");
  const [isTestingIntelipost, setIsTestingIntelipost] = useState(false);
  const [intelipostStatus, setIntelipostStatus] = useState<"idle" | "success" | "error">("idle");

  // --- Estados BizCommerce (Magento) ---
  const [bizUrl, setBizUrl] = useState("https://www.forlabexpress.com.br");
  const [bizToken, setBizToken] = useState("");
  const [isTestingBiz, setIsTestingBiz] = useState(false);
  const [bizStatus, setBizStatus] = useState<"idle" | "success" | "error">("idle");

  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true);

  const { toast } = useToast();

  // ==========================================
  // CARREGAR DO BANCO DE DADOS (SUPABASE)
  // ==========================================
  useEffect(() => {
    async function loadConfigs() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase
          .from('configuracoes_empresa')
          .select('onclick_url, onclick_token, intelipost_url, intelipost_token, magento_url, magento_token')
          .eq('user_id', session.user.id)
          .maybeSingle(); // Permite retornar vazio sem dar erro 406

        if (error) throw error;

        if (data) {
          if (data.onclick_url) setBaseUrl(data.onclick_url);
          if (data.onclick_token) setApiToken(data.onclick_token);
          if (data.intelipost_url) setIntelipostUrl(data.intelipost_url);
          if (data.intelipost_token) setIntelipostKey(data.intelipost_token);
          if (data.magento_url) setBizUrl(data.magento_url);
          if (data.magento_token) setBizToken(data.magento_token);
        }
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      } finally {
        setIsLoadingConfigs(false);
      }
    }
    loadConfigs();
  }, []);

  // ==========================================
  // FUNÇÃO GLOBAL DE SALVAMENTO NO SUPABASE
  // ==========================================
  const saveToDatabase = async (updateData: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado");

      // UPSERT: Se não existir a linha da empresa, cria. Se existir, atualiza!
      const { error } = await supabase
        .from('configuracoes_empresa')
        .upsert(
          { user_id: session.user.id, ...updateData }, 
          { onConflict: 'user_id' }
        );

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
      return false;
    }
  };

  // --- Handlers Onclick ---
  const handleSaveOnclick = async () => {
    if (!baseUrl || !apiToken) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Preencha a URL base e o Token da API Onclick." });
      return;
    }
    // Fallback local
    localStorage.setItem("onclick_base_url", baseUrl);
    localStorage.setItem("onclick_api_token", apiToken);
    
    // Salva na Nuvem
    const sucesso = await saveToDatabase({ onclick_url: baseUrl, onclick_token: apiToken });
    if (sucesso) toast({ title: "Configurações Onclick salvas", description: "As credenciais foram atualizadas na nuvem." });
  };

  const handleTestOnclick = async () => {
    if (!baseUrl || !apiToken) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha os campos antes de testar." });
      return;
    }
    setIsTesting(true);
    setConnectionStatus("idle");

    try {
      const { data, error } = await supabase.functions.invoke('onclick-proxy', {
        body: { action: 'GET_PRODUCTS' },
        headers: { 'x-onclick-url': baseUrl, 'x-onclick-token': apiToken }
      });

      if (error) throw error;
      if (data && (data.error || data.message)) throw new Error(data.error || data.message);

      setConnectionStatus("success");
      toast({ title: "Sucesso!", description: "Conexão com o Onclick estabelecida." });
      handleSaveOnclick(); // Auto-salva se testar e der certo
    } catch (error: any) {
      setConnectionStatus("error");
      toast({ variant: "destructive", title: "Falha na conexão", description: error.message || "Verifique a URL e o Token." });
    } finally {
      setIsTesting(false);
    }
  };

  // --- Handlers Intelipost ---
  const handleSaveIntelipost = async () => {
    if (!intelipostUrl || !intelipostKey) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Preencha a URL e a API Key da Intelipost." });
      return;
    }
    // Fallback local
    localStorage.setItem("intelipost_base_url", intelipostUrl);
    localStorage.setItem("intelipost_api_key", intelipostKey);
    
    const sucesso = await saveToDatabase({ intelipost_url: intelipostUrl, intelipost_token: intelipostKey });
    if (sucesso) toast({ title: "Configurações Intelipost salvas", description: "As credenciais foram atualizadas na nuvem." });
  };

  const handleTestIntelipost = async () => {
    if (!intelipostUrl || !intelipostKey) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha os campos antes de testar." });
      return;
    }
    setIsTestingIntelipost(true);
    setIntelipostStatus("idle");

    try {
      const { data, error } = await supabase.functions.invoke('intelipost-proxy', {
        body: { action: 'TEST_CONNECTION' },
        headers: { 'x-intelipost-url': intelipostUrl, 'api-key': intelipostKey }
      });

      if (error) throw error;
      if (data && (data.error || (data.status && data.status !== "OK"))) throw new Error(data.error || "Erro de resposta da API");

      setIntelipostStatus("success");
      toast({ title: "Sucesso!", description: "Conexão com a Intelipost estabelecida." });
      handleSaveIntelipost();
    } catch (error: any) {
      setIntelipostStatus("error");
      toast({ variant: "destructive", title: "Falha na conexão Intelipost", description: error.message || "Verifique a Chave de API." });
    } finally {
      setIsTestingIntelipost(false);
    }
  };

  // --- Handlers BizCommerce ---
  const handleSaveBiz = async () => {
    if (!bizUrl || !bizToken) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Preencha a URL e o Token da BizCommerce." });
      return;
    }
    // Fallback local
    localStorage.setItem("biz_base_url", bizUrl);
    localStorage.setItem("biz_api_token", bizToken);
    
    const sucesso = await saveToDatabase({ magento_url: bizUrl, magento_token: bizToken });
    if (sucesso) toast({ title: "Configurações BizCommerce salvas", description: "As credenciais foram atualizadas na nuvem." });
  };

  const handleTestBiz = async () => {
    if (!bizUrl || !bizToken) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha os campos antes de testar." });
      return;
    }
    setIsTestingBiz(true);
    setBizStatus("idle");

    try {
      const { data, error } = await supabase.functions.invoke('sync-magento-orders', {
        headers: {
          'Authorization': `Bearer ${bizToken}`,
          'x-magento-url': bizUrl
        }
      });

      if (error) throw error;
      if (data && data.message && data.message.includes("401")) {
         throw new Error("Acesso negado. Verifique o Token.");
      }

      setBizStatus("success");
      toast({ title: "Sucesso!", description: "Conexão com BizCommerce verificada." });
      handleSaveBiz();
    } catch (error: any) {
      console.error("Erro BizCommerce:", error);
      setBizStatus("error");
      toast({ variant: "destructive", title: "Falha na conexão", description: error.message || "Erro ao conectar com Magento." });
    } finally {
      setIsTestingBiz(false);
    }
  };

  if (isLoadingConfigs) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;
  }

  return (
    <div>
      <PageHeader title="Configurações" description="Integrações ERP e Logística" />

      <div className="grid gap-6 max-w-2xl">
        
        {/* CARD 1: ONCLICK */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" /> Credenciais Onclick (ERP)
            </CardTitle>
            <CardDescription>Dados de conexão com o Onclick.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="baseUrl">URL Base da API</Label>
              <Input id="baseUrl" placeholder="Ex: https://api.onclick.com.br/api/v1" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiToken">Token de Acesso (API Key)</Label>
              <Input id="apiToken" type="password" placeholder="Cole seu Token aqui" value={apiToken} onChange={(e) => setApiToken(e.target.value)} />
            </div>
            {connectionStatus !== "idle" && (
              <div className={cn("flex items-center gap-2 p-3 rounded-lg", connectionStatus === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                {connectionStatus === "success" ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span className="font-medium">{connectionStatus === "success" ? "Conectado com sucesso!" : "Falha na conexão."}</span>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSaveOnclick} variant="outline">Salvar</Button>
              <Button onClick={handleTestOnclick} disabled={isTesting}>
                {isTesting ? <Loader2 className="animate-spin mr-2" /> : "Testar Conexão"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: BIZCOMMERCE (MAGENTO) */}
        <Card className="shadow-card border-orange-200">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-600" /> Credenciais BizCommerce
            </CardTitle>
            <CardDescription>Conexão com loja Magento 2.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bizUrl">URL da Loja</Label>
              <Input id="bizUrl" placeholder="Ex: https://www.sua-loja.com.br" value={bizUrl} onChange={(e) => setBizUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bizToken">Access Token (Integration)</Label>
              <Input id="bizToken" type="password" placeholder="Token de Integração do Magento" value={bizToken} onChange={(e) => setBizToken(e.target.value)} />
              <p className="text-xs text-muted-foreground">Gerado no Admin em: System {'>'} Extensions {'>'} Integrations.</p>
            </div>
            {bizStatus !== "idle" && (
              <div className={cn("flex items-center gap-2 p-3 rounded-lg", bizStatus === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                {bizStatus === "success" ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span className="font-medium">{bizStatus === "success" ? "Loja Conectada!" : "Falha na conexão."}</span>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSaveBiz} variant="outline">Salvar</Button>
              <Button onClick={handleTestBiz} disabled={isTestingBiz} className="bg-orange-600 hover:bg-orange-700">
                {isTestingBiz ? <Loader2 className="animate-spin mr-2" /> : "Testar Magento"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: INTELIPOST */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" /> Credenciais Intelipost (TMS)
            </CardTitle>
            <CardDescription>Configuração de API para cálculo de frete e rastreio.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="intelipostUrl">URL Base da API</Label>
              <Input id="intelipostUrl" placeholder="Ex: https://api.intelipost.com.br/api/v1/" value={intelipostUrl} onChange={(e) => setIntelipostUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="intelipostKey">API Key (Chave de Acesso)</Label>
              <Input id="intelipostKey" type="password" placeholder="Cole sua API Key Intelipost aqui" value={intelipostKey} onChange={(e) => setIntelipostKey(e.target.value)} />
            </div>
            {intelipostStatus !== "idle" && (
              <div className={cn("flex items-center gap-2 p-3 rounded-lg", intelipostStatus === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                {intelipostStatus === "success" ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span className="font-medium">{intelipostStatus === "success" ? "Intelipost Conectado!" : "Falha na conexão Intelipost."}</span>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSaveIntelipost} variant="outline">Salvar</Button>
              <Button onClick={handleTestIntelipost} disabled={isTestingIntelipost} className="bg-blue-600 hover:bg-blue-700">
                {isTestingIntelipost ? <Loader2 className="animate-spin mr-2" /> : "Testar Intelipost"}
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}