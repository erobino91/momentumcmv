import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getMateriasPrimas } from "@/lib/actions/materias-primas";
import { getReceitas } from "@/lib/actions/receitas";
import { getProdutos } from "@/lib/actions/produtos";
import { getConfiguracao } from "@/lib/actions/configuracoes";
import { getSnapshots } from "@/lib/actions/snapshots";
import { getOfertas } from "@/lib/actions/ofertas";
import { AppSidebar, MobileHeader } from "@/components/layout/app-sidebar";
import { DataProvider } from "@/components/providers/data-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [mps, receitas, produtos, config, snapshots, ofertas] = await Promise.all([
    getMateriasPrimas(),
    getReceitas(),
    getProdutos(),
    getConfiguracao(),
    getSnapshots(),
    getOfertas(),
  ]);

  return (
    <DataProvider mps={mps} receitas={receitas} produtos={produtos} config={config} snapshots={snapshots} ofertas={ofertas}>
      <div className="flex min-h-screen">
        <AppSidebar />
        <MobileHeader />
        <main className="flex-1 bg-background overflow-auto pt-14 md:pt-0">
          {children}
        </main>
      </div>
    </DataProvider>
  );
}
