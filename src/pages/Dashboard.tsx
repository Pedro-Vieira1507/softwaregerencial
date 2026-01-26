import { PageHeader } from "@/components/layout/PageHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle,
  ArrowRight 
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const recentOrders = [
  { id: "PED-001", cliente: "Tech Solutions Ltda", valor: 4580.90, status: "pendente" as const },
  { id: "PED-002", cliente: "Comercial ABC", valor: 12350.00, status: "faturado" as const },
  { id: "PED-003", cliente: "Indústria XYZ", valor: 8900.50, status: "enviado" as const },
  { id: "PED-004", cliente: "Loja Central", valor: 2150.00, status: "entregue" as const },
];

const lowStockItems = [
  { nome: "Produto Alpha", sku: "SKU-001", estoque: 5, minimo: 10 },
  { nome: "Produto Beta", sku: "SKU-002", estoque: 3, minimo: 15 },
  { nome: "Produto Gamma", sku: "SKU-003", estoque: 8, minimo: 20 },
];

export default function Dashboard() {
  return (
    <div>
      <PageHeader 
        title="Dashboard" 
        description="Visão geral das integrações e status do sistema"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Total de Produtos"
          value="1,284"
          icon={Package}
          variant="primary"
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Pedidos do Mês"
          value="342"
          icon={ShoppingCart}
          variant="success"
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Faturamento"
          value="R$ 158.420"
          icon={TrendingUp}
          variant="primary"
          trend={{ value: 15, isPositive: true }}
        />
        <StatsCard
          title="Estoque Baixo"
          value="12"
          icon={AlertTriangle}
          variant="warning"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-heading">Pedidos Recentes</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/pedidos" className="text-primary">
                Ver todos <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div 
                  key={order.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{order.id}</p>
                    <p className="text-xs text-muted-foreground">{order.cliente}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="font-medium text-sm">
                      {order.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-heading">Alerta de Estoque</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/estoque" className="text-primary">
                Ver todos <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockItems.map((item) => (
                <div 
                  key={item.sku} 
                  className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20"
                >
                  <div>
                    <p className="font-medium text-sm">{item.nome}</p>
                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm text-warning">{item.estoque} un</p>
                    <p className="text-xs text-muted-foreground">Min: {item.minimo}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
