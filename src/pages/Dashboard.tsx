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
  // --- Estados Gerais ---
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // --- Estados de Estatísticas ---
  const [monthCount, setMonthCount] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // --- Estados de Recorrência ---
  const [overallRecurringCount, setOverallRecurringCount] = useState(0);
  const [recurringDataByMonth, setRecurringDataByMonth] = useState<Record<string, any[]>>({});
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("Todos");

  // --- Estados de Estoque ---
  const [stockAlerts, setStockAlerts] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState(true);

  // --- Estados dos Modais ---
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyType, setHistoryType] = useState<'orders' | 'revenue' | 'recurrence'>('orders');

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // 1. Busca Pedidos Recentes
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

  // 2. Calcula Estatísticas Mensais e Recorrência Mês a Mês
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

  // 3. Análise de Alerta de Estoque
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

  // 4. Sync Geral
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

  // 5. Detalhes do Pedido
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

  // 6. Abre Modal Histórico
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
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader title="Dashboard" description="Visão geral das integrações e status do sistema" />
        <Button variant="outline" size="sm" onClick={() => handleSync(false)} disabled={syncing} className="bg-white">
          <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Atualizando...' : 'Atualizar Dados'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        
        {/* Card 1: RECORRÊNCIA DE CLIENTES */}
        <div 
          onClick={() => openHistory('recurrence')}
          className="cursor-pointer transition-transform hover:scale-[1.02] flex flex-col h-full"
        >
          <StatsCard
            title="Recorrência (Total)"
            value={overallRecurringCount.toString()}
            icon={Users}
            variant="primary"
            trend={{ }} /* Hack de espaçamento: Igualamos a prop vazia ao dos outros cards para forçar a mesma altura na div interna */
            className="border-purple-200 bg-purple-50/30 h-full flex-1"
          />
        </div>

        {/* Card 2: PEDIDOS */}
        <div 
          onClick={() => openHistory('orders')}
          className="cursor-pointer transition-transform hover:scale-[1.02] flex flex-col h-full"
        >
          <StatsCard
            title="Pedidos do Mês"
            value={monthCount.toString()}
            icon={ShoppingCart}
            variant="success"
            trend={{ }} 
            className="border-green-200 bg-green-50/30 h-full flex-1"
          />
        </div>

        {/* Card 3: FATURAMENTO */}
        <div 
          onClick={() => openHistory('revenue')}
          className="cursor-pointer transition-transform hover:scale-[1.02] flex flex-col h-full"
        >
          <StatsCard
            title="Faturamento (Mês)"
            value={monthRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
            icon={TrendingUp}
            variant="primary"
            trend 
            className="border-blue-200 bg-blue-50/30 h-full flex-1"
          />
        </div>

        {/* Card 4: Alerta Estoque */}
        <StatsCard
          title="Alerta Estoque"
          value={stockAlerts.length.toString()}
          icon={AlertTriangle}
          variant={stockAlerts.length > 0 ? "warning" : "primary"}
          trend={{ }} /* Hack para manter a altura igual a do Faturamento */
          className="h-full"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card Pedidos Recentes */}
        <Card className="shadow-card flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div><CardTitle className="text-lg font-heading">Últimos Pedidos</CardTitle><CardDescription>Sincronizado com Forlab Express</CardDescription></div>
            <Button variant="ghost" size="sm" asChild><Link to="/pedidos" className="text-blue-600 hover:text-blue-800">Ver todos <ArrowRight className="w-4 h-4 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-3">
              {loadingOrders ? (
                <div className="flex justify-center py-8 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 transition-all cursor-pointer" onClick={() => handleOrderClick(order.increment_id)}>
                  <div>
                    <p className="font-bold text-sm text-blue-600">#{order.increment_id}</p>
                    <p className="text-xs text-gray-500 font-medium truncate max-w-[150px]">{order.customer_firstname} {order.customer_lastname}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-gray-800">{Number(order.grand_total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                    <StatusBadgeDashboard status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Card Alerta de Estoque */}
        <Card className="shadow-card flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-heading">Alerta de Estoque</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link to="/estoque" className="text-primary">Ver todos <ArrowRight className="w-4 h-4 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {loadingStock ? (
                <div className="flex justify-center py-4 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : stockAlerts.length > 0 ? (
                stockAlerts.map((item) => (
                  <div key={item.sku} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                    <div className="overflow-hidden max-w-[65%]">
                      <p className="font-medium text-sm text-red-900 truncate" title={item.nome}>
                        {item.nome || "Produto sem nome"}
                      </p>
                      <p className="text-xs text-red-700/70 font-mono">{item.sku}</p>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="font-bold text-sm text-red-600">
                        {item.estoque} un
                      </p>
                      <p className="text-[10px] text-red-500 font-semibold">
                        Mínimo: {item.qtyminstock}
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

      {/* Modais */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {historyType === 'orders' && <><Package className="h-5 w-5 text-green-600" /> Histórico de Volume de Pedidos</>}
              {historyType === 'revenue' && <><BarChart3 className="h-5 w-5 text-blue-600" /> Histórico de Faturamento (Efetivo)</>}
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

          <div className="mt-4 border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
             <table className="w-full text-sm">
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido #{selectedOrderId}</DialogTitle>
            <DialogDescription>Consulta em tempo real</DialogDescription>
          </DialogHeader>
          {loadingDetails ? (
             <div className="flex flex-col items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
          ) : orderDetails ? (
            <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded border flex gap-3 items-center">
                    <Truck className="h-5 w-5 text-slate-500" />
                    <div><p className="text-xs text-slate-500">Frete</p><p className="font-bold text-sm">{Number(orderDetails.frete).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded border flex gap-3 items-center">
                    <DollarSign className="h-5 w-5 text-slate-500" />
                    <div><p className="text-xs text-slate-500">Total</p><p className="font-bold text-sm text-green-700">{Number(orderDetails.total_pedido).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                  </div>
               </div>
               <div className="border rounded-lg overflow-hidden max-h-[200px] overflow-y-auto">
                  <table className="w-full text-sm">
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