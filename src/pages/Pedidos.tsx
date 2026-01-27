import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/utils"; // ou src/lib/supabase
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { RefreshCw, Search, ShoppingCart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const getApiCredentials = () => ({
  url: localStorage.getItem("onclick_base_url"),
  token: localStorage.getItem("onclick_api_token")
});

export default function Pedidos() {
  const [search, setSearch] = useState("");

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['onclick-orders'],
    queryFn: async () => {
      const { url, token } = getApiCredentials();
      if (!url || !token) throw new Error("Credenciais ausentes");

      const { data, error } = await supabase.functions.invoke('onclick-proxy', {
        body: { action: 'GET_ORDERS' },
        headers: { 'x-onclick-url': url, 'x-onclick-token': token }
      });

      if (error) throw error;

      // Mapeamento de Pedidos (Ajuste 'status_pedido', 'valor_total' conforme JSON real)
      return Array.isArray(data) ? data.map((order: any) => ({
        id: order.numero_pedido || order.id,
        cliente: order.cliente?.nome || order.nome_cliente || "Consumidor",
        data: order.data_emissao || new Date().toISOString(),
        valor: Number(order.valor_total || 0),
        // Normaliza status para lowercase para bater com o componente StatusBadge
        status: (order.situacao || order.status || 'pendente').toLowerCase(),
      })) : [];
    }
  });

  const filteredOrders = orders.filter((o: any) =>
    String(o.id).includes(search) ||
    o.cliente.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Status de Pedidos" description="Tempo real via Onclick ERP">
        <Button onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
          Atualizar
        </Button>
      </PageHeader>

      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" /> Pedidos Recentes
            </CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pedido..."
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
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center">Nenhum pedido encontrado</TableCell></TableRow>
                ) : filteredOrders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono">{order.id}</TableCell>
                    <TableCell>{order.cliente}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(order.data).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {order.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
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