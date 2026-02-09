import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, ShoppingCart, Truck, FileText, Loader2, RefreshCw, MapPin, DollarSign, X, Eye, Package, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// --- HELPERS ---

const getStatusBadgeColor = (status: string) => {
  const s = status?.toUpperCase() || "";
  if (s === "DELIVERED") return "bg-green-100 text-green-700 border-green-200";
  if (s === "SHIPPED" || s === "IN_TRANSIT") return "bg-blue-100 text-blue-700 border-blue-200";
  if (s === "READY_FOR_SHIPPING") return "bg-yellow-100 text-yellow-700 border-yellow-200";
  if (s === "CANCELED") return "bg-red-100 text-red-700 border-red-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const formatDateTime = (isoDate: string | number) => {
    if (!isoDate) return "-";
    const date = new Date(isoDate);
    return date.toLocaleString('pt-BR', { 
        day: '2-digit', month: '2-digit', year: '2-digit', 
        hour: '2-digit', minute: '2-digit' 
    });
};

const getInvoiceNumber = (pedido: any) => {
    if (pedido.invoice_number) return pedido.invoice_number;
    if (pedido.shipment_order_volume_array && Array.isArray(pedido.shipment_order_volume_array)) {
        const volume = pedido.shipment_order_volume_array[0];
        if (volume && volume.shipment_order_volume_invoice) {
            return volume.shipment_order_volume_invoice.invoice_number;
        }
    }
    return null;
};

// --- COMPONENTES ---

// Modal de Detalhes do Produto (Novo)
const ProductDetailsModal = ({ orderNumber, onClose }: { orderNumber: string, onClose: () => void }) => {
    const { data: details, isLoading } = useQuery({
        queryKey: ['order-details', orderNumber],
        queryFn: async () => {
            const url = localStorage.getItem("intelipost_base_url");
            const key = localStorage.getItem("intelipost_api_key");
            
            // Chama a nova ação GET_SHIPMENT_DETAILS
            const { data, error } = await supabase.functions.invoke('intelipost-proxy', {
                body: { action: 'GET_SHIPMENT_DETAILS', order_number: orderNumber },
                headers: { 'x-intelipost-url': url || "", 'api-key': key }
            });

            if (error) throw error;
            return data.content; // Retorna o objeto content do JSON
        }
    });

    // Extrai produtos de todos os volumes
    const products: any[] = [];
    if (details?.shipment_order_volume_array) {
        details.shipment_order_volume_array.forEach((vol: any) => {
            if (vol.products && Array.isArray(vol.products)) {
                products.push(...vol.products);
            }
        });
    }

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary" />
                        Detalhes do Pedido: {orderNumber}
                    </DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-8">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground mt-2">Buscando produtos...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Info Básica */}
                        <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg">
                            <div>
                                <span className="font-semibold text-muted-foreground block">Número de Venda (Sales):</span>
                                <span className="font-mono">{details?.sales_order_number || "-"}</span>
                            </div>
                            <div>
                                <span className="font-semibold text-muted-foreground block">Método de Entrega:</span>
                                <span>{details?.delivery_method_name}</span>
                            </div>
                            <div>
                                <span className="font-semibold text-muted-foreground block">Destinatário:</span>
                                <span>{details?.end_customer?.first_name} {details?.end_customer?.last_name}</span>
                            </div>
                             <div>
                                <span className="font-semibold text-muted-foreground block">Rastreio:</span>
                                {details?.tracking_url ? (
                                    <a href={details.tracking_url} target="_blank" rel="noreferrer" className="text-blue-600 underline flex items-center gap-1">
                                        Link Externo <ExternalLink className="w-3 h-3" />
                                    </a>
                                ) : "-"}
                            </div>
                        </div>

                        {/* Tabela de Produtos */}
                        <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4" /> Produtos ({products.length})
                            </h4>
                            <div className="border rounded-md overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead>SKU</TableHead>
                                            <TableHead>Descrição</TableHead>
                                            <TableHead className="text-right">Qtd</TableHead>
                                            <TableHead className="text-right">Preço</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {products.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                                    Nenhum produto listado neste pedido.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            products.map((prod: any, idx: number) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-mono text-xs">{prod.sku}</TableCell>
                                                    <TableCell className="font-medium text-sm">{prod.description}</TableCell>
                                                    <TableCell className="text-right">{prod.quantity}</TableCell>
                                                    <TableCell className="text-right">
                                                        {Number(prod.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button onClick={onClose}>Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// Modal de Rastreio (Existente)
const TrackingModal = ({ order, onClose }: { order: any, onClose: () => void }) => {
    if (!order) return null;

    let history: any[] = [];
    if (order.shipment_order_volume_array && Array.isArray(order.shipment_order_volume_array)) {
        order.shipment_order_volume_array.forEach((vol: any) => {
            if (vol.shipment_order_volume_state_history_array) {
                const events = vol.shipment_order_volume_state_history_array.map((evt: any) => ({
                    ...evt,
                    volume_number: vol.shipment_order_volume_number
                }));
                history = [...history, ...events];
            }
        });
    }

    history.sort((a, b) => {
        const dateA = new Date(a.event_date_iso || a.created_iso).getTime();
        const dateB = new Date(b.event_date_iso || b.created_iso).getTime();
        return dateB - dateA;
    });

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                         <Truck className="w-5 h-5 text-primary" /> Rastreamento do Pedido
                    </DialogTitle>
                </DialogHeader>

                <div className="p-2">
                    {history.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Nenhum histórico disponível para este pedido.
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-slate-200 ml-3 space-y-8">
                            {history.map((event: any, idx: number) => (
                                <div key={idx} className="relative pl-8">
                                    <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${idx === 0 ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-slate-300'}`}></div>
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                                        <div>
                                            <p className={`font-semibold text-sm ${idx === 0 ? 'text-blue-700' : 'text-slate-700'}`}>
                                                {event.shipment_order_volume_state_localized || event.shipment_volume_micro_state?.name || "Status desconhecido"}
                                            </p>
                                            {event.shipment_volume_micro_state?.description && (
                                                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                                                    {event.shipment_volume_micro_state.description}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                {formatDateTime(event.event_date_iso || event.created_iso)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={onClose}>Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- PÁGINA PRINCIPAL ---

export default function Pedidos() {
  const [searchNf, setSearchNf] = useState(""); 
  const [activeSearch, setActiveSearch] = useState("");
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState<any>(null); // Modal de Rastreio
  const [selectedProductOrder, setSelectedProductOrder] = useState<string | null>(null); // Modal de Produtos (ID)
  
  const { toast } = useToast();

  const { data: rawData = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['intelipost-pedidos', activeSearch], 
    queryFn: async () => {
      const url = localStorage.getItem("intelipost_base_url");
      const key = localStorage.getItem("intelipost_api_key");

      if (!key) return [];

      const action = activeSearch ? 'SEARCH_BY_INVOICE' : 'GET_SHIPMENTS';
      const bodyPayload = activeSearch ? { action, invoice_number: activeSearch } : { action };

      const { data, error } = await supabase.functions.invoke('intelipost-proxy', {
        body: bodyPayload,
        headers: { 'x-intelipost-url': url || "", 'api-key': key }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data.content?.shipments || [];
    },
    refetchInterval: activeSearch ? false : 30000, 
    retry: false
  });

  const pedidos = Array.isArray(rawData) ? rawData : [];

  const handleSearch = () => {
    if (!searchNf.trim()) {
        toast({ title: "Digite o número da Nota Fiscal" });
        return;
    }
    setActiveSearch(searchNf.trim());
  };

  const clearSearch = () => {
    setSearchNf("");
    setActiveSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Gestão de Entregas" description="Monitoramento via Intelipost (TMS)">
        <Button onClick={() => refetch()} disabled={isRefetching || isLoading} variant="outline">
            <span className="mr-2">
                {isRefetching ? <Loader2 className="animate-spin w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
            </span>
            {isRefetching ? "Atualizando..." : "Atualizar Lista"}
        </Button>
      </PageHeader>

      {/* Modal de Rastreio */}
      {selectedTrackingOrder && (
          <TrackingModal order={selectedTrackingOrder} onClose={() => setSelectedTrackingOrder(null)} />
      )}

      {/* Modal de Produtos (Novo) */}
      {selectedProductOrder && (
          <ProductDetailsModal orderNumber={selectedProductOrder} onClose={() => setSelectedProductOrder(null)} />
      )}

      <Card>
        <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-1/3 space-y-2">
                    <label className="text-sm font-medium leading-none">
                        Consultar Nota Fiscal (API)
                    </label>
                    <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                            placeholder="Digite o número da NF..." 
                            value={searchNf}
                            onChange={(e) => setSearchNf(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="pl-9 pr-20"
                        />
                        {activeSearch && (
                            <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-red-500">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
                <Button onClick={handleSearch} disabled={isLoading} className="mb-[2px]">
                    <span className="mr-2 flex items-center">
                        {isLoading ? (
                            <Loader2 className="animate-spin w-4 h-4" />
                        ) : (
                            <SearchIcon className="w-4 h-4" />
                        )}
                    </span>
                    Buscar na Intelipost
                </Button>
                
                {activeSearch && (
                    <div className="mb-2 text-sm text-muted-foreground">
                        Filtro ativo: <strong>{activeSearch}</strong>
                        <span className="mx-2">•</span>
                        <span className="cursor-pointer text-blue-600 underline" onClick={clearSearch}>Limpar</span>
                    </div>
                )}
            </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visualizado</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pedidos.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Recente</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {pedidos.length > 0 ? pedidos[0]?.shipment_order_status : "-"}
            </div>
            <p className="text-xs text-muted-foreground">Última atualização</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Frete Total (Lista)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">
               {pedidos.reduce((acc: number, item: any) => acc + (item.customer_shipping_costs || 0), 0)
                .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <CardTitle>{activeSearch ? `Resultados da busca: ${activeSearch}` : "Últimos Pedidos"}</CardTitle>
            </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-12 gap-4">
                    <Loader2 className="animate-spin w-8 h-8 text-primary" />
                    <p className="text-sm text-muted-foreground">Consultando Intelipost...</p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Pedido</TableHead>
                            <TableHead>Emissão</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>NF</TableHead>
                            <TableHead>Transportadora</TableHead>
                            <TableHead className="text-center">Rastreio</TableHead>
                            <TableHead className="text-right">Frete</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pedidos.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                                    {activeSearch 
                                        ? "Nenhum pedido encontrado com esta Nota Fiscal." 
                                        : "Nenhum pedido recente encontrado."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            pedidos.map((pedido: any, index: number) => {
                                const uniqueKey = pedido.order_number 
                                    ? `${pedido.order_number}-${index}` 
                                    : `pedido-${index}`;
                                
                                const notaFiscal = getInvoiceNumber(pedido);

                                return (
                                <TableRow key={uniqueKey}>
                                    <TableCell className="font-medium">
                                        {/* CLICÁVEL: Abre Modal de Produtos */}
                                        <button 
                                            onClick={() => setSelectedProductOrder(pedido.order_number)}
                                            className="font-mono text-blue-600 hover:text-blue-800 hover:underline flex flex-col items-start"
                                        >
                                            {pedido.order_number}
                                            <span className="text-[10px] text-muted-foreground no-underline">
                                                Vol: {pedido.shipment_order_volume_number || 1}
                                            </span>
                                        </button>
                                    </TableCell>
                                    <TableCell>
                                        {pedido.created ? new Date(pedido.created).toLocaleDateString('pt-BR') : "-"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col max-w-[180px]">
                                            <span className="font-medium truncate" title={pedido.end_customer?.first_name}>
                                                {pedido.end_customer?.first_name} {pedido.end_customer?.last_name}
                                            </span>
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {pedido.end_customer?.city}/{pedido.end_customer?.state}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {notaFiscal ? (
                                            <Badge variant="outline" className="font-mono bg-slate-50">
                                                {notaFiscal}
                                            </Badge>
                                        ) : "-"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{pedido.logistic_provider_name || "N/A"}</span>
                                            <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={pedido.delivery_method_name}>
                                                {pedido.delivery_method_name}
                                            </span>
                                        </div>
                                    </TableCell>
                                    
                                    <TableCell className="text-center">
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className={`h-7 px-3 text-xs gap-1 border shadow-sm ${getStatusBadgeColor(pedido.shipment_order_status)}`}
                                            onClick={() => setSelectedTrackingOrder(pedido)}
                                        >
                                            <Eye className="w-3 h-3" /> 
                                            {pedido.shipment_order_status || "Ver Status"}
                                        </Button>
                                    </TableCell>

                                    <TableCell className="text-right font-medium">
                                        {pedido.customer_shipping_costs !== undefined && pedido.customer_shipping_costs !== null
                                            ? Number(pedido.customer_shipping_costs).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                            : "-"}
                                    </TableCell>
                                </TableRow>
                            )})
                        )}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}