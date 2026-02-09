import { useState, useEffect } from "react";

import { supabase } from "@/lib/utils";

import { PageHeader } from "@/components/layout/PageHeader";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { useToast } from "@/hooks/use-toast";

import { Settings, Key, Truck, CheckCircle2, XCircle, Loader2, ShoppingBag } from "lucide-react"; // Adicionei 'ShoppingBag'

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



  const { toast } = useToast();



  // Carrega as configurações salvas ao abrir a tela

  useEffect(() => {

    // Carregar Onclick

    const savedUrl = localStorage.getItem("onclick_base_url");

    const savedToken = localStorage.getItem("onclick_api_token");

    if (savedUrl) setBaseUrl(savedUrl);

    if (savedToken) setApiToken(savedToken);



    // Carregar Intelipost

    const savedInteliUrl = localStorage.getItem("intelipost_base_url");

    const savedInteliKey = localStorage.getItem("intelipost_api_key");

    if (savedInteliUrl) setIntelipostUrl(savedInteliUrl);

    if (savedInteliKey) setIntelipostKey(savedInteliKey);



    // Carregar BizCommerce

    const savedBizUrl = localStorage.getItem("biz_base_url");

    const savedBizToken = localStorage.getItem("biz_api_token");

    if (savedBizUrl) setBizUrl(savedBizUrl);

    if (savedBizToken) setBizToken(savedBizToken);

  }, []);



  // --- Handlers Onclick ---

  const handleSaveOnclick = () => {

    if (!baseUrl || !apiToken) {

      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Preencha a URL base e o Token da API Onclick." });

      return;

    }

    localStorage.setItem("onclick_base_url", baseUrl);

    localStorage.setItem("onclick_api_token", apiToken);

    toast({ title: "Configurações Onclick salvas", description: "As credenciais foram atualizadas." });

  };



  const handleTestOnclick = async () => {

    if (!baseUrl || !apiToken) {

      toast({ variant: "destructive", title: "Erro", description: "Preencha os campos antes de testar." });

      return;

    }

    setIsTesting(true);

    setConnectionStatus("idle");

    localStorage.setItem("onclick_base_url", baseUrl);

    localStorage.setItem("onclick_api_token", apiToken);



    try {

      const { data, error } = await supabase.functions.invoke('onclick-proxy', {

        body: { action: 'GET_PRODUCTS' },

        headers: { 'x-onclick-url': baseUrl, 'x-onclick-token': apiToken }

      });



      if (error) throw error;

      if (data && (data.error || data.message)) throw new Error(data.error || data.message);



      setConnectionStatus("success");

      toast({ title: "Sucesso!", description: "Conexão com o Onclick estabelecida." });

    } catch (error: any) {

      setConnectionStatus("error");

      toast({ variant: "destructive", title: "Falha na conexão", description: error.message || "Verifique a URL e o Token." });

    } finally {

      setIsTesting(false);

    }

  };



  // --- Handlers Intelipost ---

  const handleSaveIntelipost = () => {

    if (!intelipostUrl || !intelipostKey) {

      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Preencha a URL e a API Key da Intelipost." });

      return;

    }

    localStorage.setItem("intelipost_base_url", intelipostUrl);

    localStorage.setItem("intelipost_api_key", intelipostKey);

    toast({ title: "Configurações Intelipost salvas", description: "As credenciais foram atualizadas." });

  };



  const handleTestIntelipost = async () => {

    if (!intelipostUrl || !intelipostKey) {

      toast({ variant: "destructive", title: "Erro", description: "Preencha os campos antes de testar." });

      return;

    }

    setIsTestingIntelipost(true);

    setIntelipostStatus("idle");

    localStorage.setItem("intelipost_base_url", intelipostUrl);

    localStorage.setItem("intelipost_api_key", intelipostKey);



    try {

      const { data, error } = await supabase.functions.invoke('intelipost-proxy', {

        body: { action: 'TEST_CONNECTION' },

        headers: { 'x-intelipost-url': intelipostUrl, 'api-key': intelipostKey }

      });



      if (error) throw error;

      if (data && (data.error || (data.status && data.status !== "OK"))) throw new Error(data.error || "Erro de resposta da API");



      setIntelipostStatus("success");

      toast({ title: "Sucesso!", description: "Conexão com a Intelipost estabelecida." });

    } catch (error: any) {

      setIntelipostStatus("error");

      toast({ variant: "destructive", title: "Falha na conexão Intelipost", description: error.message || "Verifique a Chave de API." });

    } finally {

      setIsTestingIntelipost(false);

    }

  };



  // --- Handlers BizCommerce ---

  const handleSaveBiz = () => {

    if (!bizUrl || !bizToken) {

      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Preencha a URL e o Token da BizCommerce." });

      return;

    }

    localStorage.setItem("biz_base_url", bizUrl);

    localStorage.setItem("biz_api_token", bizToken);

    toast({ title: "Configurações BizCommerce salvas", description: "As credenciais foram atualizadas." });

  };



  const handleTestBiz = async () => {

    if (!bizUrl || !bizToken) {

      toast({ variant: "destructive", title: "Erro", description: "Preencha os campos antes de testar." });

      return;

    }

    setIsTestingBiz(true);

    setBizStatus("idle");

    localStorage.setItem("biz_base_url", bizUrl);

    localStorage.setItem("biz_api_token", bizToken);



    try {

      // Usamos a função 'sync-magento-orders' que criamos antes.

      // Passamos o token no header para testar se ele é válido,

      // mesmo que a função tenha um token padrão no .env, é bom garantir que este funciona.

      const { data, error } = await supabase.functions.invoke('sync-magento-orders', {

        headers: {

          'Authorization': `Bearer ${bizToken}`,

          'x-magento-url': bizUrl

        }

      });



      if (error) throw error;

     

      // Se a função retornar erro de autenticação (401) ou outro erro

      if (data && data.message && data.message.includes("401")) {

         throw new Error("Acesso negado. Verifique o Token.");

      }



      setBizStatus("success");

      toast({ title: "Sucesso!", description: "Conexão com BizCommerce verificada." });

    } catch (error: any) {

      console.error("Erro BizCommerce:", error);

      setBizStatus("error");

      toast({ variant: "destructive", title: "Falha na conexão", description: error.message || "Erro ao conectar com Magento." });

    } finally {

      setIsTestingBiz(false);

    }

  };



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



        {/* CARD 2: BIZCOMMERCE (MAGENTO) - NOVO */}

        <Card className="shadow-card border-orange-200">

          <CardHeader>

            <CardTitle className="text-lg font-heading flex items-center gap-2">

              <ShoppingBag className="w-5 h-5 text-orange-600" /> Credenciais BizCommerce

            </CardTitle>

            <CardDescription>Conexão com loja Magento 2 (Forlab Express).</CardDescription>

          </CardHeader>

          <CardContent className="space-y-4">

            <div className="space-y-2">

              <Label htmlFor="bizUrl">URL da Loja</Label>

              <Input id="bizUrl" placeholder="Ex: https://www.forlabexpress.com.br" value={bizUrl} onChange={(e) => setBizUrl(e.target.value)} />

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