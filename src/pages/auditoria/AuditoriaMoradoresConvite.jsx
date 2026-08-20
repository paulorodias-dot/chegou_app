import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ChevronLeft,
  ChevronRight,
  DatabaseZap,
  Download,
  Eye,
  Info,
  MoreVertical,
  RefreshCw,
  Search,
  Send,
  Sparkles,
} from "lucide-react";

import toast from "react-hot-toast";
import * as XLSX from "xlsx";

import "./AuditoriaMoradoresConvite.css";

import {
  buscarTorresAuditoriaMoradores,
  enviarConviteMoradorAuditoria,
  listarAuditoriaConvitesMoradores,
  obterDetalheAuditoriaConviteMorador,
  obterLimiteEnvioDiario,
  obterResumoAuditoriaConvitesMoradores,
} from "../../services/auditoriaMoradoresConvitesService";

const STATUS_FILTROS = [
  {
    value: "TODOS",
    label: "Todos",
  },
  {
    value: "RASCUNHO",
    label: "Pronto para enviar",
  },
  {
    value: "AGUARDANDO_ENVIO",
    label: "Aguardando envio",
  },
  {
    value: "PROCESSANDO",
    label: "Enviando e-mail",
  },
  {
    value: "ERRO_ENVIO",
    label: "Falha no envio",
  },
  {
    value: "CONVITE_ENVIADO",
    label: "E-mail enviado",
  },
  {
    value: "ABERTO",
    label: "E-mail aberto",
  },
  {
    value: "EM_PREENCHIMENTO",
    label: "Em preenchimento",
  },
  {
    value: "AGUARDANDO_AUDITORIA",
    label: "Aguardando auditoria",
  },
  {
    value: "APROVADO",
    label: "Aprovado",
  },
  {
    value: "REPROVADO",
    label: "Reprovado",
  },
];

function obterStatusSistema(item) {
  const status = String(
    item?.status_sistema ||
      item?.status_convite ||
      item?.convite?.status ||
      ""
  )
    .trim()
    .toUpperCase();

  if (status) {
    return status;
  }

  /*
   * Registro sem status de convite ainda é tratado
   * como disponível para o primeiro envio, desde que
   * não exista evidência de envio anterior.
   */
  if (
    item?.enviado_em ||
    item?.convite?.enviado_em
  ) {
    return "CONVITE_ENVIADO";
  }

  return "RASCUNHO";
}

function podeEnviarConvite(item) {
  if (
    !item?.pre_cadastro_id ||
    !String(item?.email || "").trim()
  ) {
    return false;
  }

  const status =
    obterStatusSistema(item);

  const estadosQueJaSeguiramAdiante = [
    "AGUARDANDO_ENVIO",
    "PROCESSANDO",
    "CONVITE_ENVIADO",
    "ABERTO",
    "EM_PREENCHIMENTO",
    "WIZARD_FINALIZADO",
    "AGUARDANDO_AUDITORIA",
    "CORRECAO_SOLICITADA",
    "APROVADO",
    "REPROVADO",
    "BLOQUEADO",
  ];

  if (
    estadosQueJaSeguiramAdiante.includes(
      status
    )
  ) {
    return false;
  }

  /*
   * RASCUNHO e ERRO_ENVIO são os estados oficiais
   * já conhecidos. Outros estados ainda não enviados
   * também permanecem elegíveis para não esconder a
   * ação quando o backend devolver um estado novo de
   * pré-envio.
   */
  return !item?.enviado_em;
}

function formatarCanalParaUsuario(valor) {
  const canal = String(
    valor || ""
  )
    .trim()
    .toUpperCase();

  const mapa = {
    EMAIL: "E-mail",
    E_MAIL: "E-mail",
    BREVO: "E-mail",
    WHATSAPP: "WhatsApp",
    SMS: "SMS",
  };

  return mapa[canal] || valor || "—";
}

function formatarDataHora(valor) {
  if (!valor) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(
      "pt-BR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(
      new Date(valor)
    );
  } catch {
    return "—";
  }
}

function formatarData(valor) {
  if (!valor) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(
      "pt-BR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    ).format(
      new Date(valor)
    );
  } catch {
    return "—";
  }
}

function formatarUltimaAtividade(
  valor
) {
  if (!valor) {
    return "—";
  }

  const agora = new Date();
  const data = new Date(valor);

  const diffMs =
    agora.getTime() -
    data.getTime();

  const diffMin =
    Math.floor(
      diffMs / 60000
    );

  const diffHoras =
    Math.floor(
      diffMin / 60
    );

  if (diffMin < 1) {
    return "Agora";
  }

  if (diffMin < 60) {
    return `Há ${diffMin} min`;
  }

  if (diffHoras < 24) {
    return `Há ${diffHoras} h`;
  }

  return formatarDataHora(valor);
}

function calcularDiasRestantes(
  valor
) {
  if (!valor) {
    return "—";
  }

  const agora = new Date();
  const data = new Date(valor);

  const diffMs =
    data.getTime() -
    agora.getTime();

  const dias =
    Math.ceil(
      diffMs /
        (1000 *
          60 *
          60 *
          24)
    );

  if (dias < 0) {
    return "Expirado";
  }

  if (dias === 0) {
    return "Expira hoje";
  }

  if (dias === 1) {
    return "1 dia";
  }

  return `${dias} dias`;
}

function formatarStatusTela(
  status
) {
  if (!status) {
    return "Aguardando envio";
  }

  const mapa = {
    RASCUNHO: "Pronto para enviar",
    AGUARDANDO_ENVIO:
      "Aguardando envio",
    PROCESSANDO:
      "Enviando e-mail",
    ERRO_ENVIO:
      "Falha no envio",
    CONVITE_ENVIADO:
      "E-mail enviado",
    ABERTO:
      "Convite aberto",
    EM_PREENCHIMENTO:
      "Em Preenchimento",
    WIZARD_FINALIZADO:
      "Cadastro preenchido",
    AGUARDANDO_AUDITORIA:
      "Aguardando auditoria",
    CORRECAO_SOLICITADA:
      "Correção solicitada",
    APROVADO: "Aprovado",
    REPROVADO: "Reprovado",
    BLOQUEADO: "Acesso bloqueado",
  };

  return (
    mapa[status] ||
    String(status).replaceAll(
      "_",
      " "
    )
  );
}

function classeStatus(status) {
  const mapa = {
    RASCUNHO: "aguardando",
    AGUARDANDO_ENVIO:
      "aguardando",
    PROCESSANDO:
      "processando",
    ERRO_ENVIO: "erro",
    CONVITE_ENVIADO:
      "enviado",
    ABERTO: "enviado",
    EM_PREENCHIMENTO:
      "preenchimento",
    WIZARD_FINALIZADO:
      "auditoria",
    AGUARDANDO_AUDITORIA:
      "auditoria",
    CORRECAO_SOLICITADA:
      "correcao",
    APROVADO: "aprovado",
    REPROVADO: "reprovado",
    BLOQUEADO: "bloqueado",
  };

  return (
    mapa[status] ||
    "aguardando"
  );
}

function obterSubStatus(item) {
  if (!item) {
    return "—";
  }

  const mapa = {
    RASCUNHO:
      "Ainda não enviado",

    AGUARDANDO_ENVIO:
      "Aguardando envio",

    PROCESSANDO:
      "Envio em andamento",

    ERRO_ENVIO:
      "Não foi possível enviar. Tente novamente.",

    CONVITE_ENVIADO:
      "E-mail enviado",

    ABERTO:
      "Morador abriu o convite",

    WIZARD_FINALIZADO:
      "Cadastro preenchido pelo morador",

    AGUARDANDO_AUDITORIA:
      "Cadastro finalizado e aguardando auditoria",

    APROVADO:
      "Aguardando 1º acesso",

    REPROVADO:
      "Auditoria encerrada",

    BLOQUEADO:
      "Suspeita de fraude",

    CORRECAO_SOLICITADA:
      "Pendente de ajuste",
  };

  if (
    item.status_sistema ===
    "EM_PREENCHIMENTO"
  ) {
    return item
      .percentual_preenchimento
      ? `${item.percentual_preenchimento}% preenchido`
      : "Cadastro iniciado";
  }

  return (
    mapa[
      item.status_sistema
    ] ||
    "Acompanhamento do convite"
  );
}

function formatarCanalEnvio(item) {
  const valor =
    item?.canal_envio ||
    item?.tipo_envio ||
    item?.convite?.canal_envio ||
    item?.convite?.tipo_envio ||
    "";

  return formatarCanalParaUsuario(
    valor
  );
}

function obterIniciais(
  nome = ""
) {
  const partes = String(nome)
    .trim()
    .split(" ")
    .filter(Boolean);

  if (!partes.length) {
    return "CH";
  }

  if (partes.length === 1) {
    return partes[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${partes[0][0]}${
    partes[
      partes.length - 1
    ][0]
  }`.toUpperCase();
}

function calcularPercentual(
  usados,
  limite
) {
  if (!limite) {
    return 0;
  }

  return Math.min(
    100,
    Math.round(
      (Number(usados || 0) /
        Number(limite)) *
        100
    )
  );
}

function gerarNomeArquivoConvites() {
  const agora = new Date();

  const data =
    agora
      .toISOString()
      .slice(0, 10);

  const hora =
    String(
      agora.getHours()
    ).padStart(
      2,
      "0"
    );

  const minuto =
    String(
      agora.getMinutes()
    ).padStart(
      2,
      "0"
    );

  return `auditoria_convites_moradores_${data}_${hora}${minuto}.xlsx`;
}

function KpiCard({
  icon: Icon,
  titulo,
  valor,
  detalhe,
  variante = "azul",
}) {
  return (
    <div className="amc-kpi-card">
      <div
        className={`amc-kpi-icon amc-kpi-icon-${variante}`}
      >
        <Icon
          size={22}
          strokeWidth={2.1}
        />
      </div>

      <div className="amc-kpi-content">
        <span>{titulo}</span>

        <strong>
          {valor}
        </strong>

        <div className="amc-kpi-footer">
          <small>
            {detalhe}
          </small>
        </div>
      </div>
    </div>
  );
}

function AcaoLinhaMenu({
  item,
  aberto,
  onToggle,
  onAcao,
}) {
  const [posicao, setPosicao] =
    useState({
      top: 0,
      left: 0,
    });

  const statusAtual =
    obterStatusSistema(item);

  const envioDisponivel =
    podeEnviarConvite(item);

  const opcoesPorStatus = {
    RASCUNHO: [
      "Enviar Convite",
      "Editar Dados",
      "Visualizar Cadastro",
      "Cancelar Pré-Cadastro",
    ],

    AGUARDANDO_ENVIO: [
      "Visualizar Convite",
      "Cancelar Envio",
      "Visualizar Cadastro",
    ],

    PROCESSANDO: [
      "Visualizar Convite",
      "Visualizar Cadastro",
    ],

    ERRO_ENVIO: [
      "Tentar Enviar Novamente",
      "Visualizar Cadastro",
      "Visualizar Histórico",
    ],

    CONVITE_ENVIADO: [
      "Visualizar Convite",
      "Reenviar Convite",
      "Revogar Convite",
      "Visualizar Cadastro",
    ],

    ABERTO: [
      "Visualizar Andamento",
      "Reenviar Convite",
      "Visualizar Cadastro",
    ],

    EM_PREENCHIMENTO: [
      "Visualizar Andamento",
      "Reenviar Convite",
      "Visualizar Cadastro",
    ],

    WIZARD_FINALIZADO: [
      "Visualizar Cadastro Completo",
      "Abrir Auditoria",
    ],

    AGUARDANDO_AUDITORIA: [
      "Visualizar Cadastro Completo",
      "Abrir Auditoria",
    ],

    CORRECAO_SOLICITADA: [
      "Visualizar Pendências",
      "Reenviar Aviso",
      "Visualizar Cadastro",
    ],

    APROVADO: [
      "Visualizar Usuário Criado",
      "Visualizar Histórico",
    ],

    REPROVADO: [
      "Visualizar Motivo",
      "Visualizar Histórico",
      "Reabrir Auditoria",
    ],

    BLOQUEADO: [
      "Visualizar Risco",
      "Visualizar Histórico de Ações",
      "Desbloquear",
      "Reabrir Auditoria",
    ],
  };

  const opcoesBase =
    opcoesPorStatus[
      statusAtual
    ] || [
      "Visualizar Cadastro",
    ];

  const opcoes =
    envioDisponivel &&
    !opcoesBase.includes(
      "Enviar Convite"
    ) &&
    !opcoesBase.includes(
      "Tentar Enviar Novamente"
    )
      ? [
          "Enviar Convite",
          ...opcoesBase,
        ]
      : opcoesBase;

  function abrirMenu(event) {
    const rect =
      event.currentTarget
        .getBoundingClientRect();

    const larguraMenu = 196;

    const alturaMenu =
      Math.min(
        320,
        opcoes.length *
          34 +
          14
      );

    let left =
      rect.right -
      larguraMenu -
      25;

    let top =
      rect.top -
      alturaMenu +
      28;

    if (left < 12) {
      left = 12;
    }

    if (
      left +
        larguraMenu >
      window.innerWidth -
        12
    ) {
      left =
        window.innerWidth -
        larguraMenu -
        12;
    }

    if (top < 12) {
      top =
        rect.bottom + 8;
    }

    if (
      top +
        alturaMenu >
      window.innerHeight -
        12
    ) {
      top =
        window.innerHeight -
        alturaMenu -
        12;
    }

    setPosicao({
      top,
      left,
    });

    onToggle(
      aberto
        ? null
        : item.id
    );
  }

  function executarOpcao(
    opcao
  ) {
    onToggle(null);

    onAcao(
      opcao,
      item
    );
  }

  return (
    <div className="amc-row-actions">
      <button
        type="button"
        className="amc-icon-action amc-row-menu-btn"
        onClick={abrirMenu}
        aria-label="Abrir ações"
      >
        <MoreVertical
          size={18}
        />
      </button>

      {aberto ? (
        <>
          <button
            type="button"
            className="amc-menu-overlay"
            onClick={() =>
              onToggle(null)
            }
            aria-label="Fechar menu"
          />

          <div
            className="amc-row-menu amc-row-menu-fixed"
            style={{
              top: `${posicao.top}px`,
              left: `${posicao.left}px`,
            }}
          >
            {opcoes.map(
              (opcao) => (
                <button
                  key={opcao}
                  type="button"
                  onClick={() =>
                    executarOpcao(
                      opcao
                    )
                  }
                >
                  {opcao}
                </button>
              )
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

/*
 * ============================================================
 * DRAWER DE CONSULTA
 * ============================================================
 */
function DrawerRegistro({
  item,
  titulo,
  onClose,
}) {
  if (!item) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="amc-drawer-backdrop"
        onClick={onClose}
        aria-label="Fechar"
      />

      <aside className="amc-drawer">
        <div className="amc-drawer-header">
          <div>
            <span>
              {titulo}
            </span>

            <h2>
              {item.nome}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="amc-drawer-grid">
          <div>
            <small>
              Status
            </small>

            <strong>
              {formatarStatusTela(
                obterStatusSistema(item)
              )}
            </strong>
          </div>

          <div>
            <small>
              Unidade
            </small>

            <strong>
              Apto {item.unidade}
            </strong>
          </div>

          <div>
            <small>
              Torre
            </small>

            <strong>
              {item.torre}
            </strong>
          </div>

          <div>
            <small>
              E-mail
            </small>

            <strong>
              {item.email}
            </strong>
          </div>

          <div>
            <small>
              Telefone
            </small>

            <strong>
              {item.telefone ||
                "—"}
            </strong>
          </div>

          <div>
            <small>
              Preenchimento
            </small>

            <strong>
              {item.percentual_preenchimento ||
                0}
              %
            </strong>
          </div>

          <div>
            <small>
              Enviado em
            </small>

            <strong>
              {formatarDataHora(
                item.enviado_em
              )}
            </strong>
          </div>

          <div>
            <small>
              Expiração
            </small>

            <strong>
              {formatarData(
                item.token_expira_em
              )}
            </strong>
          </div>
        </div>

        <div className="amc-drawer-section">
          <h3>
            Acompanhamento
          </h3>

          <p>
            {obterSubStatus(
              item
            )}
          </p>
        </div>

        {item.auditoria ? (
          <div className="amc-drawer-section">
            <h3>
              Auditoria
            </h3>

            <p>
              {item.auditoria
                ?.observacao_auditor ||
                item.auditoria
                  ?.mensagem_para_morador ||
                "Nenhuma observação registrada."}
            </p>
          </div>
        ) : null}

        {item.convite
          ?.observacoes ? (
          <div className="amc-drawer-section">
            <h3>
              Observações do convite
            </h3>

            <p>
              {
                item.convite
                  .observacoes
              }
            </p>
          </div>
        ) : null}
      </aside>
    </>
  );
}

function ModalConfirmarReenvio({
  item,
  onClose,
  onConfirmar,
  processando = false,
}) {
  if (!item) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="amc-drawer-backdrop"
        onClick={onClose}
        aria-label="Cancelar reenvio"
      />

      <aside className="amc-confirm-modal">
        <div className="amc-confirm-header">
          <div>
            <span>
              Confirmação de Reenvio
            </span>

            <h2>
              Reenviar Convite
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={
              processando
            }
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="amc-confirm-section">
          <h3>
            Morador
          </h3>

          <p>
            <strong>
              {item.nome}
            </strong>

            <br />

            {item.email}

            <br />

            Apto {item.unidade} —{" "}
            {item.torre}
          </p>
        </div>

        <div className="amc-confirm-section">
          <h3>
            Como funcionará o reenvio
          </h3>

          <p>
            Ao confirmar, o convite será
            programado para envio pelo Sistema
            Chegou<span className="amc-orange">!</span>.
            O envio é feito automaticamente,
            respeitando o limite e o horário
            configurados para o condomínio.
          </p>
        </div>

        <div className="amc-confirm-actions">
          <button
            type="button"
            className="amc-btn amc-btn-outline"
            onClick={onClose}
            disabled={
              processando
            }
          >
            Cancelar
          </button>

          <button
            type="button"
            className="amc-btn amc-btn-primary"
            onClick={
              onConfirmar
            }
            disabled={
              processando
            }
          >
            {processando
              ? "Preparando novo envio..."
              : "Confirmar Reenvio"}
          </button>
        </div>
      </aside>
    </>
  );
}

export default function AuditoriaMoradoresConvite({
  perfil,
  onNavigate,
}) {
  const condominioId =
    perfil?.condominio_id ||
    perfil?.condominio_atual_id ||
    perfil?.usuario_condominio
      ?.condominio_id ||
    null;

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    ultimaAtualizacao,
    setUltimaAtualizacao,
  ] = useState(null);

  const [
    erro,
    setErro,
  ] = useState("");

  const [
    registros,
    setRegistros,
  ] = useState([]);

  const [
    resumo,
    setResumo,
  ] = useState({
    convitesEnviados: 0,
    aguardandoAbertura: 0,
    emPreenchimento: 0,
    aguardandoAuditoria: 0,
    aprovados: 0,
    reprovadosBloqueados: 0,
  });

  const [
    limiteEnvio,
    setLimiteEnvio,
  ] = useState({
    convites: {
      usados: 0,
      limite: 40,
    },

    confirmacoes: {
      usados: 0,
      limite: 20,
    },
  });

  const [
    torres,
    setTorres,
  ] = useState([]);

  /*
   * Busca digitada ≠ busca aplicada.
   *
   * Isso elimina o segundo carregarDados()
   * disparado na montagem.
   */
  const [
    busca,
    setBusca,
  ] = useState("");

  const [
    buscaAplicada,
    setBuscaAplicada,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState("TODOS");

  const [
    torre,
    setTorre,
  ] = useState("TODAS");

  const [
    unidade,
    setUnidade,
  ] = useState("TODAS");

  const hojeISO =
    new Date()
      .toISOString()
      .slice(0, 10);

  const [
    dataInicio,
    setDataInicio,
  ] = useState("");

  const [
    dataFim,
    setDataFim,
  ] = useState(
    hojeISO
  );

  const [
    pagina,
    setPagina,
  ] = useState(1);

  const [
    linhasPorPagina,
    setLinhasPorPagina,
  ] = useState(10);

  const [
    possuiProxima,
    setPossuiProxima,
  ] = useState(false);

  const [
    totalReferencia,
    setTotalReferencia,
  ] = useState(0);

  const [
    menuAberto,
    setMenuAberto,
  ] = useState(null);

  const [
    infoAberta,
    setInfoAberta,
  ] = useState(false);

  const [
    detalheSelecionado,
    setDetalheSelecionado,
  ] = useState(null);

  const [
    tituloDetalhe,
    setTituloDetalhe,
  ] = useState(
    "Detalhes do Convite"
  );

  const [
    carregandoDetalhe,
    setCarregandoDetalhe,
  ] = useState(false);

  const [
    reenvioSelecionado,
    setReenvioSelecionado,
  ] = useState(null);

  const [
    processandoAcao,
    setProcessandoAcao,
  ] = useState(false);

  const [
    modoSelecao,
    setModoSelecao,
  ] = useState(null);

  const [
    selecionados,
    setSelecionados,
  ] = useState([]);

  const [
    progressoEnvio,
    setProgressoEnvio,
  ] = useState(null);

  const [
    refreshToken,
    setRefreshToken,
  ] = useState(0);

  /*
   * ==========================================================
   * DEBOUNCE DA BUSCA
   * ==========================================================
   */
  useEffect(() => {
    const timeout =
      setTimeout(() => {
        setBuscaAplicada(
          busca.trim()
        );

        setPagina(1);
      }, 450);

    return () =>
      clearTimeout(timeout);
  }, [busca]);

  /*
   * ==========================================================
   * DADOS ESTÁVEIS
   * ==========================================================
   *
   * Torres e limites não precisam ser buscados novamente
   * toda vez que o usuário troca página ou digita uma busca.
   */
  useEffect(() => {
    if (!condominioId) {
      return;
    }

    let ativo = true;

    async function carregarContexto() {
      try {
        const [
          torresAtual,
          limiteAtual,
        ] =
          await Promise.all([
            buscarTorresAuditoriaMoradores({
              condominioId,
            }),

            obterLimiteEnvioDiario({
              condominioId,
            }),
          ]);

        if (!ativo) {
          return;
        }

        setTorres(
          torresAtual
        );

        setLimiteEnvio(
          limiteAtual
        );
      } catch (error) {
        console.error(
          "Erro ao carregar contexto dos convites:",
          error
        );
      }
    }

    carregarContexto();

    return () => {
      ativo = false;
    };
  }, [
    condominioId,
    refreshToken,
  ]);

  /*
   * ==========================================================
   * LISTAGEM + RESUMO
   * ==========================================================
   *
   * Um único effect.
   *
   * Não existe mais:
   *
   * effect dos filtros
   * +
   * effect inicial da busca
   *
   * disparando a mesma carga duas vezes.
   */
  useEffect(() => {
    if (!condominioId) {
      setErro(
        "Condomínio autenticado não encontrado."
      );

      setCarregando(false);

      return;
    }

    let ativo = true;

    async function carregar() {
      try {
        setCarregando(true);
        setErro("");

        const [
          listaAtual,
          resumoAtual,
        ] =
          await Promise.all([
            listarAuditoriaConvitesMoradores({
              condominioId,
              busca:
                buscaAplicada,
              status,
              torre,
              unidade,
              dataInicio,
              dataFim,
              pagina,
              limite:
                linhasPorPagina,
            }),

            obterResumoAuditoriaConvitesMoradores({
              condominioId,
            }),
          ]);

        if (!ativo) {
          return;
        }

        setRegistros(
          listaAtual.registros ||
            []
        );

        setPossuiProxima(
          Boolean(
            listaAtual.possuiProxima
          )
        );

        setTotalReferencia(
          Number(
            listaAtual.total ||
              0
          )
        );

        setResumo(
          resumoAtual
        );

        setUltimaAtualizacao(
          new Date()
        );
      } catch (error) {
        if (!ativo) {
          return;
        }

        console.error(error);

        setErro(
          error?.message ||
            "Erro ao carregar auditoria de convites."
        );
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [
    condominioId,
    buscaAplicada,
    status,
    torre,
    unidade,
    dataInicio,
    dataFim,
    pagina,
    linhasPorPagina,
    refreshToken,
  ]);

  /*
   * ==========================================================
   * ESC
   * ==========================================================
   */
  useEffect(() => {
    function handleEsc(event) {
      if (
        event.key !== "Escape"
      ) {
        return;
      }

      setMenuAberto(null);
      setDetalheSelecionado(
        null
      );

      if (
        !processandoAcao &&
        !carregandoDetalhe
      ) {
        setReenvioSelecionado(
          null
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleEsc
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEsc
      );
    };
  }, [
    processandoAcao,
    carregandoDetalhe,
  ]);

  const unidades =
    useMemo(() => {
      return [
        ...new Set(
          registros
            .map(
              (item) =>
                item.unidade
            )
            .filter(Boolean)
            .filter(
              (valor) =>
                valor !== "—"
            )
        ),
      ].sort(
        (a, b) =>
          String(
            a
          ).localeCompare(
            String(b)
          )
      );
    }, [registros]);

  const numeroInicial =
    registros.length
      ? (pagina - 1) *
          linhasPorPagina +
        1
      : 0;

  const numeroFinal =
    registros.length
      ? numeroInicial +
        registros.length -
        1
      : 0;

  function atualizar() {
    setRefreshToken(
      (atual) =>
        atual + 1
    );
  }

  function limparSelecao() {
    setModoSelecao(null);
    setSelecionados([]);
  }

  function podeSelecionar(
    item
  ) {
    return podeEnviarConvite(
      item
    );
  }

  function alternarSelecionado(
    item
  ) {
    if (
      !podeSelecionar(item)
    ) {
      toast(
        "Este registro não está disponível para envio.",
        {
          icon: "⚠️",
        }
      );

      return;
    }

    setSelecionados(
      (atuais) => {
        const id =
          item.pre_cadastro_id;

        const jaExiste =
          atuais.includes(id);

        if (jaExiste) {
          return atuais.filter(
            (atual) =>
              atual !== id
          );
        }

        if (
          modoSelecao ===
            "individual" &&
          atuais.length >= 1
        ) {
          toast(
            "Para enviar mais de um convite, use Enviar em Lote.",
            {
              icon: "📦",
            }
          );

          return atuais;
        }

        return [
          ...atuais,
          id,
        ];
      }
    );
  }

  function selecionarPagina() {
    if (
      modoSelecao !== "lote"
    ) {
      return;
    }

    const elegiveis =
      registros.filter(
        podeSelecionar
      );

    if (
      !elegiveis.length
    ) {
      toast(
        "Não há registros disponíveis para envio nesta página.",
        {
          icon: "⚠️",
        }
      );

      return;
    }

    setSelecionados(
      (atuais) => {
        const novos =
          elegiveis
            .map(
              (item) =>
                item.pre_cadastro_id
            )
            .filter(
              (id) =>
                !atuais.includes(
                  id
                )
            );

        return [
          ...atuais,
          ...novos,
        ];
      }
    );
  }

  async function confirmarEnvioSelecionados() {
    const selecionadosPagina =
      registros.filter(
        (item) =>
          selecionados.includes(
            item.pre_cadastro_id
          )
      );

    if (
      modoSelecao ===
        "individual" &&
      selecionadosPagina.length !==
        1
    ) {
      toast(
        "Selecione exatamente um morador.",
        {
          icon: "✉️",
        }
      );

      return;
    }

    if (
      modoSelecao === "lote" &&
      selecionadosPagina.length <
        2
    ) {
      toast(
        "Selecione pelo menos dois moradores.",
        {
          icon: "📦",
        }
      );

      return;
    }

    if (
      selecionadosPagina.length >
      30
    ) {
      toast(
        "O lote permite no máximo 30 convites.",
        {
          icon: "⚠️",
        }
      );

      return;
    }

    try {
      setProcessandoAcao(true);

      setProgressoEnvio({
        aberto: true,
        bloqueado: true,
        total:
          selecionadosPagina.length,
        processados: 0,
        sucesso: 0,
        erro: 0,
        finalizado: false,
        titulo:
          "Programando convites para envio",
        mensagem:
          "Os convites serão enviados automaticamente, respeitando o limite e o horário configurados.",
      });

      let sucesso = 0;
      let erro = 0;

      for (
        let index = 0;
        index <
        selecionadosPagina.length;
        index += 1
      ) {
        const registro =
          selecionadosPagina[
            index
          ];

        try {
          await enviarConviteMoradorAuditoria({
            perfil,
            registro,
            enviarAgora: false,
            tipoEnvio:
              modoSelecao ===
              "individual"
                ? "individual"
                : "lote",
          });

          sucesso += 1;
        } catch (errorAtual) {
          console.error(
            "Erro ao programar envio do convite:",
            errorAtual
          );

          erro += 1;
        }

        setProgressoEnvio(
          (atual) => ({
            ...atual,
            processados:
              index + 1,
            sucesso,
            erro,
          })
        );
      }

      setProgressoEnvio(
        (atual) => ({
          ...atual,
          bloqueado: false,
          finalizado: true,
          sucesso,
          erro,
          titulo:
            erro === 0
              ? "Convites programados para envio"
              : "Processamento concluído com atenção",
          mensagem:
            erro === 0
              ? `${sucesso} convite(s) programado(s) para envio.`
              : `${sucesso} programado(s); ${erro} não programado(s).`,
        })
      );

      limparSelecao();

      /*
       * Uma única revalidação controlada após mutação.
       */
      atualizar();
    } finally {
      setProcessandoAcao(false);
    }
  }

  async function abrirDetalhe(
    item,
    titulo
  ) {
    try {
      setCarregandoDetalhe(
        true
      );

      const detalhe =
        await obterDetalheAuditoriaConviteMorador({
          condominioId,
          conviteId:
            item.convite_id,
          preCadastroId:
            item.pre_cadastro_id,
        });

      setTituloDetalhe(
        titulo
      );

      setDetalheSelecionado(
        detalhe
      );
    } catch (error) {
      toast.error(
        error?.message ||
          "Não foi possível carregar o detalhe."
      );
    } finally {
      setCarregandoDetalhe(
        false
      );
    }
  }

  async function handleAcaoLinha(
    acao,
    item
  ) {
    if (
      acao ===
      "Enviar Convite"
    ) {
      try {
        setProcessandoAcao(
          true
        );

        await enviarConviteMoradorAuditoria({
          perfil,
          registro: item,
          enviarAgora: false,
          tipoEnvio:
            "individual",
        });

        toast.success(
          "Convite programado para envio."
        );

        atualizar();
      } catch (error) {
        toast.error(
          error?.message ||
            "Não foi possível programar o envio do convite."
        );
      } finally {
        setProcessandoAcao(
          false
        );
      }

      return;
    }

    if (
      acao ===
      "Tentar Enviar Novamente"
    ) {
      try {
        setProcessandoAcao(
          true
        );

        await enviarConviteMoradorAuditoria({
          perfil,
          registro: item,
          enviarAgora: false,
          tipoEnvio: "reenvio",
        });

        toast.success(
          "Convite programado para novo envio."
        );

        atualizar();
      } catch (error) {
        toast.error(
          error?.message ||
            "Não foi possível programar o novo envio do convite."
        );
      } finally {
        setProcessandoAcao(
          false
        );
      }

      return;
    }

    if (
      acao ===
      "Reenviar Convite"
    ) {
      setReenvioSelecionado(
        item
      );

      return;
    }

    if (
      acao ===
      "Abrir Auditoria"
    ) {
      onNavigate?.(
        "admin-auditoria-moradores-auditoria"
      );

      return;
    }

    if (
      [
        "Visualizar Andamento",
        "Visualizar Convite",
        "Visualizar Cadastro",
        "Visualizar Cadastro Completo",
        "Visualizar Usuário Criado",
        "Visualizar Histórico",
        "Visualizar Motivo",
        "Visualizar Pendências",
        "Visualizar Risco",
        "Visualizar Histórico de Ações",
        "Corrigir e Enviar",
      ].includes(acao)
    ) {
      await abrirDetalhe(
        item,
        acao
      );

      return;
    }

    toast(
      `A ação “${acao}” ainda não está disponível nesta etapa.`,
      {
        icon: "⚙️",
      }
    );
  }

  async function confirmarReenvioConvite() {
    if (
      !reenvioSelecionado ||
      processandoAcao
    ) {
      return;
    }

    try {
      setProcessandoAcao(
        true
      );

      await enviarConviteMoradorAuditoria({
        perfil,
        registro:
          reenvioSelecionado,
        enviarAgora: false,
        tipoEnvio: "reenvio",
      });

      toast.success(
        "Convite programado para novo envio."
      );

      setReenvioSelecionado(
        null
      );

      atualizar();
    } catch (error) {
      toast.error(
        error?.message ||
          "Não foi possível programar o novo envio do convite."
      );
    } finally {
      setProcessandoAcao(
        false
      );
    }
  }

  function handleAcaoTopo(
    acao
  ) {
    if (
      acao ===
      "Enviar Convite"
    ) {
      setStatus(
        "TODOS"
      );

      setPagina(1);

      setModoSelecao(
        "individual"
      );

      setSelecionados([]);

      return;
    }

    if (
      acao ===
      "Enviar em Lote"
    ) {
      setStatus(
        "TODOS"
      );

      setPagina(1);

      setModoSelecao(
        "lote"
      );

      setSelecionados([]);

      return;
    }

    if (
      acao ===
      "Histórico de Ações"
    ) {
      onNavigate?.(
        "admin-auditoria-moradores-historico"
      );
    }
  }

  function alterarDataInicio(
    valor
  ) {
    if (
      valor &&
      valor > hojeISO
    ) {
      toast(
        "A data inicial não pode ser futura.",
        {
          icon: "📅",
        }
      );

      return;
    }

    setDataInicio(valor);
    setPagina(1);

    if (
      dataFim &&
      valor &&
      dataFim < valor
    ) {
      setDataFim(valor);
    }
  }

  function alterarDataFim(
    valor
  ) {
    if (
      valor &&
      valor > hojeISO
    ) {
      toast(
        "A data final não pode ser futura.",
        {
          icon: "📅",
        }
      );

      return;
    }

    if (
      dataInicio &&
      valor &&
      valor < dataInicio
    ) {
      toast(
        "A data final não pode ser anterior à data inicial.",
        {
          icon: "📅",
        }
      );

      return;
    }

    setDataFim(valor);
    setPagina(1);
  }

  function limparPeriodo() {
    setDataInicio("");
    setDataFim(hojeISO);
    setPagina(1);
  }

  function exportarListaConvites() {
    if (
      !registros.length
    ) {
      toast.error(
        "Não há dados na página atual para exportar."
      );

      return;
    }

    const dados =
      registros.map(
        (item) => ({
          "Identificador":
            item.business_id ||
            "—",

          Nome:
            item.nome ||
            "—",

          Torre:
            item.torre ||
            "—",

          Unidade:
            item.unidade ||
            "—",

          "E-mail":
            item.email ||
            "—",

          Telefone:
            item.telefone ||
            "—",

          "Status do Convite":
            formatarStatusTela(
              item.status_sistema
            ),

          "Situação detalhada":
            obterSubStatus(
              item
            ),

          "Percentual Preenchimento":
            `${item.percentual_preenchimento || 0}%`,

          "Última Atualização":
            formatarDataHora(
              item.ultima_atividade_em
            ),

          "Enviado em":
            formatarDataHora(
              item.enviado_em
            ),

          "Canal de Envio":
            formatarCanalEnvio(
              item
            ),

          "Validade do convite":
            formatarData(
              item.token_expira_em
            ),
        })
      );

    const worksheet =
      XLSX.utils.json_to_sheet(
        dados
      );

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils
      .book_append_sheet(
        workbook,
        worksheet,
        "Convites"
      );

    XLSX.writeFile(
      workbook,
      gerarNomeArquivoConvites()
    );

    toast.success(
      "Página atual exportada com sucesso."
    );
  }

  function fecharProgressoEnvio() {
    if (
      progressoEnvio?.bloqueado
    ) {
      return;
    }

    setProgressoEnvio(
      null
    );
  }

  return (
    <div className="amc-page">
      <div className="amc-main">
        <div className="amc-breadcrumb">
          <span>
            Auditoria
          </span>

          <ChevronRight
            size={14}
          />

          <span>
            Moradores
          </span>

          <ChevronRight
            size={14}
          />

          <strong>
            Convite
          </strong>
        </div>

        <div className="amc-header">
          <div>
            <h1>
              Auditoria / Convite do Morador

              <button
                type="button"
                className="amc-title-info"
                onClick={() =>
                  setInfoAberta(
                    true
                  )
                }
                aria-label="Informações sobre a tela"
              >
                <Info
                  size={17}
                />
              </button>
            </h1>

            <p>
              Acompanhe o preparo, envio, abertura e
              andamento dos convites dos moradores
              pelo Sistema
              Chegou
              <span className="amc-orange">
                !
              </span>
              .
            </p>
          </div>

          <div className="amc-header-actions">
            <button
              type="button"
              className="amc-btn amc-btn-outline"
              onClick={
                atualizar
              }
              disabled={
                carregando
              }
            >
              <RefreshCw
                size={17}
                className={
                  carregando
                    ? "amc-spin"
                    : ""
                }
              />

              Atualizar
            </button>

            <button
              type="button"
              className="amc-btn amc-btn-outline"
              onClick={() =>
                handleAcaoTopo(
                  "Enviar Convite"
                )
              }
            >
              <Send
                size={17}
              />

              Enviar Convite
            </button>

            <button
              type="button"
              className="amc-btn amc-btn-primary"
              onClick={() =>
                handleAcaoTopo(
                  "Enviar em Lote"
                )
              }
            >
              <DatabaseZap
                size={17}
              />

              Enviar em Lote
            </button>
          </div>
        </div>

        <div className="amc-tabs">
          <button
            type="button"
            onClick={() =>
              onNavigate?.(
                "admin-auditoria-moradores-pre-cadastro"
              )
            }
          >
            Pré-Cadastro
          </button>

          <button
            type="button"
            className="active"
          >
            Convite
          </button>

          <button
            type="button"
            onClick={() =>
              onNavigate?.(
                "admin-auditoria-moradores-auditoria"
              )
            }
          >
            Auditoria
          </button>

          <button
            type="button"
            onClick={() =>
              onNavigate?.(
                "admin-auditoria-moradores-historico"
              )
            }
          >
            Histórico
          </button>
        </div>

        <section className="amc-kpis">
          <KpiCard
            icon={Send}
            titulo="Convites Enviados"
            valor={
              resumo.convitesEnviados
            }
            detalhe="Status atual"
            variante="azul"
          />
        </section>

        <section className="amc-table-card">
          <div className="amc-filters">
            <div className="amc-search">
              <Search
                size={18}
              />

              <input
                value={busca}
                onChange={(
                  event
                ) =>
                  setBusca(
                    event.target
                      .value
                  )
                }
                placeholder="Buscar por nome, e-mail, unidade ou ID do morador..."
              />
            </div>

            <label>
              <span>
                Status do Convite
              </span>

              <select
                value={status}
                onChange={(
                  event
                ) => {
                  setStatus(
                    event.target
                      .value
                  );

                  setPagina(1);
                }}
              >
                {STATUS_FILTROS.map(
                  (opcao) => (
                    <option
                      key={
                        opcao.value
                      }
                      value={
                        opcao.value
                      }
                    >
                      {
                        opcao.label
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>
                Torre
              </span>

              <select
                value={torre}
                onChange={(
                  event
                ) => {
                  setTorre(
                    event.target
                      .value
                  );

                  setPagina(1);
                }}
              >
                <option value="TODAS">
                  Todas
                </option>

                {torres.map(
                  (item) => (
                    <option
                      key={
                        item.id
                      }
                      value={
                        item.nome
                      }
                    >
                      {
                        item.nome
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>
                Unidade
              </span>

              <select
                value={
                  unidade
                }
                onChange={(
                  event
                ) => {
                  setUnidade(
                    event.target
                      .value
                  );

                  setPagina(1);
                }}
              >
                <option value="TODAS">
                  Todas
                </option>

                {unidades.map(
                  (item) => (
                    <option
                      key={
                        item
                      }
                      value={
                        item
                      }
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>
                De
              </span>

              <input
                type="date"
                className="amc-date-input"
                value={
                  dataInicio
                }
                max={
                  hojeISO
                }
                onChange={(
                  event
                ) =>
                  alterarDataInicio(
                    event.target
                      .value
                  )
                }
              />
            </label>

            <label>
              <span>
                Até
              </span>

              <input
                type="date"
                className="amc-date-input"
                value={
                  dataFim
                }
                min={
                  dataInicio ||
                  undefined
                }
                max={
                  hojeISO
                }
                onChange={(
                  event
                ) =>
                  alterarDataFim(
                    event.target
                      .value
                  )
                }
              />
            </label>

            <button
              type="button"
              className="amc-filter-extra"
              onClick={
                limparPeriodo
              }
            >
              Limpar
            </button>
          </div>

          {erro ? (
            <div className="amc-error">
              {erro}
            </div>
          ) : null}

          {modoSelecao ? (
            <div className="amc-selection-bar">
              <div>
                <strong>
                  {modoSelecao ===
                  "individual"
                    ? "Enviar para um morador"
                    : "Enviar para vários moradores"}
                </strong>

                <span>
                  {modoSelecao ===
                  "individual"
                    ? selecionados.length === 1
                      ? "1 morador selecionado"
                      : "Selecione apenas 1 morador"
                    : `${selecionados.length} morador(es) selecionado(s)`}
                </span>
              </div>

              <div className="amc-selection-actions">
                {modoSelecao ===
                "lote" ? (
                  <button
                    type="button"
                    className="amc-btn amc-btn-outline"
                    onClick={
                      selecionarPagina
                    }
                  >
                    Selecionar página
                  </button>
                ) : null}

                <button
                  type="button"
                  className="amc-btn amc-btn-outline"
                  onClick={
                    limparSelecao
                  }
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="amc-btn amc-btn-primary"
                  disabled={
                    processandoAcao ||
                    (modoSelecao ===
                      "individual"
                      ? selecionados.length !== 1
                      : selecionados.length < 2)
                  }
                  onClick={
                    confirmarEnvioSelecionados
                  }
                >
                  {processandoAcao
                    ? "Preparando..."
                    : modoSelecao ===
                      "individual"
                    ? "Enviar Convite"
                    : "Enviar Convites"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="amc-table-wrap">
            <table className="amc-table">
              <thead>
                <tr>
                  {modoSelecao ? (
                    <th>
                      Selecionar
                    </th>
                  ) : null}

                  <th>
                    Morador
                  </th>

                  <th>
                    Unidade
                  </th>

                  <th>
                    E-mail
                  </th>

                  <th>
                    Status do Convite
                  </th>

                  <th>
                    Última Atualização
                  </th>

                  <th>
                    Enviado em
                  </th>

                  <th>
                    Validade do convite
                  </th>

                  <th>
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {carregando ? (
                  <tr>
                    <td
                      colSpan={
                        modoSelecao
                          ? 9
                          : 8
                      }
                    >
                      <div className="amc-loading">
                        <RefreshCw
                          size={18}
                          className="amc-spin"
                        />

                        Carregando convites...
                      </div>
                    </td>
                  </tr>
                ) : registros.length ? (
                  registros.map(
                    (item) => (
                      <tr
                        key={
                          item.id
                        }
                      >
                        {modoSelecao ? (
                          <td>
                            <input
                              type="checkbox"
                              checked={selecionados.includes(
                                item.pre_cadastro_id
                              )}
                              disabled={
                                !podeSelecionar(
                                  item
                                ) ||
                                (modoSelecao ===
                                  "individual" &&
                                  selecionados.length ===
                                    1 &&
                                  !selecionados.includes(
                                    item.pre_cadastro_id
                                  ))
                              }
                              onChange={() =>
                                alternarSelecionado(
                                  item
                                )
                              }
                            />
                          </td>
                        ) : null}

                        <td>
                          <div className="amc-person">
                            <div className="amc-avatar">
                              {obterIniciais(
                                item.nome
                              )}
                            </div>

                            <div>
                              <strong>
                                {
                                  item.nome
                                }
                              </strong>

                              <span>
                                Identificador:{" "}
                                {item.business_id ||
                                  "—"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <strong>
                            Apto{" "}
                            {
                              item.unidade
                            }
                          </strong>

                          <span>
                            {
                              item.torre
                            }
                          </span>
                        </td>

                        <td>
                          {
                            item.email
                          }
                        </td>

                        <td>
                          <div className="amc-status-cell">
                            <span
                              className={`amc-status amc-status-${classeStatus(
                                obterStatusSistema(item)
                              )}`}
                            >
                              {formatarStatusTela(
                                obterStatusSistema(item)
                              )}
                            </span>

                            <small>
                              {obterSubStatus(
                                item
                              )}
                            </small>
                          </div>
                        </td>

                        <td>
                          {formatarUltimaAtividade(
                            item.ultima_atividade_em
                          )}
                        </td>

                        <td>
                          <strong>
                            {formatarDataHora(
                              item.enviado_em
                            )}
                          </strong>

                          <span>
                            {formatarCanalEnvio(
                              item
                            )}
                          </span>
                        </td>

                        <td>
                          <strong>
                            {formatarData(
                              item.token_expira_em
                            )}
                          </strong>

                          <span>
                            {calcularDiasRestantes(
                              item.token_expira_em
                            )}
                          </span>
                        </td>

                        <td>
                          <AcaoLinhaMenu
                            item={
                              item
                            }
                            aberto={
                              menuAberto ===
                              item.id
                            }
                            onToggle={
                              setMenuAberto
                            }
                            onAcao={
                              handleAcaoLinha
                            }
                          />
                        </td>
                      </tr>
                    )
                  )
                ) : (
                  <tr>
                    <td
                      colSpan={
                        modoSelecao
                          ? 9
                          : 8
                      }
                    >
                      <div className="amc-empty">
                        <strong>
                          Nenhum registro encontrado
                        </strong>

                        <p>
                          Não há registros compatíveis
                          com os filtros aplicados.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="amc-table-footer">
            <span>
              Mostrando{" "}
              {numeroInicial} a{" "}
              {numeroFinal} de até{" "}
              {Math.max(
                totalReferencia,
                numeroFinal
              )}{" "}
              registros
            </span>

            <div className="amc-pagination">
              <button
                type="button"
                disabled={
                  pagina === 1 ||
                  carregando
                }
                onClick={() =>
                  setPagina(
                    (atual) =>
                      Math.max(
                        1,
                        atual - 1
                      )
                  )
                }
              >
                <ChevronLeft
                  size={16}
                />
              </button>

              <strong>
                {pagina}
              </strong>

              <button
                type="button"
                disabled={
                  !possuiProxima ||
                  carregando
                }
                onClick={() =>
                  setPagina(
                    (atual) =>
                      atual + 1
                  )
                }
              >
                <ChevronRight
                  size={16}
                />
              </button>
            </div>

            <label className="amc-per-page">
              Linhas por página:

              <select
                value={
                  linhasPorPagina
                }
                onChange={(
                  event
                ) => {
                  setLinhasPorPagina(
                    Number(
                      event.target
                        .value
                    )
                  );

                  setPagina(
                    1
                  );
                }}
              >
                <option value={10}>
                  10
                </option>

                <option value={20}>
                  20
                </option>

                <option value={30}>
                  30
                </option>
              </select>
            </label>
          </div>
        </section>
      </div>

      <aside className="amc-rightbar">
        <section className="amc-side-card">
          <div className="amc-side-title">
            <Sparkles
              size={17}
            />

            <strong>
              Operações
            </strong>
          </div>

          <button
            type="button"
            className="amc-side-action"
            onClick={() =>
              handleAcaoTopo(
                "Enviar Convite"
              )
            }
          >
            <Send
              size={17}
            />

            <span>
              <strong>
                Enviar Convite
              </strong>

              <small>
                Escolher um morador
              </small>
            </span>
          </button>

          <button
            type="button"
            className="amc-side-action"
            onClick={() =>
              handleAcaoTopo(
                "Enviar em Lote"
              )
            }
          >
            <DatabaseZap
              size={17}
            />

            <span>
              <strong>
                Enviar em Lote
              </strong>

              <small>
                Escolher vários moradores
              </small>
            </span>
          </button>

          <button
            type="button"
            className="amc-side-action"
            onClick={
              exportarListaConvites
            }
          >
            <Download
              size={17}
            />

            <span>
              <strong>
                Exportar Página
              </strong>

              <small>
                Exportar dados carregados
              </small>
            </span>
          </button>

          <button
            type="button"
            className="amc-side-action"
            onClick={() =>
              handleAcaoTopo(
                "Histórico de Ações"
              )
            }
          >
            <Eye
              size={17}
            />

            <span>
              <strong>
                Histórico de Ações
              </strong>

              <small>
                Consultar ações registradas
              </small>
            </span>
          </button>
        </section>

        <section className="amc-side-card amc-side-card-orange amc-communication-premium">
          <div className="amc-side-title">
            <Info
              size={17}
            />

            <strong>
              Painel de Comunicados Chegou
              <span className="amc-orange">
                !
              </span>
            </strong>
          </div>

          <div className="amc-communication-box">
            <div className="amc-communication-orb" />

            <div>
              <strong>
                Comunicados do Módulo
              </strong>

              <p>
                Espaço reservado para avisos
                da Equipe Chegou! ou da Administração.
              </p>
            </div>
          </div>
        </section>

        <section className="amc-side-card">
          <h3>
            Limite de Envio (Diário)
          </h3>

          <div className="amc-limit-row">
            <div>
              <span>
                Convites de cadastro
              </span>

              <strong>
                {
                  limiteEnvio
                    .convites
                    .usados
                }{" "}
                /{" "}
                {
                  limiteEnvio
                    .convites
                    .limite
                }
              </strong>
            </div>

            <div className="amc-progress">
              <span
                style={{
                  width: `${calcularPercentual(
                    limiteEnvio
                      .convites
                      .usados,
                    limiteEnvio
                      .convites
                      .limite
                  )}%`,
                }}
              />
            </div>
          </div>

          <small>
            Horário de envio: 08h às 20h
            (Brasília)

            {ultimaAtualizacao ? (
              <>
                <br />

                Última atualização:{" "}
                {new Intl.DateTimeFormat(
                  "pt-BR",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                ).format(
                  ultimaAtualizacao
                )}
              </>
            ) : null}
          </small>
        </section>
      </aside>

      <DrawerRegistro
        item={
          detalheSelecionado
        }
        titulo={
          tituloDetalhe
        }
        onClose={() =>
          setDetalheSelecionado(
            null
          )
        }
      />

      <ModalConfirmarReenvio
        item={
          reenvioSelecionado
        }
        onClose={() => {
          if (
            !processandoAcao
          ) {
            setReenvioSelecionado(
              null
            );
          }
        }}
        onConfirmar={
          confirmarReenvioConvite
        }
        processando={
          processandoAcao
        }
      />

      {progressoEnvio?.aberto ? (
        <>
          <div className="amc-progress-backdrop" />

          <div
            className="amc-progress-modal"
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="amc-progress-close"
              onClick={
                fecharProgressoEnvio
              }
              disabled={
                progressoEnvio.bloqueado
              }
            >
              ×
            </button>

            <div className="amc-progress-modal-header">
              <strong>
                {
                  progressoEnvio.titulo
                }
              </strong>

              <span>
                {
                  progressoEnvio.mensagem
                }
              </span>
            </div>

            <div className="amc-progress-large">
              <span
                style={{
                  width: `${
                    progressoEnvio.total
                      ? Math.round(
                          (progressoEnvio.processados /
                            progressoEnvio.total) *
                            100
                        )
                      : 0
                  }%`,
                }}
              />
            </div>

            <div className="amc-progress-numbers">
              <strong>
                {progressoEnvio.total
                  ? Math.round(
                      (progressoEnvio.processados /
                        progressoEnvio.total) *
                        100
                    )
                  : 0}
                %
              </strong>

              <span>
                {
                  progressoEnvio.processados
                }{" "}
                de{" "}
                {
                  progressoEnvio.total
                }{" "}
                preparado(s)
              </span>
            </div>

            <div className="amc-progress-summary">
              <span>
                Programados:{" "}
                {
                  progressoEnvio.sucesso
                }
              </span>

              <span>
                Não programados:{" "}
                {
                  progressoEnvio.erro
                }
              </span>
            </div>
          </div>
        </>
      ) : null}

      {infoAberta ? (
        <>
          <button
            type="button"
            className="amc-drawer-backdrop"
            onClick={() =>
              setInfoAberta(
                false
              )
            }
          />

          <aside className="amc-drawer">
            <div className="amc-drawer-header">
              <div>
                <span>
                  Orientações da Tela
                </span>

                <h2>
                  Auditoria / Convite do Morador
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setInfoAberta(
                    false
                  )
                }
              >
                ×
              </button>
            </div>

            <div className="amc-drawer-section">
              <h3>
                Objetivo
              </h3>

              <p>
                Acompanhar cada convite desde o preparo
                até a conclusão do cadastro do morador,
                com acesso rápido às informações necessárias.
              </p>
            </div>

            <div className="amc-drawer-section">
              <h3>
                Envios de e-mail
              </h3>

              <p>
                Convites individuais ou em lote
                são programados para envio. O Sistema
                Chegou! realiza o envio automaticamente,
                no máximo um e-mail por minuto, respeitando
                o horário de envio configurado.
              </p>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}