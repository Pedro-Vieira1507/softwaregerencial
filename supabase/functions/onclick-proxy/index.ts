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
    
    // Configurações
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
        
        console.log("🛠️ Sincronizando Estoque + SKU Pai...");

        // 1. BAIXAR A FILA DE ESTOQUE
        let stockMap = new Map(); 
        let skusToProcess = new Set<string>();

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
        } catch (e) { console.error("Erro Stock Queue:", e); }

        // 2. PROCESSAR CADA SKU
        if (skusToProcess.size > 0) {
            const itemsToUpsert = await Promise.all(Array.from(skusToProcess).map(async (sku) => {
                let nome = "Produto Sincronizado";
                let parentSku = "0"; // Valor padrão
                
                // Regra de Estoque (-1000)
                const estoqueOriginal = stockMap.get(sku) ?? 0;
                const estoqueCalculado = estoqueOriginal - 1000;

                try {
                    // A. BUSCA DETALHES DO PRODUTO (NOME)
                    const respProd = await fetch(`${baseUrl}/api/v2/Product/GetBySku/${sku}`, { method: 'GET', headers: headersOnclick });
                    if (respProd.ok) {
                        const json = await respProd.json();
                        if (json.products && json.products.length > 0) {
                            nome = json.products[0].productName;
                        }
                    }

                    // B. BUSCA SKU PAI (NOVO ENDPOINT)
                    const respParent = await fetch(`${baseUrl}/api/v2/ParentSku?sku=${sku}`, { method: 'GET', headers: headersOnclick });
                    if (respParent.ok) {
                        const jsonParent = await respParent.json();
                        // Se vier null ou vazio, mantemos "0"
                        if (jsonParent.success && jsonParent.parentSku) {
                            parentSku = jsonParent.parentSku;
                        }
                    }

                } catch (err) {
                    console.error(`Erro ao enriquecer SKU ${sku}:`, err);
                }

                return {
                    sku: sku,
                    nome: nome,
                    estoque: estoqueCalculado,
                    parent_sku: parentSku, // Campo novo no banco
                    ultima_atualizacao: new Date().toISOString()
                };
            }));

            // Salva no Supabase
            const { error } = await supabase
                .from('produtos_cache')
                .upsert(itemsToUpsert, { onConflict: 'sku' });
            
            if (error) console.error("Erro Supabase:", error);
        }

        // 3. RETORNAR DADOS DO BANCO
        const { data: cachedProducts, error: dbError } = await supabase
            .from('produtos_cache')
            .select('*')
            .order('ultima_atualizacao', { ascending: false });

        if (dbError) throw dbError;

        return new Response(JSON.stringify(cachedProducts), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    return new Response(JSON.stringify({ msg: "Action not found" }), { headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})