import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import CriarSenhaResponsavel from "./pages/CriarSenhaResponsavel";

import {
  logout,
  recuperarSessaoAtual,
  registrarAtividadeUsuario,
  sessaoExpiradaPorInatividade,
} from "./services/authService";

import MasterLayout from "./layouts/MasterLayout";
import AppLayout from "./layouts/AppLayout";

import DashboardMaster from "./pages/master/DashboardMaster";
import CadastroCondominio from "./pages/master/CadastroCondominio";
import AuditoriaCondominios from "./pages/master/AuditoriaCondominios";

import DashboardAdmin from "./pages/admin/DashboardAdmin";
import CadastroMorador from "./pages/admin/CadastroMorador";

import PaginaPreparando from "./pages/PaginaPreparando";
import WizardCondominio from "./pages/wizardCondominio";

import WizardMorador from "./pages/WizardMorador";

import "./App.css";

function App() {
  const navigate = useNavigate();

  const [perfil, setPerfil] = useState(null);
  const [paginaAtual, setPaginaAtual] = useState(
    localStorage.getItem("chegou_pagina_atual") || "dashboard"
  );
  const [carregandoSessao, setCarregandoSessao] = useState(true);

  useEffect(() => {
    restaurarSessao();
  }, []);

  useEffect(() => {
    localStorage.setItem("chegou_pagina_atual", paginaAtual);
  }, [paginaAtual]);

  useEffect(() => {
    const eventos = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    function registrarAtividade() {
      if (perfil) {
        registrarAtividadeUsuario();
      }
    }

    eventos.forEach((evento) => {
      window.addEventListener(evento, registrarAtividade);
    });

    const intervalo = setInterval(async () => {
      if (perfil && sessaoExpiradaPorInatividade()) {
        await handleLogout(true);
      }
    }, 60 * 1000);

    return () => {
      eventos.forEach((evento) => {
        window.removeEventListener(evento, registrarAtividade);
      });

      clearInterval(intervalo);
    };
  }, [perfil]);

  async function restaurarSessao() {
    try {
      const sessao = await recuperarSessaoAtual();

      if (sessao?.perfil) {
        setPerfil(sessao.perfil);

        const role = getRole(sessao.perfil);
        const paginaSalva = localStorage.getItem("chegou_pagina_atual");

        if (paginaSalva) {
          setPaginaAtual(paginaSalva);
        } else if (role === "master") {
          setPaginaAtual("dashboard");
        } else if (role === "admin_logistica") {
          setPaginaAtual("admin-dashboard");
        } else {
          setPaginaAtual("morador-dashboard");
        }
      }
    } catch (error) {
      console.warn("Sessão não restaurada:", error);
    } finally {
      setCarregandoSessao(false);
    }
  }

  function getRole(perfilUsuario) {
    const nivel = Number(perfilUsuario?.nivel_id);

    if (nivel === 1) return "master";
    if ([2, 3, 4, 5].includes(nivel)) return "admin_logistica";
    if ([6, 7].includes(nivel)) return "morador";

    return "admin_logistica";
  }

  function navegarPara(pagina) {
    setPaginaAtual(pagina);
    localStorage.setItem("chegou_pagina_atual", pagina);
  }

  function handleLogin(perfilUsuario) {
    const role = getRole(perfilUsuario);

    setPerfil(perfilUsuario);

    let paginaInicial = "dashboard";

    if (role === "master") {
      paginaInicial = "dashboard";
    } else if (role === "admin_logistica") {
      paginaInicial = "admin-dashboard";
    } else {
      paginaInicial = "morador-dashboard";
    }

    setPaginaAtual(paginaInicial);
    localStorage.setItem("chegou_pagina_atual", paginaInicial);

    navigate("/sistema");
  }

  async function handleLogout(inatividade = false) {
    await logout();

    setPerfil(null);
    setPaginaAtual("dashboard");

    localStorage.removeItem("chegou_pagina_atual");

    if (inatividade) {
      navigate("/login", {
        state: {
          mensagem:
            "Sua sessão foi encerrada por inatividade. Acesse novamente para visualizar notificações e detalhes.",
        },
      });
    } else {
      navigate("/login");
    }
  }

  function renderizarPaginaMaster() {
    if (paginaAtual === "dashboard") return <DashboardMaster />;

    if (paginaAtual === "condominios-cadastro") {
      return <CadastroCondominio perfil={perfil} />;
    }

    if (paginaAtual === "validacao-primeiro-acesso-condominio") {
      return <WizardCondominio modoTeste />;
    }

    if (paginaAtual === "condominios-auditoria") {
      return <AuditoriaCondominios perfil={perfil} />;
    }

    if (paginaAtual === "validacao-wizard-morador") {
      return <WizardMorador modoTeste perfil={perfil} />;
    }

    return <PaginaPreparando titulo="Módulo" />;
  }

  function renderizarPaginaAdmin() {
    if (paginaAtual === "admin-dashboard") {
      return <DashboardAdmin perfil={perfil} />;
    }

    if (paginaAtual === "admin-cadastro-morador") {
      return <CadastroMorador perfil={perfil} />;
    }

    return <PaginaPreparando titulo="Módulo Administrativo" />;
  }

  function renderizarPaginaMorador() {
    return <PaginaPreparando titulo="Módulo Morador" />;
  }

  function renderizarSistemaProtegido() {
    if (carregandoSessao) {
      return <PaginaPreparando titulo="Carregando sessão..." />;
    }

    if (!perfil) {
      return <Navigate to="/login" replace />;
    }

    const role = getRole(perfil);

    if (role === "master") {
      return (
        <MasterLayout
          perfil={perfil}
          activePage={paginaAtual}
          onNavigate={navegarPara}
          onLogout={() => handleLogout(false)}
        >
          {renderizarPaginaMaster()}
        </MasterLayout>
      );
    }

    if (role === "admin_logistica") {
      return (
        <AppLayout
          perfil={perfil}
          role="admin_logistica"
          activePage={paginaAtual}
          onNavigate={navegarPara}
          onLogout={() => handleLogout(false)}
        >
          {renderizarPaginaAdmin()}
        </AppLayout>
      );
    }

    return (
      <AppLayout
        perfil={perfil}
        role="morador"
        activePage={paginaAtual}
        onNavigate={navegarPara}
        onLogout={() => handleLogout(false)}
      >
        {renderizarPaginaMorador()}
      </AppLayout>
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

      <Route
        path="/criar-senha-responsavel"
        element={<CriarSenhaResponsavel />}
      />

      <Route path="/sistema" element={renderizarSistemaProtegido()} />

      <Route path="/wizard-morador" element={<WizardMorador />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    );
}

export default App;