import { useEffect, useState } from "react";
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
import "./AppLayout.css";

const APP_VERSION = "01.01.01";
const COPYRIGHT_YEAR = new Date().getFullYear();

export default function AppLayout({
  perfil,
  role = "master",
  activePage,
  onNavigate,
  onLogout,
  children,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  const menus = menusByRole[role] || menusByRole.master;

  useEffect(() => {
    const menuAberto = menus.find((menu) =>
      menu.children?.some((child) => child.id === activePage)
    );

    if (menuAberto) {
      setOpenMenu(menuAberto.id);
    }
  }, [activePage, menus]);

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
          <span className="notification">
            <Bell size={20} />
            <b>0</b>
          </span>

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
    </div>
  );
}