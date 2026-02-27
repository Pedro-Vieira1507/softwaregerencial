import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Settings, 
  Link2,
  ChevronLeft,
  ChevronRight,
  Truck,
  Map,
  LogOut,
  UserCircle,
  KeyRound
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Package, label: "Estoque", path: "/estoque" },
  { icon: Truck, label: "Rastreio", path: "/rastreio" },
  { icon: ShoppingCart, label: "Pedidos Site", path: "/pedidos" },
  { icon: Map, label: "WMS Logística", path: "/wms" },
  { icon: Settings, label: "Configurações", path: "/configuracoes" },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <aside 
      className={cn(
        // ADICIONADO AQUI: 'hidden md:flex' para esconder no mobile e mostrar a partir do tamanho 'md'
        "bg-sidebar text-sidebar-foreground flex-col border-r border-sidebar-border transition-all duration-300 h-[100dvh] sticky top-0 z-50",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand */}
      <div className="p-4 border-b border-sidebar-border flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <Link2 className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <h1 className="font-heading font-semibold text-lg text-sidebar-primary-foreground tracking-tight truncate">
            Integration Hub
          </h1>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
        {!collapsed && (
          <span className="text-xs uppercase text-sidebar-muted font-semibold px-2 py-2 block">
            Menu Principal
          </span>
        )}
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md font-medium transition-all duration-200",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Rodapé Compacto (Usuário + Botão de Recolher) */}
      <div className="border-t border-sidebar-border bg-sidebar-accent/10 p-2 space-y-1">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2 px-2 py-1 mb-2">
              <UserCircle className="w-8 h-8 text-sidebar-muted-foreground flex-shrink-0" />
              <div className="flex flex-col overflow-hidden leading-tight">
                <span className="text-sm font-bold text-sidebar-foreground truncate">Minha Conta</span>
                <span className="text-[10px] text-sidebar-muted-foreground truncate">Gerenciar Acesso</span>
              </div>
            </div>
            
            <Link 
              to="/conta" 
              className="flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
            >
              <KeyRound className="w-4 h-4 flex-shrink-0" />
              <span>Alterar Senha</span>
            </Link>

            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all duration-200 w-full text-left"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span>Sair do Sistema</span>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <UserCircle className="w-7 h-7 text-sidebar-muted-foreground mb-1 mt-1" />
            
            <Link 
              to="/conta" 
              title="Alterar Senha"
              className="p-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
            >
              <KeyRound className="w-4 h-4" />
            </Link>

            <button 
              onClick={handleLogout}
              title="Sair do Sistema"
              className="p-2 rounded-md text-red-500 hover:bg-red-500/10 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Linha separadora discreta */}
        <div className="h-px bg-sidebar-border my-1 w-full" />

        {/* Botão Recolher integrado no final */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>
    </aside>
  );
}