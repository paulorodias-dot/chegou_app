import { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import Landing from "./pages/Landing";
import Login from "./pages/Login";

import { logout } from "./services/authService";
import MasterLayout from "./layouts/MasterLayout";

import DashboardMaster from "./pages/master/DashboardMaster";
import CadastroCondominio from "./pages/master/CadastroCondominio";
import AuditoriaCondominios from "./pages/master/AuditoriaCondominios";
import PaginaPreparando from "./pages/PaginaPreparando";
import WizardCondominio from "./pages/wizardCondominio";

import "./App.css";

function App() {
  const navigate = useNavigate();

  const [perfil, setPerfil] = useState(null);
  const [paginaAtual, setPaginaAtual] = useState("dashboard");

  function handleLogin(perfilUsuario) {
    setPerfil(perfilUsuario);
    setPaginaAtual("dashboard");
    navigate("/sistema");
  }

  async function handleLogout() {
    await logout();
    setPerfil(null);
    setPaginaAtual("dashboard");
    navigate("/login");
  }

  function renderizarPagina() {
    if (paginaAtual === "dashboard") {
      return <DashboardMaster />;
    }

    if (paginaAtual === "condominios-cadastro") {
      return <CadastroCondominio perfil={perfil} />;
    }

    if (paginaAtual === "validacao-primeiro-acesso-condominio") {
      return <WizardCondominio modoTeste />;
    }

    if (paginaAtual === "condominios-auditoria") {
      return <AuditoriaCondominios />;
    }

    return <PaginaPreparando titulo="Módulo" />;
  }

  function renderizarSistemaProtegido() {
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
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/login" element={<Login onLogin={handleLogin} />} />

      <Route path="/primeiro-acesso" element={<WizardCondominio />} />

      <Route
        path="/primeiro-acesso-condominio"
        element={<WizardCondominio />}
      />

      <Route path="/sistema" element={renderizarSistemaProtegido()} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;