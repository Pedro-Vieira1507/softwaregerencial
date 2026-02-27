import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle,
  ArrowRight,
  Truck,
  DollarSign,
  Loader2,
  RefreshCw,
  BarChart3,
  Users
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { createClient } from '@supabase/supabase-js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Credenciais
const supabase = createClient(
  'https://foulnpmrfyuwvqppdrnt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdWxucG1yZnl1d3ZxcHBkcm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDE1NjYsImV4cCI6MjA4NTA3NzU2Nn0.NX3r510aLr4CAROBdFV75VvVjbIz4aj9qEetsF6UQBU'
);

export default function Dashboard() {
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [monthCount, setMonthCount] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [overallRecurringCount, setOverallRecurringCount] = useState(0);
  const [recurringDataByMonth, setRecurringDataByMonth] = useState<Record<string, any[]>>({});
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("Todos");

  const [stockAlerts, setStockAlerts] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState(true);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyType, setHistoryType] = useState<'orders' | 'revenue' | 'recurrence'>('orders');

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchRecentOrders = async () => {
    if (recentOrders.length === 0) setLoadingOrders(true);
    const { data, error } = await supabase
      .from('pedidos_magento')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(4);

    if (!error) setRecentOrders(data || []);
    setLoadingOrders(false);
  };

  const fetchMonthlyStats = async () => {
    setLoadingHistory(true);
    const today = new Date();
    const firstDayCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), 1).toISOString();

    const { data, error } = await supabase
      .from('pedidos_magento')
      .select('created_at, grand_total, status, customer_firstname, customer_lastname') 
      .gte('created_at', oneYearAgo);

    if (error || !data) {
      setLoadingHistory(false);
      return;
    }

    let currentMonthCounter = 0;
    let currentMonthTotal = 0;
    const statsMap: Record<string, { count: number; total: number; sortKey: number }> = {};
    const customerOverall: Record<string, { count: number; total: number }> = {};
    const customerByMonth: Record<string, Record<string, { count: number; total: number }>> = {};
    const monthsSet = new Set<string>();

    data.forEach((order: any) => {
      const dateObj = new Date(order.created_at);
      const monthKey = dateObj.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      const sortKey = dateObj.getFullYear() * 100 + dateObj.getMonth();
      const status = order.status?.toLowerCase() || '';
      const valorPedido = Number(order.grand_total);
      const statusExcluidos = ['pending', 'canceled', 'cancelado']; 
      const isRevenueValid = !statusExcluidos.includes(status);

      if (dateObj >= firstDayCurrentMonth) {
        currentMonthCounter++;
        if (isRevenueValid) currentMonthTotal += valorPedido;
      }

      if (!statsMap[monthKey]) statsMap[monthKey] = { count: 0, total: 0, sortKey };
      statsMap[monthKey].count += 1; 
      
      if (isRevenueValid) {
        statsMap[monthKey].total += valorPedido; 
        const name = `${order.customer_firstname || ''} ${order.customer_lastname || ''}`.trim();
        if (name) {
          if (!customerOverall[name]) customerOverall[name] = { count: 0, total: 0 };
          customerOverall[name].count += 1;
          customerOverall[name].total += valorPedido;

          if (!customerByMonth[monthKey]) customerByMonth[monthKey] = {};
          if (!customerByMonth[monthKey][name]) customerByMonth[monthKey][name] = { count: 0, total: 0 };
          customerByMonth[monthKey][name].count += 1;
          customerByMonth[monthKey][name].total += valorPedido;
          
          monthsSet.add(monthKey);
        }
      }
    });

    const historyArray = Object.entries(statsMap)
      .map(([key, value]) => ({ month: key, ...value }))
      .sort((a, b) => b.sortKey - a.sortKey);

    const overallRecurring = Object.entries(customerOverall)
      .filter(([_, stats]) => stats.count > 1)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.total - a.total); 

    const monthlyRecurring: Record<string, any[]> = {};
    Array.from(monthsSet).forEach(month => {
      monthlyRecurring[month] = Object.entries(customerByMonth[month])
        .filter(([_, stats]) => stats.count > 1) 
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.total - a.total);
    });

    const sortedMonths = historyArray.map(h => h.month);

    setMonthCount(currentMonthCounter);
    setMonthRevenue(currentMonthTotal);
    setHistoryData(historyArray);
    setOverallRecurringCount(overallRecurring.length);
    setRecurringDataByMonth({ "Todos": overallRecurring, ...monthlyRecurring });
    setAvailableMonths(["Todos", ...sortedMonths]);
    setLoadingHistory(false);
  };

  const fetchStockAlerts = async () => {
    setLoadingStock(true);
    const { data, error } = await supabase
      .from('produtos_cache')
      .select('sku, nome, estoque, qtyminstock');

    if (!error && data) {
      const criticalItems = data.filter((produto: any) => {
        const estoqueAtual = Number(produto.estoque);
        const estoqueMinimo = Number(produto.qtyminstock);
        return estoqueMinimo > 0 && estoqueAtual < estoqueMinimo;
      });
      setStockAlerts(criticalItems);
    }
    setLoadingStock(false);
  };

  const handleSync = async (silent = false) => {
    if (!silent) setSyncing(true);
    try {
      await supabase.functions.invoke('sync-magento-orders');
      await Promise.all([
        fetchRecentOrders(), 
        fetchMonthlyStats(),
        fetchStockAlerts()
      ]);
      if (!silent) alert('Dashboard atualizado!');
    } catch (err) { console.error(err); } 
    finally { if (!silent) setSyncing(false); }
  };

  const handleOrderClick = async (incrementId: string) => {
    setSelectedOrderId(incrementId);
    setIsDetailModalOpen(true);
    setLoadingDetails(true);
    setOrderDetails(null);
    try {
      const { data } = await supabase.functions.invoke('get-order-details', { body: { orderId: incrementId } });
      setOrderDetails(data);
    } catch (err) { console.error(err); } 
    finally { setLoadingDetails(false); }
  };

  const openHistory = (type: 'orders' | 'revenue' | 'recurrence') => {
    setHistoryType(type);
    setIsHistoryModalOpen(true);
  };

  useEffect(() => {
    fetchRecentOrders();
    fetchMonthlyStats();
    fetchStockAlerts();
    const intervalo = setInterval(() => handleSync(true), 60000);
    return () => clearInterval(intervalo);
  }, []);

  const currentRecurrenceData = recurringDataByMonth[selectedMonth] || [];

  return (
    // FORÇADO: max-w-full e overflow-x-hidden para impedir que qualquer filho quebre a tela
    <div className="w-full max-w-full overflow-x-hidden space-y-4 sm:space-y-6 pb-6">
      
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
        {/* Garantimos que o PageHeader não crie overflow */}
        <div className="w-full min-w-0">
           <PageHeader title="Dashboard" description="Visão geral das integrações e status do sistema" />
        </div>
        <Button 
          onClick={() => handleSync(false)} 
          disabled={syncing} 
          className="w-full sm:w-auto shadow-sm flex-shrink-0"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Atualizando...' : 'Atualizar Dados'}
        </Button>
      </div>

      {/* GRELHA DE CARTÕES DE ESTATÍSTICA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        
        {/* Usar 'w-full min-w-0' nos blocos da grelha impede que cartões longos empurrem os limites */}
        <div className="w-full min-w-0 cursor-pointer transition-transform hover:-translate-y-1" onClick={() => openHistory('recurrence')}>
          <StatsCard
            title="Recorrência (Total)"
            value={overallRecurringCount.toString()}
            icon={Users}
            variant="primary"
            trend={{ }} 
            className="border-purple-200 bg-purple-50/30 h-full w-full shadow-sm hover:shadow-md transition-shadow"
          />
        </div>

        <div className="w-full min-w-0 cursor-pointer transition-transform hover:-translate-y-1" onClick={() => openHistory('orders')}>
          <StatsCard
            title="Pedidos do Mês"
            value={monthCount.toString()}
            icon={ShoppingCart}
            variant="success"
            trend={{ }} 
            className="border-green-200 bg-green-50/30 h-full w-full shadow-sm hover:shadow-md transition-shadow"
          />
        </div>

        <div className="w-full min-w-0 cursor-pointer transition-transform hover:-translate-y-1" onClick={() => openHistory('revenue')}>
          <StatsCard
            title="Faturamento (Mês)"
            value={monthRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
            icon={TrendingUp}
            variant="primary"
            trend 
            className="border-blue-200 bg-blue-50/30 h-full w-full shadow-sm hover:shadow-md transition-shadow"
          />
        </div>

        <div className="w-full min-w-0">
            <StatsCard
              title="Alerta Estoque"
              value={stockAlerts.length.toString()}
              icon={AlertTriangle}
              variant={stockAlerts.length > 0 ? "warning" : "primary"}
              trend={{ }} 
              className="h-full w-full shadow-sm"
            />
        </div>
      </div>

      {/* GRELHA INFERIOR: ÚLTIMOS PEDIDOS E ALERTA ESTOQUE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full">
        
        <Card className="shadow-sm border-border flex flex-col h-full overflow-hidden w-full min-w-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50 flex-wrap gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base sm:text-lg font-heading truncate">Últimos Pedidos</CardTitle>
              <CardDescription className="text-xs sm:text-sm truncate">Sincronizado com Forlab Express</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="flex-shrink-0">
                <Link to="/pedidos" className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm px-0 sm:px-3">
                    Ver todos <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 pt-4 px-3 sm:px-6">
            <div className="space-y-3">
              {loadingOrders ? (
                <div className="flex justify-center py-8 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 transition-all cursor-pointer gap-2" onClick={() => handleOrderClick(order.increment_id)}>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-blue-600">#{order.increment_id}</p>
                    <p className="text-xs text-gray-500 font-medium truncate">{order.customer_firstname} {order.customer_lastname}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm text-gray-800">{Number(order.grand_total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                    <StatusBadgeDashboard status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border flex flex-col h-full overflow-hidden w-full min-w-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50 flex-wrap gap-2">
            <CardTitle className="text-base sm:text-lg font-heading truncate flex-1 min-w-0">Alerta de Estoque</CardTitle>
            <Button variant="ghost" size="sm" asChild className="flex-shrink-0">
                <Link to="/estoque" className="text-primary text-xs sm:text-sm px-0 sm:px-3">
                    Ver todos <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-4 px-3 sm:px-6">
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
              {loadingStock ? (
                <div className="flex justify-center py-4 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : stockAlerts.length > 0 ? (
                stockAlerts.map((item) => (
                  <div key={item.sku} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100 gap-2">
                    <div className="overflow-hidden min-w-0 flex-1">
                      <p className="font-medium text-sm text-red-900 truncate" title={item.nome}>
                        {item.nome || "Produto sem nome"}
                      </p>
                      <p className="text-xs text-red-700/70 font-mono truncate">{item.sku}</p>
                    </div>
                    <div className="text-right flex-shrink-0 w-[65px] sm:w-[80px]">
                      <p className="font-bold text-sm text-red-600 truncate">
                        {item.estoque} un
                      </p>
                      <p className="text-[10px] sm:text-xs text-red-500 font-semibold truncate">
                        Mín: {item.qtyminstock}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Nenhum produto com estoque crítico.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MODAIS (MANTIDOS IGUAIS) */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[500px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {historyType === 'orders' && <><Package className="h-5 w-5 text-green-600" /> Histórico de Volume de Pedidos</>}
              {historyType === 'revenue' && <><BarChart3 className="h-5 w-5 text-blue-600" /> Histórico de Faturamento</>}
              {historyType === 'recurrence' && <><Users className="h-5 w-5 text-purple-600" /> Clientes Recorrentes</>}
            </DialogTitle>
            <DialogDescription>
              {historyType === 'orders' && "Quantidade de pedidos recebidos nos últimos 12 meses."}
              {historyType === 'revenue' && "Valores faturados (exclui pendentes e cancelados) nos últimos 12 meses."}
              {historyType === 'recurrence' && "Clientes que possuem mais de 1 compra faturada no período selecionado."}
            </DialogDescription>
          </DialogHeader>
          
          {historyType === 'recurrence' && (
            <div className="mt-4 mb-2">
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Filtrar por Período</label>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full border-slate-200 border rounded-md p-2 text-sm bg-slate-50 outline-none focus:border-purple-400 capitalize"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m} className="capitalize">{m}</option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-4 border rounded-lg overflow-x-auto max-h-[300px] overflow-y-auto">
             <table className="w-full text-sm min-w-[350px]">
                <thead className="bg-slate-100 text-slate-700 sticky top-0">
                  <tr>
                    {historyType === 'recurrence' ? (
                      <>
                        <th className="px-4 py-3 text-left">Nome do Cliente</th>
                        <th className="px-4 py-3 text-center">Nº de Compras</th>
                        <th className="px-4 py-3 text-right">Total Gasto</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3 text-left">Mês/Ano</th>
                        {historyType === 'orders' && <th className="px-4 py-3 text-center">Qtde Pedidos</th>}
                        {historyType === 'revenue' && <th className="px-4 py-3 text-right">Valor Total</th>}
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loadingHistory ? (
                    <tr><td colSpan={3} className="p-4 text-center">Carregando dados...</td></tr>
                  ) : historyType === 'recurrence' ? (
                    currentRecurrenceData.length > 0 ? (
                      currentRecurrenceData.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 capitalize">{item.name.toLowerCase()}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-purple-100 px-2.5 py-0.5 rounded-full text-xs font-bold text-purple-800">
                              {item.count}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-green-700">
                            {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={3} className="p-4 text-center text-slate-500">Nenhum cliente recorrente encontrado neste período.</td></tr>
                    )
                  ) : (
                    historyData.map((item, idx) => (
                      <tr key={idx} className={`hover:bg-slate-50 ${idx === 0 ? 'bg-slate-50 font-medium' : ''}`}>
                        <td className="px-4 py-3 capitalize">{item.month}</td>
                        {historyType === 'orders' && (
                          <td className="px-4 py-3 text-center">
                            <span className="bg-green-100 px-2.5 py-0.5 rounded-full text-xs font-bold text-green-800">{item.count}</span>
                          </td>
                        )}
                        {historyType === 'revenue' && (
                          <td className="px-4 py-3 text-right font-medium text-blue-700">
                            {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
             </table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[600px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido #{selectedOrderId}</DialogTitle>
            <DialogDescription>Consulta em tempo real</DialogDescription>
          </DialogHeader>
          {loadingDetails ? (
             <div className="flex flex-col items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
          ) : orderDetails ? (
            <div className="space-y-6">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded border flex gap-3 items-center">
                    <Truck className="h-5 w-5 text-slate-500 flex-shrink-0" />
                    <div><p className="text-xs text-slate-500">Frete</p><p className="font-bold text-sm">{Number(orderDetails.frete).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded border flex gap-3 items-center">
                    <DollarSign className="h-5 w-5 text-slate-500 flex-shrink-0" />
                    <div><p className="text-xs text-slate-500">Total</p><p className="font-bold text-sm text-green-700">{Number(orderDetails.total_pedido).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                  </div>
               </div>
               
               <div className="border rounded-lg overflow-x-auto max-h-[200px] overflow-y-auto">
                  <table className="w-full text-sm min-w-[400px]">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0">
                      <tr><th className="px-3 py-2 text-left">Produto</th><th className="px-3 py-2 text-center">Qtd</th><th className="px-3 py-2 text-right">Total</th></tr>
                    </thead>
                    <tbody className="divide-y">{orderDetails.itens.map((item: any, idx: number) => (
                        <tr key={idx}><td className="px-3 py-2 text-xs truncate max-w-[200px]">{item.nome}</td><td className="px-3 py-2 text-center text-xs">{Number(item.qtd)}</td><td className="px-3 py-2 text-right text-xs">{(Number(item.preco) * Number(item.qtd)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td></tr>
                    ))}</tbody>
                  </table>
               </div>
            </div>
          ) : <p className="text-center text-red-500">Erro ao carregar.</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadgeDashboard({ status }: { status: string }) {
  const styles: Record<string, string> = { pending: "text-yellow-700 bg-yellow-50", processing: "text-blue-700 bg-blue-50", integrado: "text-indigo-700 bg-indigo-50", complete: "text-green-700 bg-green-50", faturado: "text-purple-700 bg-purple-50", closed: "text-gray-700 bg-gray-50", canceled: "text-red-700 bg-red-50" };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${styles[status?.toLowerCase()] || "text-gray-600 bg-gray-50"}`}>{status}</span>;
}