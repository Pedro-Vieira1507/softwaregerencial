import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { RefreshCw, Search, ShoppingCart, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type StatusType = "pendente" | "faturado" | "enviado" | "entregue" | "cancelado";

interface OrderItem {
  produto: string;
  quantidade: number;
  valorUnitario: number;
}

interface Order {
  id: string;
  cliente: string;
  data: string;
  valor: number;
  status: StatusType;
  items: OrderItem[];
  historico: { data: string; status: StatusType; observacao?: string }[];
}

const mockOrders: Order[] = [
  {
    id: "PED-2024-001",
    cliente: "Tech Solutions Ltda",
    data: "2024-01-15",
    valor: 4580.90,
    status: "pendente",
    items: [
      { produto: "Notebook Dell Inspiron 15", quantidade: 1, valorUnitario: 3499.00 },
      { produto: "Mouse Logitech MX Master 3", quantidade: 2, valorUnitario: 540.95 },
    ],
    historico: [
      { data: "2024-01-15 10:30", status: "pendente", observacao: "Pedido criado" },
    ],
  },
  {
    id: "PED-2024-002",
    cliente: "Comercial ABC",
    data: "2024-01-14",
    valor: 12350.00,
    status: "faturado",
    items: [
      { produto: "Monitor LG 27\" 4K", quantidade: 5, valorUnitario: 2299.00 },
      { produto: "Webcam Logitech C920", quantidade: 5, valorUnitario: 171.00 },
    ],
    historico: [
      { data: "2024-01-14 09:00", status: "pendente", observacao: "Pedido criado" },
      { data: "2024-01-15 11:45", status: "faturado", observacao: "NF-e emitida: 123456" },
    ],
  },
  {
    id: "PED-2024-003",
    cliente: "Indústria XYZ",
    data: "2024-01-13",
    valor: 8900.50,
    status: "enviado",
    items: [
      { produto: "Teclado Mecânico Keychron K2", quantidade: 20, valorUnitario: 445.03 },
    ],
    historico: [
      { data: "2024-01-13 14:00", status: "pendente", observacao: "Pedido criado" },
      { data: "2024-01-13 16:30", status: "faturado", observacao: "NF-e emitida: 123457" },
      { data: "2024-01-14 08:00", status: "enviado", observacao: "Transportadora: Jadlog - Rastreio: JD123456789BR" },
    ],
  },
  {
    id: "PED-2024-004",
    cliente: "Loja Central",
    data: "2024-01-10",
    valor: 2150.00,
    status: "entregue",
    items: [
      { produto: "Headset HyperX Cloud II", quantidade: 4, valorUnitario: 537.50 },
    ],
    historico: [
      { data: "2024-01-10 11:00", status: "pendente", observacao: "Pedido criado" },
      { data: "2024-01-10 14:00", status: "faturado", observacao: "NF-e emitida: 123458" },
      { data: "2024-01-11 09:00", status: "enviado", observacao: "Transportadora: Correios" },
      { data: "2024-01-12 16:00", status: "entregue", observacao: "Entregue ao destinatário" },
    ],
  },
  {
    id: "PED-2024-005",
    cliente: "Startup Digital",
    data: "2024-01-08",
    valor: 5499.00,
    status: "cancelado",
    items: [
      { produto: "Notebook Dell Inspiron 15", quantidade: 1, valorUnitario: 3499.00 },
      { produto: "Monitor LG 27\" 4K", quantidade: 1, valorUnitario: 2000.00 },
    ],
    historico: [
      { data: "2024-01-08 10:00", status: "pendente", observacao: "Pedido criado" },
      { data: "2024-01-09 11:00", status: "cancelado", observacao: "Cancelado pelo cliente" },
    ],
  },
];

export default function Pedidos() {
  const [orders] = useState<Order[]>(mockOrders);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const filteredOrders = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.cliente.toLowerCase().includes(search.toLowerCase())
  );

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsDialogOpen(true);
  };

  const handleSyncOrders = async () => {
    setIsSyncing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSyncing(false);
    
    toast({
      title: "Pedidos atualizados",
      description: "Status dos pedidos sincronizados com o Onclick ERP.",
    });
  };

  return (
    <div>
      <PageHeader 
        title="Status de Pedidos" 
        description="Acompanhe os pedidos sincronizados com o Onclick ERP"
      >
        <Button onClick={handleSyncOrders} disabled={isSyncing}>
          <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")} />
          {isSyncing ? "Sincronizando..." : "Atualizar Pedidos"}
        </Button>
      </PageHeader>

      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Pedidos
            </CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID ou cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-sm font-medium">{order.id}</TableCell>
                  <TableCell>{order.cliente}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(order.data).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {order.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewOrder(order)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Pedido {selectedOrder?.id}
              {selectedOrder && <StatusBadge status={selectedOrder.status} />}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedOrder.cliente}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium">
                    {new Date(selectedOrder.data).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="font-medium text-lg">
                    {selectedOrder.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-heading font-semibold mb-3">Itens do Pedido</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">{item.produto}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantidade}x {item.valorUnitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                      </div>
                      <p className="font-medium">
                        {(item.quantidade * item.valorUnitario).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="font-heading font-semibold mb-3">Histórico</h4>
                <div className="space-y-3">
                  {selectedOrder.historico.map((h, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        {idx < selectedOrder.historico.length - 1 && (
                          <div className="w-0.5 h-full bg-border mt-1" />
                        )}
                      </div>
                      <div className="pb-4">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={h.status} />
                          <span className="text-xs text-muted-foreground">{h.data}</span>
                        </div>
                        {h.observacao && (
                          <p className="text-sm text-muted-foreground mt-1">{h.observacao}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
