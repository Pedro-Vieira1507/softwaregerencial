import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-onclick-url, x-onclick-token, x-supabase-client-platform, x-supabase-client-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, payload } = await req.json()
    
    // Autenticação
    const rawKey = req.headers.get('x-onclick-token')
    const onclickKey = rawKey ? rawKey.trim() : null
    if (!onclickKey) throw new Error('Secret Key não fornecida.')

    const baseUrl = "http://api.onclick.com.br:8085"
    
    // SKU DE TESTE
    const SKU_TESTE = "23008" 

    const headersOnclick = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'secretKey': onclickKey,
      'company': '2',
      'businessUnit': '9'
    }

    // Validação Rápida
    const authCheck = await fetch(`${baseUrl}/api/v2/Company`, { method: 'GET', headers: headersOnclick })
    if (!authCheck.ok) throw new Error(`Auth Error: ${await authCheck.text()}`)

    let finalData = [];

    if (action === 'GET_PRODUCTS') {
        
        // 1. BUSCAR PRODUTO (PM996)
        let endpointProduct = ''
        const skuAlvo = payload?.sku || SKU_TESTE;
        
        if (skuAlvo) {
           endpointProduct = `/api/v2/Product/GetBySku/${skuAlvo}`
        } else {
           endpointProduct = '/api/v2/Product?limit=50' 
        }

        const respProd = await fetch(`${baseUrl}${endpointProduct}`, { method: 'GET', headers: headersOnclick });
        
        if (!respProd.ok) {
             return new Response(JSON.stringify([]), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        const jsonProd = await respProd.json();
        
        let productsList = [];
        if (jsonProd.products && Array.isArray(jsonProd.products)) {
            productsList = jsonProd.products;
        } else if (jsonProd.products === null) {
            productsList = [];
        }

        // 2. BUSCAR ESTOQUE COM FILTRAGEM RIGOROSA
        finalData = await Promise.all(productsList.map(async (produto) => {
            let estoqueFinal = 0;
            let achouEstoque = false;
            let debugStock = null;
            
            try {
                // Chamamos a API tentando filtrar. 
                // Se ela ignorar e mandar tudo (como aconteceu antes), nós filtramos abaixo.
                const urlEstoque = `${baseUrl}/api/v2/Stock?sku=${produto.sku}`;
                const respStock = await fetch(urlEstoque, { method: 'GET', headers: headersOnclick });

                if (respStock.ok) {
                    const jsonStock = await respStock.json();
                    debugStock = jsonStock; // Guarda para você ver o que veio

                    if (jsonStock.stocks && Array.isArray(jsonStock.stocks)) {
                        
                        // --- AQUI ESTÁ O FILTRO QUE VOCÊ PEDIU ---
                        // Nós ignoramos a ordem e procuramos EXATAMENTE o SKU PM996 dentro da lista
                        const itemCerto = jsonStock.stocks.find(s => 
                            s.sku && s.sku.toString().toUpperCase().trim() === produto.sku.toString().toUpperCase().trim()
                        );

                        if (itemCerto) {
                            // Se achou o sku na lista, pega o estoque dele
                            estoqueFinal = itemCerto.stock || 0;
                            achouEstoque = true;
                            console.log(`✅ ACHOU! SKU: ${produto.sku} | Estoque: ${estoqueFinal}`);
                        } else {
                            // Se a API mandou uma lista mas o sku não estava nela
                            console.log(`⚠️ Lista veio, mas SKU ${produto.sku} não estava nela.`);
                        }
                    }
                }
            } catch (err) {
                console.error(`Erro estoque:`, err);
            }

            return {
                ...produto, 
                name: produto.productName, 
                nome: produto.productName,
                
                // Valor encontrado (ou 0 se não achou)
                estoque: estoqueFinal,
                stock: estoqueFinal,
                
                // Debug para ver se funcionou
                _debug_encontrado: achouEstoque,
                _debug_raw: debugStock
            };
        }));

    } else if (action === 'GET_ORDERS') {
        const resp = await fetch(`${baseUrl}/api/v2/Order/GetQueue?limit=20`, { headers: headersOnclick });
        finalData = await resp.json();
    } else {
         return new Response(JSON.stringify({ msg: "Ação não implementada" }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify(finalData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})