import { useEffect, useState } from 'react'
import {
  Bell,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FlaskConical,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

import logo from '../assets/logo.png'
import { supabase } from '../services/supabase'

function MasterLayout({ perfil, activePage, onNavigate, onLogout, children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [openMenu, setOpenMenu] = useState(null)
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0)

  useEffect(() => {
    async function carregarNotificacoes() {
      if (!perfil?.id) return

      const { count, error } = await supabase
        .from('notificacoes')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', perfil.id)
        .eq('lida', false)

      if (!error) setNotificacoesNaoLidas(count || 0)
    }

    carregarNotificacoes()
  }, [perfil])

  const menus = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'condominios',
    label: 'Condomínio',
    icon: Building2,
    children: [
      {
        id: 'condominios-cadastro',
        label: 'Cadastro',
        icon: ClipboardList,
      },
      {
        id: 'condominios-auditoria',
        label: 'Auditoria',
        icon: ClipboardCheck,
      },
    ],
  },
  
  {
    id: 'ambiente-validacao',
    label: 'Ambiente de Validação',
    icon: FlaskConical,
    children: [
      {
        id: 'validacao-primeiro-acesso-condominio',
        label: 'Primeiro Acesso Condomínio',
        icon: KeyRound,
      },
    ],
  },
]

  function clicarMenu(menu) {
    if (menu.children?.length) {
      setOpenMenu((atual) => (atual === menu.id ? null : menu.id))
      return
    }

    setOpenMenu(null)
    onNavigate(menu.id)
    setMobileOpen(false)
  }

  function clicarSubmenu(id) {
    onNavigate(id)
    setMobileOpen(false)
  }

  return (
  <div className={`master-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
    <header className="master-topbar">

  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <button
      className="hamburger mobile-hamburger"
      onClick={() => setMobileOpen(true)}
    >
      <Menu size={26} />
    </button>

    <button
      className="hamburger desktop-collapse"
      onClick={() => setSidebarCollapsed((atual) => !atual)}
    >
      {sidebarCollapsed ? <PanelLeftOpen size={22} /> : <PanelLeftClose size={22} />}
    </button>

    <img src={logo} alt="Chegou!" className="master-top-logo" />
  </div>

  <div className="topbar-actions">
    <span className="notification">
      <Bell size={20} />
      {notificacoesNaoLidas > 0 && <b>{notificacoesNaoLidas}</b>}
    </span>

    <span className="notification desktop-only">
      <MessageSquare size={20} />
    </span>

    <div className="profile desktop-only">
      <span>M</span>
      <div>
        <strong>Master</strong>
        <small>{perfil?.nome || 'Perfil Master'}</small>
      </div>
    </div>

    <button className="topbar-logout" onClick={onLogout}>
      <LogOut size={16} />
      Sair
    </button>
  </div>

</header>

    {mobileOpen && (
      <button
        className="sidebar-overlay"
        onClick={() => setMobileOpen(false)}
        aria-label="Fechar menu"
      />
    )}

    <aside className={`master-sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <img src={logo} alt="Chegou!" />
      </div>

      <p className="sidebar-title">MENU PRINCIPAL</p>

      <nav className="sidebar-menu">
        {menus.map((menu) => {
          const Icon = menu.icon
          const isOpen = openMenu === menu.id
          const hasChildren = menu.children?.length > 0
          const isActive =
            activePage === menu.id ||
            menu.children?.some((child) => child.id === activePage)

          return (
            <div className="sidebar-group" key={menu.id}>
              <button
                type="button"
                className={isActive ? 'active' : ''}
                onClick={() => clicarMenu(menu)}
                title={menu.label}
              >
                <span>
                  <Icon size={20} />
                  <em>{menu.label}</em>
                </span>

                {hasChildren && !sidebarCollapsed && (
                  isOpen ? <ChevronDown size={17} /> : <ChevronRight size={17} />
                )}
              </button>

              {hasChildren && isOpen && !sidebarCollapsed && (
                <div className="sidebar-submenu">
                  {menu.children.map((child) => {
                    const ChildIcon = child.icon

                    return (
                      <button
                        type="button"
                        key={child.id}
                        className={activePage === child.id ? 'active-subitem' : ''}
                        onClick={() => clicarSubmenu(child.id)}
                      >
                        <ChildIcon size={16} />
                        {child.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="master-badge">
        <strong>Perfil Master (God)</strong>
        <p>Acesso total a todos os condomínios, usuários e recursos da plataforma.</p>
      </div>
    </aside>

    <main className="master-main">
      {children}
    </main>
  </div>
)
}

export default MasterLayout