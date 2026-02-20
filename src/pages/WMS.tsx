import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Map, UploadCloud, MapPin, Package, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Interface para estruturar os dados extraídos
interface PickItem {
  codigo: string;
  sku: string;
  descricao: string;
  local: string;
  qtdeTotal: number;
  pedidos: string[];
}

export default function WMS() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // 1. Modificado: Tenta carregar a lista salva no navegador primeiro
  const [pickingList, setPickingList] = useState<PickItem[]>(() => {
    const savedList = localStorage.getItem("wms_picking_list");
    if (savedList) {
      try {
        return JSON.parse(savedList);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // 2. Novo: Toda vez que a pickingList mudar, salva automaticamente no navegador
  useEffect(() => {
    localStorage.setItem("wms_picking_list", JSON.stringify(pickingList));
  }, [pickingList]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleProcessFile = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const text = await file.text();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      
      const divs = Array.from(doc.querySelectorAll('div'));
      
      const elements = divs.map(div => ({
        top: parseInt(div.style.top || '0', 10),
        left: parseInt(div.style.left || '0', 10),
        text: div.textContent?.trim() || ''
      })).filter(e => e.text);

      const rowsByTop: Record<number, typeof elements> = {};
      elements.forEach(e => {
        if (!rowsByTop[e.top]) rowsByTop[e.top] = [];
        rowsByTop[e.top].push(e);
      });

      const sortedTops = Object.keys(rowsByTop).map(Number).sort((a, b) => a - b);

      let currentPedido = "";
      let lastParsedItem: any = null;
      const rawItems: any[] = [];

      sortedTops.forEach(top => {
        const rowElements = rowsByTop[top].sort((a, b) => a.left - b.left);
        const texts = rowElements.map(e => e.text);

        if (texts[0].startsWith('PEDIDO:')) {
          currentPedido = texts[0].replace('PEDIDO:', '').trim();
        } 
        else if (texts[0].startsWith('LOCAL:')) {
          if (lastParsedItem) {
            lastParsedItem.local = texts[0].replace('LOCAL:', '').trim();
          }
        } 
        // Identifica uma linha de produto
        else if (texts.length >= 7 && (texts[6] === 'SIM' || texts[6] === 'NAO' || texts[6] === 'NÃO')) {
          const qtde = parseFloat(texts[4].replace(/\./g, '').replace(',', '.')); 
          const isAtendido = texts[6] === 'SIM';

          const item = {
            pedido: currentPedido,
            codigo: texts[0],
            sku: texts[1],
            descricao: texts[2],
            qtde: qtde,
            atendido: isAtendido,
            local: "Sem Local" 
          };
          
          lastParsedItem = item;
          rawItems.push(item);
        }
      });

      // Agrupamento (Batch Picking)
      const batchMap: Record<string, PickItem> = {};
      
      rawItems
        .filter(item => item.atendido) 
        .forEach(item => {
          if (!batchMap[item.codigo]) {
            batchMap[item.codigo] = {
              codigo: item.codigo,
              sku: item.sku,
              descricao: item.descricao,
              local: item.local,
              qtdeTotal: 0,
              pedidos: []
            };
          }
          batchMap[item.codigo].qtdeTotal += item.qtde;
          
          if (!batchMap[item.codigo].pedidos.includes(item.pedido)) {
            batchMap[item.codigo].pedidos.push(item.pedido);
          }
        });

      // Converte pra Array e ordena
      const finalList = Object.values(batchMap).sort((a, b) => a.local.localeCompare(b.local));

      setPickingList(finalList);
      toast({ title: "Sucesso!", description: `${finalList.length} SKUs agrupados para coleta.` });

    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro na leitura", description: "Verifique se o arquivo importado é um HTML válido." });
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Modificado: Limpa também os dados do navegador quando recomeçar
  const resetList = () => {
    setPickingList([]);
    setFile(null);
    localStorage.removeItem("wms_picking_list");
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader 
          title="Roteirização WMS" 
          description="Agrupamento inteligente de coleta (Batch Picking)." 
        />
        {pickingList.length > 0 && (
          <Button variant="outline" onClick={resetList}>
            <RefreshCw className="w-4 h-4 mr-2" /> Novo Lote
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {pickingList.length === 0 && (
          <Card className="shadow-card lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-primary" />
                Importar Relatório
              </CardTitle>
              <CardDescription>
                Faça o upload do HTML de "Pedidos a Faturar" para compilar a rota.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
                <Input 
                  type="file" 
                  accept=".htm, .html" 
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
              </div>
              <Button className="w-full" onClick={handleProcessFile} disabled={!file || isProcessing}>
                {isProcessing ? "Lendo dados..." : "Processar Separação"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className={`shadow-card ${pickingList.length > 0 ? 'lg:col-span-3' : 'lg:col-span-2'} min-h-[400px] flex flex-col`}>
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Map className="w-5 h-5 text-purple-600" />
              Rota de Coleta Agrupada
            </CardTitle>
            <CardDescription>
              Itens repetidos foram combinados. A lista está ordenada pela localização para evitar idas e vindas.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {pickingList.length > 0 ? (
              <div className="border-t">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[150px]">Local (Endereço)</TableHead>
                      <TableHead className="w-[100px]">Código</TableHead>
                      <TableHead className="w-[120px]">SKU</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Atende Pedidos</TableHead>
                      <TableHead className="text-right">Qtd. Coletar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pickingList.map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/50">
                        <TableCell>
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-mono text-sm">
                            <MapPin className="w-3 h-3 mr-1" />
                            {item.local}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-slate-500">{item.codigo}</TableCell>
                        <TableCell className="font-mono font-medium text-blue-600">{item.sku}</TableCell>
                        <TableCell className="font-medium text-slate-800">{item.descricao}</TableCell>
                        <TableCell>
                          <span className="text-xs text-slate-500">
                            {item.pedidos.join(', ')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-lg font-bold text-green-600">
                            {item.qtdeTotal} un
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-b-xl border-t border-dashed py-20">
                <Package className="w-12 h-12 mb-3 opacity-20" />
                <p>Aguardando importação do arquivo.</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}