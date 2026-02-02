import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/utils"; // Ajuste o import se criou em src/lib/supabase.ts
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RefreshCw, Search, Package, Edit2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Função auxiliar para buscar credenciais
const getApiCredentials = () => {
  return {
    url: localStorage.getItem("onclick_base_url"),
    token: localStorage.getItem("onclick_api_token")
  };
};

export default function Estoque() {
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [newStock, setNewStock] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Busca dados reais via Edge Function
  const { data: products = [], isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['onclick-products'],
    queryFn: async () => {
      const { url, token } = getApiCredentials();
      if (!url || !token) throw new Error("Credenciais não configuradas");

      const { data, error } = await supabase.functions.invoke('onclick-proxy', {
        body: { action: 'GET_PRODUCTS' },
        headers: {
          'x-onclick-url': url,
          'x-onclick-token': token
        }
      });

      if (error) throw error;
      
      return Array.isArray(data) ? data.map((item: any) => ({
        id: item.sku, 
        sku: item.sku,
        nome: item.nome,
        estoque: Number(item.estoque),
        parentSku: item.parent_sku || "0", 
        ultimaSync: new Date(item.ultima_atualizacao).toLocaleString("pt-BR")
      })) : [];
    },
    // Configurações de Polling (Atualização Automática)
    staleTime: 0, 
    refetchInterval: 60000, 
    refetchIntervalInBackground: true, 
    refetchOnWindowFocus: true 
  });

  // 2. Mutação para atualizar estoque
  const updateStockMutation = useMutation({
    mutationFn: async ({ sku, quantity }: { sku: string, quantity: number }) => {
      const { url, token } = getApiCredentials();
      const { data, error } = await supabase.functions.invoke('onclick-proxy', {
        body: { 
          action: 'UPDATE_STOCK', 
          payload: { sku, quantidade: quantity } 
        },
        headers: { 'x-onclick-url': url, 'x-onclick-token': token }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onclick-products'] });
      toast({ title: "Sucesso", description: "Estoque atualizado no ERP." });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  });

  const filteredProducts = products.filter((p: any) =>
    p.nome?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEditStock = (product: any) => {
    setSelectedProduct(product);
    setNewStock(product.estoque.toString());
    setIsDialogOpen(true);
  };

  return (
    <div>
      <PageHeader title="Gestão de Estoque" description="Sincronizado com Onclick ERP">
        <Button onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", (isLoading || isRefetching) && "animate-spin")} />
          Atualizar Lista
        </Button>
      </PageHeader>

      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" /> Produtos ({products.length})
            </CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou SKU..."
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
          ) : isError ? (
            <div className="text-center text-red-500 p-4">Erro ao carregar dados. Verifique as configurações.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Produto</TableHead>
                  {/* Cabeçalhos Centralizados */}
                  <TableHead className="text-center">Estoque</TableHead>
                  <TableHead className="text-center whitespace-nowrap">SKU Pai</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product: any) => (
                  <TableRow key={product.id || product.sku}>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell className="font-medium">{product.nome}</TableCell>
                    
                    {/* Célula Estoque: Centralizada */}
                    <TableCell className="text-center">
                      <span className={cn("font-medium", product.estoque < product.estoqueMinimo && "text-warning")}>
                        {product.estoque}
                      </span>
                    </TableCell>

                    {/* Célula SKU Pai: Centralizada */}
                    <TableCell className="text-center">
                      {product.parentSku === "0" || !product.parentSku 
                        ? "Não" 
                        : product.parentSku}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Estoque</DialogTitle>
            <DialogDescription>Produto: {selectedProduct?.nome}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="stock">Nova quantidade</Label>
            <Input
              id="stock"
              type="number"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button 
              onClick={() => updateStockMutation.mutate({ sku: selectedProduct.sku, quantity: parseInt(newStock) })} 
              disabled={updateStockMutation.isPending}
            >
              {updateStockMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar no ERP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}