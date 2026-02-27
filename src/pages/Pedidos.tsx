import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog"; 
import { Calendar as CalendarIcon, Search, RefreshCw, Loader2, Package, Truck, DollarSign } from "lucide-react";

// Suas credenciais
const supabase = createClient(
  'https://foulnpmrfyuwvqppdrnt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdWxucG1yZnl1d3ZxcHBkcm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDE1NjYsImV4cCI6MjA4NTA3NzU2Nn0.NX3r510aLr4CAROBdFV75VvVjbIz4aj9qEetsF6UQBU'
);

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Filtros
  const [buscaId, setBuscaId] = useState("");
  const [buscaData, setBuscaData] = useState("");

  // Estados do Modal de Detalhes
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Busca lista local
  const fetchLocalOrders = async () => {
    if (pedidos.length === 0) setLoading(true);
    const { data, error } = await supabase
      .from('pedidos_magento')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setPedidos(data || []);
    setLoading(false);
  };

  // Sincronização
  const handleSync = async (silent = false) => {
    if (!silent) setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-magento-orders');
      if (error) throw error;
      await fetchLocalOrders();
      if (!silent) alert('Sincronização concluída!');
    } catch (err: any) {
      if (!silent) alert('Erro: ' + err.message);
    } finally {
      if (!silent) setSyncing(false);
    }
  };

  // Busca detalhes ao clicar
  const handleOrderClick = async (incrementId: string) => {
    setSelectedOrderId(incrementId);
    setIsModalOpen(true);
    setLoadingDetails(true);
    setOrderDetails(null); 

    try {
      const { data, error } = await supabase.functions.invoke('get-order-details', {
        body: { orderId: incrementId }
      });

      if (error) throw error;
      setOrderDetails(data);
    } catch (err) {
      console.error("Erro ao buscar detalhes:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchLocalOrders();
    const intervalo = setInterval(() => handleSync(true), 60000);
    return () => clearInterval(intervalo);
  }, []);

  // Filtragem local
  const pedidosFiltrados = pedidos.filter(pedido => {
    const matchId = pedido.increment_id.includes(buscaId);
    const dataPedido = new Date(pedido.created_at).toISOString().split('T')[0];
    const matchData = buscaData ? dataPedido === buscaData : true;
    return matchId && matchData;
  });

  return (
    <div className="space-y-4 sm:space-y-6 w-full pb-6">
      
      {/* Cabeçalho e Botões */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-800">
          Gerenciamento de Pedidos
        </h1>
        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3">
           <span className="text-xs sm:text-sm text-gray-500 animate-pulse">
             {syncing ? 'Sincronizando...' : 'Auto-sync ativo'}
           </span>
           <Button onClick={() => handleSync(false)} disabled={syncing} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-9 sm:h-10 text-sm">
             <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
             Sincronizar
           </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col sm:flex-row gap-4 items-end w-full">
        <div className="w-full sm:w-1/3">
          <label className="text-sm font-medium text-gray-700 mb-1 block">Número do Pedido</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input placeholder="Ex: 000040046" className="pl-9" value={buscaId} onChange={(e) => setBuscaId(e.target.value)} />
          </div>
        </div>
        <div className="w-full sm:w-1/3">
          <label className="text-sm font-medium text-gray-700 mb-1 block">Data</label>
          <div className="relative">
             <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
             <Input type="date" className="pl-9" value={buscaData} onChange={(e) => setBuscaData(e.target.value)} />
          </div>
        </div>
        <Button variant="outline" className="w-full sm:w-auto" onClick={() => { setBuscaId(''); setBuscaData(''); }}>
          Limpar Filtros
        </Button>
      </div>

      {/* Tabela Principal COM SCROLL HORIZONTAL (overflow-x-auto) */}
      <div className="rounded-md border bg-white shadow-sm overflow-hidden w-full">
        {/* A div abaixo garante que a tabela crie scroll se não couber na tela */}
        <div className="overflow-x-auto w-full custom-scrollbar">
          <table className="w-full caption-bottom text-sm min-w-[600px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="h-10 sm:h-12 px-4 text-left font-medium text-gray-500">Pedido</th>
                <th className="h-10 sm:h-12 px-4 text-left font-medium text-gray-500">Data</th>
                <th className="h-10 sm:h-12 px-4 text-left font-medium text-gray-500">Cliente</th>
                <th className="h-10 sm:h-12 px-4 text-left font-medium text-gray-500">Total</th>
                <th className="h-10 sm:h-12 px-4 text-center font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && pedidos.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Carregando pedidos...</td></tr>
              ) : pedidosFiltrados.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum pedido encontrado.</td></tr>
              ) : pedidosFiltrados.map((pedido) => (
                <tr key={pedido.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="p-3 sm:p-4">
                    <button 
                      onClick={() => handleOrderClick(pedido.increment_id)}
                      className="font-bold text-blue-600 hover:underline hover:text-blue-800 flex items-center gap-1 sm:gap-2 whitespace-nowrap"
                    >
                      #{pedido.increment_id}
                    </button>
                  </td>
                  <td className="p-3 sm:p-4 text-gray-600 whitespace-nowrap">
                    {new Date(pedido.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-3 sm:p-4 text-gray-800 truncate max-w-[200px]" title={`${pedido.customer_firstname} ${pedido.customer_lastname}`}>
                    {pedido.customer_firstname} {pedido.customer_lastname}
                  </td>
                  <td className="p-3 sm:p-4 font-medium whitespace-nowrap">
                    {Number(pedido.grand_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="p-3 sm:p-4 text-center whitespace-nowrap">
                    <StatusBadge status={pedido.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL DE DETALHES --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600 flex-shrink-0" /> 
              Detalhes do Pedido #{selectedOrderId}
            </DialogTitle>
            <DialogDescription>Dados atualizados em tempo real do Magento.</DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <p className="text-sm text-gray-500">Consultando API da Loja...</p>
            </div>
          ) : orderDetails ? (
            <div className="space-y-6 mt-2">
              
              {/* Bloco de Frete e Totais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 sm:p-4 rounded-lg border flex items-start gap-3">
                  <div className="bg-white p-2 rounded-full border shadow-sm flex-shrink-0">
                    <Truck className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-slate-900">Entrega</h4>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 truncate" title={orderDetails.metodo_frete}>
                      {orderDetails.metodo_frete}
                    </p>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      Frete: {Number(orderDetails.frete).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 sm:p-4 rounded-lg border flex items-start gap-3">
                  <div className="bg-white p-2 rounded-full border shadow-sm flex-shrink-0">
                    <DollarSign className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900">Total Geral</h4>
                    <p className="text-xl sm:text-2xl font-bold text-green-700 mt-1">
                      {Number(orderDetails.total_pedido).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabela de Itens */}
              <div>
                <h4 className="font-semibold text-sm mb-3 text-gray-700">Itens Comprados ({orderDetails.itens?.length || 0})</h4>
                {/* Scroll horizontal na tabela do modal */}
                <div className="border rounded-lg overflow-x-auto w-full">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead className="bg-slate-100 text-slate-600 font-medium sticky top-0">
                      <tr>
                        <th className="px-3 py-2 sm:px-4 sm:py-3 text-left">Produto</th>
                        <th className="px-3 py-2 sm:px-4 sm:py-3 text-center">Qtd</th>
                        <th className="px-3 py-2 sm:px-4 sm:py-3 text-right">Preço Un.</th>
                        <th className="px-3 py-2 sm:px-4 sm:py-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orderDetails.itens?.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2 sm:px-4 sm:py-3 max-w-[200px]">
                            <div className="font-medium text-slate-900 truncate" title={item.nome}>{item.nome}</div>
                            <div className="text-xs text-slate-500 truncate">SKU: {item.sku}</div>
                          </td>
                          <td className="px-3 py-2 sm:px-4 sm:py-3 text-center font-medium">{Number(item.qtd)}</td>
                          <td className="px-3 py-2 sm:px-4 sm:py-3 text-right text-slate-600 whitespace-nowrap">
                            {Number(item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="px-3 py-2 sm:px-4 sm:py-3 text-right font-bold text-slate-800 whitespace-nowrap">
                            {(Number(item.preco) * Number(item.qtd)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-6 text-red-500 bg-red-50 rounded-lg border border-red-100">
              Não foi possível carregar os detalhes. Verifique a conexão com a loja.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    processing: "bg-blue-100 text-blue-800 border-blue-200",
    integrado: "bg-indigo-100 text-indigo-800 border-indigo-200",
    complete: "bg-green-100 text-green-800 border-green-200",
    faturado: "bg-purple-100 text-purple-800 border-purple-200",
    closed: "bg-gray-100 text-gray-800 border-gray-200",
    canceled: "bg-red-100 text-red-800 border-red-200",
  };
  const normalized = status?.toLowerCase() || "";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border uppercase tracking-wider ${styles[normalized] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
      {status}
    </span>
  );
}