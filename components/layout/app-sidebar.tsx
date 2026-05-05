"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Package,
  BookOpen,
  ClipboardList,
  TrendingDown,
  Settings,
  ChevronRight,
  ShoppingBag,
  Grid2X2,
  FileText,
  History,
  Tag,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Matérias-Primas", href: "/materias-primas", icon: Package },
  { label: "Receitas", href: "/receitas", icon: BookOpen },
  { label: "Produtos", href: "/produtos", icon: ShoppingBag },
  { label: "Ofertas & Combos", href: "/ofertas", icon: Tag },
  { label: "Fichas Técnicas", href: "/fichas-tecnicas", icon: ClipboardList },
  { label: "CMV", href: "/cmv", icon: TrendingDown },
  { label: "Eng. de Cardápio", href: "/cardapio-engineering", icon: Grid2X2 },
  { label: "Histórico CMV", href: "/historico-cmv", icon: History },
  { label: "Relatório", href: "/relatorio", icon: FileText },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {navItems.map((item) => {
        const isFicha = /^\/(receitas|produtos)\/[^/]+\/ficha/.test(pathname);
        const active = isFicha
          ? item.href === "/fichas-tecnicas"
          : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors group",
              active
                ? "bg-primary text-white"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {active && <ChevronRight className="w-3 h-3 opacity-70" />}
          </Link>
        );
      })}
    </nav>
  );
}

function BottomLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
      <Link
        href="/configuracoes"
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
          pathname === "/configuracoes"
            ? "bg-primary text-white"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
        )}
      >
        <Settings className="w-4 h-4 shrink-0" />
        <span>Configurações</span>
      </Link>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <UserButton appearance={{ elements: { avatarBox: "w-6 h-6" } }} />
        <span className="text-sm text-sidebar-foreground/70">Minha conta</span>
      </div>
    </div>
  );
}

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 min-h-screen bg-sidebar flex-col hidden md:flex">
      <SidebarLogo />
      <NavLinks pathname={pathname} />
      <BottomLinks pathname={pathname} />
    </aside>
  );
}

// ─── Mobile top bar + drawer ──────────────────────────────────────────────────

export function MobileHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Top bar — only on mobile */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-sidebar border-b border-sidebar-border flex items-center px-4 gap-3">
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-md text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <SidebarLogo compact />
      </header>

      {/* Mobile drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <div className="flex flex-col h-full">
            <div className="px-6 py-5 border-b border-sidebar-border flex items-center justify-between">
              <SidebarLogo />
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded text-sidebar-foreground/60 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            </div>
            <BottomLinks pathname={pathname} onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ─── Shared logo ─────────────────────────────────────────────────────────────

function SidebarLogo({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <MomentumIcon size={24} />
        <span className="text-white font-bold text-base leading-none">MOMENTUM</span>
        <span className="text-primary text-xs font-semibold tracking-widest">CMV</span>
      </div>
    );
  }
  return (
    <div className="px-6 py-5 border-b border-sidebar-border">
      <div className="flex items-center gap-3">
        <MomentumIcon />
        <div>
          <span className="text-white font-bold text-lg leading-none">MOMENTUM</span>
          <span className="block text-primary text-xs font-semibold tracking-widest mt-0.5">CMV</span>
        </div>
      </div>
    </div>
  );
}

function MomentumIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="50,2 93,26 93,74 50,98 7,74 7,26" fill="#D1222A" />
      <path
        d="M32 65V35l12 18 6-9 6 9 12-18v30"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
