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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RefreshCw, Search, Package, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  sku: string;
  nome: string;
  estoque: number;
  estoqueMinimo: number;
  preco: number;
  ultimaSync: string;
}

const mockProducts: Product[] = [
  { id: "1", sku: "SKU-001", nome: "Notebook Dell Inspiron 15", estoque: 25, estoqueMinimo: 10, preco: 3499.00, ultimaSync: "2024-01-15 14:30" },
  { id: "2", sku: "SKU-002", nome: "Mouse Logitech MX Master 3", estoque: 5, estoqueMinimo: 15, preco: 599.00, ultimaSync: "2024-01-15 14:30" },
  { id: "3", sku: "SKU-003", nome: "Teclado Mecânico Keychron K2", estoque: 42, estoqueMinimo: 20, preco: 449.00, ultimaSync: "2024-01-15 14:30" },
  { id: "4", sku: "SKU-004", nome: "Monitor LG 27\" 4K", estoque: 8, estoqueMinimo: 5, preco: 2299.00, ultimaSync: "2024-01-15 14:30" },
  { id: "5", sku: "SKU-005", nome: "Webcam Logitech C920", estoque: 3, estoqueMinimo: 10, preco: 399.00, ultimaSync: "2024-01-15 14:30" },
  { id: "6", sku: "SKU-006", nome: "Headset HyperX Cloud II", estoque: 18, estoqueMinimo: 8, preco: 549.00, ultimaSync: "2024-01-15 14:30" },
];

export default function Estoque() {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newStock, setNewStock] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const filteredProducts = products.filter(
    (p) =>
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleEditStock = (product: Product) => {
    setSelectedProduct(product);
    setNewStock(product.estoque.toString());
    setIsDialogOpen(true);
  };

  const handleSaveStock = async () => {
    if (!selectedProduct) return;

    setIsSyncing(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setProducts((prev) =>
      prev.map((p) =>
        p.id === selectedProduct.id
          ? { ...p, estoque: parseInt(newStock), ultimaSync: new Date().toLocaleString("pt-BR") }
          : p
      )
    );

    setIsSyncing(false);
    setIsDialogOpen(false);
    
    toast({
      title: "Estoque atualizado",
      description: `${selectedProduct.nome} atualizado para ${newStock} unidades.`,
    });
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSyncing(false);
    
    toast({
      title: "Sincronização concluída",
      description: "Todos os produtos foram sincronizados com o Onclick ERP.",
    });
  };

  return (
    <div>
      <PageHeader 
        title="Gestão de Estoque" 
        description="Gerencie e sincronize o estoque com o Onclick ERP"
      >
        <Button onClick={handleSyncAll} disabled={isSyncing}>
          <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")} />
          {isSyncing ? "Sincronizando..." : "Sincronizar Todos"}
        </Button>
      </PageHeader>

      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Produtos
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead>Última Sync</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                  <TableCell className="font-medium">{product.nome}</TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "font-medium",
                        product.estoque < product.estoqueMinimo && "text-warning"
                      )}
                    >
                      {product.estoque}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {product.estoqueMinimo}
                  </TableCell>
                  <TableCell className="text-right">
                    {product.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {product.ultimaSync}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditStock(product)}
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Atualizar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Estoque</DialogTitle>
            <DialogDescription>
              Atualize a quantidade em estoque para {selectedProduct?.nome}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="stock">Nova quantidade</Label>
            <Input
              id="stock"
              type="number"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              className="mt-2"
              min="0"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveStock} disabled={isSyncing}>
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                "Salvar e Sincronizar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
