import { useEffect, useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AuditoriaKPIs } from "@/components/auditoria/AuditoriaKPIs";
import { AuditoriaFilters, type AuditoriaFiltersState } from "@/components/auditoria/AuditoriaFilters";
import { AuditoriaTable } from "@/components/auditoria/AuditoriaTable";
import { 
  intelipostService, 
  type FreightOrder, 
  type AuditoriaStats 
} from "@/lib/intelipost-service";

export default function AuditoriaFretes() {
  const [orders, setOrders] = useState<FreightOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<FreightOrder[]>([]);
  const [stats, setStats] = useState<AuditoriaStats | null>(null);
  const [carriers, setCarriers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [filters, setFilters] = useState<AuditoriaFiltersState>({
    dateFrom: undefined,
    dateTo: undefined,
    carrier: "all",
    status: "all"
  });
  const { toast } = useToast();

  // Load initial data
  useEffect(() => {
    loadOrders();
  }, []);

  // Apply filters when orders or filters change
  useEffect(() => {
    applyFilters();
  }, [orders, filters]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await intelipostService.fetchOrders();
      setOrders(data);
      setCarriers(intelipostService.getCarriers(data));
      setStats(intelipostService.calculateStats(data));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os pedidos. Tente novamente."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...orders];

    // Filter by date range
    if (filters.dateFrom) {
      result = result.filter(o => new Date(o.orderDate) >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      result = result.filter(o => new Date(o.orderDate) <= filters.dateTo!);
    }

    // Filter by carrier
    if (filters.carrier && filters.carrier !== "all") {
      result = result.filter(o => o.carrier === filters.carrier);
    }

    // Filter by status
    if (filters.status && filters.status !== "all") {
      result = result.filter(o => o.status === filters.status);
    }

    setFilteredOrders(result);
    
    // Recalculate stats based on filtered data
    if (result.length > 0) {
      setStats(intelipostService.calculateStats(result));
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // Pass date filters to the sync API
      const result = await intelipostService.syncWithApi(filters.dateFrom, filters.dateTo);
      
      if (result.success) {
        // If we got data from the API, use it directly
        if (result.data?.orders) {
          setOrders(result.data.orders);
          setCarriers(intelipostService.getCarriers(result.data.orders));
          setStats(result.data.stats);
        }
        
        toast({
          title: "Sincronização concluída",
          description: `${result.syncedCount} pedidos sincronizados com a Intelipost.`
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar com a API. Verifique suas credenciais."
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoria de Fretes"
        description="Compare valores cotados vs. cobrados e identifique discrepâncias"
      >
        <Button 
          onClick={handleSync} 
          disabled={isSyncing}
          className="gap-2"
        >
          {isSyncing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Sincronizar API
            </>
          )}
        </Button>
      </PageHeader>

      {/* KPI Cards */}
      <AuditoriaKPIs stats={stats} isLoading={isLoading} />

      {/* Filters */}
      <AuditoriaFilters
        carriers={carriers}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Orders Table */}
      <AuditoriaTable orders={filteredOrders} isLoading={isLoading} />
    </div>
  );
}
