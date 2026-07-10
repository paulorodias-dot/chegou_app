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

import AppLayout from "./layouts/AppLayout";
import MasterLayout from "./layouts/MasterLayout";

import CargosFuncoes from "./pages/master/CargosFuncoes";
import AcessoAssistidoMaster from "./pages/master/AcessoAssistidoMaster";
import DashboardMaster from "./pages/master/DashboardMaster";
import CadastroCondominio from "./pages/master/CadastroCondominio";
import AuditoriaCondominios from "./pages/master/AuditoriaCondominios";

import DashboardAdmin from "./pages/admin/DashboardAdmin";
import CadastroMorador from "./pages/admin/CadastroMorador";
import ImportacaoMoradoresDivergencias from "./pages/admin/ImportacaoMoradoresDivergencias";
import AuditoriaMoradoresConvite from "./pages/auditoria/AuditoriaMoradoresConvite";
import AuditoriaMoradoresPreCadastro from "./pages/auditoria/AuditoriaMoradoresPreCadastro";
import AuditoriaMoradoresAuditoria from "./pages/auditoria/AuditoriaMoradoresAuditoria";
import AuditoriaMoradoresHistorico from "./pages/auditoria/AuditoriaMoradoresHistorico";
import Funcionarios from "./pages/admin/cadastro/Funcionarios";
import AdminCargosFuncoes from "./pages/admin/AdminCargosFuncoes";
import CadastroFornecedores from "./pages/admin/CadastroFornecedores";

import MoradorDashboard from "./pages/morador/MoradorDashboard";
import PortariaInicio from "./pages/portaria/PortariaInicio";

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

  const [suporteMaster, setSuporteMaster] = useState(() => {
    try {
      const salvo = localStorage.getItem("chegou_suporte_master");
      return salvo ? JSON.parse(salvo) : null;
    } catch {
      return null;
    }
  });

  const [carregandoSessao, setCarregandoSessao] = useState(true);

  useEffect(() => {
    document.documentElement.classList.add("chegou-app-fullscreen");
    document.body.classList.add("chegou-app-fullscreen");

    const viewport = document.querySelector('meta[name="viewport"]');

    if (viewport) {
      viewport.setAttribute(
        "content",
        "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1"
      );
    }

    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("Service Worker não registrado:", error);
      });
    }

    restaurarSessao();
  }, []);

  useEffect(() => {
    localStorage.setItem("chegou_pagina_atual", paginaAtual);
  }, [paginaAtual]);

  useEffect(() => {
    const eventos = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    function registrarAtividade() {
      if (perfil) registrarAtividadeUsuario();
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

        setPaginaAtual(paginaSalva || getPaginaInicialPorRole(role));
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
    if ([2, 3, 4].includes(nivel)) return "admin_logistica";
    if (nivel === 5) return "funcionario";
    if ([6, 7].includes(nivel)) return "morador";

    return "admin_logistica";
  }

  function getPaginaInicialPorRole(role) {
    if (role === "master") return "dashboard";
    if (role === "admin_logistica") return "admin-dashboard";
    if (role === "funcionario") return "portaria-inicio";
    return "morador-dashboard";
  }

  function navegarPara(pagina) {
    setPaginaAtual(pagina);
    localStorage.setItem("chegou_pagina_atual", pagina);
  }

  function handleLogin(perfilUsuario) {
    const role = getRole(perfilUsuario);
    const paginaInicial = getPaginaInicialPorRole(role);

    setPerfil(perfilUsuario);
    navegarPara(paginaInicial);

    navigate("/sistema");
  }

  async function handleLogout(inatividade = false) {
    await logout();

    setPerfil(null);
    setSuporteMaster(null);
    setPaginaAtual("dashboard");

    localStorage.removeItem("chegou_pagina_atual");
    localStorage.removeItem("chegou_suporte_master");

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

  function entrarModoSuporteMaster(contexto) {
    setSuporteMaster(contexto);
    localStorage.setItem("chegou_suporte_master", JSON.stringify(contexto));
    navegarPara("admin-dashboard");
  }

  function sairModoSuporteMaster() {
    setSuporteMaster(null);
    localStorage.removeItem("chegou_suporte_master");
    navegarPara("dashboard");
  }

  function renderizarPaginaMaster() {
    if (paginaAtual === "dashboard") return <DashboardMaster />;

    if (paginaAtual === "acesso-assistido") {
      return (
        <AcessoAssistidoMaster
          perfil={perfil}
          onEntrarSuporte={entrarModoSuporteMaster}
        />
      );
    }

    if (paginaAtual === "condominios-cadastro") {
      return <CadastroCondominio perfil={perfil} />;
    }

    if (paginaAtual === "cargos-funcoes") {
      return <CargosFuncoes perfil={perfil} />;
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

    return <PaginaPreparando titulo="Módulo Master" />;
  }

  function renderizarPaginaAdmin(perfilContexto = perfil) {
    if (paginaAtual === "admin-dashboard") {
      return <DashboardAdmin perfil={perfilContexto} />;
    }

    if (paginaAtual === "admin-cadastro-morador") {
      return <CadastroMorador perfil={perfilContexto} />;
    }

    if (paginaAtual === "admin-divergencias-moradores") {
      return <ImportacaoMoradoresDivergencias perfil={perfilContexto} />;
    }

    if (paginaAtual === "admin-funcionarios") {
      return <Funcionarios perfil={perfilContexto} />;
    }

    if (paginaAtual === "admin-cargos-funcoes") {
      return <AdminCargosFuncoes perfil={perfilContexto} />;
    }

    if (paginaAtual === "admin-fornecedor") {
      return <CadastroFornecedores perfil={perfilContexto} />;
    }

    if (paginaAtual === "admin-auditoria-moradores-convite") {
      return (
        <AuditoriaMoradoresConvite
          perfil={perfilContexto}
          onNavigate={navegarPara}
        />
      );
    }

    if (paginaAtual === "admin-auditoria-moradores-pre-cadastro") {
      return (
        <AuditoriaMoradoresPreCadastro
          perfil={perfilContexto}
          onNavigate={navegarPara}
        />
      );
    }

    if (paginaAtual === "admin-auditoria-moradores-auditoria") {
      return (
        <AuditoriaMoradoresAuditoria
          perfil={perfilContexto}
          onNavigate={navegarPara}
        />
      );
    }

    if (paginaAtual === "admin-auditoria-moradores-historico") {
      return (
        <AuditoriaMoradoresHistorico
          perfil={perfilContexto}
          onNavigate={navegarPara}
        />
      );
    }

    if (paginaAtual === "admin-logs-auditoria") {
      return <PaginaPreparando titulo="Logs de Auditoria" />;
    }

    return <PaginaPreparando titulo="Módulo Administrativo" />;
  }

  function renderizarPaginaMorador() {
    if (paginaAtual === "morador-dashboard") {
      return <MoradorDashboard perfil={perfil} usuario={perfil} />;
    }

    if (paginaAtual === "morador-encomendas-retiradas") {
      return <PaginaPreparando titulo="Retiradas de Encomendas" />;
    }

    if (paginaAtual === "morador-encomendas-rastreio") {
      return <PaginaPreparando titulo="Rastreio de Encomendas" />;
    }

    if (paginaAtual === "morador-encomendas-diretas-grande-porte") {
      return <PaginaPreparando titulo="Entregas Diretas e Grande Porte" />;
    }

    if (paginaAtual === "morador-encomendas-pendentes") {
      return <PaginaPreparando titulo="Encomendas Pendentes" />;
    }

    if (paginaAtual === "morador-encomendas-recebidas") {
      return <PaginaPreparando titulo="Encomendas Recebidas" />;
    }

    if (paginaAtual === "morador-garagem-perfil-vaga") {
      return <PaginaPreparando titulo="Perfil da Vaga" />;
    }

    if (paginaAtual === "morador-garagem-emprestimo") {
      return <PaginaPreparando titulo="Empréstimo de Garagem" />;
    }

    if (paginaAtual === "morador-perfil") {
      return <PaginaPreparando titulo="Perfil do Morador" />;
    }

    if (paginaAtual === "morador-notificacoes") {
      return <PaginaPreparando titulo="Notificações do Morador" />;
    }

    if (paginaAtual === "morador-configuracoes") {
      return <PaginaPreparando titulo="Configurações do Morador" />;
    }

    if (paginaAtual === "morador-manual-ajuda") {
      return <PaginaPreparando titulo="Manual e Ajuda" />;
    }

    if (paginaAtual === "morador-sobre") {
      return <PaginaPreparando titulo="Sobre o Sistema Chegou!" />;
    }

    return <PaginaPreparando titulo="Módulo Morador" />;
  }

  function renderizarPaginaPortaria() {
    if (paginaAtual === "portaria-inicio") {
      return <PortariaInicio perfil={perfil} />;
    }

    return <PaginaPreparando titulo="Módulo Portaria" />;
  }

  function renderizarSistemaProtegido() {
    if (carregandoSessao) {
      return <PaginaPreparando titulo="Carregando sessão..." />;
    }

    if (!perfil) {
      return <Navigate to="/login" replace />;
    }

    const role = getRole(perfil);

    if (role === "master" && suporteMaster?.modo_suporte_master) {
      const perfilSuporte = {
        ...perfil,
        modo_suporte_master: true,
        suporte_master_id: suporteMaster.suporte_master_id,
        suporte_master_nome: suporteMaster.suporte_master_nome,
        suporte_master_email: suporteMaster.suporte_master_email,
        condominio_id: suporteMaster.condominio_id,
        business_id: suporteMaster.business_id_condominio,
        business_id_condominio: suporteMaster.business_id_condominio,
        nome_condominio: suporteMaster.nome_condominio,
        codigo_condominio: suporteMaster.codigo_condominio,
        origem_login: "suporte_master",
      };

      return (
        <AppLayout
          perfil={perfilSuporte}
          role="admin_logistica"
          activePage={paginaAtual}
          onNavigate={navegarPara}
          onLogout={() => handleLogout(false)}
          onExitSupport={sairModoSuporteMaster}
        >
          {renderizarPaginaAdmin(perfilSuporte)}
        </AppLayout>
      );
    }

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

    if (role === "funcionario") {
      return (
        <AppLayout
          perfil={perfil}
          role="funcionario"
          activePage={paginaAtual}
          onNavigate={navegarPara}
          onLogout={() => handleLogout(false)}
        >
          {renderizarPaginaPortaria()}
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
      <Route path="/primeiro-acesso-condominio" element={<WizardCondominio />} />
      <Route path="/criar-senha-responsavel" element={<CriarSenhaResponsavel />} />
      <Route path="/criar-senha" element={<CriarSenhaResponsavel />} />
      <Route path="/sistema" element={renderizarSistemaProtegido()} />
      <Route path="/wizard-morador" element={<WizardMorador />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;