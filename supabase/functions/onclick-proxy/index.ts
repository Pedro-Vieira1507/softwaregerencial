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
        
        let stockMap = new Map(); 
        let skusToProcess = new Set<string>();
        let debugMap = new Map(); // Mapa para guardar o status da API

        // 1. LEITURA DA FILA DE ESTOQUE
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

        // 2. AUTOCORREÇÃO (Pega 50 produtos que ainda estão como 'Não'/'0')
        // Isso garante que o DP10 seja pego eventualmente
        const { data: missingParents } = await supabase
            .from('produtos_cache')
            .select('sku')
            .or('parent_sku.eq.0,parent_sku.is.null')
            .limit(50);

        if (missingParents) {
            missingParents.forEach((p: any) => {
                if(p.sku) skusToProcess.add(p.sku.toString().trim());
            });
        }

        // 3. PROCESSAMENTO (API -> BANCO)
        if (skusToProcess.size > 0) {
            const itemsToUpsert = await Promise.all(Array.from(skusToProcess).map(async (sku) => {
                let nome = "Produto Sincronizado";
                let parentSku = "0"; 
                let debugInfo = {};

                // Lógica de Estoque (Preserva o banco se não veio da fila)
                let estoqueCalculado = 0;
                if (stockMap.has(sku)) {
                     estoqueCalculado = (stockMap.get(sku) ?? 0) - 1000;
                } else {
                     const { data: current } = await supabase.from('produtos_cache').select('estoque, nome').eq('sku', sku).single();
                     estoqueCalculado = current?.estoque || 0;
                     if (current?.nome) nome = current.nome;
                }

                try {
                    // Busca PAI na API
                    const urlParent = `${baseUrl}/api/v2/ParentSku?sku=${encodeURIComponent(sku)}`;
                    const respParent = await fetch(urlParent, { method: 'GET', headers: headersOnclick });
                    const textParent = await respParent.text();
                    
                    try {
                        const jsonParent = JSON.parse(textParent);
                        debugInfo = { status: respParent.status, response: jsonParent };

                        if (respParent.ok && jsonParent.success && jsonParent.parentSku) {
                            parentSku = jsonParent.parentSku;
                        }
                    } catch {
                        debugInfo = { error: "JSON Inválido", raw: textParent };
                    }
                } catch (err) { debugInfo = { error: err.message }; }

                // Guarda o debug
                debugMap.set(sku, debugInfo);

                return {
                    sku: sku,
                    nome: nome,
                    estoque: estoqueCalculado,
                    parent_sku: parentSku, // AGORA VAI SALVAR NO BANCO!
                    ultima_atualizacao: new Date().toISOString()
                };
            }));

            // Salva no banco (Agora a coluna existe, então vai funcionar!)
            const { error } = await supabase
                .from('produtos_cache')
                .upsert(itemsToUpsert, { onConflict: 'sku' });
            
            if (error) console.error("Erro ao salvar:", error);
        }

        // 4. LEITURA FINAL (Lê tudo do banco)
        const { data: fullList, error: dbError } = await supabase
            .from('produtos_cache')
            .select('*')
            .order('nome', { ascending: true });

        if (dbError) throw dbError;

        // Anexa o debug nos itens processados para você conferir no Network
        const responseWithDebug = fullList?.map((item: any) => {
            const debug = debugMap.get(item.sku);
            return debug ? { ...item, _debug_api: debug } : item;
        });

        return new Response(JSON.stringify(responseWithDebug), {
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