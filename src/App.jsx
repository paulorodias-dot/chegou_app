import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Landing from "./pages/Landing";
import Login from "./pages/Login";

import { logout } from "./services/authService";
import MasterLayout from "./layouts/MasterLayout";

import DashboardMaster from "./pages/master/DashboardMaster";
import CadastroCondominio from "./pages/master/CadastroCondominio";
import PaginaPreparando from "./pages/PaginaPreparando";
import WizardCondominio from "./pages/wizardCondominio";

import "./App.css";

function App() {
  const [perfil, setPerfil] = useState(null);
  const [paginaAtual, setPaginaAtual] = useState("dashboard");

  async function handleLogout() {
    await logout();
    setPerfil(null);
    setPaginaAtual("dashboard");
  }

  function renderizarPagina() {
    if (paginaAtual === "dashboard") {
      return <DashboardMaster />;
    }

    if (paginaAtual === "condominios-cadastro") {
      return <CadastroCondominio perfil={perfil} />;
    }

    if (paginaAtual === "validacao-primeiro-acesso-condominio") {
      return <WizardCondominio />;
    }

    return <PaginaPreparando titulo="Módulo" />;
  }

  const SistemaProtegido = () => {
    if (!perfil) {
      return <Navigate to="/login" replace />;
    }

    return (
      <MasterLayout
        perfil={perfil}
        activePage={paginaAtual}
        onNavigate={setPaginaAtual}
        onLogout={handleLogout}
      >
        {renderizarPagina()}
      </MasterLayout>
    );
  };

  return (
    <Routes>
      {/* LANDING PÚBLICA */}
      <Route path="/" element={<Landing />} />

      {/* LOGIN */}
      <Route path="/login" element={<Login onLogin={setPerfil} />} />

      {/* WIZARD PÚBLICO PELO CONVITE */}
      <Route path="/primeiro-acesso" element={<WizardCondominio />} />

      {/* COMPATIBILIDADE COM ROTA ANTIGA */}
      <Route path="/primeiro-acesso-condominio" element={<WizardCondominio />} />

      {/* SISTEMA INTERNO */}
      <Route path="/sistema" element={SistemaProtegido()} />

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;