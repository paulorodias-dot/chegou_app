import { useState } from "react";
import AppLayout from "../layouts/AppLayout";

import DashboardAdmin from "./admin/DashboardAdmin";
import CadastroMorador from "./admin/CadastroMorador";
import ImportacaoMoradoresDivergencias from "./admin/ImportacaoMoradoresDivergencias";

export default function AppContainer() {
  // 👉 Simulação inicial (depois virá do Supabase)
  const role = "admin_logistica";

  const [activePage, setActivePage] = useState("admin-dashboard");

  function renderPage() {
  switch (activePage) {
    case "admin-dashboard":
      return <DashboardAdmin />;

    case "admin-cadastro-morador":
      return <CadastroMorador />;

    case "admin-divergencias-moradores":
      return <ImportacaoMoradoresDivergencias />;

    default:
      return <div>Página não encontrada</div>;
  }
}

  return (
    <AppLayout
      role={role}
      activePage={activePage}
      onNavigate={setActivePage}
      onLogout={() => alert("Logout")}
      perfil={{ nome: "Admin Condomínio" }}
    >
      {renderPage()}
    </AppLayout>
  );
}