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
    
    const onclickUrl = req.headers.get('x-onclick-url')
    const onclickToken = req.headers.get('x-onclick-token')

    if (!onclickUrl || !onclickToken) {
      throw new Error('Configurações de API ausentes.')
    }

    const baseUrl = onclickUrl.replace(/\/$/, ""); 
    
    let endpoint = ''
    let method = 'GET'
    let body = null

    // --- CORREÇÃO: USANDO NOMES EM INGLÊS (CONFIRMADO PELO POSTMAN) ---
    switch (action) {
      case 'GET_PRODUCTS':
        // Pasta "Product" no Postman
        endpoint = '/product?limit=50' 
        break;
      
      case 'UPDATE_STOCK':
        // Pasta "Product" -> endpoint de estoque
        if (!payload?.sku) throw new Error('SKU não informado')
        // Tenta endpoint padrão de update do produto ou sub-recurso
        endpoint = `/product/${payload.sku}` 
        method = 'PUT'
        body = JSON.stringify({
          stock: payload.quantidade, // 'estoque' em inglês
          warehouse: "GERAL"         // 'deposito' em inglês (chute educado, se falhar tentamos o pt)
        })
        break;

      case 'GET_ORDERS':
        // Pasta "Order" no Postman
        // Trocando 'situacao' por 'status' que é mais comum em APIs em inglês
        endpoint = '/order?limit=20' 
        break;

      default:
        throw new Error(`Ação desconhecida: ${action}`)
    }

    console.log(`Proxy para: ${method} ${baseUrl}${endpoint}`)

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': onclickToken, 
      },
      body
    })

    const responseText = await response.text()

    if (!response.ok) {
      throw new Error(`Erro Onclick (${response.status}): ${responseText}`)
    }

    let data
    try { data = JSON.parse(responseText) } catch { data = { msg: responseText } }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})