import { useEffect, useMemo, useState } from "react";
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
  Car,
} from "lucide-react";

import logo from "../assets/logo.png";
import { menusByRole } from "../config/menusByRole";

import NotificationCenter from "../components/NotificationCenter";
import "./AppLayout.css";

const APP_VERSION = "01.01.01";
const COPYRIGHT_YEAR = new Date().getFullYear();

function getUsuarioMemoriaId(perfil) {
  return perfil?.usuario_id || perfil?.id || perfil?.email || "usuario";
}

function montarChaveNovidades(role, perfil) {
  return `chegou_menus_novos_vistos_${role}_${getUsuarioMemoriaId(perfil)}`;
}

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
  const [menusNovosVistos, setMenusNovosVistos] = useState([]);

  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(
    Number(perfil?.notificacoes_nao_lidas || 0)
  );

  const menus = menusByRole[role] || menusByRole.master;

  const menusVisiveis = menus.filter((menu) => menu.visible !== false);

  const chaveNovidades = useMemo(
    () => montarChaveNovidades(role, perfil),
    [role, perfil?.id, perfil?.usuario_id, perfil?.email]
  );

  const nomeExibicaoMorador = useMemo(() => {
    if (role !== "morador") return null;

    const nomeBase =
      perfil?.nome ||
      perfil?.nome_completo ||
      perfil?.nome_usuario ||
      "Usuário";

    const partes = nomeBase.trim().split(" ").filter(Boolean);

    if (partes.length <= 1) return partes[0] || "Usuário";

    return `${partes[0]} ${partes[partes.length - 1]}`;
  }, [role, perfil?.nome, perfil?.nome_completo, perfil?.nome_usuario]);

  const perfilExibicaoMorador = useMemo(() => {
    if (role !== "morador") return null;

    return (
      perfil?.tipo_morador ||
      perfil?.perfil_morador ||
      perfil?.papel_morador ||
      perfil?.descricao_perfil ||
      "Morador Responsável"
    );
  }, [
    role,
    perfil?.tipo_morador,
    perfil?.perfil_morador,
    perfil?.papel_morador,
    perfil?.descricao_perfil,
  ]);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(chaveNovidades);
      setMenusNovosVistos(salvo ? JSON.parse(salvo) : []);
    } catch {
      setMenusNovosVistos([]);
    }
  }, [chaveNovidades]);

  useEffect(() => {
    const menuAberto = menus.find((menu) =>
      menu.children?.some((child) => child.id === activePage)
    );

    if (menuAberto && !sidebarCollapsed) {
      setOpenMenu(menuAberto.id);
    }
  }, [activePage, menus, sidebarCollapsed]);

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

  function salvarMenusNovosVistos(ids) {
    const unicos = Array.from(new Set(ids));

    setMenusNovosVistos(unicos);
    localStorage.setItem(chaveNovidades, JSON.stringify(unicos));
  }

  function menuNovoVisivel(menu) {
    return Boolean(menu?.novo && !menusNovosVistos.includes(menu.id));
  }

  function submenuNovoVisivel(child) {
    return Boolean(child?.novo && !menusNovosVistos.includes(child.id));
  }

  function menuTemSubmenuNovoVisivel(menu) {
    return Boolean(
      menu?.children?.some(
        (child) => child.visible !== false && submenuNovoVisivel(child)
      )
    );
  }

  function registrarNovidadeVista(menu, childId = null) {
    const ids = [...menusNovosVistos];

    if (menu?.id) ids.push(menu.id);
    if (childId) ids.push(childId);

    if (menu?.children?.length) {
      const todosSubmenusNovos = menu.children
        .filter((child) => child.novo)
        .map((child) => child.id);

      if (childId) {
        ids.push(childId);
      }

      const aindaTemOutroNovoNaoAberto = todosSubmenusNovos.some(
        (id) => id !== childId && !menusNovosVistos.includes(id)
      );

      if (!aindaTemOutroNovoNaoAberto) {
        ids.push(menu.id);
      }
    }

    salvarMenusNovosVistos(ids);
  }

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
    const hasChildren = menu.children?.length > 0;

    if (hasChildren) {
      if (sidebarCollapsed) {
        setSidebarCollapsed(false);
        setOpenMenu(menu.id);
        return;
      }

      setOpenMenu((atual) => (atual === menu.id ? null : menu.id));
      return;
    }

    registrarNovidadeVista(menu);

    setOpenMenu(null);
    onNavigate(menu.id);
    setMobileOpen(false);

    if (window.innerWidth > 900) {
      setSidebarCollapsed(true);
    }
  }

  function clicarSubmenu(menu, childId) {
    registrarNovidadeVista(menu, childId);

    onNavigate(childId);
    setMobileOpen(false);
    setOpenMenu(null);

    if (window.innerWidth > 900) {
      setSidebarCollapsed(true);
    }
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

    setSidebarCollapsed((atual) => {
      const novoEstado = !atual;

      if (novoEstado) {
        setOpenMenu(null);
      }

      return novoEstado;
    });
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
            <span>
              {role === "morador"
                ? nomeExibicaoMorador?.charAt(0) || "U"
                : getPerfilNome().charAt(0)}
            </span>

            <div>
              <strong>
                {role === "morador" ? nomeExibicaoMorador : getPerfilNome()}
              </strong>

              <small>
                {role === "morador" ? perfilExibicaoMorador : getPerfilDescricao()}
              </small>
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
          {menusVisiveis.map((menu) => {
            const Icon = menu.icon;
            const isOpen = openMenu === menu.id;
            const hasChildren = menu.children?.length > 0;
            const isActive =
              activePage === menu.id ||
              menu.children?.some((child) => child.id === activePage);

            const mostrarNovoMenu =
              menuNovoVisivel(menu) || menuTemSubmenuNovoVisivel(menu);

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

                    {mostrarNovoMenu ? (
                      <i className="menu-new-dot" aria-label="Novo menu" />
                    ) : null}
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
                    {menu.children
                      .filter((child) => child.visible !== false)
                      .map((child) => {
                        const ChildIcon = child.icon;

                        return (
                          <button
                            type="button"
                            key={child.id}
                            className={
                              activePage === child.id ? "active-subitem" : ""
                            }
                            onClick={() => clicarSubmenu(menu, child.id)}
                          >
                            <ChildIcon size={16} />

                            <span className="submenu-label">
                              {child.label}

                              {submenuNovoVisivel(child) ? (
                                <strong className="submenu-new-badge">
                                  NOVO
                                </strong>
                              ) : null}
                            </span>
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
                activePage === "admin-divergencias-moradores" ||
                activePage === "admin-cargos-funcoes"
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

        {role === "morador" && (
          <nav className="mobile-bottom-nav">
            <button
              type="button"
              className={
                activePage === "morador-dashboard"
                  ? "mobile-nav-item active"
                  : "mobile-nav-item"
              }
              onClick={() => navegarMobile("morador-dashboard")}
            >
              <Home size={20} />
              <span>Início</span>
            </button>

            <button
              type="button"
              className={
                activePage === "morador-encomendas-retiradas"
                  ? "mobile-nav-item active"
                  : "mobile-nav-item"
              }
              onClick={() => navegarMobile("morador-encomendas-retiradas")}
            >
              <Package size={20} />
              <span>Encomendas</span>
            </button>

            <button
              type="button"
              className={
                activePage === "morador-garagem-emprestimo"
                  ? "mobile-nav-item active"
                  : "mobile-nav-item"
              }
              onClick={() => navegarMobile("morador-garagem-emprestimo")}
            >
              <Car size={20} />
              <span>Garagem</span>
            </button>

            <button
              type="button"
              className={
                activePage === "morador-notificacoes"
                  ? "mobile-nav-item active"
                  : "mobile-nav-item"
              }
              onClick={() => navegarMobile("morador-notificacoes")}
            >
              <Bell size={20} />
              <span>Alertas</span>
            </button>

            <button
              type="button"
              className={
                activePage === "morador-configuracoes"
                  ? "mobile-nav-item active"
                  : "mobile-nav-item"
              }
              onClick={() => navegarMobile("morador-configuracoes")}
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