import { useEffect, useState } from "react";
import { contarNotificacoesNaoLidasAdministrativo } from "../services/notificacoesService";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  MessageSquare,
  Home,
  ClipboardList,
  Package,
  Settings,
} from "lucide-react";

import logo from "../assets/logo.png";
import { menusByRole } from "../config/menusByRole";

import NotificationCenter from "../components/NotificationCenter";
import "./AppLayout.css";

const APP_VERSION = "01.01.01";
const COPYRIGHT_YEAR = new Date().getFullYear();

export default function AppLayout({
  perfil,
  role = "master",
  activePage,
  onNavigate,
  onLogout,
  onExitSupport,
  children,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);

  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(
    Number(perfil?.notificacoes_nao_lidas || 0)
  );

  const menus = menusByRole[role] || menusByRole.master;

  useEffect(() => {
    const menuAberto = menus.find((menu) =>
      menu.children?.some((child) => child.id === activePage)
    );

    if (menuAberto) {
      setOpenMenu(menuAberto.id);
    }
  }, [activePage, menus]);

  useEffect(() => {
    let ativo = true;

    async function carregarNotificacoes() {
      if (role !== "admin_logistica") {
        if (ativo) {
          setNotificacoesNaoLidas(Number(perfil?.notificacoes_nao_lidas || 0));
        }
        return;
      }

      try {
        const total = await contarNotificacoesNaoLidasAdministrativo({ perfil });

        if (ativo) {
          setNotificacoesNaoLidas(total);
        }
      } catch (error) {
        console.error("Erro ao carregar notificações:", error);
      }
    }

    carregarNotificacoes();

    const intervalo = window.setInterval(carregarNotificacoes, 60000);

    return () => {
      ativo = false;
      window.clearInterval(intervalo);
    };
  }, [role, perfil?.id, perfil?.usuario_id, perfil?.condominio_id]);

  async function atualizarContadorNotificacoes() {
    if (role !== "admin_logistica") {
      setNotificacoesNaoLidas(Number(perfil?.notificacoes_nao_lidas || 0));
      return;
    }

    try {
      const total = await contarNotificacoesNaoLidasAdministrativo({ perfil });
      setNotificacoesNaoLidas(total);
    } catch (error) {
      console.error("Erro ao atualizar contador de notificações:", error);
    }
  }

  function clicarMenu(menu) {
    if (menu.children?.length) {
      setOpenMenu((atual) => (atual === menu.id ? null : menu.id));
      return;
    }

    setOpenMenu(null);
    onNavigate(menu.id);
    setMobileOpen(false);
  }

  function clicarSubmenu(id) {
    onNavigate(id);
    setMobileOpen(false);
  }

  function getPerfilNome() {
    if (role === "master") return "Master";
    if (role === "admin_logistica") return "Admin Logística";
    return "Usuário";
  }

  function getPerfilDescricao() {
    if (role === "master") return perfil?.nome || "Perfil Master";
    if (role === "admin_logistica") return perfil?.nome || "Gestão do Condomínio";
    return perfil?.nome || "Perfil";
  }

  function getBadgeTitulo() {
    if (role === "master") return "Perfil Master (God)";
    if (role === "admin_logistica") return "Admin Logística";
    return "Perfil do Sistema";
  }

  function getBadgeDescricao() {
    if (role === "master") {
      return "Acesso total a todos os condomínios, usuários e recursos da plataforma.";
    }

    if (role === "admin_logistica") {
      return "Acesso administrativo para gestão operacional do condomínio.";
    }

    return "Acesso conforme permissões do perfil.";
  }

  function navegarMobile(destino) {
    setNotificationCenterOpen(false);
    setMobileOpen(false);
    onNavigate(destino);
  }

  function handleMenuButton() {
    if (window.innerWidth <= 900) {
      setMobileOpen(true);
      return;
    }

    setSidebarCollapsed((atual) => !atual);
  }

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>

      {perfil?.modo_suporte_master ? (
        <div className="support-master-banner">
          <strong>Modo Suporte Master</strong>
          <span>
            Condomínio: {perfil?.nome_condominio || "Condomínio selecionado"}
          </span>
          <button type="button" onClick={onExitSupport}>
            Sair do Suporte
          </button>
        </div>
      ) : null}

      <header className="app-topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="hamburger"
            onClick={handleMenuButton}
            aria-label="Abrir ou recolher menu"
          >
            <Menu size={28} />
          </button>

          <img src={logo} alt="Chegou!" className="app-top-logo" />
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="notification"
            onClick={() => setNotificationCenterOpen(true)}
            aria-label="Abrir notificações"
          >
            <Bell size={20} />

            {Number(notificacoesNaoLidas || 0) > 0 ? (
              <b>{notificacoesNaoLidas}</b>
            ) : null}
          </button>

          <span className="notification desktop-only">
            <MessageSquare size={20} />
          </span>

          <div className="profile desktop-only">
            <span>{getPerfilNome().charAt(0)}</span>
            <div>
              <strong>{getPerfilNome()}</strong>
              <small>{getPerfilDescricao()}</small>
            </div>
            <ChevronDown size={15} />
          </div>

          <button type="button" className="topbar-logout" onClick={onLogout}>
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </header>

      {mobileOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
        />
      )}

      <aside className={`app-sidebar ${mobileOpen ? "open" : ""}`}>
        <p className="sidebar-title">MENU PRINCIPAL</p>

        <nav className="sidebar-menu">
          {menus.map((menu) => {
            const Icon = menu.icon;
            const isOpen = openMenu === menu.id;
            const hasChildren = menu.children?.length > 0;
            const isActive =
              activePage === menu.id ||
              menu.children?.some((child) => child.id === activePage);

            return (
              <div className="sidebar-group" key={menu.id}>
                <button
                  type="button"
                  className={isActive ? "active" : ""}
                  onClick={() => clicarMenu(menu)}
                  title={menu.label}
                >
                  <span>
                    <Icon size={20} />
                    <em>{menu.label}</em>
                  </span>

                  {hasChildren &&
                    !sidebarCollapsed &&
                    (isOpen ? (
                      <ChevronDown size={17} />
                    ) : (
                      <ChevronRight size={17} />
                    ))}
                </button>

                {hasChildren && isOpen && !sidebarCollapsed && (
                  <div className="sidebar-submenu">
                    {menu.children.map((child) => {
                      const ChildIcon = child.icon;

                      return (
                        <button
                          type="button"
                          key={child.id}
                          className={
                            activePage === child.id ? "active-subitem" : ""
                          }
                          onClick={() => clicarSubmenu(child.id)}
                        >
                          <ChildIcon size={16} />
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="app-sidebar-footer">
          <div className="profile-badge">
            <strong>{getBadgeTitulo()}</strong>
            <p>{getBadgeDescricao()}</p>
          </div>

          <div className="system-footer">
            <span>Versão {APP_VERSION}</span>
            <small>© {COPYRIGHT_YEAR} Chegou! Todos os direitos reservados.</small>
          </div>
        </div>
      </aside>

      <>
  <main className="app-main">{children}</main>

  {role === "admin_logistica" && (
    <nav className="mobile-bottom-nav">
      <button
        type="button"
        className={
          activePage === "admin-dashboard"
            ? "mobile-nav-item active"
            : "mobile-nav-item"
        }
        onClick={() => navegarMobile("admin-dashboard")}
      >
        <Home size={20} />
        <span>Início</span>
      </button>

      <button
        type="button"
        className={
          activePage === "admin-cadastro-morador" ||
          activePage === "admin-divergencias-moradores"
            ? "mobile-nav-item active"
            : "mobile-nav-item"
        }
        onClick={() => navegarMobile("admin-cadastro-morador")}
      >
        <ClipboardList size={20} />
        <span>Cadastro</span>
      </button>

      <button
        type="button"
        className={
          activePage === "admin-encomendas"
            ? "mobile-nav-item active"
            : "mobile-nav-item"
        }
        onClick={() => navegarMobile("admin-encomendas")}
      >
        <Package size={20} />
        <span>Encomendas</span>
      </button>

      <button
        type="button"
        className={
          activePage === "admin-notificacoes"
            ? "mobile-nav-item active"
            : "mobile-nav-item"
        }
        onClick={() => navegarMobile("admin-notificacoes")}
      >
        <Bell size={20} />
        <span>Alertas</span>
      </button>

      <button
        type="button"
        className={
          activePage === "admin-configuracoes"
            ? "mobile-nav-item active"
            : "mobile-nav-item"
        }
        onClick={() => navegarMobile("admin-configuracoes")}
      >
        <Settings size={20} />
        <span>Config</span>
      </button>
    </nav>
  )}
</>

    <NotificationCenter
      aberto={notificationCenterOpen}
      perfil={perfil}
      role={role}
      onClose={() => setNotificationCenterOpen(false)}
      onAtualizarContador={atualizarContadorNotificacoes}
      onNavigate={onNavigate}
    />

    </div>
  );
}