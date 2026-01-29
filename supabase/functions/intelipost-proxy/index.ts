// Edge function to proxy requests to Intelipost API

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface IntelipostShipment {
  order_number: string;
  created: string;
  logistic_provider_name: string;
  logistic_provider_cnpj?: string;
  quote_price: number;
  invoice_price?: number;
  cte_number?: string;
  invoice_number?: string;
  weight: number;
  destination_city: string;
  destination_state: string;
  status: string;
}

interface IntelipostResponse {
  status: string;
  content: {
    shipments?: IntelipostShipment[];
    shipment?: IntelipostShipment;
    page?: {
      total_pages?: number;
      current?: number;
      total_elements?: number;
    };
  };
}

interface AuditOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  carrier: string;
  carrierCnpj: string;
  quotePrice: number;
  invoicePrice: number;
  difference: number;
  differencePercentage: number;
  status: 'auditado' | 'pendente' | 'divergente';
  cteNumber?: string;
  invoiceNumber?: string;
  weight: number;
  destination: {
    city: string;
    state: string;
  };
}

// Function to fetch all pages of shipments with date filters
async function fetchAllShipments(
  baseUrl: string, 
  apiKey: string,
  dateFrom?: string,
  dateTo?: string,
  maxPages: number = 10
): Promise<IntelipostShipment[]> {
  const allShipments: IntelipostShipment[] = [];
  let currentPage = 0;
  let totalPages = 1;

  // Build the search request body - Intelipost uses POST for search
  const buildSearchBody = (page: number) => {
    const body: Record<string, unknown> = {
      page,
      page_size: 100,
    };

    // Add date filters if provided
    if (dateFrom || dateTo) {
      body.created = {};
      if (dateFrom) {
        (body.created as Record<string, string>).gte = dateFrom;
      }
      if (dateTo) {
        (body.created as Record<string, string>).lte = dateTo;
      }
    }

    return body;
  };

  while (currentPage < totalPages && currentPage < maxPages) {
    console.log(`Fetching page ${currentPage + 1} of shipments...`);
    
    const response = await fetch(`${baseUrl}/shipment_order/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
        'Accept': 'application/json',
      },
      body: JSON.stringify(buildSearchBody(currentPage)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch page ${currentPage + 1}:`, errorText);
      throw new Error(`Failed to fetch shipments: ${errorText}`);
    }

    const data: IntelipostResponse = await response.json();
    
    if (data.content?.shipments) {
      allShipments.push(...data.content.shipments);
    }

    // Update pagination info
    if (data.content?.page) {
      totalPages = data.content.page.total_pages || 1;
      console.log(`Page ${currentPage + 1}/${totalPages}, total elements: ${data.content.page.total_elements}`);
    }

    currentPage++;
  }

  console.log(`Fetched ${allShipments.length} shipments total`);
  return allShipments;
}

// Function to sync audit data - fetches shipments and compares quote vs invoice
async function syncAuditData(
  baseUrl: string, 
  apiKey: string,
  dateFrom?: string,
  dateTo?: string
) {
  try {
    // Fetch shipments with date filters
    const shipments = await fetchAllShipments(baseUrl, apiKey, dateFrom, dateTo);

    // Process and calculate discrepancies
    const auditedOrders: AuditOrder[] = shipments.map((shipment: IntelipostShipment) => {
      const quotePrice = shipment.quote_price || 0;
      const invoicePrice = shipment.invoice_price || 0;
      const difference = invoicePrice - quotePrice;
      const differencePercentage = quotePrice > 0 ? (difference / quotePrice) * 100 : 0;

      let status: 'auditado' | 'pendente' | 'divergente' = 'pendente';
      if (invoicePrice > 0) {
        status = Math.abs(difference) > 0.01 ? 'divergente' : 'auditado';
      }

      return {
        id: shipment.order_number,
        orderNumber: shipment.order_number,
        orderDate: shipment.created,
        carrier: shipment.logistic_provider_name || 'N/A',
        carrierCnpj: shipment.logistic_provider_cnpj || '',
        quotePrice,
        invoicePrice,
        difference,
        differencePercentage,
        status,
        cteNumber: shipment.cte_number,
        invoiceNumber: shipment.invoice_number,
        weight: shipment.weight || 0,
        destination: {
          city: shipment.destination_city || 'N/A',
          state: shipment.destination_state || 'N/A',
        },
      };
    });

    // Calculate summary stats
    const totalOrders = auditedOrders.filter((o) => o.status !== 'pendente').length;
    const totalDiscrepancy = auditedOrders
      .filter((o) => o.difference > 0)
      .reduce((sum, o) => sum + o.difference, 0);

    // Find carrier with most divergence
    const carrierDivergence: Record<string, { total: number; count: number }> = {};
    auditedOrders.forEach((order) => {
      if (order.difference > 0) {
        if (!carrierDivergence[order.carrier]) {
          carrierDivergence[order.carrier] = { total: 0, count: 0 };
        }
        carrierDivergence[order.carrier].total += order.difference;
        carrierDivergence[order.carrier].count += 1;
      }
    });

    const carrierWithMost = Object.entries(carrierDivergence)
      .sort(([, a], [, b]) => b.total - a.total)[0];

    return {
      success: true,
      data: {
        orders: auditedOrders,
        stats: {
          totalOrders,
          totalDiscrepancy,
          carrierWithMostDivergence: carrierWithMost
            ? {
                name: carrierWithMost[0],
                totalDivergence: carrierWithMost[1].total,
                orderCount: carrierWithMost[1].count,
              }
            : { name: '-', totalDivergence: 0, orderCount: 0 },
        },
        syncedAt: new Date().toISOString(),
        totalRecords: auditedOrders.length,
      },
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Sync audit error:', err);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Intelipost credentials from secrets
    const INTELIPOST_API_KEY = Deno.env.get('INTELIPOST_API_KEY');
    const INTELIPOST_BASE_URL = Deno.env.get('INTELIPOST_BASE_URL') || 'https://api.intelipost.com.br/api/v1';

    if (!INTELIPOST_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Intelipost API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    // Get date filters from query params
    const dateFrom = url.searchParams.get('date_from') || undefined;
    const dateTo = url.searchParams.get('date_to') || undefined;

    // Route to appropriate action
    switch (action) {
      case 'list-shipments': {
        // List shipments with optional date filters using POST search
        const page = parseInt(url.searchParams.get('page') || '0', 10);
        const pageSize = parseInt(url.searchParams.get('page_size') || '50', 10);
        
        const searchBody: Record<string, unknown> = {
          page,
          page_size: pageSize,
        };

        if (dateFrom || dateTo) {
          searchBody.created = {};
          if (dateFrom) {
            (searchBody.created as Record<string, string>).gte = dateFrom;
          }
          if (dateTo) {
            (searchBody.created as Record<string, string>).lte = dateTo;
          }
        }

        const response = await fetch(`${INTELIPOST_BASE_URL}/shipment_order/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': INTELIPOST_API_KEY,
            'Accept': 'application/json',
          },
          body: JSON.stringify(searchBody),
        });

        const responseData = await response.json();
        
        if (!response.ok) {
          return new Response(
            JSON.stringify({ error: 'Intelipost API error', details: responseData }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify(responseData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-shipment': {
        // Get single shipment details
        const orderId = url.searchParams.get('order_id');
        if (!orderId) {
          return new Response(
            JSON.stringify({ error: 'order_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const response = await fetch(`${INTELIPOST_BASE_URL}/shipment_order/${orderId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'api-key': INTELIPOST_API_KEY,
            'Accept': 'application/json',
          },
        });

        const responseData = await response.json();
        return new Response(
          JSON.stringify(responseData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-invoices': {
        // Get invoice/CT-e information - also uses POST
        const invoicePage = parseInt(url.searchParams.get('page') || '0', 10);
        
        const response = await fetch(`${INTELIPOST_BASE_URL}/invoice/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': INTELIPOST_API_KEY,
            'Accept': 'application/json',
          },
          body: JSON.stringify({ page: invoicePage, page_size: 50 }),
        });

        const responseData = await response.json();
        return new Response(
          JSON.stringify(responseData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-tracking': {
        // Get tracking events for a shipment
        const trackingOrderId = url.searchParams.get('order_id');
        if (!trackingOrderId) {
          return new Response(
            JSON.stringify({ error: 'order_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const response = await fetch(`${INTELIPOST_BASE_URL}/shipment_order/${trackingOrderId}/history`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'api-key': INTELIPOST_API_KEY,
            'Accept': 'application/json',
          },
        });

        const responseData = await response.json();
        return new Response(
          JSON.stringify(responseData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'sync-audit': {
        // Custom action: Fetch all shipments and compare quote vs invoice prices
        const syncResponse = await syncAuditData(INTELIPOST_BASE_URL, INTELIPOST_API_KEY, dateFrom, dateTo);
        return new Response(
          JSON.stringify(syncResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Valid actions: list-shipments, get-shipment, get-invoices, get-tracking, sync-audit' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in intelipost-proxy:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
