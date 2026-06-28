import { useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Bell,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FlaskConical,
  Home,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Moon,
  Settings,
  Smartphone,
  UserCheck,
  BriefcaseBusiness,
  UserCog,
} from "lucide-react";

import logo from "../assets/logo.png";
import { supabase } from "../services/supabase";

const APP_VERSION = "01.01.01";
const COPYRIGHT_YEAR = new Date().getFullYear();
const DEVICE_KEY = "chegou_device_id";

const preferenciasPadrao = {
  push: false,
  localizacao: false,
  modoEscuro: "sistema",
  aparelhoConfiavel: false,
  permissoesSolicitadas: false,
};

function MasterLayout({ perfil, activePage, onNavigate, onLogout, children }) {
  const notificationRef = useRef(null);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  const [notificacoes, setNotificacoes] = useState([]);
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
  const [sinoAnimando, setSinoAnimando] = useState(false);

  const [preferencias, setPreferencias] = useState(preferenciasPadrao);
  const [localizacaoAtual, setLocalizacaoAtual] = useState(null);
  const [statusPush, setStatusPush] = useState("nao_suportado");
  const [statusLocalizacao, setStatusLocalizacao] = useState("desativado");

  const [menusNovosVistos, setMenusNovosVistos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("chegou_menus_novos_vistos_master") || "[]");
    } catch {
      return [];
    }
  });

  const preferenciasKey = perfil?.id
    ? `chegou_preferencias_${perfil.id}`
    : "chegou_preferencias_master";

  const localizacaoKey = `${preferenciasKey}_localizacao`;

  const notificacoesNaoLidas = useMemo(() => {
    return notificacoes.filter((item) => !item.lida).length;
  }, [notificacoes]);

  const modoEscuroAtivo = useMemo(() => {
    if (preferencias.modoEscuro === "escuro") return true;
    if (preferencias.modoEscuro === "claro") return false;

    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches || false;
  }, [preferencias.modoEscuro]);

  const menus = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "condominios",
      label: "Condomínio",
      icon: Building2,
      children: [
        {
          id: "condominios-cadastro",
          label: "Cadastro",
          icon: ClipboardList,
        },
        {
          id: "condominios-auditoria",
          label: "Auditoria",
          icon: ClipboardCheck,
        },
      ],
    },
    {
      id: "usuarios-master",
      label: "Usuários",
      icon: UserCog,
      novo: true,
      children: [
        {
          id: "cargos-funcoes",
          label: "Cargos e Funções",
          icon: BriefcaseBusiness,
          novo: true,
        },
      ],
    },

    {
      id: "ambiente-validacao",
      label: "Ambiente de Validação",
      icon: FlaskConical,
      children: [
        {
          id: "validacao-primeiro-acesso-condominio",
          label: "Primeiro Acesso Condomínio",
          icon: KeyRound,
        },
        {
          id: "validacao-wizard-morador",
          label: "Wizard Morador",
          icon: UserCheck,
        }
      ],
    },
    {
      id: "acesso-assistido",
      label: "Acesso Assistido",
      icon: UserCheck,
    },

    {
      id: "notificacoes",
      label: "Notificações",
      icon: Bell,
    },
    {
      id: "configuracoes",
      label: "Configurações",
      icon: Settings,
    },
  ];

  function obterDeviceId() {
    let deviceId = localStorage.getItem(DEVICE_KEY);

    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem(DEVICE_KEY, deviceId);
    }

    return deviceId;
  }

  function detectarSistema() {
    const ua = navigator.userAgent;

    if (/android/i.test(ua)) return "Android";
    if (/iPad|iPhone|iPod/.test(ua)) return "iOS";
    if (/Win/i.test(ua)) return "Windows";
    if (/Mac/i.test(ua)) return "MacOS";
    if (/Linux/i.test(ua)) return "Linux";

    return "Desconhecido";
  }

  function detectarTipoDispositivo() {
    return window.innerWidth <= 900 ? "Mobile" : "Desktop";
  }

  function dataNotificacao(notificacao) {
    return notificacao.created_at || notificacao.criado_em || notificacao.data_criacao;
  }

  function ehNotificacaoDoMaster(notificacao) {
    const destinoTipo = String(notificacao?.destino_tipo || "").trim().toUpperCase();
    const usuarioId = notificacao?.usuario_id;

    return destinoTipo === "MASTER" || (perfil?.id && usuarioId === perfil.id);
  }

  async function carregarNotificacoes() {
    let query = supabase
      .from("notificacoes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (perfil?.id) {
      query = query.or(`usuario_id.eq.${perfil.id},destino_tipo.eq.MASTER`);
    } else {
      query = query.eq("destino_tipo", "MASTER");
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao carregar notificações:", error);
      return;
    }

    setNotificacoes(data || []);
  }

  async function registrarDispositivo({
    pushAtivo = preferencias.push,
    localizacaoAtiva = preferencias.localizacao,
    localizacao = localizacaoAtual,
    aparelhoConfiavel = preferencias.aparelhoConfiavel,
  } = {}) {
    if (!perfil?.id) return;

    const identificador = obterDeviceId();

    const payload = {
      usuario_id: perfil.id,
      email: perfil.email || null,
      identificador_dispositivo: identificador,
      nome_dispositivo: `${detectarTipoDispositivo()} ${detectarSistema()}`,
      navegador: navigator.userAgent,
      sistema_operacional: detectarSistema(),
      tipo_dispositivo: detectarTipoDispositivo(),
      confiavel: aparelhoConfiavel,
      push_ativo: pushAtivo,
      localizacao_ativa: localizacaoAtiva,
      latitude: localizacao?.latitude || null,
      longitude: localizacao?.longitude || null,
      precisao: localizacao?.precisao || null,
      ultimo_acesso_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
      metadata: {
        app_version: APP_VERSION,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        idioma: navigator.language,
      },
    };

    const { error } = await supabase
      .from("dispositivos_confiaveis")
      .upsert(payload, {
        onConflict: "identificador_dispositivo",
      });

    if (error) {
      console.error("Erro ao registrar dispositivo:", error);
    }
  }

  useEffect(() => {
    const salvas = localStorage.getItem(preferenciasKey);
    const localizacaoSalva = localStorage.getItem(localizacaoKey);

    if (salvas) {
      setPreferencias({
        ...preferenciasPadrao,
        ...JSON.parse(salvas),
      });
    } else {
      setPreferencias(preferenciasPadrao);
    }

    if (localizacaoSalva) {
      const localizacao = JSON.parse(localizacaoSalva);
      setLocalizacaoAtual(localizacao);
      setStatusLocalizacao("ativo");
    }

    if ("Notification" in window) {
      if (Notification.permission === "granted") setStatusPush("ativo");
      if (Notification.permission === "default") setStatusPush("pendente");
      if (Notification.permission === "denied") setStatusPush("bloqueado");
    }
  }, [preferenciasKey, localizacaoKey]);

  useEffect(() => {
    localStorage.setItem(preferenciasKey, JSON.stringify(preferencias));
  }, [preferencias, preferenciasKey]);

  useEffect(() => {
    if (!perfil?.id) return;

    registrarDispositivo();
  }, [perfil?.id]);

  useEffect(() => {
    document.documentElement.classList.toggle("modo-escuro", modoEscuroAtivo);
    document.body.classList.toggle("modo-escuro", modoEscuroAtivo);
  }, [modoEscuroAtivo]);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;

    function atualizarModoSistema() {
      if (preferencias.modoEscuro === "sistema") {
        document.documentElement.classList.toggle("modo-escuro", media.matches);
        document.body.classList.toggle("modo-escuro", media.matches);
      }
    }

    media.addEventListener?.("change", atualizarModoSistema);

    return () => {
      media.removeEventListener?.("change", atualizarModoSistema);
    };
  }, [preferencias.modoEscuro]);

  useEffect(() => {
    function fecharDropdownFora(event) {
      if (
        notificacoesAbertas &&
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificacoesAbertas(false);
      }
    }

    document.addEventListener("mousedown", fecharDropdownFora);
    document.addEventListener("touchstart", fecharDropdownFora);

    return () => {
      document.removeEventListener("mousedown", fecharDropdownFora);
      document.removeEventListener("touchstart", fecharDropdownFora);
    };
  }, [notificacoesAbertas]);

  useEffect(() => {
    const menuAberto = menus.find((menu) =>
      menu.children?.some((child) => child.id === activePage)
    );

    if (menuAberto) {
      setOpenMenu(menuAberto.id);
    }
  }, [activePage]);

  useEffect(() => {
    carregarNotificacoes();

    const intervalo = setInterval(() => {
      carregarNotificacoes();
    }, 15000);

    return () => clearInterval(intervalo);
  }, [perfil?.id]);

  useEffect(() => {
    const channel = supabase
      .channel("notificacoes-master")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificacoes",
        },
        (payload) => {
          const nova = payload.new;

          if (!ehNotificacaoDoMaster(nova)) return;

          setNotificacoes((atuais) => {
            const jaExiste = atuais.some((item) => item.id === nova.id);
            if (jaExiste) return atuais;

            return [nova, ...atuais].slice(0, 20);
          });

          setSinoAnimando(true);

          setTimeout(() => {
            setSinoAnimando(false);
          }, 1800);
        }
      )
      .subscribe((status) => {
        console.log("Realtime notificacoes-master:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [perfil?.id]);

  useEffect(() => {
    if (!perfil?.id) return;
    if (preferencias.permissoesSolicitadas) return;

    const timer = setTimeout(() => {
      solicitarPermissoesIniciais();
    }, 900);

    return () => clearTimeout(timer);
  }, [perfil?.id, preferencias.permissoesSolicitadas]);

  async function solicitarPermissoesIniciais() {
    const novasPreferencias = {
      ...preferencias,
      permissoesSolicitadas: true,
    };

    if ("Notification" in window && Notification.permission === "default") {
      const permissao = await Notification.requestPermission();
      novasPreferencias.push = permissao === "granted";
      setStatusPush(permissao === "granted" ? "ativo" : "bloqueado");
    }

    setPreferencias(novasPreferencias);

    await registrarDispositivo({
      pushAtivo: novasPreferencias.push,
      localizacaoAtiva: novasPreferencias.localizacao,
      aparelhoConfiavel: novasPreferencias.aparelhoConfiavel,
    });
  }

  async function solicitarPush() {
    if (!("Notification" in window)) {
      setStatusPush("nao_suportado");
      alert("Este navegador não suporta notificações.");
      return;
    }

    if (Notification.permission === "denied") {
      setStatusPush("bloqueado");
      alert("As notificações estão bloqueadas no navegador. Libere nas configurações do navegador.");
      return;
    }

    const permissao = await Notification.requestPermission();
    const pushAtivo = permissao === "granted";

    setStatusPush(pushAtivo ? "ativo" : "bloqueado");

    setPreferencias((atual) => ({
      ...atual,
      push: pushAtivo,
      permissoesSolicitadas: true,
    }));

    await registrarDispositivo({
      pushAtivo,
    });

    if (pushAtivo) {
      new Notification("Chegou!", {
        body: "Notificações ativadas neste aparelho.",
      });
    }
  }

  async function desativarPushLocal() {
    setPreferencias((atual) => ({
      ...atual,
      push: false,
    }));

    setStatusPush("desativado");

    await registrarDispositivo({
      pushAtivo: false,
    });
  }

  function solicitarLocalizacao() {
    if (!("geolocation" in navigator)) {
      setStatusLocalizacao("nao_suportado");
      alert("Este navegador não suporta localização.");
      return;
    }

    setStatusLocalizacao("solicitando");

    navigator.geolocation.getCurrentPosition(
      async (posicao) => {
        const localizacao = {
          latitude: posicao.coords.latitude,
          longitude: posicao.coords.longitude,
          precisao: posicao.coords.accuracy,
          capturado_em: new Date().toISOString(),
        };

        setLocalizacaoAtual(localizacao);
        localStorage.setItem(localizacaoKey, JSON.stringify(localizacao));

        setPreferencias((atual) => ({
          ...atual,
          localizacao: true,
          permissoesSolicitadas: true,
        }));

        setStatusLocalizacao("ativo");

        await registrarDispositivo({
          localizacaoAtiva: true,
          localizacao,
        });
      },
      async () => {
        setPreferencias((atual) => ({
          ...atual,
          localizacao: false,
          permissoesSolicitadas: true,
        }));

        setStatusLocalizacao("bloqueado");

        await registrarDispositivo({
          localizacaoAtiva: false,
          localizacao: null,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    );
  }

  async function desativarLocalizacao() {
    localStorage.removeItem(localizacaoKey);
    setLocalizacaoAtual(null);
    setStatusLocalizacao("desativado");

    setPreferencias((atual) => ({
      ...atual,
      localizacao: false,
    }));

    await registrarDispositivo({
      localizacaoAtiva: false,
      localizacao: null,
    });
  }

  function alterarModoEscuro(valor) {
    setPreferencias((atual) => ({
      ...atual,
      modoEscuro: valor,
    }));
  }

  async function alternarAparelhoConfiavel() {
    const novoValor = !preferencias.aparelhoConfiavel;

    setPreferencias((atual) => ({
      ...atual,
      aparelhoConfiavel: novoValor,
    }));

    await registrarDispositivo({
      aparelhoConfiavel: novoValor,
    });
  }

  function marcarMenuNovoComoVisto(id) {
    setMenusNovosVistos((atuais) => {
      if (atuais.includes(id)) return atuais;

      const atualizados = [...atuais, id];
      localStorage.setItem(
        "chegou_menus_novos_vistos_master",
        JSON.stringify(atualizados)
      );

      return atualizados;
    });
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
    marcarMenuNovoComoVisto(id);
    onNavigate(id);
    setMobileOpen(false);
  }

  function alternarMenuPrincipal() {
    if (window.innerWidth <= 900) {
      setMobileOpen(true);
      return;
    }

    setSidebarCollapsed((atual) => !atual);
  }

  async function abrirNotificacao(notificacao) {
    if (!notificacao.lida) {
      const agora = new Date().toISOString();

      const { error } = await supabase
        .from("notificacoes")
        .update({
          lida: true,
          data_leitura: agora,
          lida_em: agora,
        })
        .eq("id", notificacao.id);

      if (!error) {
        setNotificacoes((atuais) =>
          atuais.map((item) =>
            item.id === notificacao.id
              ? { ...item, lida: true, data_leitura: agora, lida_em: agora }
              : item
          )
        );
      }
    }

    if (notificacao.acao_url) {
      if (notificacao.acao_url.includes("condominios-auditoria")) {
        onNavigate("condominios-auditoria");
      }
    }

    setNotificacoesAbertas(false);
  }

  function StatusLed({ ativo }) {
    return <span className={`status-led ${ativo ? "ativo" : "inativo"}`} />;
  }

  function textoStatusPush() {
    if (statusPush === "ativo" && preferencias.push) return "Ativado";
    if (statusPush === "bloqueado") return "Bloqueado";
    if (statusPush === "pendente") return "Pendente";
    if (statusPush === "desativado") return "Desativado";
    return "Não suportado";
  }

  function textoStatusLocalizacao() {
    if (statusLocalizacao === "ativo" && preferencias.localizacao) return "Ativada";
    if (statusLocalizacao === "solicitando") return "Solicitando...";
    if (statusLocalizacao === "bloqueado") return "Bloqueada";
    if (statusLocalizacao === "nao_suportado") return "Não suportada";
    return "Desativada";
  }

  function renderizarPaginaInterna() {
    if (activePage === "configuracoes") {
      return (
        <div className="master-config-page">
          <div className="master-page-header">
            <div>
              <h1>Configurações</h1>
              <p>Gerencie preferências deste aparelho e recursos de segurança.</p>
            </div>
          </div>

          <div className="config-grid">
            <section className="config-card">
              <div>
                <div className="config-title-row">
                  <Bell size={24} />
                  <strong>Notificações Push</strong>
                  <StatusLed ativo={preferencias.push && statusPush === "ativo"} />
                </div>

                <p>
                  Permite receber alertas importantes no aparelho. O envio real por push
                  com Service Worker será conectado na próxima etapa.
                </p>

                <small>Status: {textoStatusPush()}</small>
              </div>

              <div className="config-actions">
                <button type="button" onClick={solicitarPush}>
                  {preferencias.push ? "Atualizar" : "Ativar Push"}
                </button>

                {preferencias.push && (
                  <button
                    type="button"
                    className="btn-config-secondary"
                    onClick={desativarPushLocal}
                  >
                    Desativar
                  </button>
                )}
              </div>
            </section>

            <section className="config-card">
              <div>
                <div className="config-title-row">
                  <MapPin size={24} />
                  <strong>Localização aproximada</strong>
                  <StatusLed
                    ativo={preferencias.localizacao && statusLocalizacao === "ativo"}
                  />
                </div>

                <p>
                  Usada para segurança, auditoria e identificação de acessos suspeitos,
                  somente mediante autorização do usuário.
                </p>

                <small>Status: {textoStatusLocalizacao()}</small>

                {localizacaoAtual && (
                  <small>
                    Precisão aproximada: {Math.round(localizacaoAtual.precisao)}m •{" "}
                    {new Date(localizacaoAtual.capturado_em).toLocaleString("pt-BR")}
                  </small>
                )}
              </div>

              <div className="config-actions">
                <button type="button" onClick={solicitarLocalizacao}>
                  {preferencias.localizacao ? "Atualizar" : "Permitir"}
                </button>

                {preferencias.localizacao && (
                  <button
                    type="button"
                    className="btn-config-secondary"
                    onClick={desativarLocalizacao}
                  >
                    Desativar
                  </button>
                )}
              </div>
            </section>

            <section className="config-card">
              <div>
                <div className="config-title-row">
                  <Moon size={24} />
                  <strong>Modo escuro</strong>
                  <StatusLed ativo={modoEscuroAtivo} />
                </div>

                <p>Use o padrão do sistema ou escolha manualmente o tema visual.</p>
                <small>Status: {modoEscuroAtivo ? "Escuro ativo" : "Claro ativo"}</small>
              </div>

              <select
                value={preferencias.modoEscuro}
                onChange={(e) => alterarModoEscuro(e.target.value)}
              >
                <option value="sistema">Usar padrão do sistema</option>
                <option value="claro">Claro</option>
                <option value="escuro">Escuro</option>
              </select>
            </section>

            <section className="config-card">
              <div>
                <div className="config-title-row">
                  <Smartphone size={24} />
                  <strong>Aparelho confiável</strong>
                  <StatusLed ativo={preferencias.aparelhoConfiavel} />
                </div>

                <p>
                  Esta opção já fica preparada, mas o controle completo será feito depois
                  com impressão do dispositivo, data de validação e confirmação por código.
                </p>

                <small>
                  Status:{" "}
                  {preferencias.aparelhoConfiavel
                    ? "Ativo neste navegador"
                    : "Desativado"}
                </small>
              </div>

              <button type="button" onClick={alternarAparelhoConfiavel}>
                {preferencias.aparelhoConfiavel ? "Desativar" : "Marcar"}
              </button>
            </section>
          </div>
        </div>
      );
    }

    if (activePage === "notificacoes") {
      return (
        <div className="master-config-page">
          <div className="master-page-header">
            <div>
              <h1>Notificações</h1>
              <p>Últimos alertas, auditorias e eventos do sistema.</p>
            </div>
          </div>

          <div className="notificacoes-lista-page">
            {notificacoes.length === 0 && (
              <div className="notificacao-vazia">Nenhuma notificação encontrada.</div>
            )}

            {notificacoes.map((notificacao) => (
              <button
                type="button"
                key={notificacao.id}
                className={`notificacao-card ${!notificacao.lida ? "nao-lida" : ""}`}
                onClick={() => abrirNotificacao(notificacao)}
              >
                <strong>{notificacao.titulo}</strong>
                <p>{notificacao.mensagem}</p>
                <small>
                  {notificacao.prioridade || "normal"} •{" "}
                  {dataNotificacao(notificacao)
                    ? new Date(dataNotificacao(notificacao)).toLocaleString("pt-BR")
                    : "sem data"}
                </small>
              </button>
            ))}
          </div>
        </div>
      );
    }

    return children;
  }

  const botoesMobile = [
    { id: "dashboard", label: "Início", icon: Home },
    { id: "condominios-cadastro", label: "Cadastro", icon: Building2 },
    { id: "condominios-auditoria", label: "Auditoria", icon: ClipboardCheck },
    { id: "notificacoes", label: "Alertas", icon: Bell },
    { id: "configuracoes", label: "Config.", icon: Settings },
  ];

  return (
    <div className={`master-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <header className="master-topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="hamburger"
            onClick={alternarMenuPrincipal}
            aria-label="Abrir menu"
          >
            <Menu size={26} />
          </button>

          <img src={logo} alt="Chegou!" className="master-top-logo" />
        </div>

        <div className="topbar-actions">
          <div className="notification-wrapper" ref={notificationRef}>
            <button
              type="button"
              className={`notification ${sinoAnimando ? "bell-shake" : ""}`}
              onClick={() => setNotificacoesAbertas((atual) => !atual)}
              aria-label="Notificações"
            >
              <Bell size={20} />
              {notificacoesNaoLidas > 0 && <b>{notificacoesNaoLidas}</b>}
            </button>

            {notificacoesAbertas && (
              <div className="notifications-dropdown">
                <div className="notifications-header">
                  <strong>Notificações</strong>
                  <small>{notificacoesNaoLidas} não lidas</small>
                </div>

                <div className="notifications-list">
                  {notificacoes.length === 0 && (
                    <div className="notification-empty">Nenhuma notificação.</div>
                  )}

                  {notificacoes.slice(0, 6).map((notificacao) => (
                    <button
                      type="button"
                      key={notificacao.id}
                      className={!notificacao.lida ? "unread" : ""}
                      onClick={() => abrirNotificacao(notificacao)}
                    >
                      <strong>{notificacao.titulo}</strong>
                      <p>{notificacao.mensagem}</p>
                      <small>
                        {dataNotificacao(notificacao)
                          ? new Date(dataNotificacao(notificacao)).toLocaleString("pt-BR")
                          : "sem data"}
                      </small>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="notifications-footer"
                  onClick={() => {
                    setNotificacoesAbertas(false);
                    onNavigate("notificacoes");
                  }}
                >
                  Ver todas
                </button>
              </div>
            )}
          </div>

          <span className="notification desktop-only">
            <MessageSquare size={20} />
          </span>

          <div className="profile desktop-only">
            <span>M</span>
            <div>
              <strong>Master</strong>
              <small>{perfil?.nome || "Perfil Master"}</small>
            </div>
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

      <aside className={`master-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <img src={logo} alt="Chegou!" />
        </div>

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
                    <em className="menu-label-novo">
                      {menu.label}
                      {menu.novo &&
                        menu.children?.some((child) => !menusNovosVistos.includes(child.id)) && (
                          <span className="menu-novo-dot" />
                        )}
                    </em>
                  </span>

                  {hasChildren &&
                    !sidebarCollapsed &&
                    (isOpen ? <ChevronDown size={17} /> : <ChevronRight size={17} />)}
                </button>

                {hasChildren && isOpen && !sidebarCollapsed && (
                  <div className="sidebar-submenu">
                    {menu.children.map((child) => {
                      const ChildIcon = child.icon;

                      return (
                        <button
                          type="button"
                          key={child.id}
                          className={activePage === child.id ? "active-subitem" : ""}
                          onClick={() => clicarSubmenu(child.id)}
                        >
                          <ChildIcon size={16} />
                          <span className="submenu-label">
                            {child.label}
                            {child.novo && !menusNovosVistos.includes(child.id) && (
                              <strong className="menu-novo-badge">NOVO</strong>
                            )}
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

        <div className="master-sidebar-footer">
          <div className="master-badge">
            <strong>Perfil Master (God)</strong>
            <p>Acesso total a todos os condomínios, usuários e recursos da plataforma.</p>
          </div>

          <div className="system-footer">
            <span>Versão {APP_VERSION}</span>
            <small>© {COPYRIGHT_YEAR} Chegou! Todos os direitos reservados.</small>
          </div>
        </div>
      </aside>

      <main className="master-main">{renderizarPaginaInterna()}</main>

      <nav className="mobile-bottom-nav">
        {botoesMobile.map((item) => {
          const Icon = item.icon;
          const ativo = activePage === item.id;

          return (
            <button
              type="button"
              key={item.id}
              className={ativo ? "active" : ""}
              onClick={() => {
                onNavigate(item.id);
                setMobileOpen(false);
              }}
            >
              <Icon size={20} />
              <span>{item.label}</span>
              {item.id === "notificacoes" && notificacoesNaoLidas > 0 && (
                <b>{notificacoesNaoLidas}</b>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default MasterLayout;