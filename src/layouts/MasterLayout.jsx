import { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Bell,
  Building2,
  ClipboardCheck,
  Home,
  MapPin,
  Moon,
  Settings,
  Smartphone,
} from "lucide-react";

import AppLayout from "./AppLayout";
import { supabase } from "../services/supabase";

const DEVICE_KEY = "chegou_device_id";

const preferenciasPadrao = {
  push: false,
  localizacao: false,
  modoEscuro: "sistema",
  aparelhoConfiavel: false,
  permissoesSolicitadas: false,
};

const rotasNotificacaoMaster = [
  {
    page: "condominios-auditoria",
    termos: ["condominios-auditoria", "WIZARD_CONDOMINIO", "aprovacao"],
  },
  {
    page: "cargos-funcoes",
    termos: [
      "cargos-funcoes",
      "admin-cargos-funcoes",
      "CARGOS_FUNCOES",
      "cargos_funcoes",
      "auditoria_cargo",
      "auditoria_cargo_master",
      "solicitacao_cargo",
    ],
  },
  {
    page: "notificacoes",
    termos: ["notificacoes"],
  },
];

function detectarModalOuDrawerMaster() {
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
        ".cf-drawer",
        ".cf-drawer.open",
        ".cf-modal",
        ".cf-modal.open",
        ".modal-backdrop",
        ".drawer-backdrop",
        ".auditoria-drawer",
        ".auditoria-drawer.open",
        ".condominio-drawer",
        ".condominio-drawer.open",
      ].join(",")
    )
  );
}

function MasterLayout({ perfil, activePage, onNavigate, onLogout, children }) {
  const [notificacoes, setNotificacoes] = useState([]);
  const [preferencias, setPreferencias] = useState(preferenciasPadrao);
  const [localizacaoAtual, setLocalizacaoAtual] = useState(null);
  const [statusPush, setStatusPush] = useState("nao_suportado");
  const [statusLocalizacao, setStatusLocalizacao] = useState("desativado");
  const [camadaAbertaMaster, setCamadaAbertaMaster] = useState(false);

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

  const botoesMobileMaster = [
    {
      id: "dashboard",
      label: "Início",
      icon: Home,
    },
    {
      id: "condominios-cadastro",
      label: "Cadastro",
      icon: Building2,
    },
    {
      id: "condominios-auditoria",
      label: "Auditoria",
      icon: ClipboardCheck,
    },
    {
      id: "notificacoes",
      label: "Alertas",
      icon: Bell,
      badge: notificacoesNaoLidas,
    },
    {
      id: "configuracoes",
      label: "Config.",
      icon: Settings,
    },
  ];

  function navegar(destino) {
    onNavigate(destino);

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }

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
    return (
      notificacao.created_at ||
      notificacao.criado_em ||
      notificacao.data_criacao
    );
  }

  function ehNotificacaoDoMaster(notificacao) {
    const destinoTipo = String(notificacao?.destino_tipo || "")
      .trim()
      .toUpperCase();

    const modulo = String(notificacao?.modulo || "")
      .trim()
      .toUpperCase();

    const usuarioId = notificacao?.usuario_id;

    return (
      destinoTipo === "MASTER" ||
      modulo === "MASTER" ||
      (perfil?.id && usuarioId === perfil.id)
    );
  }

  function obterDestinoNotificacao(notificacao) {
    const metadata =
      notificacao?.metadata && typeof notificacao.metadata === "object"
        ? JSON.stringify(notificacao.metadata)
        : String(notificacao?.metadata || "");

    const textoBusca = [
      notificacao?.acao_url,
      notificacao?.modulo,
      notificacao?.tipo,
      notificacao?.origem,
      notificacao?.origem_tipo,
      notificacao?.titulo,
      metadata,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const rota = rotasNotificacaoMaster.find((item) =>
      item.termos.some((termo) =>
        textoBusca.includes(String(termo).toLowerCase())
      )
    );

    return rota?.page || null;
  }

  async function navegarPorNotificacao(notificacao) {
    const destino = obterDestinoNotificacao(notificacao);

    if (!destino) return;

    await marcarNotificacaoComoLida(notificacao);

    navegar(destino);
  }

  async function marcarNotificacaoComoLida(notificacao) {
    if (!notificacao?.id || notificacao.lida) return;

    const agora = new Date().toISOString();

    const { error } = await supabase
      .from("notificacoes")
      .update({
        lida: true,
        data_leitura: agora,
        lida_em: agora,
      })
      .eq("id", notificacao.id);

    if (error) {
      console.error("Erro ao marcar notificação como lida:", error);
      return;
    }

    setNotificacoes((atuais) =>
      atuais.map((item) =>
        item.id === notificacao.id
          ? {
              ...item,
              lida: true,
              data_leitura: agora,
              lida_em: agora,
            }
          : item
      )
    );
  }

  async function carregarNotificacoes() {
    let query = supabase
      .from("notificacoes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (perfil?.id) {
      query = query.or(
        `usuario_id.eq.${perfil.id},destino_tipo.eq.MASTER,modulo.eq.MASTER`
      );
    } else {
      query = query.or("destino_tipo.eq.MASTER,modulo.eq.MASTER");
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
        app_version: import.meta.env.VITE_APP_VERSION || "1.0.0",
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
      alert(
        "As notificações estão bloqueadas no navegador. Libere nas configurações do navegador."
      );
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

  function textoStatusPush() {
    if (statusPush === "ativo" && preferencias.push) return "Ativado";
    if (statusPush === "bloqueado") return "Bloqueado";
    if (statusPush === "pendente") return "Pendente";
    if (statusPush === "desativado") return "Desativado";
    return "Não suportado";
  }

  function textoStatusLocalizacao() {
    if (statusLocalizacao === "ativo" && preferencias.localizacao) {
      return "Ativada";
    }

    if (statusLocalizacao === "solicitando") return "Solicitando...";
    if (statusLocalizacao === "bloqueado") return "Bloqueada";
    if (statusLocalizacao === "nao_suportado") return "Não suportada";

    return "Desativada";
  }

  function StatusLed({ ativo }) {
    return <span className={`status-led ${ativo ? "ativo" : "inativo"}`} />;
  }

  useEffect(() => {
    document.documentElement.classList.add("chegou-app-fullscreen");
    document.body.classList.add("chegou-app-fullscreen");
  }, []);

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

  useEffect(() => {
    function verificarCamadasMaster() {
      setCamadaAbertaMaster(detectarModalOuDrawerMaster());
    }

    verificarCamadasMaster();

    const observer = new MutationObserver(verificarCamadasMaster);

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

    window.addEventListener("resize", verificarCamadasMaster);
    window.addEventListener("keydown", verificarCamadasMaster);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", verificarCamadasMaster);
      window.removeEventListener("keydown", verificarCamadasMaster);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "chegou_master_pagina_atual",
        JSON.stringify({
          pagina: activePage,
          criadoEm: new Date().toISOString(),
        })
      );
    } catch {
      // mantém navegação mesmo se o storage falhar
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, [activePage]);

  function renderizarPaginaConfiguracoes() {
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
                Permite receber alertas importantes no aparelho. O envio real por
                push com Service Worker será conectado na próxima etapa.
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
                Usada para segurança, auditoria e identificação de acessos
                suspeitos, somente mediante autorização do usuário.
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
                Esta opção já fica preparada, mas o controle completo será feito
                depois com impressão do dispositivo, data de validação e
                confirmação por código.
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

  function renderizarPaginaNotificacoes() {
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
            <div className="notificacao-vazia">
              Nenhuma notificação encontrada.
            </div>
          )}

          {notificacoes.map((notificacao) => (
            <button
              type="button"
              key={notificacao.id}
              className={`notificacao-card ${
                !notificacao.lida ? "nao-lida" : ""
              }`}
              onClick={() => navegarPorNotificacao(notificacao)}
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

  function renderizarConteudo() {
    if (activePage === "configuracoes") {
      return renderizarPaginaConfiguracoes();
    }

    if (activePage === "notificacoes") {
      return renderizarPaginaNotificacoes();
    }

    return children;
  }

  return (
    <AppLayout
      perfil={{
        ...perfil,
        notificacoes_nao_lidas: notificacoesNaoLidas,
      }}
      role="master"
      activePage={activePage}
      onNavigate={navegar}
      onLogout={onLogout}
      mobileBottomItems={botoesMobileMaster}
      forceMobileBottomNav
      forceHideMobileFooter={camadaAbertaMaster}
    >
      {renderizarConteudo()}
    </AppLayout>
  );
}

export default MasterLayout;