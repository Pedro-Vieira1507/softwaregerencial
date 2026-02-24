import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Map, UploadCloud, MapPin, Package, RefreshCw, Route as RouteIcon, ListChecks, CheckCircle, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Interface para estruturar os dados extraídos
interface PickItem {
  codigo: string;
  sku: string;
  descricao: string;
  local: string;
  qtdeTotal: number;
  pedidos: string[];
}

// Mapeamento EXATO da localização física das prateleiras
const ZONES = {
  // Galpão Principal
  CENTRAL_DIREITA: ["1-A3", "1-A5", "1-A7", "1-A4", "1-A6", "1-A8", "1-B3", "1-B5", "1-B7", "1-B4", "1-B6", "1-B8", "1-C3", "1-C5", "1-C7", "1-C4", "1-C6", "1-C8", "1-D3", "1-D5", "1-D7", "1-D4", "1-D6", "1-D8", "1-E1", "1-E2", "P12-A", "P12-B", "P12-C", "P12-D", "P12-E", "P13-A", "P13-B", "P13-C", "P13-D", "P13-E"],
  CENTRAL_ESQUERDA: ["2-A1", "2-A2", "2-A3", "2-A4", "2-A5", "2-A6", "2-B1", "2-B2", "2-B3", "2-B4", "2-B5", "2-B6", "2-C1", "2-C2", "2-C3", "2-C4", "2-C5", "2-C6", "2-D1", "2-D2", "2-D3", "2-D4", "2-D5", "2-D6", "2-D7", "2-D8", "P11-A", "P11-B", "P11-C", "P11-D", "P11-E", "P10-A", "P10-B", "P10-C", "P10-D", "P10-E"],
  PAREDE_ESQUERDA: ["4-A1", "3-A2", "3-A3", "3-A4", "3-A5", "3-A6", "3-B1", "3-B2", "3-B3", "3-B4", "3-C1", "3-C2", "3-C3", "3-C4", "3-C5", "3-C6", "3-D1", "3-D2", "3-D3", "3-D4", "3-E1", "3-E2", "3-E3", "3-E4", "3-F1", "3-F2", "3-F3", "3-F4", "3-F5", "3-F6"],
  PAREDE_FUNDO: ["4-A1", "4-A2", "4-A3", "4-A4", "4-B1", "4-B2", "4-B3", "4-B4", "4-C1", "4-C2", "4-C3", "4-C4", "4-D1", "4-D2"],
  
  // Sala Correlatos
  CORR_PORTA: ["P14-A", "P14-B", "P14-C", "P14-D", "P14-E", "P14-F"],
  CORR_ESQUERDA: ["P15-A", "P15-B", "P15-C", "P15-D", "P15-E", "P15-F", "P16-A", "P16-B", "P16-C", "P16-E", "P16-F", "P17-A", "P17-B", "P17-C", "P17-D", "P17-E", "P17-F", "P25-A", "P25-B", "P25-C", "P25-D", "P25-E", "P25-F"],
  CORR_FUNDO: ["P18-A", "P18-B", "P18-C", "P18-D", "P18-E", "P18-F", "P19-A", "P19-B", "P19-C", "P19-D", "P19-E", "P20-A", "P20-B", "P20-C", "P20-D", "P20-E"],
  CORR_DIREITA: ["P21-A", "P21-B", "P21-C", "P21-D", "P21-E", "P22-A", "P22-B", "P22-C", "P22-D", "P22-E", "GELADEIRA"],
  CORR_CENTRAL: ["P24-A", "P23-B", "P23-C", "P23-D", "P23-E", "P23-F", "P24-A", "P24-B", "P24-C", "P24-D", "P24-E", "P24-F"]
};

// ============================================================================
// SISTEMA ESTRITO DE FLUXO CONTÍNUO (Path Coord x Shelf Coord)
// ============================================================================
const getBestLocationInfo = (localStr: string) => {
  const locals = localStr.split('/').map(s => s.replace(/\s+/g, '').toUpperCase().replace('1D', '1-D'));
  
  let bestScore = Infinity;
  // pathCoord: por onde o tracejado passa | shelfCoord: onde o pino é colado
  let bestPathCoord = { x: 340, y: 580 }; 
  let bestShelfCoord = { x: 340, y: 580 }; 
  let isValid = false;

  for (const loc of locals) {
    let foundZone: string | null = null;
    let foundIndex = 0;
    let totalLength = 1;

    for (const [zoneName, items] of Object.entries(ZONES)) {
      const idx = items.indexOf(loc);
      if (idx !== -1) {
         foundZone = zoneName;
         foundIndex = idx;
         totalLength = items.length;
         break;
      }
    }

    if (foundZone) {
      isValid = true;
      const ratio = totalLength > 1 ? (foundIndex / (totalLength - 1)) : 0.5;
      let score = 99999;
      let pCoord = { x: 340, y: 550 };
      let sCoord = { x: 340, y: 550 };

      // Ajustes finos: pCoord (linha) fica no corredor, sCoord (bolinha) fica na parede
      switch(foundZone) {
        case 'CENTRAL_DIREITA': 
          score = 10000 + (ratio * 1000); 
          pCoord = { x: 340, y: 500 - ratio * 360 }; 
          sCoord = { x: 260, y: 500 - ratio * 360 }; // Colado no amarelo direito
          break;
        case 'CORR_PORTA': 
          score = 21000 + (ratio * 1000); 
          pCoord = { x: 480, y: 120 - ratio * 100 }; 
          sCoord = { x: 455, y: 120 - ratio * 100 }; // Colado no azul
          break;
        case 'CORR_ESQUERDA': 
          score = 22000 + (ratio * 1000); 
          pCoord = { x: 480 + ratio * 240, y: 50 }; 
          sCoord = { x: 480 + ratio * 240, y: 15 }; // Colado no preto
          break;
        case 'CORR_FUNDO': 
          score = 23000 + (ratio * 1000); 
          pCoord = { x: 720, y: 50 + ratio * 120 }; 
          sCoord = { x: 765, y: 50 + ratio * 120 }; // Colado no rosa
          break;
        case 'CORR_DIREITA': 
          score = 24000 + (ratio * 1000); 
          pCoord = { x: 720 - ratio * 240, y: 170 }; 
          sCoord = { x: 720 - ratio * 240, y: 205 }; // Colado no roxo
          break;
        case 'CORR_CENTRAL': 
          score = 25000 + (ratio * 1000); 
          pCoord = { x: 690 - ratio * 160, y: 110 }; 
          sCoord = { x: 690 - ratio * 160, y: 110 }; // Em cima do vermelho central
          break;
        case 'PAREDE_FUNDO': 
          score = 30000 + ((1 - ratio) * 1000); 
          pCoord = { x: 120 + ratio * 200, y: 100 }; 
          sCoord = { x: 120 + ratio * 200, y: 30 }; // Colado no vermelho fundo
          break;
        case 'CENTRAL_ESQUERDA': 
          score = 40000 + ((1 - ratio) * 1000); 
          pCoord = { x: 100, y: 500 - ratio * 360 }; 
          sCoord = { x: 160, y: 500 - ratio * 360 }; // Colado no amarelo esquerdo
          break;
        case 'PAREDE_ESQUERDA': 
          score = 40000 + ((1 - ratio) * 1000); 
          pCoord = { x: 100, y: 540 - ratio * 400 }; 
          sCoord = { x: 30, y: 540 - ratio * 400 }; // Colado no laranja
          break;
      }

      if (score < bestScore) {
        bestScore = score;
        bestPathCoord = pCoord;
        bestShelfCoord = sCoord;
      }
    }
  }
  
  return { 
    isValid,
    score: bestScore === Infinity ? 99999 : bestScore, 
    pathCoord: bestPathCoord,
    shelfCoord: bestShelfCoord
  };
};

const buildPath = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
  let points: {x: number, y: number}[] = [];
  
  if ((p1.x < 400 && p2.x > 400) || (p1.x > 400 && p2.x < 400)) {
      const doorMain = {x: 340, y: 160};
      const doorCorr = {x: 460, y: 160};
      if (p1.x < 400) {
          points.push(...buildPath(p1, doorMain), doorCorr, ...buildPath(doorCorr, p2));
      } else {
          points.push(...buildPath(p1, doorCorr), doorMain, ...buildPath(doorMain, p2));
      }
      return points;
  }

  if (p1.x < 400 && p2.x < 400) {
      if (p1.x !== p2.x && p1.y !== p2.y) {
          if ((p1.x === 100 && p2.x === 340) || (p1.x === 340 && p2.x === 100)) {
              const viaY = (p1.y + p2.y) / 2 < 325 ? 100 : 550;
              points.push({ x: p1.x, y: viaY }, { x: p2.x, y: viaY });
          } else {
              const isP1Vert = p1.x === 100 || p1.x === 340;
              const isP2Vert = p2.x === 100 || p2.x === 340;
              if (isP1Vert && !isP2Vert) points.push({ x: p1.x, y: p2.y });
              else if (!isP1Vert && isP2Vert) points.push({ x: p2.x, y: p1.y });
              else points.push({ x: p1.x, y: p2.y });
          }
      } else if (p1.y === p2.y && p1.y > 100 && p1.y < 550 && p1.x !== p2.x) {
          const viaY = p1.y < 325 ? 100 : 550;
          points.push({ x: p1.x, y: viaY }, { x: p2.x, y: viaY });
      }
  } else {
       if (p1.x !== p2.x && p1.y !== p2.y) {
          if ((p1.y === 20 && p2.y === 200) || (p1.y === 200 && p2.y === 20)) {
              const viaX = (p1.x + p2.x) / 2 < 600 ? 460 : 740;
              points.push({ x: viaX, y: p1.y }, { x: viaX, y: p2.y });
          } else {
              const isP1Horiz = p1.y === 20 || p1.y === 200;
              const isP2Horiz = p2.y === 20 || p2.y === 200;
              if (isP1Horiz && !isP2Horiz) points.push({ x: p2.x, y: p1.y });
              else if (!isP1Horiz && isP2Horiz) points.push({ x: p1.x, y: p2.y });
              else points.push({ x: p2.x, y: p1.y });
          }
       } else if (p1.x === p2.x && p1.x > 460 && p1.x < 740 && p1.y !== p2.y) {
          const viaX = p1.x < 600 ? 460 : 740;
          points.push({ x: viaX, y: p1.y }, { x: viaX, y: p2.y });
       }
  }
  return points;
};


export default function WMS() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const [pickingList, setPickingList] = useState<PickItem[]>(() => {
    const saved = localStorage.getItem("wms_picking_list");
    return saved ? JSON.parse(saved) : [];
  });
  
  const [checkedItems, setCheckedItems] = useState<number[]>(() => {
    const saved = localStorage.getItem("wms_checked_items");
    return saved ? JSON.parse(saved) : [];
  });

  const [activePin, setActivePin] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem("wms_picking_list", JSON.stringify(pickingList));
    localStorage.setItem("wms_checked_items", JSON.stringify(checkedItems));
  }, [pickingList, checkedItems]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setFile(e.target.files[0]);
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
        } else if (texts[0].startsWith('LOCAL:')) {
          if (lastParsedItem) lastParsedItem.local = texts[0].replace('LOCAL:', '').trim();
        } else if (texts.length >= 7 && (texts[6] === 'SIM' || texts[6] === 'NAO' || texts[6] === 'NÃO')) {
          const qtde = parseFloat(texts[4].replace(/\./g, '').replace(',', '.')); 
          const item = {
            pedido: currentPedido, codigo: texts[0], sku: texts[1], descricao: texts[2],
            qtde: qtde, atendido: texts[6] === 'SIM', local: "Sem Local" 
          };
          lastParsedItem = item;
          rawItems.push(item);
        }
      });

      const batchMap: Record<string, PickItem> = {};
      const unknownLocations = new Set<string>();

      rawItems.filter(item => item.atendido).forEach(item => {
          if (!batchMap[item.codigo]) {
            batchMap[item.codigo] = { codigo: item.codigo, sku: item.sku, descricao: item.descricao, local: item.local, qtdeTotal: 0, pedidos: [] };
          }
          batchMap[item.codigo].qtdeTotal += item.qtde;
          if (!batchMap[item.codigo].pedidos.includes(item.pedido)) batchMap[item.codigo].pedidos.push(item.pedido);

          // Validação Limpa
          const locals = item.local.split('/').map(s => s.replace(/\s+/g, '').toUpperCase().replace('1D', '1-D'));
          let isMapped = false;
          for (const loc of locals) {
            for (const items of Object.values(ZONES)) {
              if (items.includes(loc)) { isMapped = true; break; }
            }
            if (isMapped) break;
          }
          if (!isMapped) unknownLocations.add(item.local);
      });

      const validItems: PickItem[] = [];
      Object.values(batchMap).forEach(item => {
        if (getBestLocationInfo(item.local).isValid) validItems.push(item);
      });

      const finalList = validItems.sort((a, b) => getBestLocationInfo(a.local).score - getBestLocationInfo(b.local).score);

      setPickingList(finalList);
      setCheckedItems([]); // Zera os checks ao processar novo
      setActivePin(null);

      toast({ title: "Rota Otimizada!", description: `Fluxo gerado para ${finalList.length} SKUs encontrados.` });

      if (unknownLocations.size > 0) {
        setTimeout(() => {
          toast({ 
            variant: "destructive", title: "Atenção: Endereços não mapeados!", 
            description: `Os seguintes locais não constam na planta e foram EXCLUÍDOS da rota: ${Array.from(unknownLocations).join(' | ')}`,
            duration: 9999999, 
          });
        }, 800); 
      }

    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro na leitura", description: "Verifique o arquivo HTML." });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetList = () => {
    setPickingList([]);
    setCheckedItems([]);
    setActivePin(null);
    setFile(null);
    localStorage.removeItem("wms_picking_list");
    localStorage.removeItem("wms_checked_items");
  };

  const handleToggleCheck = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedItems(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  // Permite fechar o modal clicando em qualquer lugar vazio do mapa
  const handleMapClick = () => {
    if (activePin !== null) setActivePin(null);
  }

  // ============================================================================
  // PREPARAÇÃO VISUAL (Linha Azul separada das Bolinhas)
  // ============================================================================
  const productPointsInfo = pickingList.map((item) => getBestLocationInfo(item.local));
  
  // 1. Gera a Linha Tracejada baseada apenas nos "PathCoords" (Corredores)
  const fullOrthogonalPath: {x: number, y: number}[] = [{ x: 340, y: 580 }]; 
  productPointsInfo.forEach((info) => {
    const curr = fullOrthogonalPath[fullOrthogonalPath.length - 1];
    fullOrthogonalPath.push(...buildPath(curr, info.pathCoord));
    fullOrthogonalPath.push(info.pathCoord);
  });
  if (productPointsInfo.length > 0) {
    const curr = fullOrthogonalPath[fullOrthogonalPath.length - 1];
    fullOrthogonalPath.push(...buildPath(curr, { x: 100, y: 580 }));
    fullOrthogonalPath.push({ x: 100, y: 580 });
  }

  // 2. Gera as Bolinhas nas "ShelfCoords" (Prateleiras) aplicando Anticolisão
  const coordCounts: Record<string, number> = {};
  const adjustedPins = productPointsInfo.map(info => {
    const pt = info.shelfCoord;
    const key = `${pt.x},${pt.y}`;
    const count = coordCounts[key] || 0;
    coordCounts[key] = count + 1;
    
    // Anticolisão compacta (16px de offset para criar um grid ao redor do ponto)
    const col = count % 3;
    const row = Math.floor(count / 3);
    const offset = 16;
    
    return { x: pt.x + (col * offset), y: pt.y + (row * offset) };
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader 
          title="Roteirização WMS" 
          description="Controle de picking interativo com memória e prateleiras ajustadas." 
        />
        {pickingList.length > 0 && (
          <Button variant="outline" onClick={resetList}>
            <RefreshCw className="w-4 h-4 mr-2" /> Novo Lote
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lado Esquerdo: Upload */}
        {pickingList.length === 0 && (
          <Card className="shadow-card lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-primary" />
                Importar Relatório
              </CardTitle>
              <CardDescription>Faça o upload do HTML de "Pedidos a Faturar" para compilar a rota.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
                <Input type="file" accept=".htm, .html" onChange={handleFileChange} className="cursor-pointer" />
              </div>
              <Button className="w-full" onClick={handleProcessFile} disabled={!file || isProcessing}>
                {isProcessing ? "Lendo dados..." : "Processar Separação"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ========================================== */}
        {/* SIMULADOR DE PLANTA 3D */}
        {/* ========================================== */}
        <Card className={`shadow-card ${pickingList.length > 0 ? 'lg:col-span-3' : 'lg:col-span-2'} overflow-hidden bg-slate-50`}>
          <CardHeader className="bg-white border-b">
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <RouteIcon className="w-5 h-5 text-blue-600" />
              Mapa Interativo de Coleta
            </CardTitle>
            <CardDescription>Clique nos números para abrir os detalhes e dar Baixa (Check) nas posições.</CardDescription>
          </CardHeader>
          <CardContent className="py-8 flex justify-center items-center h-[650px] overflow-hidden relative perspective-[1200px]" onClick={handleMapClick}>
            
            {pickingList.length > 0 ? (
              <div className="relative w-[800px] h-[600px] transition-transform duration-700 [transform-style:preserve-3d] [transform:rotateX(45deg)_scale(0.85)] sm:[transform:rotateX(45deg)_scale(1)] shadow-2xl bg-white border border-slate-200 rounded-sm cursor-crosshair">
                
                <div className="absolute inset-0 bg-[linear-gradient(#f1f5f9_2px,transparent_2px),linear-gradient(90deg,#f1f5f9_2px,transparent_2px)] bg-[size:40px_40px] opacity-80 pointer-events-none"></div>

                {/* GALPÃO PRINCIPAL */}
                <div className="absolute top-0 left-0 w-[60px] h-[600px] bg-orange-400/90 border-2 border-orange-500 shadow-xl [transform:translateZ(10px)] pointer-events-none"><div className="absolute inset-0 border-b-2 border-orange-600 [transform:translateZ(20px)] bg-orange-300/80"></div><div className="absolute inset-0 border-b-2 border-orange-600 [transform:translateZ(40px)] bg-orange-300/90 flex items-center justify-center"><span className="text-[10px] font-black text-orange-900 -rotate-90 tracking-widest opacity-80 whitespace-nowrap">PAREDE ESQUERDA</span></div></div>
                <div className="absolute top-0 left-[60px] w-[340px] h-[60px] bg-red-500/90 border-2 border-red-600 shadow-xl [transform:translateZ(10px)] pointer-events-none"><div className="absolute inset-0 border-r-2 border-red-700 [transform:translateZ(20px)] bg-red-400/80"></div><div className="absolute inset-0 border-r-2 border-red-700 [transform:translateZ(40px)] bg-red-400/90 flex items-center justify-center"><span className="text-[10px] font-black text-red-900 tracking-widest opacity-80">PAREDE FUNDO</span></div></div>
                <div className="absolute top-[140px] left-[140px] w-[140px] h-[360px] bg-yellow-400/90 border-2 border-yellow-500 shadow-xl [transform:translateZ(10px)] pointer-events-none"><div className="absolute inset-0 border-b-2 border-yellow-600 [transform:translateZ(20px)] bg-yellow-300/80"></div><div className="absolute inset-0 border-b-2 border-yellow-600 [transform:translateZ(40px)] bg-yellow-300/90 flex items-center justify-center"><span className="text-[14px] font-black text-yellow-800 -rotate-90 tracking-widest whitespace-nowrap">CENTRAL</span></div></div>
                <div className="absolute bottom-0 left-[300px] w-[100px] h-[20px] bg-green-500 border-2 border-green-600 shadow-sm [transform:translateZ(2px)] flex items-center justify-center pointer-events-none"><span className="text-[10px] font-black text-white">ENTRADA</span></div>

                {/* SALA CORRELATOS */}
                <div className="absolute top-0 left-[470px] w-[280px] h-[30px] bg-slate-800/90 border-2 border-slate-900 shadow-xl [transform:translateZ(10px)] pointer-events-none"><div className="absolute inset-0 border-b-2 border-slate-900 [transform:translateZ(20px)] bg-slate-700/80"></div><div className="absolute inset-0 border-b-2 border-slate-900 [transform:translateZ(40px)] bg-slate-700/90 flex items-center justify-center"><span className="text-[8px] font-black text-slate-400 tracking-widest opacity-80">PAREDE ESQUERDA</span></div></div>
                <div className="absolute top-0 left-[750px] w-[30px] h-[220px] bg-pink-400/90 border-2 border-pink-500 shadow-xl [transform:translateZ(10px)] pointer-events-none"><div className="absolute inset-0 border-l-2 border-pink-600 [transform:translateZ(20px)] bg-pink-300/80"></div><div className="absolute inset-0 border-l-2 border-pink-600 [transform:translateZ(40px)] bg-pink-300/90 flex items-center justify-center"><span className="text-[8px] font-black text-pink-800 -rotate-90 tracking-widest opacity-80 whitespace-nowrap">PAREDE FUNDO</span></div></div>
                <div className="absolute top-[190px] left-[470px] w-[280px] h-[30px] bg-purple-500/90 border-2 border-purple-600 shadow-xl [transform:translateZ(10px)] pointer-events-none"><div className="absolute inset-0 border-t-2 border-purple-700 [transform:translateZ(20px)] bg-purple-400/80"></div><div className="absolute inset-0 border-t-2 border-purple-700 [transform:translateZ(40px)] bg-purple-400/90 flex items-center justify-center"><span className="text-[8px] font-black text-purple-900 tracking-widest opacity-80">PAREDE DIREITA</span></div></div>
                <div className="absolute top-0 left-[440px] w-[30px] h-[130px] bg-sky-300/90 border-2 border-sky-400 shadow-xl [transform:translateZ(10px)] pointer-events-none"><div className="absolute inset-0 border-r-2 border-sky-500 [transform:translateZ(20px)] bg-sky-200/80"></div><div className="absolute inset-0 border-r-2 border-sky-500 [transform:translateZ(40px)] bg-sky-200/90 flex items-center justify-center"><span className="text-[8px] font-black text-sky-800 -rotate-90 tracking-widest opacity-80 whitespace-nowrap">PAREDE PORTA</span></div></div>
                <div className="absolute top-[130px] left-[440px] w-[30px] h-[90px] bg-green-500 border-2 border-green-600 shadow-sm [transform:translateZ(2px)] flex items-center justify-center pointer-events-none"><span className="text-[8px] font-black text-white -rotate-90">ENTRADA</span></div>
                <div className="absolute top-[70px] left-[530px] w-[160px] h-[80px] bg-red-600/90 border-2 border-red-700 shadow-xl [transform:translateZ(10px)] pointer-events-none"><div className="absolute inset-0 border-b-2 border-red-800 [transform:translateZ(20px)] bg-red-500/80"></div><div className="absolute inset-0 border-b-2 border-red-800 [transform:translateZ(40px)] bg-red-500/90 flex items-center justify-center"><span className="text-[10px] font-black text-red-900 tracking-widest whitespace-nowrap">CENTRAL</span></div></div>

                {/* LINHA ANIMADA */}
                <svg viewBox="0 0 800 600" className="absolute inset-0 w-full h-full overflow-visible [transform:translateZ(1px)] pointer-events-none">
                  <polyline points={fullOrthogonalPath.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#2563eb" strokeWidth="4" strokeLinejoin="round" strokeDasharray="10,10" className="animate-[dash_20s_linear_infinite]" />
                  <polygon points="95,575 105,575 100,585" fill="#2563eb" className="animate-[dash_20s_linear_infinite]" />
                  <style>{`@keyframes dash { to { stroke-dashoffset: -1000; } }`}</style>
                </svg>

                {/* MARCADORES INTERATIVOS (Agora usando Adjusted Pins) */}
                {adjustedPins.map((pos, idx) => {
                  const item = pickingList[idx]; 
                  const isChecked = checkedItems.includes(idx);
                  const isActive = activePin === idx;

                  return (
                    <div 
                      key={idx}
                      className={cn("absolute transition-all duration-300", isActive ? "z-[999]" : "z-50")}
                      style={{ 
                        left: pos.x - 12, 
                        top: pos.y - 12,
                        transform: `translateZ(${isActive ? '50px' : '30px'}) rotateX(-45deg)` 
                      }}
                      onClick={(e) => { e.stopPropagation(); setActivePin(isActive ? null : idx); }}
                    >
                      {/* Bolinha Clicável */}
                      <div className={cn(
                        "w-6 h-6 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-white text-[10px] font-bold cursor-pointer transition-colors",
                        isChecked ? "bg-green-500 hover:bg-green-600" : "bg-slate-800 hover:bg-blue-600",
                        isActive && !isChecked && "ring-4 ring-blue-400/50",
                        isActive && isChecked && "ring-4 ring-green-400/50"
                      )}>
                        {isChecked ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : (idx + 1)}
                      </div>

                      {/* Modal de Detalhes (Abre no Clique) */}
                      {isActive && (
                        <div 
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 bg-slate-900 text-white rounded-lg shadow-2xl origin-bottom animate-in fade-in zoom-in duration-200 cursor-default"
                          onClick={(e) => e.stopPropagation()} 
                        >
                          <div className="p-3.5 text-[11px] leading-relaxed flex flex-col gap-2">
                            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                              <span className="font-bold text-blue-400 text-xs">TAREFA {idx + 1}</span>
                              <button onClick={() => setActivePin(null)} className="text-slate-400 hover:text-white bg-slate-800 rounded-full p-1">
                                <X className="w-3.5 h-3.5"/>
                              </button>
                            </div>
                            
                            <div>
                              <Badge variant="outline" className="text-[10px] h-5 border-slate-600 bg-slate-800 text-slate-300 px-2 rounded-md mb-2">
                                <MapPin className="w-3 h-3 mr-1" /> {item.local}
                              </Badge>
                              <p className="font-mono text-slate-400 mb-1">SKU: <span className="text-slate-200">{item.sku}</span></p>
                              <p className="line-clamp-2" title={item.descricao}>{item.descricao}</p>
                            </div>
                            
                            <div className="mt-1 pt-2 border-t border-slate-700 flex justify-between items-center">
                              <span className="text-slate-400 uppercase tracking-wider text-[9px] font-bold">A Coletar</span>
                              <span className="font-black text-green-400 text-lg">{item.qtdeTotal} un</span>
                            </div>

                            <Button 
                              size="sm" 
                              className={cn("w-full mt-1 h-8 font-bold", isChecked ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-green-600 hover:bg-green-500")}
                              onClick={(e) => { handleToggleCheck(idx, e); setActivePin(null); }}
                            >
                              {isChecked ? "Desmarcar Tarefa" : "Confirmar Coleta"}
                            </Button>
                          </div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900"></div>
                        </div>
                      )}
                    </div>
                  );
                })}

              </div>
            ) : (
              <div className="text-slate-400 text-center pointer-events-none">
                <Map className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>Importe um lote para visualizar o trajeto no galpão.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ========================================== */}
        {/* TABELA DE ROTA GERADA                        */}
        {/* ========================================== */}
        {pickingList.length > 0 && (
          <Card className="shadow-card lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-green-600" />
                Lista de Coleta Sequencial
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border-t">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[80px] text-center">Status</TableHead>
                      <TableHead className="w-[150px]">Local</TableHead>
                      <TableHead className="w-[100px]">Código</TableHead>
                      <TableHead className="w-[120px]">SKU</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Atende Pedidos</TableHead>
                      <TableHead className="text-right">Qtd. Coletar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pickingList.map((item, idx) => {
                      const isChecked = checkedItems.includes(idx);
                      return (
                        <TableRow key={idx} className={cn("transition-colors", isChecked ? "bg-green-50/40 hover:bg-green-50/60" : "hover:bg-slate-50/50")}>
                          <TableCell className="text-center font-bold">
                            <div 
                              onClick={(e) => handleToggleCheck(idx, e)}
                              className={cn("w-7 h-7 rounded-full flex items-center justify-center mx-auto text-xs cursor-pointer transition-all border-2", isChecked ? "bg-green-500 border-green-500 text-white" : "bg-slate-100 border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-500")}
                            >
                              {isChecked ? <CheckCircle className="w-4 h-4" /> : (idx + 1)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("font-mono text-sm", isChecked ? "bg-transparent text-slate-400 border-slate-200" : "bg-purple-50 text-purple-700 border-purple-200")}>
                              {item.local}
                            </Badge>
                          </TableCell>
                          <TableCell className={cn("font-mono", isChecked ? "text-slate-400 line-through" : "text-slate-500")}>{item.codigo}</TableCell>
                          <TableCell className={cn("font-mono font-medium", isChecked ? "text-slate-400 line-through" : "text-blue-600")}>{item.sku}</TableCell>
                          <TableCell className={cn("font-medium", isChecked ? "text-slate-400 line-through" : "text-slate-800")}>{item.descricao}</TableCell>
                          <TableCell>
                            <span className={cn("text-xs", isChecked ? "text-slate-300" : "text-slate-500")}>
                              {item.pedidos.join(', ')}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={cn("text-lg font-bold", isChecked ? "text-slate-300" : "text-green-600")}>
                              {item.qtdeTotal} un
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}