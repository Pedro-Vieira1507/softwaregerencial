import { supabase } from "@/integrations/supabase/client";

export interface FreightOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  carrier: string;
  carrierCnpj: string;
  quotePrice: number;
  invoicePrice: number;
  difference: number;
  differencePercentage: number;
  status: "auditado" | "pendente" | "divergente";
  cteNumber?: string;
  invoiceNumber?: string;
  weight: number;
  destination: {
    city: string;
    state: string;
  };
}

export interface AuditoriaStats {
  totalOrders: number;
  totalDiscrepancy: number;
  carrierWithMostDivergence: {
    name: string;
    totalDivergence: number;
    orderCount: number;
  };
}

interface SyncAuditResponse {
  success: boolean;
  data?: {
    orders: FreightOrder[];
    stats: AuditoriaStats;
    syncedAt: string;
    totalRecords: number;
  };
  error?: string;
}

// Mock data for demo/fallback when API is not configured
const mockOrders: FreightOrder[] = [
  {
    id: "1",
    orderNumber: "PED-2024-001234",
    orderDate: "2024-01-15",
    carrier: "Correios - SEDEX",
    carrierCnpj: "34.028.316/0001-03",
    quotePrice: 45.90,
    invoicePrice: 52.30,
    difference: 6.40,
    differencePercentage: 13.94,
    status: "divergente",
    cteNumber: "CTE-00123456",
    weight: 2.5,
    destination: { city: "São Paulo", state: "SP" }
  },
  {
    id: "2",
    orderNumber: "PED-2024-001235",
    orderDate: "2024-01-15",
    carrier: "Jadlog",
    carrierCnpj: "04.884.082/0001-35",
    quotePrice: 89.00,
    invoicePrice: 89.00,
    difference: 0,
    differencePercentage: 0,
    status: "auditado",
    cteNumber: "CTE-00123457",
    weight: 5.2,
    destination: { city: "Rio de Janeiro", state: "RJ" }
  },
  {
    id: "3",
    orderNumber: "PED-2024-001236",
    orderDate: "2024-01-16",
    carrier: "Total Express",
    carrierCnpj: "07.152.227/0001-94",
    quotePrice: 156.50,
    invoicePrice: 178.90,
    difference: 22.40,
    differencePercentage: 14.31,
    status: "divergente",
    cteNumber: "CTE-00123458",
    weight: 12.0,
    destination: { city: "Belo Horizonte", state: "MG" }
  },
  {
    id: "4",
    orderNumber: "PED-2024-001237",
    orderDate: "2024-01-16",
    carrier: "Correios - PAC",
    carrierCnpj: "34.028.316/0001-03",
    quotePrice: 32.00,
    invoicePrice: 32.00,
    difference: 0,
    differencePercentage: 0,
    status: "auditado",
    weight: 1.8,
    destination: { city: "Curitiba", state: "PR" }
  },
  {
    id: "5",
    orderNumber: "PED-2024-001238",
    orderDate: "2024-01-17",
    carrier: "Jadlog",
    carrierCnpj: "04.884.082/0001-35",
    quotePrice: 67.00,
    invoicePrice: 74.50,
    difference: 7.50,
    differencePercentage: 11.19,
    status: "divergente",
    cteNumber: "CTE-00123459",
    weight: 3.4,
    destination: { city: "Porto Alegre", state: "RS" }
  },
  {
    id: "6",
    orderNumber: "PED-2024-001239",
    orderDate: "2024-01-17",
    carrier: "Total Express",
    carrierCnpj: "07.152.227/0001-94",
    quotePrice: 210.00,
    invoicePrice: 245.00,
    difference: 35.00,
    differencePercentage: 16.67,
    status: "divergente",
    weight: 18.5,
    destination: { city: "Salvador", state: "BA" }
  },
  {
    id: "7",
    orderNumber: "PED-2024-001240",
    orderDate: "2024-01-18",
    carrier: "Azul Cargo",
    carrierCnpj: "09.296.295/0001-60",
    quotePrice: 320.00,
    invoicePrice: 310.00,
    difference: -10.00,
    differencePercentage: -3.13,
    status: "auditado",
    cteNumber: "CTE-00123460",
    weight: 25.0,
    destination: { city: "Recife", state: "PE" }
  },
  {
    id: "8",
    orderNumber: "PED-2024-001241",
    orderDate: "2024-01-18",
    carrier: "Correios - SEDEX",
    carrierCnpj: "34.028.316/0001-03",
    quotePrice: 58.90,
    invoicePrice: 0,
    difference: 0,
    differencePercentage: 0,
    status: "pendente",
    weight: 2.0,
    destination: { city: "Fortaleza", state: "CE" }
  },
  {
    id: "9",
    orderNumber: "PED-2024-001242",
    orderDate: "2024-01-19",
    carrier: "Jadlog",
    carrierCnpj: "04.884.082/0001-35",
    quotePrice: 125.00,
    invoicePrice: 142.00,
    difference: 17.00,
    differencePercentage: 13.60,
    status: "divergente",
    cteNumber: "CTE-00123461",
    weight: 8.7,
    destination: { city: "Brasília", state: "DF" }
  },
  {
    id: "10",
    orderNumber: "PED-2024-001243",
    orderDate: "2024-01-19",
    carrier: "Total Express",
    carrierCnpj: "07.152.227/0001-94",
    quotePrice: 98.00,
    invoicePrice: 98.00,
    difference: 0,
    differencePercentage: 0,
    status: "auditado",
    weight: 4.5,
    destination: { city: "Goiânia", state: "GO" }
  },
  {
    id: "11",
    orderNumber: "PED-2024-001244",
    orderDate: "2024-01-20",
    carrier: "Azul Cargo",
    carrierCnpj: "09.296.295/0001-60",
    quotePrice: 180.00,
    invoicePrice: 0,
    difference: 0,
    differencePercentage: 0,
    status: "pendente",
    weight: 15.0,
    destination: { city: "Manaus", state: "AM" }
  },
  {
    id: "12",
    orderNumber: "PED-2024-001245",
    orderDate: "2024-01-20",
    carrier: "Correios - PAC",
    carrierCnpj: "34.028.316/0001-03",
    quotePrice: 28.50,
    invoicePrice: 35.00,
    difference: 6.50,
    differencePercentage: 22.81,
    status: "divergente",
    cteNumber: "CTE-00123462",
    weight: 1.2,
    destination: { city: "Florianópolis", state: "SC" }
  }
];

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const intelipostService = {
  /**
   * Fetch orders - tries real API first, falls back to mock data
   */
  async fetchOrders(): Promise<FreightOrder[]> {
    try {
      // Try to sync with real Intelipost API
      const result = await this.syncWithApi();
      if (result.success && result.data?.orders) {
        return result.data.orders;
      }
    } catch (error) {
      console.warn('Failed to fetch from Intelipost API, using mock data:', error);
    }
    
    // Fallback to mock data
    await delay(800);
    return mockOrders;
  },

  /**
   * Calculate audit statistics from orders
   */
  calculateStats(orders: FreightOrder[]): AuditoriaStats {
    const auditedOrders = orders.filter(o => o.status !== "pendente");
    
    const totalDiscrepancy = orders
      .filter(o => o.difference > 0)
      .reduce((sum, o) => sum + o.difference, 0);
    
    const carrierDivergence = orders.reduce((acc, order) => {
      if (order.difference > 0) {
        if (!acc[order.carrier]) {
          acc[order.carrier] = { total: 0, count: 0 };
        }
        acc[order.carrier].total += order.difference;
        acc[order.carrier].count += 1;
      }
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    const carrierWithMost = Object.entries(carrierDivergence)
      .sort(([, a], [, b]) => b.total - a.total)[0];

    return {
      totalOrders: auditedOrders.length,
      totalDiscrepancy,
      carrierWithMostDivergence: carrierWithMost 
        ? {
            name: carrierWithMost[0],
            totalDivergence: carrierWithMost[1].total,
            orderCount: carrierWithMost[1].count
          }
        : { name: "-", totalDivergence: 0, orderCount: 0 }
    };
  },

  /**
   * Get unique carriers from orders
   */
  getCarriers(orders: FreightOrder[]): string[] {
    return [...new Set(orders.map(o => o.carrier))].sort();
  },

  /**
   * Sync with Intelipost API via Edge Function
   */
  async syncWithApi(dateFrom?: Date, dateTo?: Date): Promise<{ success: boolean; message: string; syncedCount: number; data?: SyncAuditResponse['data'] }> {
    try {
      const projectUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      // Build URL with optional date filters
      let url = `${projectUrl}/functions/v1/intelipost-proxy?action=sync-audit`;
      if (dateFrom) {
        url += `&date_from=${dateFrom.toISOString().split('T')[0]}`;
      }
      if (dateTo) {
        url += `&date_to=${dateTo.toISOString().split('T')[0]}`;
      }
      
      const syncResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
        },
      });

      if (!syncResponse.ok) {
        const errorText = await syncResponse.text();
        console.warn('Sync API error:', errorText);
        throw new Error(`API error: ${syncResponse.status}`);
      }

      const syncResult: SyncAuditResponse = await syncResponse.json();

      if (syncResult.success && syncResult.data) {
        return {
          success: true,
          message: `Sincronização concluída com sucesso`,
          syncedCount: syncResult.data.totalRecords,
          data: syncResult.data
        };
      } else {
        throw new Error(syncResult.error || 'Unknown error');
      }
    } catch (error) {
      console.warn('Sync failed, using mock data:', error);
      // Fallback to mock sync
      await delay(1500);
      return {
        success: true,
        message: "Sincronização concluída (dados de demonstração)",
        syncedCount: mockOrders.length
      };
    }
  },

  /**
   * Get shipment details by order ID
   */
  async getShipmentDetails(orderId: string): Promise<FreightOrder | null> {
    try {
      const projectUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${projectUrl}/functions/v1/intelipost-proxy?action=get-shipment&order_id=${encodeURIComponent(orderId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.content?.shipment || null;
    } catch (error) {
      console.warn('Failed to get shipment details:', error);
      return mockOrders.find(o => o.id === orderId || o.orderNumber === orderId) || null;
    }
  }
};
