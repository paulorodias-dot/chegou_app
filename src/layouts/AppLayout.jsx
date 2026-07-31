import { useEffect, useMemo, useRef, useState } from "react";
import { contarNotificacoesNaoLidasAdministrativo } from "../services/notificacoesService";
import {
  Bell,
  Camera,
  Car,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Settings,
  ShieldCheck,
  UserRound,
  X,
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

function ambientePermiteInstalacaoPWA() {
  if (typeof window === "undefined") {
    return false;
  }

  const hostname = window.location.hostname;

  const ambienteLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1";

  return import.meta.env.PROD && !ambienteLocal;
}

function isStandalonePWA() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
}

function isIOS() {
  if (
    typeof navigator === "undefined" ||
    typeof window === "undefined"
  ) {
    return false;
  }

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

function obterNomeCompleto(perfil) {
  const nome =
    perfil?.nome ||
    perfil?.nome_completo ||
    perfil?.nome_usuario ||
    perfil?.display_name ||
    perfil?.usuario_nome ||
    "Usuário";

  return String(nome).trim().replace(/\s+/g, " ");
}

function obterPrimeiroEUltimoNome(perfil) {
  const partes = obterNomeCompleto(perfil).split(" ").filter(Boolean);

  if (partes.length === 0) {
    return "Usuário";
  }

  if (partes.length === 1) {
    return partes[0];
  }

  return `${partes[0]} ${partes[partes.length - 1]}`;
}

function obterIniciais(perfil) {
  const partes = obterPrimeiroEUltimoNome(perfil)
    .split(" ")
    .filter(Boolean);

  if (partes.length === 0) {
    return "U";
  }

  if (partes.length === 1) {
    return partes[0].charAt(0).toUpperCase();
  }

  return `${partes[0].charAt(0)}${partes[
    partes.length - 1
  ].charAt(0)}`.toUpperCase();
}

function obterImagemPerfil(perfil) {
  return (
    perfil?.foto_perfil_url ||
    perfil?.imagem_perfil_url ||
    perfil?.avatar_url ||
    perfil?.foto_url ||
    null
  );
}

function obterFuncaoExibicao(role, perfil) {
  if (perfil?.modo_suporte_master) {
    return "Suporte Master";
  }

  const descricaoCadastrada =
    perfil?.cargo_nome ||
    perfil?.nome_cargo ||
    perfil?.cargo ||
    perfil?.funcao_nome ||
    perfil?.nome_funcao ||
    perfil?.funcao ||
    perfil?.descricao_funcao ||
    perfil?.tipo_morador ||
    perfil?.perfil_morador ||
    perfil?.papel_morador ||
    perfil?.descricao_perfil ||
    perfil?.nivel_nome;

  if (descricaoCadastrada) {
    return String(descricaoCadastrada);
  }

  if (role === "master") {
    return "Master";
  }

  if (role === "admin_logistica") {
    return "Administrador";
  }

  if (role === "funcionario") {
    return "Funcionário";
  }

  if (role === "morador") {
    return "Morador";
  }

  return "Usuário";
}

function obterRotaPerfil(role) {
  if (role === "master") return "master-perfil";
  if (role === "admin_logistica") return "admin-perfil";
  if (role === "funcionario") return "portaria-perfil";
  if (role === "morador") return "morador-perfil";

  return "perfil";
}

function obterRotaConfiguracoes(role) {
  if (role === "master") return "configuracoes";
  if (role === "admin_logistica") return "admin-configuracoes";
  if (role === "funcionario") return "portaria-configuracoes";
  if (role === "morador") return "morador-configuracoes";

  return "configuracoes";
}

function existeModalOuDrawerAberto() {
  if (typeof document === "undefined") {
    return false;
  }

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
  onOpenChat,
  onOpenProfile,
  onOpenSettings,
  onChangeProfileImage,
  children,
  mobileBottomItems = null,
  forceMobileBottomNav = false,
  forceHideMobileFooter = false,
}) {
  const deferredPromptRef = useRef(null);
  const profileMenuRef = useRef(null);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
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

  const nomeExibicao = useMemo(
    () => obterPrimeiroEUltimoNome(perfil),
    [
      perfil?.nome,
      perfil?.nome_completo,
      perfil?.nome_usuario,
      perfil?.display_name,
      perfil?.usuario_nome,
    ]
  );

  const iniciaisPerfil = useMemo(
    () => obterIniciais(perfil),
    [
      perfil?.nome,
      perfil?.nome_completo,
      perfil?.nome_usuario,
      perfil?.display_name,
      perfil?.usuario_nome,
    ]
  );

  const funcaoExibicao = useMemo(
    () => obterFuncaoExibicao(role, perfil),
    [
      role,
      perfil?.modo_suporte_master,
      perfil?.cargo_nome,
      perfil?.nome_cargo,
      perfil?.cargo,
      perfil?.funcao_nome,
      perfil?.nome_funcao,
      perfil?.funcao,
      perfil?.descricao_funcao,
      perfil?.tipo_morador,
      perfil?.perfil_morador,
      perfil?.papel_morador,
      perfil?.descricao_perfil,
      perfil?.nivel_nome,
    ]
  );

  const imagemPerfil = obterImagemPerfil(perfil);

  const ocultarRodapeMobile =
    forceHideMobileFooter ||
    mobileOpen ||
    notificationCenterOpen ||
    profileMenuOpen ||
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
    function fecharMenuAoClicarFora(event) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setProfileMenuOpen(false);
      }
    }

    function fecharMenuComEscape(event) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", fecharMenuAoClicarFora);
    document.addEventListener("touchstart", fecharMenuAoClicarFora);
    document.addEventListener("keydown", fecharMenuComEscape);

    return () => {
      document.removeEventListener("mousedown", fecharMenuAoClicarFora);
      document.removeEventListener("touchstart", fecharMenuAoClicarFora);
      document.removeEventListener("keydown", fecharMenuComEscape);
    };
  }, []);

  useEffect(() => {
    if (!isStandalonePWA()) {
      return;
    }

    const agora = new Date().toISOString();

    localStorage.setItem(
      PWA_INSTALL_KEY,
      JSON.stringify({
        instalado: true,
        ignoradoEm: null,
        acessos: 0,
        detectadoEm: agora,
        atualizadoEm: agora,
        origem: "standalone",
      })
    );

    setPwaInstalado(true);
    setMostrarInstalacaoPWA(false);
  }, []);

  useEffect(() => {
    let ativo = true;

    async function carregarNotificacoes() {
      if (role !== "admin_logistica") {
        if (ativo) {
          setNotificacoesNaoLidas(
            Number(perfil?.notificacoes_nao_lidas || 0)
          );
        }

        return;
      }

      try {
        const total = await contarNotificacoesNaoLidasAdministrativo({
          perfil,
        });

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
  }, [
    role,
    perfil?.id,
    perfil?.usuario_id,
    perfil?.condominio_id,
    perfil?.notificacoes_nao_lidas,
  ]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });

    setProfileMenuOpen(false);
  }, [activePage]);

  useEffect(() => {
    if (!ambientePermiteInstalacaoPWA()) {
      deferredPromptRef.current = null;
      setPwaInstallPromptDisponivel(false);
      setMostrarInstalacaoPWA(false);

      return undefined;
    }

    function atualizarPWAInstalado() {
      const instalado = isStandalonePWA();

      deferredPromptRef.current = null;
      setPwaInstalado(instalado);
      setPwaInstallPromptDisponivel(false);
      setMostrarInstalacaoPWA(false);

      const agora = new Date().toISOString();

      localStorage.setItem(
        PWA_INSTALL_KEY,
        JSON.stringify({
          instalado: true,
          ignoradoEm: null,
          acessos: 0,
          detectadoEm: agora,
          atualizadoEm: agora,
          origem: "appinstalled",
        })
      );
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
    if (!ambientePermiteInstalacaoPWA()) {
      setMostrarInstalacaoPWA(false);
      return;
    }

    if (!perfil || pwaInstalado) {
      return;
    }

    let estado = {
      instalado: false,
      ignoradoEm: null,
      acessos: 0,
      atualizadoEm: null,
    };

    try {
      const salvo = localStorage.getItem(PWA_INSTALL_KEY);

      if (salvo) {
        estado = {
          ...estado,
          ...JSON.parse(salvo),
        };
      }
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
    const ignoradoEm = estado.ignoradoEm
      ? new Date(estado.ignoradoEm)
      : null;

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
  }, [
    perfil?.id,
    perfil?.usuario_id,
    pwaInstallPromptDisponivel,
    pwaInstalado,
  ]);

  useEffect(() => {
    const isMobile = window.innerWidth <= 900;

    if (!isMobile && !isStandalonePWA()) {
      return;
    }

    history.pushState(
      {
        chegouGuard: true,
      },
      "",
      window.location.href
    );

    function bloquearVoltar(event) {
      event.preventDefault();

      history.pushState(
        {
          chegouGuard: true,
        },
        "",
        window.location.href
      );

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

    if (menu?.id) {
      ids.push(menu.id);
    }

    if (childId) {
      ids.push(childId);
    }

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
      setNotificacoesNaoLidas(
        Number(perfil?.notificacoes_nao_lidas || 0)
      );

      return;
    }

    try {
      const total = await contarNotificacoesNaoLidasAdministrativo({
        perfil,
      });

      setNotificacoesNaoLidas(total);
    } catch (error) {
      console.error("Erro ao atualizar contador de notificações:", error);
    }
  }

  function navegar(destino) {
    if (!destino) {
      return;
    }

    setNotificationCenterOpen(false);
    setProfileMenuOpen(false);
    setMobileOpen(false);

    onNavigate?.(destino);

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

  function getBadgeTitulo() {
    if (perfil?.modo_suporte_master) {
      return "Suporte Master";
    }

    if (role === "master") return "Perfil Master";
    if (role === "admin_logistica") return "Admin Logística";
    if (role === "funcionario") return "Módulo Portaria";
    if (role === "morador") return "Módulo Morador";

    return "Perfil do Sistema";
  }

  function getBadgeDescricao() {
    if (perfil?.modo_suporte_master) {
      return "Acesso assistido ao ambiente administrativo do condomínio.";
    }

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

  function abrirChat() {
    setProfileMenuOpen(false);

    if (typeof onOpenChat === "function") {
      onOpenChat();
      return;
    }

    console.info(
      "[Sistema Chegou!] Módulo de chat ainda não configurado."
    );
  }

  function abrirPerfil() {
    setProfileMenuOpen(false);

    if (typeof onOpenProfile === "function") {
      onOpenProfile();
      return;
    }

    navegar(obterRotaPerfil(role));
  }

  function abrirConfiguracoes() {
    setProfileMenuOpen(false);

    if (typeof onOpenSettings === "function") {
      onOpenSettings();
      return;
    }

    navegar(obterRotaConfiguracoes(role));
  }

  function trocarImagemPerfil() {
    setProfileMenuOpen(false);

    if (typeof onChangeProfileImage === "function") {
      onChangeProfileImage();
      return;
    }

    abrirPerfil();
  }

  function sairPeloMenuPerfil() {
    setProfileMenuOpen(false);
    onLogout?.();
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

  function renderizarAvatar({ compacto = false } = {}) {
    return (
      <span
        className={[
          "profile-avatar-premium",
          compacto ? "profile-avatar-compact" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      >
        {imagemPerfil ? (
          <img src={imagemPerfil} alt="" />
        ) : (
          <strong>{iniciaisPerfil}</strong>
        )}
      </span>
    );
  }

  function renderizarMenuPerfil() {
    if (!profileMenuOpen) {
      return null;
    }

    return (
      <div
        className="profile-menu-premium"
        role="menu"
        aria-label="Opções do perfil"
        data-drawer-open="true"
      >
        <button
          type="button"
          className="profile-menu-mobile-close"
          onClick={() => setProfileMenuOpen(false)}
          aria-label="Fechar opções do perfil"
        >
          <X size={20} />
        </button>

        <div className="profile-menu-header">
          {renderizarAvatar()}

          <div>
            <strong>{nomeExibicao}</strong>
            <small>{funcaoExibicao}</small>
          </div>
        </div>

        <div className="profile-menu-options">
          <button
            type="button"
            role="menuitem"
            onClick={trocarImagemPerfil}
          >
            <Camera size={18} />
            <span>Trocar imagem do perfil</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={abrirPerfil}
          >
            <UserRound size={18} />
            <span>Meu perfil</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={abrirConfiguracoes}
          >
            <Settings size={18} />
            <span>Configurações</span>
          </button>

          <div className="profile-menu-separator" />

          <button
            type="button"
            role="menuitem"
            className="profile-menu-logout"
            onClick={sairPeloMenuPerfil}
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </div>
    );
  }

  function renderMobileCustomItems() {
    if (!forceMobileBottomNav && !mobileBottomItems?.length) {
      return null;
    }

    if (!mobileBottomItems?.length) {
      return null;
    }

    return (
      <nav className="mobile-bottom-nav">
        {mobileBottomItems.map((item) => {
          const Icon = item.icon;

          const ativo =
            activePage === item.id ||
            (Array.isArray(item.activeIds) &&
              item.activeIds.includes(activePage));

          return (
            <button
              type="button"
              key={item.id}
              className={
                ativo
                  ? "mobile-nav-item active"
                  : "mobile-nav-item"
              }
              onClick={() => navegar(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>

              {Number(item.badge || 0) > 0 ? (
                <b>{item.badge}</b>
              ) : null}
            </button>
          );
        })}
      </nav>
    );
  }

  function renderMobileBottomNav() {
    if (ocultarRodapeMobile) {
      return null;
    }

    const customNav = renderMobileCustomItems();

    if (customNav) {
      return customNav;
    }

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
              [
                "admin-cadastro-morador",
                "admin-divergencias-moradores",
                "admin-cargos-funcoes",
                "admin-funcionarios",
                "admin-fornecedor",
              ].includes(activePage)
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

          <button
            type="button"
            className="mobile-nav-item"
            onClick={() => navegar("portaria-inicio")}
          >
            <Package size={20} />
            <span>Receber</span>
          </button>

          <button
            type="button"
            className="mobile-nav-item"
            onClick={() => navegar("portaria-inicio")}
          >
            <ShieldCheck size={20} />
            <span>Entrega</span>
          </button>

          <button
            type="button"
            className="mobile-nav-item"
            onClick={() => navegar("portaria-inicio")}
          >
            <Bell size={20} />
            <span>Alertas</span>
          </button>

          <button
            type="button"
            className={
              activePage === "portaria-configuracoes"
                ? "mobile-nav-item active"
                : "mobile-nav-item"
            }
            onClick={() => navegar("portaria-configuracoes")}
          >
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
    if (!ambientePermiteInstalacaoPWA()) {
      deferredPromptRef.current = null;
      setPwaInstallPromptDisponivel(false);
      setMostrarInstalacaoPWA(false);

      return;
    }

    if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt();

      const resultado = await deferredPromptRef.current.userChoice;

      if (resultado?.outcome === "accepted") {
        const agora = new Date().toISOString();

        localStorage.setItem(
          PWA_INSTALL_KEY,
          JSON.stringify({
            instalado: true,
            ignoradoEm: null,
            acessos: 0,
            detectadoEm: agora,
            atualizadoEm: agora,
            origem: "prompt",
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

  function confirmarOrientacaoIOS() {
    setMostrarInstalacaoPWA(false);
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
    if (!mostrarInstalacaoPWA || pwaInstalado) {
      return null;
    }

    return (
      <div
        className="pwa-install-overlay"
        data-modal-open="true"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
      >
        <section className="pwa-install-card">
          <div>
            <strong id="pwa-install-title">
              Instale o Sistema Chegou!
            </strong>

            {isIOS() ? (
              <>
                <p>
                  No iPhone, a instalação é concluída pelo menu do Safari:
                </p>

                <ol className="pwa-install-ios-steps">
                  <li>Toque no botão Compartilhar.</li>
                  <li>Escolha “Adicionar à Tela de Início”.</li>
                  <li>Confirme em “Adicionar”.</li>
                </ol>
              </>
            ) : (
              <p>
                Tenha acesso rápido, experiência em tela cheia e navegação
                com aparência de aplicativo.
              </p>
            )}
          </div>

          <div className="pwa-install-actions">
            {!isIOS() && pwaInstallPromptDisponivel ? (
              <button
                type="button"
                onClick={instalarPWA}
              >
                Instalar
              </button>
            ) : null}

            {isIOS() ? (
              <button
                type="button"
                onClick={confirmarOrientacaoIOS}
              >
                Entendi, vou instalar
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
    if (!mostrarConfirmacaoSaida) {
      return null;
    }

    return (
      <div
        className="pwa-install-overlay"
        data-modal-open="true"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmacao-saida-title"
      >
        <section className="pwa-install-card">
          <div>
            <strong id="confirmacao-saida-title">
              Deseja sair do Sistema Chegou?
            </strong>

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

            <button
              type="button"
              onClick={confirmarSaida}
            >
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
            Condomínio:{" "}
            {perfil?.nome_condominio || "Condomínio selecionado"}
          </span>

          <button
            type="button"
            onClick={onExitSupport}
          >
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

          <img
            src={logo}
            alt="Chegou!"
            className="app-top-logo"
          />
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="topbar-chat"
            onClick={abrirChat}
            aria-label="Abrir chat"
            title="Chat"
          >
            <MessageSquare size={20} />
          </button>

          <button
            type="button"
            className="notification"
            onClick={() => setNotificationCenterOpen(true)}
            aria-label="Abrir notificações"
            title="Notificações"
          >
            <Bell size={20} />

            {Number(notificacoesNaoLidas || 0) > 0 ? (
              <b>{notificacoesNaoLidas}</b>
            ) : null}
          </button>

          <div
            className="profile-menu-wrapper"
            ref={profileMenuRef}
          >
            <button
              type="button"
              className="profile-trigger-premium"
              onClick={() => setProfileMenuOpen((atual) => !atual)}
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              aria-label={`Abrir opções de ${nomeExibicao}`}
            >
              {renderizarAvatar({
                compacto: true,
              })}

              <span className="profile-trigger-text desktop-only">
                <strong>{nomeExibicao}</strong>
                <small>{funcaoExibicao}</small>
              </span>

              <ChevronDown
                size={16}
                className={[
                  "profile-trigger-chevron",
                  profileMenuOpen ? "open" : "",
                  "desktop-only",
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            </button>

            {renderizarMenuPerfil()}
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
        />
      ) : null}

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
              <div
                className="sidebar-group"
                key={menu.id}
              >
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
                      <i
                        className="menu-new-dot"
                        aria-label="Novo menu"
                      />
                    ) : null}
                  </span>

                  {hasChildren && !sidebarCollapsed ? (
                    isOpen ? (
                      <ChevronDown size={17} />
                    ) : (
                      <ChevronRight size={17} />
                    )
                  ) : null}
                </button>

                {hasChildren && isOpen && !sidebarCollapsed ? (
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
                              activePage === child.id
                                ? "active-subitem"
                                : ""
                            }
                            onClick={() =>
                              clicarSubmenu(menu, child.id)
                            }
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
                ) : null}
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
              src={
                modoEscuroVisual
                  ? logoFooterEscuro
                  : logoFooterClaro
              }
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