import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ShoppingCart, Truck, FileText, Loader2, RefreshCw } from "lucide-react";

// Função para definir cor do badge baseada no status
const getStatusBadge = (status: string) => {
  const s = status?.toUpperCase() || "";
  if (s.includes("SHIPPED") || s.includes("ENTREGUE")) return <Badge className="bg-green-500">Enviado</Badge>;
  if (s.includes("PENDING") || s.includes("ABERTO")) return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pendente</Badge>;
  if (s.includes("CANCEL")) return <Badge variant="destructive">Cancelado</Badge>;
  if (s.includes("INVOICED") || s.includes("FATURADO")) return <Badge className="bg-blue-500">Faturado</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
};

export default function Pedidos() {
  const [search, setSearch] = useState("");

 // Busca dados via Edge Function (Igual fizemos no Estoque)
  const { data: pedidos = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['pedidos-proxy'],
    queryFn: async () => {
      const { url, token } = { 
          url: localStorage.getItem("onclick_base_url"),
          token: localStorage.getItem("onclick_api_token") 
      };
      
      // Chama a Edge Function com a ação GET_ORDERS
      const { data, error } = await supabase.functions.invoke('onclick-proxy', {
        body: { action: 'GET_ORDERS' },
        headers: { 'x-onclick-url': url || "", 'x-onclick-token': token || "" }
      });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000, 
  });

  // Filtro de busca local
  const filteredPedidos = pedidos.filter((p: any) => 
    p.id?.includes(search) || 
    p.cliente_nome?.toLowerCase().includes(search.toLowerCase()) ||
    p.nota_fiscal?.includes(search)
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Gestão de Pedidos" description="Acompanhamento de vendas e entregas">
        <Button onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Atualizar
        </Button>
      </PageHeader>

      {/* Cards de Resumo (Opcional - Futuro) */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Hoje</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pedidos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviados</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pedidos.filter((p: any) => p.status?.includes("SHIPPED")).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <CardTitle>Lista de Pedidos</CardTitle>
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar pedido, cliente ou NF..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Pedido</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Nota Fiscal</TableHead>
                            <TableHead>Rastreio</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPedidos.map((pedido: any) => (
                            <TableRow key={pedido.id}>
                                <TableCell className="font-mono">{pedido.id}</TableCell>
                                <TableCell>
                                    {pedido.data_pedido ? new Date(pedido.data_pedido).toLocaleDateString('pt-BR') : "-"}
                                </TableCell>
                                <TableCell className="font-medium">{pedido.cliente_nome || "Cliente Desconhecido"}</TableCell>
                                <TableCell>{getStatusBadge(pedido.status)}</TableCell>
                                <TableCell>
                                    {pedido.nota_fiscal ? (
                                        <div className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded w-fit">
                                            <FileText className="w-3 h-3" /> {pedido.nota_fiscal}
                                        </div>
                                    ) : "-"}
                                </TableCell>
                                <TableCell>
                                    {pedido.transportadora && (
                                        <div className="flex flex-col">
                                            <span className="text-xs font-semibold">{pedido.transportadora}</span>
                                            <span className="text-xs text-muted-foreground">{pedido.rastreio_codigo}</span>
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                    {pedido.valor_total 
                                        ? pedido.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                        : "R$ 0,00"}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}