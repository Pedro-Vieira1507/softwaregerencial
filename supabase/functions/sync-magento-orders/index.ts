import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Não autorizado. Você precisa estar logado.');

    // 1. IDENTIFICAR O USUÁRIO E A EMPRESA
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error('Sessão expirada ou inválida.');

    const { data: perfil, error: perfilError } = await userClient
      .from('perfis')
      .select('empresa_id')
      .eq('id', user.id)
      .single();

    if (perfilError || !perfil?.empresa_id) throw new Error('Nenhuma empresa vinculada a este usuário.');
    const minhaEmpresaId = perfil.empresa_id;

    // LER OS PARÂMETROS QUE VÊM DA TELA
    let body = {};
    try { body = await req.json(); } catch {}

    // =========================================================================
    // CASO A: É APENAS UM TESTE DE CONEXÃO (Vindo da tela de Configurações)
    // =========================================================================
    if (body.action === 'TEST_CONNECTION') {
        const testUrl = body.testUrl;
        const testToken = body.testToken;
        
        // Faz um mini-teste rápido com o Magento para ver se as chaves funcionam
        const testResponse = await fetch(`${testUrl}/rest/default/V1/orders?searchCriteria[pageSize]=1`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${testToken}`, 'Content-Type': 'application/json' }
        });

        if (!testResponse.ok) {
            const txt = await testResponse.text();
            throw new Error(`Credenciais inválidas no Magento. Detalhe: ${txt}`);
        }
        return new Response(JSON.stringify({ success: true, message: "OK" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // =========================================================================
    // CASO B: É UMA SINCRONIZAÇÃO REAL (Vindo do botão "Atualizar" no Dashboard)
    // =========================================================================
    
    // Precisamos de acesso de Admin para ler as configurações ocultas
    const adminClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    
    // Vai buscar a URL e o Token ESPECÍFICOS desta empresa
    const { data: config } = await adminClient
        .from('configuracoes_empresa')
        .select('magento_url, magento_token')
        .eq('empresa_id', minhaEmpresaId)
        .single();

    if (!config?.magento_url || !config?.magento_token) {
        throw new Error('As credenciais do Magento não estão configuradas para a sua empresa.');
    }

    // Usa as chaves dinâmicas da empresa
    const MAGENTO_URL = `${config.magento_url}/rest/default/V1/orders`;
    const MAGENTO_TOKEN = config.magento_token;

    const isBackfill = body.backfill === true;
    let queryParams;

    if (isBackfill) {
        queryParams = new URLSearchParams({
            'searchCriteria[filterGroups][0][filters][0][field]': 'created_at',
            'searchCriteria[filterGroups][0][filters][0][value]': '2026-01-01 00:00:00',
            'searchCriteria[filterGroups][0][filters][0][conditionType]': 'gte',
            'searchCriteria[filterGroups][1][filters][0][field]': 'created_at',
            'searchCriteria[filterGroups][1][filters][0][value]': '2026-01-31 23:59:59',
            'searchCriteria[filterGroups][1][filters][0][conditionType]': 'lte',
            'searchCriteria[pageSize]': '500', 
            'searchCriteria[currentPage]': '1'
        });
    } else {
        queryParams = new URLSearchParams({
            'searchCriteria[pageSize]': '20',
            'searchCriteria[sortOrders][0][field]': 'created_at',
            'searchCriteria[sortOrders][0][direction]': 'DESC'
        });
    }

    const responseMagento = await fetch(`${MAGENTO_URL}?${queryParams.toString()}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${MAGENTO_TOKEN}`, 'Content-Type': 'application/json' }
    });

    if (!responseMagento.ok) throw new Error(`Erro Magento: ${await responseMagento.text()}`);

    const data = await responseMagento.json();
    const orders = data.items || [];

    const pedidosFormatados = orders.map((order: any) => ({
      id: order.entity_id,
      increment_id: order.increment_id,
      created_at: order.created_at,
      status: order.status,
      customer_firstname: order.customer_firstname,
      customer_lastname: order.customer_lastname,
      grand_total: order.grand_total,
      empresa_id: minhaEmpresaId // <-- Sela o pedido com o dono correto
    }));

    if (pedidosFormatados.length > 0) {
      const { error } = await adminClient
        .from('pedidos_magento')
        .upsert(pedidosFormatados, { onConflict: 'increment_id' }); 
      if (error) throw error;
    }

    return new Response(JSON.stringify({ 
      success: true, mode: isBackfill ? 'backfill_jan_2026' : 'realtime', count: pedidosFormatados.length 
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    // Retornamos status 200 de propósito para o frontend não ocultar o erro
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
})