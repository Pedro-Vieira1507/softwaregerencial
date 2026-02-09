import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MAGENTO_TOKEN = '5qq4ag1cwq044maru56ng1glkfpc3lm9'; 
const MAGENTO_URL = 'https://www.forlabexpress.com.br/rest/default/V1/orders';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-magento-url',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Tenta ler o corpo da requisição para ver se é um Backfill
    let isBackfill = false;
    try {
        const body = await req.json();
        isBackfill = body.backfill === true;
    } catch {
        // Se der erro ao ler JSON (ex: chamada automática do cron), assume falso
        isBackfill = false;
    }

    let queryParams;

    if (isBackfill) {
        console.log("⚠️ MODO BACKFILL ATIVADO: Importando Janeiro 2026");
        // Filtra de 01/01/2026 a 31/01/2026
        // PageSize 500 para tentar pegar tudo de uma vez (cuidado com timeouts se houver muitos pedidos)
        queryParams = new URLSearchParams({
            'searchCriteria[filterGroups][0][filters][0][field]': 'created_at',
            'searchCriteria[filterGroups][0][filters][0][value]': '2026-01-01 00:00:00',
            'searchCriteria[filterGroups][0][filters][0][conditionType]': 'gte', // Maior ou igual
            
            'searchCriteria[filterGroups][1][filters][0][field]': 'created_at',
            'searchCriteria[filterGroups][1][filters][0][value]': '2026-01-31 23:59:59',
            'searchCriteria[filterGroups][1][filters][0][conditionType]': 'lte', // Menor ou igual
            
            'searchCriteria[pageSize]': '500', 
            'searchCriteria[currentPage]': '1'
        });
    } else {
        console.log("🔄 MODO SYNC PADRÃO: Últimos pedidos");
        // Filtra os últimos 20 (Sincronização rápida)
        queryParams = new URLSearchParams({
            'searchCriteria[pageSize]': '20',
            'searchCriteria[sortOrders][0][field]': 'created_at',
            'searchCriteria[sortOrders][0][direction]': 'DESC'
        });
    }

    // --- Chamada ao Magento ---
    const responseMagento = await fetch(`${MAGENTO_URL}?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MAGENTO_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!responseMagento.ok) {
      const txt = await responseMagento.text();
      throw new Error(`Erro Magento: ${txt}`);
    }

    const data = await responseMagento.json();
    const orders = data.items || [];

    // --- Salvar no Supabase ---
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const pedidosFormatados = orders.map((order: any) => ({
      id: order.entity_id,
      increment_id: order.increment_id,
      created_at: order.created_at,
      status: order.status,
      customer_firstname: order.customer_firstname,
      customer_lastname: order.customer_lastname,
      grand_total: order.grand_total
    }));

    if (pedidosFormatados.length > 0) {
      const { error } = await supabaseClient
        .from('pedidos_magento')
        .upsert(pedidosFormatados, { onConflict: 'increment_id' }); // Upsert atualiza se já existir

      if (error) throw error;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      mode: isBackfill ? 'backfill_jan_2026' : 'realtime',
      count: pedidosFormatados.length 
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
})