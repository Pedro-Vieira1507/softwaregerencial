import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-onclick-url, x-onclick-token, x-supabase-client-platform, x-supabase-client-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { action } = await req.json()
    
    const rawKey = req.headers.get('x-onclick-token')
    const onclickKey = rawKey ? rawKey.trim() : null
    const baseUrl = "http://api.onclick.com.br:8085"
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const headersOnclick = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'secretKey': onclickKey,
      'company': '2',
      'businessUnit': '9'
    }

    if (action === 'GET_PRODUCTS') {
        
        console.log("🕵️ Iniciando Diagnóstico de SKU Pai...");

        let stockMap = new Map(); 
        let skusToProcess = new Set<string>();

        // 1. Pega estoque
        try {
            const resp = await fetch(`${baseUrl}/api/v2/Stock?limit=100`, { method: 'GET', headers: headersOnclick });
            if (resp.ok) {
                const json = await resp.json();
                if (json.stocks) {
                    json.stocks.forEach((item: any) => {
                        const cleanSku = item.sku.toString().trim();
                        stockMap.set(cleanSku, item.stock);
                        skusToProcess.add(cleanSku);
                    });
                }
            }
        } catch (e) { console.error("Erro Stock:", e); }

        // 2. Processa cada produto
        if (skusToProcess.size > 0) {
            const itemsToUpsert = await Promise.all(Array.from(skusToProcess).map(async (sku) => {
                let nome = "Produto Sincronizado";
                let parentSku = "0"; 
                
                // Debug: Variável para guardar o que a API respondeu
                let debugApiResponse = null;
                let debugUrl = `${baseUrl}/api/v2/ParentSku?sku=${sku}`;

                const estoqueOriginal = stockMap.get(sku) ?? 0;
                const estoqueCalculado = estoqueOriginal - 1000;

                try {
                    // A. Dados Básicos
                    const respProd = await fetch(`${baseUrl}/api/v2/Product/GetBySku/${sku}`, { method: 'GET', headers: headersOnclick });
                    if (respProd.ok) {
                        const json = await respProd.json();
                        if (json.products && json.products.length > 0) nome = json.products[0].productName;
                    }

                    // B. SKU PAI (COM LOG DE ERRO/SUCESSO)
                    const respParent = await fetch(debugUrl, { method: 'GET', headers: headersOnclick });
                    const textParent = await respParent.text(); // Pega texto puro para não falhar no JSON.parse
                    
                    try {
                        const jsonParent = JSON.parse(textParent);
                        debugApiResponse = jsonParent; // Guarda o JSON real para você ver

                        if (respParent.ok && jsonParent.success && jsonParent.parentSku) {
                            parentSku = jsonParent.parentSku;
                        }
                    } catch (parseError) {
                        debugApiResponse = { error: "JSON Inválido", raw: textParent };
                    }

                } catch (err) {
                    debugApiResponse = { error: "Falha na Requisição", details: err.message };
                }

                // C. Retorna objeto para o Banco + LOG
                return {
                    sku: sku,
                    nome: nome,
                    estoque: estoqueCalculado,
                    parent_sku: parentSku,
                    ultima_atualizacao: new Date().toISOString(),
                    
                    // CAMPO SECRETO DE DEBUG (Vai aparecer no console do navegador, mas não salvará no banco se a coluna não existir)
                    _debug_parent_api: {
                        url: debugUrl,
                        response: debugApiResponse
                    }
                };
            }));

            // Tenta salvar no banco (removemos o campo _debug antes de salvar para não dar erro)
            const itemsToSave = itemsToUpsert.map(({ _debug_parent_api, ...rest }) => rest);

            const { error } = await supabase
                .from('produtos_cache')
                .upsert(itemsToSave, { onConflict: 'sku' });
            
            if (error) console.error("Erro Supabase:", error);

            // RETORNO PARA O FRONTEND (Inclui o _debug)
            // Aqui mandamos a lista completa com o campo _debug para você analisar
            return new Response(JSON.stringify(itemsToUpsert), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }
        
        // Se não tiver nada para processar, retorna o cache do banco
        const { data } = await supabase.from('produtos_cache').select('*');
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ msg: "Action not found" }), { headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})