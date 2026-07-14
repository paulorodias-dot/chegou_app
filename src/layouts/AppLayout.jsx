import { useEffect, useMemo, useRef, useState } from "react";
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
  ShieldCheck,
} from "lucide-react";

import logo from "../assets/logo.png";
import logoFooterClaro from "../assets/logo_azulroyal.png";
import logoFooterEscuro from "../assets/logo_branco.png";
import { menusByRole } from "../config/menusByRole";

import NotificationCenter from "../components/NotificationCenter";
import "./AppLayout.css";

const COPYRIGHT_YEAR = new Date().getFullYear();
const PWA_INSTALL_KEY = "chegou_pwa_install_state";
const NAVIGATION_GUARD_KEY = "chegou_navigation_guard";

function isStandalonePWA() {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function detectarTemaEscuroAtual() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  const html = document.documentElement;
  const body = document.body;

  const temaDeclarado =
    html.getAttribute("data-theme") ||
    body.getAttribute("data-theme") ||
    "";

  if (temaDeclarado === "dark" || temaDeclarado === "escuro") {
    return true;
  }

  if (temaDeclarado === "light" || temaDeclarado === "claro") {
    return false;
  }

  if (
    html.classList.contains("modo-escuro") ||
    body.classList.contains("modo-escuro")
  ) {
    return true;
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches || false;
}

function getUsuarioMemoriaId(perfil) {
  return perfil?.usuario_id || perfil?.id || perfil?.email || "usuario";
}

function montarChaveNovidades(role, perfil) {
  return `chegou_menus_novos_vistos_${role}_${getUsuarioMemoriaId(perfil)}`;
}

function existeModalOuDrawerAberto() {
  if (typeof document === "undefined") return false;

  return Boolean(
    document.querySelector(
      [
        "[data-modal-open='true']",
        "[data-drawer-open='true']",
        ".modal.open",
        ".modal-premium.open",
        ".drawer.open",
        ".drawer-premium.open",
        ".ReactModal__Overlay",
        "[role='dialog'][aria-modal='true']",
      ].join(",")
    )
  );
}

export default function AppLayout({
  perfil,
  role = "master",
  activePage,
  onNavigate,
  onLogout,
  onExitSupport,
  children,
  mobileBottomItems = null,
  forceMobileBottomNav = false,
  forceHideMobileFooter = false,
}) {
  const deferredPromptRef = useRef(null);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [menusNovosVistos, setMenusNovosVistos] = useState([]);
  const [modalOuDrawerAberto, setModalOuDrawerAberto] = useState(false);
  const [modoEscuroVisual, setModoEscuroVisual] = useState(
    detectarTemaEscuroAtual
  );

  const [pwaInstalado, setPwaInstalado] = useState(isStandalonePWA());
  const [pwaInstallPromptDisponivel, setPwaInstallPromptDisponivel] =
    useState(false);
  const [mostrarInstalacaoPWA, setMostrarInstalacaoPWA] = useState(false);
  const [mostrarConfirmacaoSaida, setMostrarConfirmacaoSaida] = useState(false);

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

  const ocultarRodapeMobile =
    forceHideMobileFooter ||
    mobileOpen ||
    notificationCenterOpen ||
    modalOuDrawerAberto ||
    mostrarInstalacaoPWA ||
    mostrarConfirmacaoSaida;

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
    function verificarCamadasAbertas() {
      setModalOuDrawerAberto(existeModalOuDrawerAberto());
    }

    verificarCamadasAbertas();

    const observer = new MutationObserver(verificarCamadasAbertas);

    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: [
        "class",
        "style",
        "aria-modal",
        "data-modal-open",
        "data-drawer-open",
      ],
    });

    window.addEventListener("resize", verificarCamadasAbertas);
    window.addEventListener("keydown", verificarCamadasAbertas);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", verificarCamadasAbertas);
      window.removeEventListener("keydown", verificarCamadasAbertas);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");

    function atualizarTemaVisual() {
      setModoEscuroVisual(detectarTemaEscuroAtual());
    }

    atualizarTemaVisual();

    const observer = new MutationObserver(atualizarTemaVisual);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    media?.addEventListener?.("change", atualizarTemaVisual);

    return () => {
      observer.disconnect();
      media?.removeEventListener?.("change", atualizarTemaVisual);
    };
  }, []);

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

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, [activePage]);

  useEffect(() => {
    function atualizarPWAInstalado() {
      setPwaInstalado(isStandalonePWA());
      setMostrarInstalacaoPWA(false);
    }

    function capturarPrompt(event) {
      event.preventDefault();
      deferredPromptRef.current = event;
      setPwaInstallPromptDisponivel(true);
    }

    window.addEventListener("beforeinstallprompt", capturarPrompt);
    window.addEventListener("appinstalled", atualizarPWAInstalado);

    return () => {
      window.removeEventListener("beforeinstallprompt", capturarPrompt);
      window.removeEventListener("appinstalled", atualizarPWAInstalado);
    };
  }, []);

  useEffect(() => {
    if (!perfil) return;
    if (pwaInstalado) return;

    let estado = {
      instalado: false,
      ignoradoEm: null,
      acessos: 0,
      atualizadoEm: null,
    };

    try {
      const salvo = localStorage.getItem(PWA_INSTALL_KEY);
      if (salvo) estado = { ...estado, ...JSON.parse(salvo) };
    } catch {
      estado = {
        instalado: false,
        ignoradoEm: null,
        acessos: 0,
        atualizadoEm: null,
      };
    }

    if (estado.instalado) {
      setPwaInstalado(true);
      return;
    }

    const acessos = Number(estado.acessos || 0) + 1;
    const ignoradoEm = estado.ignoradoEm ? new Date(estado.ignoradoEm) : null;
    const diasDesdeIgnorado = ignoradoEm
      ? (Date.now() - ignoradoEm.getTime()) / (1000 * 60 * 60 * 24)
      : null;

    const podeMostrarDepoisDeIgnorar =
      !ignoradoEm || diasDesdeIgnorado >= 7;

    const podeInstalarAndroidDesktop = pwaInstallPromptDisponivel;
    const podeInstalarIOS = isIOS() && !isStandalonePWA();

    const deveMostrar =
      acessos >= 3 &&
      podeMostrarDepoisDeIgnorar &&
      (podeInstalarAndroidDesktop || podeInstalarIOS);

    localStorage.setItem(
      PWA_INSTALL_KEY,
      JSON.stringify({
        ...estado,
        acessos,
        atualizadoEm: new Date().toISOString(),
      })
    );

    if (deveMostrar) {
      setMostrarInstalacaoPWA(true);
    }
  }, [perfil, pwaInstallPromptDisponivel, pwaInstalado]);

  useEffect(() => {
    const isMobile = window.innerWidth <= 900;

    if (!isMobile && !isStandalonePWA()) return;

    history.pushState({ chegouGuard: true }, "", window.location.href);

    function bloquearVoltar(event) {
      event.preventDefault();

      history.pushState({ chegouGuard: true }, "", window.location.href);

      if (existeModalOuDrawerAberto()) {
        return;
      }

      setMostrarConfirmacaoSaida(true);

      localStorage.setItem(
        NAVIGATION_GUARD_KEY,
        JSON.stringify({
          bloqueadoEm: new Date().toISOString(),
          activePage,
          role,
          origem: isStandalonePWA() ? "pwa" : "mobile_browser",
        })
      );
    }

    window.addEventListener("popstate", bloquearVoltar);

    return () => {
      window.removeEventListener("popstate", bloquearVoltar);
    };
  }, [activePage, role]);

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

  function navegar(destino) {
    setNotificationCenterOpen(false);
    setMobileOpen(false);

    onNavigate(destino);

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
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
    navegar(menu.id);

    if (window.innerWidth > 900) {
      setSidebarCollapsed(true);
    }
  }

  function clicarSubmenu(menu, childId) {
    registrarNovidadeVista(menu, childId);

    navegar(childId);
    setOpenMenu(null);

    if (window.innerWidth > 900) {
      setSidebarCollapsed(true);
    }
  }

  function getPerfilNome() {
    if (role === "master") return "Master";
    if (role === "admin_logistica") return "Admin Logística";
    if (role === "funcionario") return "Portaria";
    if (role === "morador") return "Morador";
    return "Usuário";
  }

  function getPerfilDescricao() {
    if (role === "master") return perfil?.nome || "Perfil Master";
    if (role === "admin_logistica") return perfil?.nome || "Gestão do Condomínio";
    if (role === "funcionario") return perfil?.nome || "Funcionário do Condomínio";
    if (role === "morador") return perfil?.nome || "Morador Responsável";
    return perfil?.nome || "Perfil";
  }

  function getBadgeTitulo() {
    if (role === "master") return "Perfil Master";
    if (role === "admin_logistica") return "Admin Logística";
    if (role === "funcionario") return "Módulo Portaria";
    if (role === "morador") return "Módulo Morador";
    return "Perfil do Sistema";
  }

  function getBadgeDescricao() {
    if (role === "master") {
      return "Acesso estratégico à gestão da plataforma Sistema Chegou!.";
    }

    if (role === "admin_logistica") {
      return "Acesso administrativo para gestão operacional do condomínio.";
    }

    if (role === "funcionario") {
      return "Acesso operacional restrito ao condomínio vinculado.";
    }

    if (role === "morador") {
      return "Acesso do morador aos recursos da unidade vinculada.";
    }

    return "Acesso conforme permissões do perfil.";
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

  function renderMobileCustomItems() {
    if (!forceMobileBottomNav && !mobileBottomItems?.length) return null;
    if (!mobileBottomItems?.length) return null;

    return (
      <nav className="mobile-bottom-nav">
        {mobileBottomItems.map((item) => {
          const Icon = item.icon;
          const ativo =
            activePage === item.id ||
            (Array.isArray(item.activeIds) && item.activeIds.includes(activePage));

          return (
            <button
              type="button"
              key={item.id}
              className={ativo ? "mobile-nav-item active" : "mobile-nav-item"}
              onClick={() => navegar(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>

              {Number(item.badge || 0) > 0 ? <b>{item.badge}</b> : null}
            </button>
          );
        })}
      </nav>
    );
  }

  function renderMobileBottomNav() {
    if (ocultarRodapeMobile) return null;

    const customNav = renderMobileCustomItems();

    if (customNav) return customNav;

    if (role === "admin_logistica") {
      return (
        <nav className="mobile-bottom-nav">
          <button
            type="button"
            className={
              activePage === "admin-dashboard"
                ? "mobile-nav-item active"
                : "mobile-nav-item"
            }
            onClick={() => navegar("admin-dashboard")}
          >
            <Home size={20} />
            <span>Início</span>
          </button>

          <button
            type="button"
            className={
              activePage === "admin-cadastro-morador" ||
              activePage === "admin-divergencias-moradores" ||
              activePage === "admin-cargos-funcoes" ||
              activePage === "admin-funcionarios" ||
              activePage === "admin-fornecedor"
                ? "mobile-nav-item active"
                : "mobile-nav-item"
            }
            onClick={() => navegar("admin-cadastro-morador")}
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
            onClick={() => navegar("admin-encomendas")}
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
            onClick={() => navegar("admin-notificacoes")}
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
            onClick={() => navegar("admin-configuracoes")}
          >
            <Settings size={20} />
            <span>Config</span>
          </button>
        </nav>
      );
    }

    if (role === "funcionario") {
      return (
        <nav className="mobile-bottom-nav">
          <button
            type="button"
            className={
              activePage === "portaria-inicio"
                ? "mobile-nav-item active"
                : "mobile-nav-item"
            }
            onClick={() => navegar("portaria-inicio")}
          >
            <Home size={20} />
            <span>Início</span>
          </button>

          <button type="button" className="mobile-nav-item" onClick={() => navegar("portaria-inicio")}>
            <Package size={20} />
            <span>Receber</span>
          </button>

          <button type="button" className="mobile-nav-item" onClick={() => navegar("portaria-inicio")}>
            <ShieldCheck size={20} />
            <span>Entrega</span>
          </button>

          <button type="button" className="mobile-nav-item" onClick={() => navegar("portaria-inicio")}>
            <Bell size={20} />
            <span>Alertas</span>
          </button>

          <button type="button" className="mobile-nav-item" onClick={() => navegar("portaria-inicio")}>
            <Settings size={20} />
            <span>Config</span>
          </button>
        </nav>
      );
    }

    if (role === "morador") {
      return (
        <nav className="mobile-bottom-nav">
          <button
            type="button"
            className={
              activePage === "morador-dashboard"
                ? "mobile-nav-item active"
                : "mobile-nav-item"
            }
            onClick={() => navegar("morador-dashboard")}
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
            onClick={() => navegar("morador-encomendas-retiradas")}
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
            onClick={() => navegar("morador-garagem-emprestimo")}
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
            onClick={() => navegar("morador-notificacoes")}
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
            onClick={() => navegar("morador-configuracoes")}
          >
            <Settings size={20} />
            <span>Config</span>
          </button>
        </nav>
      );
    }

    return null;
  }

  async function instalarPWA() {
    if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt();

      const resultado = await deferredPromptRef.current.userChoice;

      if (resultado?.outcome === "accepted") {
        localStorage.setItem(
          PWA_INSTALL_KEY,
          JSON.stringify({
            instalado: true,
            ignoradoEm: null,
            acessos: 0,
            atualizadoEm: new Date().toISOString(),
          })
        );

        setPwaInstalado(true);
        setMostrarInstalacaoPWA(false);
      }

      deferredPromptRef.current = null;
      setPwaInstallPromptDisponivel(false);
      return;
    }

    if (isIOS()) {
      setMostrarInstalacaoPWA(true);
    }
  }

  function adiarInstalacaoPWA() {
    localStorage.setItem(
      PWA_INSTALL_KEY,
      JSON.stringify({
        instalado: false,
        ignoradoEm: new Date().toISOString(),
        acessos: 0,
        atualizadoEm: new Date().toISOString(),
      })
    );

    setMostrarInstalacaoPWA(false);
  }

  function confirmarSaida() {
    setMostrarConfirmacaoSaida(false);
    onLogout?.();
  }

  function renderizarCardInstalacaoPWA() {
    if (!mostrarInstalacaoPWA || pwaInstalado) return null;

    return (
      <div className="pwa-install-overlay" data-modal-open="true">
        <section className="pwa-install-card">
          <div>
            <strong>Instale o Sistema Chegou!</strong>

            {isIOS() ? (
              <p>
                No iPhone, toque em compartilhar e selecione “Adicionar à Tela de
                Início” para usar o Sistema Chegou! como aplicativo.
              </p>
            ) : (
              <p>
                Tenha acesso rápido, experiência em tela cheia e navegação com
                aparência de aplicativo.
              </p>
            )}
          </div>

          <div className="pwa-install-actions">
            {!isIOS() && pwaInstallPromptDisponivel ? (
              <button type="button" onClick={instalarPWA}>
                Instalar
              </button>
            ) : null}

            <button
              type="button"
              className="btn-config-secondary"
              onClick={adiarInstalacaoPWA}
            >
              Agora não
            </button>
          </div>
        </section>
      </div>
    );
  }

  function renderizarConfirmacaoSaida() {
    if (!mostrarConfirmacaoSaida) return null;

    return (
      <div className="pwa-install-overlay" data-modal-open="true">
        <section className="pwa-install-card">
          <div>
            <strong>Deseja sair do Sistema Chegou?</strong>
            <p>
              Para evitar saída acidental, o botão voltar foi protegido neste
              aplicativo.
            </p>
          </div>

          <div className="pwa-install-actions">
            <button
              type="button"
              className="btn-config-secondary"
              onClick={() => setMostrarConfirmacaoSaida(false)}
            >
              Cancelar
            </button>

            <button type="button" onClick={confirmarSaida}>
              Sair
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      className={[
        "app-shell",
        sidebarCollapsed ? "sidebar-collapsed" : "",
        ocultarRodapeMobile ? "mobile-footer-hidden" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
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
                {role === "morador"
                  ? perfilExibicaoMorador
                  : getPerfilDescricao()}
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
        </div>
      </aside>

      <main className="app-main">
        <div className="app-content">{children}</div>

        <footer className="app-content-footer">
          <div className="content-footer-brand">
            <img
              src={modoEscuroVisual ? logoFooterEscuro : logoFooterClaro}
              alt="Sistema Chegou!"
            />
          </div>

          <div className="content-footer-meta">
            <span>
              © {COPYRIGHT_YEAR} Sistema Chegou!. Todos os direitos reservados.
            </span>
          </div>
        </footer>
      </main>

      {renderMobileBottomNav()}
      {renderizarCardInstalacaoPWA()}
      {renderizarConfirmacaoSaida()}

      <NotificationCenter
        aberto={notificationCenterOpen}
        perfil={perfil}
        role={role}
        onClose={() => setNotificationCenterOpen(false)}
        onAtualizarContador={atualizarContadorNotificacoes}
        onNavigate={navegar}
      />
    </div>
  );
}