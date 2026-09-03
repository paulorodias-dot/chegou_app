import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Boxes,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  LoaderCircle,
  MapPin,
  Package,
  PackageSearch,
  ScanLine,
  Search,
  Truck,
  UserRoundSearch,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  confirmarEntrada,
  localizarVolumeEntradaPorCodigo,
  obterContextoVolumeEntrada,
} from "../services/entradaService";

import {
  confirmarDisponibilizacaoRetirada,
  obterContextoDisponibilizacaoIndividual,
  obterContextoWhatsappAssistido,
  registrarWhatsappAssistido,
} from "../../disponibilizacao/services/disponibilizacaoService";

import {
  buscarDestinatariosEntrada,
  buscaDestinatarioSuficiente,
  obterMinimoBuscaDestinatario,
} from "../services/entradaIdentificacaoService";

import EntradaCapturaCodigo
  from "./EntradaCapturaCodigo";

import EntradaEtiquetaOCR
  from "./EntradaEtiquetaOCR";

import EntradaArmazenamento
  from "./EntradaArmazenamento";

import EntradaPonteMobile
  from "./EntradaPonteMobile";

import "./EntradaDrawer.css";

const TEMPO_DEBOUNCE_MS =
  450;

const TEMPO_FEEDBACK_SUCESSO_MS =
  850;

const ETAPA_OPERACIONAL = Object.freeze({
  LOCALIZACAO: "LOCALIZACAO",
  ENTRADA: "ENTRADA",
  ARMAZENAMENTO: "ARMAZENAMENTO",
  DISPONIBILIZACAO: "DISPONIBILIZACAO",
  POS_DISPONIBILIZACAO:
    "POS_DISPONIBILIZACAO",
  FINALIZADO: "FINALIZADO",
  REQUER_ATENCAO: "REQUER_ATENCAO",
});

// ============================================================
// SISTEMA CHEGOU!
// CENTRAL DE ENCOMENDAS — ENTRADA OFICIAL
//
// DRAWER OPERACIONAL
//
// Inclui:
// - visão do lote;
// - processamento por volume;
// - identificação automática;
// - identificação manual;
// - scanner;
// - OCR assistido;
// - matching OCR backend-driven;
// - confirmação produtiva;
// - armazenamento pós-Entrada;
// - Ponte Mobile Enterprise.
//
// REGRA:
// Ponte Mobile é recurso Enterprise.
// A prop enterpriseAtivo deve vir do contexto oficial da aplicação.
// ============================================================

// ============================================================
// HELPERS
// ============================================================

function textoOuNull(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const texto =
    String(
      value
    ).trim();

  return texto || null;
}

function capitalizarNome(
  value
) {
  const texto =
    textoOuNull(
      value
    );

  if (!texto) {
    return null;
  }

  return texto
    .toLocaleLowerCase(
      "pt-BR"
    )
    .replace(
      /(^|[\s'-])([\p{L}])/gu,
      (
        _,
        separador,
        letra
      ) =>
        `${separador}${letra.toLocaleUpperCase(
          "pt-BR"
        )}`
    );
}

function formatarTorreBloco({
  torre,
  torreIdentificador,
  bloco,
}) {
  const torreNome =
    capitalizarNome(
      torre
    );

  const identificador =
    textoOuNull(
      torreIdentificador
    );

  if (torreNome) {
    return identificador
      ? `${torreNome} • ${identificador}`
      : torreNome;
  }

  const blocoNome =
    capitalizarNome(
      bloco
    );

  return (
    blocoNome ||
    "—"
  );
}

function obterTipoLabel(
  tipo
) {
  switch (tipo) {
    case "DEPENDENTE":
      return "Dependente";

    case "MORADOR":
      return "Morador";

    default:
      return "Destinatário";
  }
}

function volumeConcluido(
  volume
) {
  return Boolean(
    volume
      ?.entradaOficial
      ?.realizada ===
      true ||
    volume?.situacao ===
      "ENTRADA_CONCLUIDA" ||
    volume?.situacao ===
      "PROMOVIDO"
  );
}

function obterStatusLote(
  lote,
  volumes
) {
  if (
    !Array.isArray(
      volumes
    ) ||
    volumes.length ===
      0
  ) {
    return (
      lote
        ?.situacaoLabel ||
      "Aguardando entrada"
    );
  }

  const concluidos =
    volumes.filter(
      volumeConcluido
    ).length;

  if (
    concluidos ===
    volumes.length
  ) {
    return "Processado";
  }

  if (
    concluidos > 0
  ) {
    return "Entrada parcial";
  }

  return (
    lote
      ?.situacaoLabel ||
    "Aguardando entrada"
  );
}

function criarChaveIdempotencia(
  volumeId
) {
  let nonce =
    null;

  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto
      .randomUUID ===
      "function"
  ) {
    nonce =
      crypto.randomUUID();
  } else {
    nonce =
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
  }

  return (
    `entrada-ui-` +
    `${volumeId}-` +
    `${nonce}`
  );
}

function formatarDataHoraEntradaWhatsapp(
  entradaConfirmadaEmLocal
) {
  const valor =
    textoOuNull(
      entradaConfirmadaEmLocal
    );

  if (!valor) {
    return {
      data: null,
      hora: null,
    };
  }

  const correspondencia =
    valor.match(
      /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/
    );

  if (!correspondencia) {
    return {
      data: null,
      hora: null,
    };
  }

  const [
    ,
    ano,
    mes,
    dia,
    hora,
    minuto,
  ] = correspondencia;

  return {
    data:
      `${dia}/${mes}/${ano}`,

    hora:
      `${hora}:${minuto}`,
  };
}

function montarMensagemWhatsappAssistido(
  contexto
) {
  const primeiroNome =
    textoOuNull(
      contexto
        ?.destinatarioPrimeiroNome
    ) ||
    "Morador";

  const numeroEncomenda =
    contexto
      ?.numeroEncomenda !==
      null &&
    contexto
      ?.numeroEncomenda !==
      undefined
      ? String(
          contexto.numeroEncomenda
        ).padStart(
          3,
          "0"
        )
      : "—";

  const nomeCondominio =
    textoOuNull(
      contexto
        ?.condominioNome
    ) ||
    "condomínio";

  const torre =
    textoOuNull(
      contexto
        ?.torreNome
    ) ||
    textoOuNull(
      contexto
        ?.torreIdentificador
    ) ||
    "—";

  const unidade =
    textoOuNull(
      contexto
        ?.unidadeNumero
    ) ||
    "—";

  const {
    data,
    hora,
  } =
    formatarDataHoraEntradaWhatsapp(
      contexto
        ?.entradaConfirmadaEmLocal
    );

  const entradaFormatada =
    data && hora
      ? `${data} às ${hora}`
      : "data registrada no sistema";

  return [
    `Olá, ${primeiroNome}! 👋`,
    "",
    `Sua encomenda *ID #${numeroEncomenda}* já está disponível para retirada no *${nomeCondominio}*.`,
    "",
    `🏢 *Torre/Unidade:* ${torre} / ${unidade}`,
    `📦 *Entrada confirmada:* ${entradaFormatada}`,
    "",
    "Na hora da retirada, acesse o *Aplicativo do Sistema Chegou!* e gere seu *Token/QR Code de retirada* para apresentar na Portaria.",
    "",
    `Portaria *${nomeCondominio}*.`,
    "Sistema Chegou! — Gestão Inteligente da Sua Encomenda.",
  ].join(
    "\n"
  );
}

function montarUrlWhatsappAssistido(
  contexto
) {
  if (
    contexto
      ?.whatsappDisponivel !==
      true
  ) {
    return null;
  }

  const telefoneE164 =
    textoOuNull(
      contexto
        ?.telefoneE164
    );

  if (!telefoneE164) {
    return null;
  }

  const telefoneSomenteDigitos =
    telefoneE164.replace(
      /\D/g,
      ""
    );

  if (!telefoneSomenteDigitos) {
    return null;
  }

  const mensagem =
    montarMensagemWhatsappAssistido(
      contexto
    );

  return (
    "https://wa.me/" +
    telefoneSomenteDigitos +
    "?text=" +
    encodeURIComponent(
      mensagem
    )
  );
}

// ============================================================
// COMPONENT
// ============================================================

export default function EntradaDrawer({
  open,
  context,
  onClose,
  onEntradaConfirmada,

  /*
   * ENTERPRISE
   *
   * Deve vir do contexto/plano oficial da aplicação.
   * Não inferimos assinatura pelo nome do condomínio.
   */
  enterpriseAtivo = false,
}) {
  const closeButtonRef =
    useRef(null);

  const searchInputRef =
    useRef(null);

  const newEntryInputRef =
    useRef(null);

  const armazenamentoRef =
    useRef(null);

  const requisicaoContextoRef =
    useRef(0);

  const requisicaoDisponibilizacaoRef =
    useRef(0);

  const requisicaoWhatsappRef =
    useRef(0);

  const requisicaoBuscaRef =
    useRef(0);

  const chaveConfirmacaoRef =
    useRef(null);

  // ==========================================================
  // CONTEXTO RAIZ
  // ==========================================================

  const modoContexto =
  context?.mode ===
    "NEW_ENTRY"
    ? "NEW_ENTRY"
    : context?.contextType ===
        "volume"
      ? "VOLUME"
      : context
        ? "LOT"
        : null;

const contextoRaizEhVolume =
  modoContexto ===
  "VOLUME";

const contextoRaizEhLote =
  modoContexto ===
  "LOT";

const contextoRaizEhNovaEntrada =
  modoContexto ===
  "NEW_ENTRY";

  const [
    volumeSelecionado,
    setVolumeSelecionado,
  ] =
    useState(null);

  useEffect(() => {
    setVolumeSelecionado(
      null
    );
  }, [
    open,
    context?.id,
    context
      ?.preRecebimentoId,
  ]);

  const visualizandoVolume =
    Boolean(
      contextoRaizEhVolume ||
        volumeSelecionado
    );

  const visualizandoLote =
    Boolean(
      contextoRaizEhLote &&
        !volumeSelecionado
    );

  const visualizandoNovaEntrada =
    Boolean(
      contextoRaizEhNovaEntrada
    );

  

  const contextoVolume =
    contextoRaizEhVolume
      ? context
      : volumeSelecionado;

  const podeVoltarAoLote =
    Boolean(
      contextoRaizEhLote &&
        volumeSelecionado
    );

  const volumeId =
    visualizandoVolume
      ? contextoVolume
          ?.volumeId ||
        contextoVolume?.id ||
        null
      : null;

  /*
   * Identidade autoritativa do lote
   * disponível no Drawer.
   *
   * Na visão do lote, context é o lote.
   * Em abertura direta por volume,
   * usamos o preRecebimentoId do contexto.
   */
  const preRecebimentoId =
    textoOuNull(
      context
        ?.preRecebimentoId
    ) ||
    textoOuNull(
      context
        ?.pre_recebimento_id
    ) ||
    (
      contextoRaizEhLote
        ? textoOuNull(
            context?.id
          )
        : null
    );

  const referenciaLote =
    textoOuNull(
      context
        ?.referenciaLote
    ) ||
    textoOuNull(
      context
        ?.referencia_lote
    ) ||
    null;

  // ==========================================================
  // SNAPSHOT LOCAL DO LOTE
  // ==========================================================

  const [
    volumesLoteLocal,
    setVolumesLoteLocal,
  ] =
    useState([]);

  useEffect(() => {
    if (
      contextoRaizEhLote &&
      Array.isArray(
        context?.volumes
      )
    ) {
      setVolumesLoteLocal(
        context.volumes
      );
    } else {
      setVolumesLoteLocal(
        []
      );
    }
  }, [
    contextoRaizEhLote,
    context?.id,
    context
      ?.preRecebimentoId,
    context?.volumes,
  ]);

  const volumesLote =
    contextoRaizEhLote
      ? volumesLoteLocal
      : [];

  // ==========================================================
  // CONTEXTO AUTORITATIVO
  // ==========================================================

  const [
    contextoOficial,
    setContextoOficial,
  ] =
    useState(null);

  const [
    loadingContexto,
    setLoadingContexto,
  ] =
    useState(false);

  const [
    erroContexto,
    setErroContexto,
  ] =
    useState(null);

  // ==========================================================
  // IDENTIFICAÇÃO MANUAL / OCR
  // ==========================================================

  const [
    termoBusca,
    setTermoBusca,
  ] =
    useState("");

  const [
    candidatos,
    setCandidatos,
  ] =
    useState([]);

  const [
    buscando,
    setBuscando,
  ] =
    useState(false);

  const [
    erroBusca,
    setErroBusca,
  ] =
    useState(null);

  const [
    consultaExecutada,
    setConsultaExecutada,
  ] =
    useState(false);

  const [
    candidatoSelecionado,
    setCandidatoSelecionado,
  ] =
    useState(null);

  /*
   * MANUAL | OCR | null
   *
   * Impede que o efeito da busca manual
   * destrua candidatos recebidos do
   * matching OCR.
   */
  const [
    origemCandidatos,
    setOrigemCandidatos,
  ] =
    useState(null);

  // ==========================================================
  // NOVA ENTRADA — LOCALIZAÇÃO LIVRE
  // ==========================================================

  const [
    codigoNovaEntrada,
    setCodigoNovaEntrada,
  ] =
    useState("");

  const [
    localizandoNovaEntrada,
    setLocalizandoNovaEntrada,
  ] =
    useState(false);

  const [
    erroNovaEntrada,
    setErroNovaEntrada,
  ] =
    useState(null);

  const [
    resultadoNovaEntrada,
    setResultadoNovaEntrada,
  ] =
    useState(null);

  const [
    etapaOperacional,
    setEtapaOperacional,
  ] =
    useState(null);

  const exibindoEtapaEntradaVolume =
    Boolean(
      visualizandoVolume &&
      (
        !contextoRaizEhNovaEntrada ||
        etapaOperacional ===
          ETAPA_OPERACIONAL.ENTRADA
      )
    );

  

    useEffect(() => {
      if (!open) {
        setEtapaOperacional(
          null
        );

        return;
      }

      if (
        contextoRaizEhNovaEntrada
      ) {
        setEtapaOperacional(
          ETAPA_OPERACIONAL
            .LOCALIZACAO
        );

        return;
      }

      if (
        contextoRaizEhVolume
      ) {
        setEtapaOperacional(
          ETAPA_OPERACIONAL
            .ENTRADA
        );

        return;
      }

      setEtapaOperacional(
        null
      );
    }, [
      open,
      modoContexto,
    ]);

  // ==========================================================
  // CAPTURA / CONFERÊNCIA DO CÓDIGO
  // ==========================================================

  const [
    conferenciaCodigo,
    setConferenciaCodigo,
  ] =
    useState(null);

  const [
    cameraCapturaAberta,
    setCameraCapturaAberta,
  ] =
    useState(false);

  const divergenciaCodigoAtiva =
    Boolean(
      conferenciaCodigo
        ?.divergente ===
        true
    );

  // ==========================================================
  // CONFIRMAÇÃO PRODUTIVA
  // ==========================================================

  const [
    confirmando,
    setConfirmando,
  ] =
    useState(false);

  const [
    confirmacaoSucesso,
    setConfirmacaoSucesso,
  ] =
    useState(null);

  const [
    erroConfirmacao,
    setErroConfirmacao,
  ] =
    useState(null);

  // ==========================================================
  // ARMAZENAMENTO PÓS-ENTRADA
  // ==========================================================

  const [
    armazenamentoEmCurso,
    setArmazenamentoEmCurso,
  ] =
    useState(false);

  const [
    armazenamentoConcluido,
    setArmazenamentoConcluido,
  ] =
    useState(null);

  const [
    estadoAcaoArmazenamento,
    setEstadoAcaoArmazenamento,
  ] =
    useState({
      podeContinuar: false,
      confirmando: false,
      carregando: false,
      localizacaoSelecionadaId:
        null,
    });

  // ==========================================================
  // DISPONIBILIZAÇÃO INDIVIDUAL
  // ==========================================================

  const [
    contextoDisponibilizacao,
    setContextoDisponibilizacao,
  ] =
    useState(null);

  const [
    loadingDisponibilizacao,
    setLoadingDisponibilizacao,
  ] =
    useState(false);

  const [
    erroDisponibilizacao,
    setErroDisponibilizacao,
  ] =
    useState(null);

  const [
    confirmandoDisponibilizacao,
    setConfirmandoDisponibilizacao,
  ] =
    useState(false);

  const [
    disponibilizacaoConcluida,
    setDisponibilizacaoConcluida,
  ] =
    useState(null);

  const [
    contextoWhatsapp,
    setContextoWhatsapp,
  ] =
    useState(null);

  const [
    loadingWhatsapp,
    setLoadingWhatsapp,
  ] =
    useState(false);

  const [
    erroWhatsapp,
    setErroWhatsapp,
  ] =
    useState(null);

  const [
    abrindoWhatsapp,
    setAbrindoWhatsapp,
  ] =
    useState(false);

  const [
    confirmandoEnvioWhatsapp,
    setConfirmandoEnvioWhatsapp,
  ] =
    useState(false);

  const [
    erroAcaoWhatsapp,
    setErroAcaoWhatsapp,
  ] =
    useState(null);

  // ==========================================================
  // RESET DO VOLUME
  // ==========================================================

  useEffect(() => {
    ++requisicaoBuscaRef.current;

    setTermoBusca("");
    setCandidatos([]);
    setOrigemCandidatos(
      null
    );

    setBuscando(false);
    setErroBusca(null);
    setConsultaExecutada(
      false
    );

    setCandidatoSelecionado(
      null
    );

    setConferenciaCodigo(
      null
    );

    setCameraCapturaAberta(
      false
    );

    setConfirmando(false);
    setConfirmacaoSucesso(
      null
    );
    setErroConfirmacao(
      null
    );

    setArmazenamentoEmCurso(
      false
    );

    setArmazenamentoConcluido(
      null
    );

    setEstadoAcaoArmazenamento({
      podeContinuar: false,
      confirmando: false,
      carregando: false,
      localizacaoSelecionadaId:
        null,
    });

    ++requisicaoDisponibilizacaoRef.current;

    setContextoDisponibilizacao(
      null
    );

    setLoadingDisponibilizacao(
      false
    );

    setErroDisponibilizacao(
      null
    );

    setConfirmandoDisponibilizacao(
      false
    );

    setDisponibilizacaoConcluida(
      null
    );

    ++requisicaoWhatsappRef.current;

    setContextoWhatsapp(
      null
    );

    setLoadingWhatsapp(
      false
    );

    setErroWhatsapp(
      null
    );

    setAbrindoWhatsapp(
      false
    );

    setConfirmandoEnvioWhatsapp(
      false
    );

    setErroAcaoWhatsapp(
      null
    );

    chaveConfirmacaoRef.current =
      null;
  }, [
    open,
    volumeId,
  ]);

  // ==========================================================
  // NAVEGAÇÃO
  // ==========================================================

  function voltarAoLote() {
    ++requisicaoBuscaRef.current;
    ++requisicaoContextoRef.current;

    setVolumeSelecionado(
      null
    );

    setContextoOficial(
      null
    );
    setErroContexto(null);
    setLoadingContexto(
      false
    );

    setTermoBusca("");
    setCandidatos([]);
    setOrigemCandidatos(
      null
    );

    setErroBusca(null);
    setBuscando(false);
    setConsultaExecutada(
      false
    );

    setCandidatoSelecionado(
      null
    );

    setConferenciaCodigo(
      null
    );

    setCameraCapturaAberta(
      false
    );

    setConfirmando(false);
    setConfirmacaoSucesso(
      null
    );
    setErroConfirmacao(
      null
    );

    setArmazenamentoEmCurso(
      false
    );

    setArmazenamentoConcluido(
      null
    );

    chaveConfirmacaoRef.current =
      null;
  }

  const operacaoEmCurso =
    loadingContexto ||
    buscando ||
    localizandoNovaEntrada ||
    confirmando ||
    armazenamentoEmCurso ||
    loadingDisponibilizacao ||
    confirmandoDisponibilizacao ||
    loadingWhatsapp ||
    abrindoWhatsapp ||
    confirmandoEnvioWhatsapp;

  const encomendaIdArmazenamento =
    textoOuNull(
      confirmacaoSucesso
        ?.encomenda_id
    );

  const condominioIdArmazenamento =
    textoOuNull(
      confirmacaoSucesso
        ?.condominio_id
    ) ||
    textoOuNull(
      contextoOficial
        ?.condominio_id
    ) ||
    textoOuNull(
      contextoVolume
        ?.condominioId
    ) ||
    textoOuNull(
      contextoVolume
        ?.condominio_id
    );

  const tipoEntregaArmazenamento =
    textoOuNull(
      confirmacaoSucesso
        ?.tipo_entrega
    );

  const contextoArmazenamentoPronto =
    Boolean(
      encomendaIdArmazenamento &&
      condominioIdArmazenamento &&
      tipoEntregaArmazenamento
    );

  const armazenamentoPendente =
    Boolean(
      confirmacaoSucesso &&
      contextoArmazenamentoPronto &&
      !armazenamentoConcluido
    );

  const retomandoArmazenamento =
    Boolean(
      contextoRaizEhNovaEntrada &&
      etapaOperacional ===
        ETAPA_OPERACIONAL.ARMAZENAMENTO &&
      resultadoNovaEntrada?.encomendaId &&
      (
        resultadoNovaEntrada?.condominioId ||
        context?.condominioId ||
        context?.condominio_id
      )
    );

  const armazenamentoNovaEntradaAtivo =
    Boolean(
      contextoRaizEhNovaEntrada &&
      (
        retomandoArmazenamento ||
        armazenamentoPendente
      )
    );

  const encomendaIdRetomadaArmazenamento =
    retomandoArmazenamento
      ? resultadoNovaEntrada.encomendaId
      : null;

  const condominioIdRetomadaArmazenamento =
    retomandoArmazenamento
      ? (
          resultadoNovaEntrada
            ?.condominioId ||
          context?.condominioId ||
          context?.condominio_id ||
          null
        )
      : null;

  const bloqueioArmazenamentoPendente =
    Boolean(
      armazenamentoPendente &&
      !contextoRaizEhNovaEntrada
    );

  const encomendaIdDisponibilizacao =
    contextoRaizEhNovaEntrada &&
    etapaOperacional ===
      ETAPA_OPERACIONAL.DISPONIBILIZACAO
      ? (
          textoOuNull(
            resultadoNovaEntrada
              ?.encomendaId
          ) ||
          textoOuNull(
            armazenamentoConcluido
              ?.encomendaId
          ) ||
          textoOuNull(
            armazenamentoConcluido
              ?.encomenda_id
          ) ||
          textoOuNull(
            confirmacaoSucesso
              ?.encomenda_id
          )
        )
      : null;

  const encomendaIdWhatsapp =
    contextoRaizEhNovaEntrada &&
    etapaOperacional ===
      ETAPA_OPERACIONAL.POS_DISPONIBILIZACAO
      ? (
          textoOuNull(
            resultadoNovaEntrada
              ?.encomendaId
          ) ||
          textoOuNull(
            disponibilizacaoConcluida
              ?.encomendaId
          ) ||
          textoOuNull(
            armazenamentoConcluido
              ?.encomendaId
          ) ||
          textoOuNull(
            armazenamentoConcluido
              ?.encomenda_id
          ) ||
          textoOuNull(
            confirmacaoSucesso
              ?.encomenda_id
          )
        )
      : null;

  const mensagemWhatsapp =
  contextoWhatsapp
    ? montarMensagemWhatsappAssistido(
        contextoWhatsapp
      )
    : null;

const urlWhatsapp =
  contextoWhatsapp
    ? montarUrlWhatsappAssistido(
        contextoWhatsapp
      )
    : null;

  // ==========================================================
  // CONTEXTO DA DISPONIBILIZAÇÃO INDIVIDUAL
  // ==========================================================

  useEffect(() => {
    if (
      !open ||
      !contextoRaizEhNovaEntrada ||
      etapaOperacional !==
        ETAPA_OPERACIONAL.DISPONIBILIZACAO ||
      !encomendaIdDisponibilizacao
    ) {
      ++requisicaoDisponibilizacaoRef.current;

      setContextoDisponibilizacao(
        null
      );

      setLoadingDisponibilizacao(
        false
      );

      setErroDisponibilizacao(
        null
      );

      return undefined;
    }

    const requisicaoId =
      ++requisicaoDisponibilizacaoRef.current;

    let ativo =
      true;

    async function carregar() {
      setLoadingDisponibilizacao(
        true
      );

      setErroDisponibilizacao(
        null
      );

      setContextoDisponibilizacao(
        null
      );

      try {
        const resultado =
          await obterContextoDisponibilizacaoIndividual({
            encomendaId:
              encomendaIdDisponibilizacao,
          });

        if (
          !ativo ||
          requisicaoId !==
            requisicaoDisponibilizacaoRef
              .current
        ) {
          return;
        }

        if (
          resultado?.encomendaId !==
            encomendaIdDisponibilizacao
        ) {
          throw new Error(
            "A encomenda retornada não corresponde à encomenda em processamento."
          );
        }

        setContextoDisponibilizacao(
          resultado
        );
      } catch (err) {
        if (
          !ativo ||
          requisicaoId !==
            requisicaoDisponibilizacaoRef
              .current
        ) {
          return;
        }

        setErroDisponibilizacao(
          err?.message ||
            "Não foi possível carregar os dados da disponibilização."
        );
      } finally {
        if (
          ativo &&
          requisicaoId ===
            requisicaoDisponibilizacaoRef
              .current
        ) {
          setLoadingDisponibilizacao(
            false
          );
        }
      }
    }

    carregar();

    return () => {
      ativo =
        false;

      ++requisicaoDisponibilizacaoRef.current;
    };
  }, [
    open,
    contextoRaizEhNovaEntrada,
    etapaOperacional,
    encomendaIdDisponibilizacao,
  ]);

  // ==========================================================
  // CONTEXTO DO WHATSAPP ASSISTIDO
  // ==========================================================

  useEffect(() => {
    if (
      !open ||
      !contextoRaizEhNovaEntrada ||
      etapaOperacional !==
        ETAPA_OPERACIONAL.POS_DISPONIBILIZACAO ||
      !encomendaIdWhatsapp
    ) {
      ++requisicaoWhatsappRef.current;

      setContextoWhatsapp(
        null
      );

      setLoadingWhatsapp(
        false
      );

      setErroWhatsapp(
        null
      );

      return undefined;
    }

    const requisicaoId =
      ++requisicaoWhatsappRef.current;

    let ativo =
      true;

    async function carregar() {
      setLoadingWhatsapp(
        true
      );

      setErroWhatsapp(
        null
      );

      setContextoWhatsapp(
        null
      );

      try {
        const resultado =
          await obterContextoWhatsappAssistido({
            encomendaId:
              encomendaIdWhatsapp,
          });

        if (
          !ativo ||
          requisicaoId !==
            requisicaoWhatsappRef.current
        ) {
          return;
        }

        if (
          resultado?.encomendaId !==
          encomendaIdWhatsapp
        ) {
          throw new Error(
            "A encomenda retornada pelo WhatsApp não corresponde à encomenda em processamento."
          );
        }

        setContextoWhatsapp(
          resultado
        );
      } catch (err) {
        if (
          !ativo ||
          requisicaoId !==
            requisicaoWhatsappRef.current
        ) {
          return;
        }

        setErroWhatsapp(
          err?.message ||
            "Não foi possível carregar os dados do WhatsApp."
        );
      } finally {
        if (
          ativo &&
          requisicaoId ===
            requisicaoWhatsappRef.current
        ) {
          setLoadingWhatsapp(
            false
          );
        }
      }
    }

    carregar();

    return () => {
      ativo =
        false;

      ++requisicaoWhatsappRef.current;
    };
  }, [
    open,
    contextoRaizEhNovaEntrada,
    etapaOperacional,
    encomendaIdWhatsapp,
  ]);

  async function handleAbrirWhatsapp() {
    if (
      abrindoWhatsapp ||
      !contextoWhatsapp?.encomendaId ||
      contextoWhatsapp
        ?.whatsappDisponivel !==
        true ||
      !urlWhatsapp
    ) {
      return;
    }

    /*
    * A janela é criada durante o clique para
    * evitar bloqueio de popup pelo navegador.
    *
    * Ela ainda NÃO aponta para o WhatsApp.
    * Primeiro persistimos a auditoria ABERTO.
    */
    const janelaWhatsapp =
      window.open(
        "about:blank",
        "_blank"
      );

    if (!janelaWhatsapp) {
      setErroAcaoWhatsapp(
        "O navegador bloqueou a abertura do WhatsApp. Autorize pop-ups para o Sistema Chegou! e tente novamente."
      );

      return;
    }

    try {
      janelaWhatsapp.opener =
        null;
    } catch {
      // Proteção adicional; não bloqueia o fluxo.
    }

    setAbrindoWhatsapp(
      true
    );

    setErroAcaoWhatsapp(
      null
    );

    try {
      await registrarWhatsappAssistido({
        encomendaId:
          contextoWhatsapp.encomendaId,

        operacao:
          "ABERTO",
      });

      /*
      * Após a auditoria, recarregamos o contexto
      * oficial. O frontend não inventa a flag
      * whatsappAberto.
      */
      const contextoAtualizado =
        await obterContextoWhatsappAssistido({
          encomendaId:
            contextoWhatsapp.encomendaId,
        });

      setContextoWhatsapp(
        contextoAtualizado
      );

      /*
      * Somente após o registro auditado
      * direcionamos a janela para o WhatsApp.
      */
      janelaWhatsapp.location.replace(
        urlWhatsapp
      );
    } catch (err) {
      try {
        janelaWhatsapp.close();
      } catch {
        // Sem ação adicional.
      }

      setErroAcaoWhatsapp(
        err?.message ||
          "Não foi possível preparar a abertura do WhatsApp."
      );
    } finally {
      setAbrindoWhatsapp(
        false
      );
    }
  }

  async function handleConfirmarEnvioWhatsapp() {
    if (
      confirmandoEnvioWhatsapp ||
      !contextoRaizEhNovaEntrada ||
      etapaOperacional !==
        ETAPA_OPERACIONAL.POS_DISPONIBILIZACAO ||
      !contextoWhatsapp?.encomendaId ||
      contextoWhatsapp?.whatsappAberto !== true ||
      contextoWhatsapp
        ?.whatsappEnvioConfirmadoOperador === true
    ) {
      return;
    }

    setConfirmandoEnvioWhatsapp(
      true
    );

    setErroAcaoWhatsapp(
      null
    );

    try {
      /*
      * Registra apenas a declaração operacional
      * do porteiro.
      *
      * Não significa entrega técnica,
      * recebimento ou leitura pelo destinatário.
      */
      await registrarWhatsappAssistido({
        encomendaId:
          contextoWhatsapp.encomendaId,

        operacao:
          "ENVIO_CONFIRMADO_OPERADOR",
      });


      /*
      * A partir daqui a confirmação já foi
      * persistida no backend.
      *
      * Invalidamos requisições do pacote anterior
      * antes de preparar a próxima Entrada.
      */
      ++requisicaoBuscaRef.current;
      ++requisicaoContextoRef.current;
      ++requisicaoDisponibilizacaoRef.current;
      ++requisicaoWhatsappRef.current;


      /*
      * Remove o volume atualmente processado.
      *
      * Isso também impede que dados do pacote
      * anterior contaminem a próxima leitura.
      */
      setVolumeSelecionado(
        null
      );

      setContextoOficial(
        null
      );

      setErroContexto(
        null
      );

      setLoadingContexto(
        false
      );


      /*
      * Limpa o contexto específico da nova
      * Entrada individual.
      */
      setCodigoNovaEntrada(
        ""
      );

      setLocalizandoNovaEntrada(
        false
      );

      setErroNovaEntrada(
        null
      );

      setResultadoNovaEntrada(
        null
      );


      /*
      * Limpa estados da Entrada anterior.
      */
      setTermoBusca(
        ""
      );

      setCandidatos(
        []
      );

      setOrigemCandidatos(
        null
      );

      setBuscando(
        false
      );

      setErroBusca(
        null
      );

      setConsultaExecutada(
        false
      );

      setCandidatoSelecionado(
        null
      );

      setConferenciaCodigo(
        null
      );

      setCameraCapturaAberta(
        false
      );

      setConfirmando(
        false
      );

      setConfirmacaoSucesso(
        null
      );

      setErroConfirmacao(
        null
      );


      /*
      * Limpa armazenamento e disponibilização
      * já persistidos do pacote anterior.
      */
      setArmazenamentoEmCurso(
        false
      );

      setArmazenamentoConcluido(
        null
      );

      setEstadoAcaoArmazenamento({
        podeContinuar: false,
        confirmando: false,
        carregando: false,
        localizacaoSelecionadaId:
          null,
      });

      setContextoDisponibilizacao(
        null
      );

      setLoadingDisponibilizacao(
        false
      );

      setErroDisponibilizacao(
        null
      );

      setConfirmandoDisponibilizacao(
        false
      );

      setDisponibilizacaoConcluida(
        null
      );


      /*
      * Limpa o WhatsApp do pacote concluído.
      */
      setContextoWhatsapp(
        null
      );

      setLoadingWhatsapp(
        false
      );

      setErroWhatsapp(
        null
      );

      setAbrindoWhatsapp(
        false
      );

      setErroAcaoWhatsapp(
        null
      );

      chaveConfirmacaoRef.current =
        null;


      /*
      * O Drawer NÃO fecha.
      *
      * Retorna diretamente ao início da Entrada
      * Individual para o próximo pacote.
      */
      setEtapaOperacional(
        ETAPA_OPERACIONAL.LOCALIZACAO
      );


      /*
      * Atualiza a fila sem transformar uma falha
      * de refresh em falha da confirmação já
      * persistida.
      */
      try {
        await onEntradaConfirmada?.();
      } catch (
        refreshError
      ) {
        console.warn(
          "[Entrada] WhatsApp confirmado pelo operador, mas a atualização da fila falhou.",
          refreshError
        );
      }


      /*
      * O próximo código já pode ser lido sem
      * clique adicional.
      */
      requestAnimationFrame(
        () => {
          newEntryInputRef
            .current
            ?.focus();
        }
      );
    } catch (err) {
      /*
      * Se o backend não confirmou a operação,
      * não limpamos o pacote atual.
      */
      setErroAcaoWhatsapp(
        err?.message ||
          "Não foi possível confirmar o envio pelo WhatsApp."
      );
    } finally {
      setConfirmandoEnvioWhatsapp(
        false
      );
    }
  }

  function fecharOuVoltar() {
    if (
      operacaoEmCurso ||
      cameraCapturaAberta ||
      bloqueioArmazenamentoPendente
    ) {
      return;
    }

    if (
      podeVoltarAoLote
    ) {
      voltarAoLote();
      return;
    }

    onClose?.();
  }

  async function handleConfirmarDisponibilizacao() {
    if (
      confirmandoDisponibilizacao ||
      !contextoDisponibilizacao?.encomendaId ||
      !contextoDisponibilizacao
        ?.elegivelDisponibilizacao
    ) {
      return;
    }

    setConfirmandoDisponibilizacao(
      true
    );

    setErroDisponibilizacao(
      null
    );

    try {
      const resultado =
        await confirmarDisponibilizacaoRetirada({
          encomendaId:
            contextoDisponibilizacao
              .encomendaId,
        });

      setDisponibilizacaoConcluida(
        resultado
      );

      setContextoDisponibilizacao(
        (atual) => ({
          ...atual,

          status:
            resultado?.status ||
            "DISPONIVEL_RETIRADA",

          disponibilizadoEm:
            resultado
              ?.disponibilizadoEm ||
            atual?.disponibilizadoEm ||
            null,

          disponibilizadoEmLocal:
            resultado
              ?.disponibilizadoEmLocal ||
            atual
              ?.disponibilizadoEmLocal ||
            null,

          elegivelDisponibilizacao:
            false,
        })
      );

      setEtapaOperacional(
        ETAPA_OPERACIONAL
          .POS_DISPONIBILIZACAO
      );

      try {
        await onEntradaConfirmada?.();
      } catch (refreshError) {
        console.warn(
          "[Entrada] Disponibilização concluída, mas a atualização da fila falhou.",
          refreshError
        );
      }
    } catch (err) {
      setErroDisponibilizacao(
        err?.message ||
          "Não foi possível disponibilizar a encomenda para retirada."
      );
    } finally {
      setConfirmandoDisponibilizacao(
        false
      );
    }
  }

  async function handleLocalizarNovaEntrada(
    event
  ) {
    event?.preventDefault?.();

    if (
      localizandoNovaEntrada
    ) {
      return;
    }

    const codigo =
      textoOuNull(
        codigoNovaEntrada
      );

    if (!codigo) {
      setErroNovaEntrada(
        "Leia ou informe o código da encomenda."
      );

      requestAnimationFrame(
        () => {
          newEntryInputRef
            .current
            ?.focus();
        }
      );

      return;
    }

    const condominioId =
      textoOuNull(
        context?.condominioId
      ) ||
      textoOuNull(
        context?.condominio_id
      );

    if (!condominioId) {
      setErroNovaEntrada(
        "Não foi possível identificar o condomínio atual."
      );

      return;
    }

    setLocalizandoNovaEntrada(
      true
    );

    setErroNovaEntrada(
      null
    );

    setResultadoNovaEntrada(
      null
    );

    try {
      const resultado =
        await localizarVolumeEntradaPorCodigo({
          condominioId,
          codigo,
        });

      setResultadoNovaEntrada(
        resultado
      );

      if (
        resultado?.resultado ===
          "LOCALIZADO_ENTRADA" &&
        resultado?.volumeId
      ) {
        setEtapaOperacional(
          ETAPA_OPERACIONAL
            .ENTRADA
        );

        setVolumeSelecionado({
          contextType:
            "volume",

          mode:
            "VOLUME",

          id:
            resultado.volumeId,

          volumeId:
            resultado.volumeId,

          preRecebimentoId:
            resultado.preRecebimentoId,

          referenciaLote:
            resultado.referenciaLote,

          statusLote:
            resultado.statusLote,

          statusVolume:
            resultado.statusVolume,

          codigoCapturado:
            resultado.codigoNormalizado,

          condominioId:
            resultado.condominioId ||
            condominioId,
        });

        return;
      }

      switch (
        resultado?.resultado
      ) {
        case "NAO_ENCONTRADO":
          setEtapaOperacional(
            ETAPA_OPERACIONAL
              .LOCALIZACAO
          );

          setErroNovaEntrada(
            "Nenhum volume recebido foi encontrado com este código neste condomínio."
          );
          break;

        case "CODIGO_AMBIGUO":
          setEtapaOperacional(
            ETAPA_OPERACIONAL
              .REQUER_ATENCAO
          );

          setErroNovaEntrada(
            "Este código corresponde a mais de um volume e precisa de análise antes de continuar."
          );
          break;

        case "REQUER_ATENCAO":
          setEtapaOperacional(
            ETAPA_OPERACIONAL
              .REQUER_ATENCAO
          );

          setErroNovaEntrada(
            "Esta encomenda precisa de análise antes de continuar o processamento."
          );
          break;

        case "LOCALIZADO_ARMAZENAMENTO":
          setEtapaOperacional(
            ETAPA_OPERACIONAL
              .ARMAZENAMENTO
          );

          setErroNovaEntrada(
            null
          );
          break;

        case "LOCALIZADO_DISPONIBILIZACAO":
          setEtapaOperacional(
            ETAPA_OPERACIONAL
              .DISPONIBILIZACAO
          );

          setErroNovaEntrada(
            null
          );
          break;

        case "LOCALIZADO_POS_DISPONIBILIZACAO":
          setEtapaOperacional(
            ETAPA_OPERACIONAL
              .POS_DISPONIBILIZACAO
          );

          setErroNovaEntrada(
            null
          );
          break;

        case "FLUXO_FINALIZADO":
          setEtapaOperacional(
            ETAPA_OPERACIONAL
              .FINALIZADO
          );

          setErroNovaEntrada(
            null
          );
          break;

        default:
          setEtapaOperacional(
            ETAPA_OPERACIONAL
              .REQUER_ATENCAO
          );

          setErroNovaEntrada(
            "Não foi possível determinar a próxima etapa desta encomenda."
          );
          break;
      }
    } catch (err) {
      setErroNovaEntrada(
        err?.message ||
          "Não foi possível localizar esta encomenda."
      );
    } finally {
      setLocalizandoNovaEntrada(
        false
      );
    }
  }

  // ==========================================================
  // ESC / FOCO
  // ==========================================================

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown =
      (event) => {
        if (
          contextoRaizEhNovaEntrada &&
          event.key ===
            "Escape"
        ) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        /*
         * A câmera possui seu próprio ESC.
         */
        if (
          cameraCapturaAberta
        ) {
          return;
        }

        if (
          event.key ===
            "Escape" &&
          !operacaoEmCurso &&
          !armazenamentoPendente
        ) {
          event.preventDefault();

          if (
            podeVoltarAoLote
          ) {
            voltarAoLote();
            return;
          }

          onClose?.();
        }
      };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    requestAnimationFrame(
      () => {
        /*
        * NEW_ENTRY:
        *
        * o foco automático no leitor existe somente
        * enquanto estamos efetivamente na etapa inicial
        * de LOCALIZACAO.
        *
        * Nas etapas seguintes, especialmente durante
        * a busca de destinatários, este efeito pode
        * executar novamente por mudanças de estado
        * operacional. Nesses casos ele não deve tocar
        * no foco atual do operador.
        */
        if (
          contextoRaizEhNovaEntrada
        ) {
          if (
            etapaOperacional ===
            ETAPA_OPERACIONAL.LOCALIZACAO
          ) {
            newEntryInputRef
              .current
              ?.focus();
          }

          return;
        }

        closeButtonRef
          .current
          ?.focus();
      }
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    open,
    operacaoEmCurso,
    podeVoltarAoLote,
    cameraCapturaAberta,
    armazenamentoPendente,
    contextoRaizEhNovaEntrada,
    visualizandoNovaEntrada,
    etapaOperacional,
    onClose,
  ]);

  // ==========================================================
  // CONTEXTO DO VOLUME
  // ==========================================================

  useEffect(() => {
    if (
      !open ||
      !visualizandoVolume ||
      !volumeId
    ) {
      ++requisicaoContextoRef.current;

      setContextoOficial(
        null
      );
      setErroContexto(null);
      setLoadingContexto(
        false
      );

      return undefined;
    }

    const requisicaoId =
      ++requisicaoContextoRef.current;

    let ativo =
      true;

    async function carregar() {
      setLoadingContexto(
        true
      );
      setErroContexto(null);
      setContextoOficial(
        null
      );

      try {
        const resultado =
          await obterContextoVolumeEntrada({
            volumeId,
          });

        if (
          !ativo ||
          requisicaoId !==
            requisicaoContextoRef
              .current
        ) {
          return;
        }

        if (
          resultado?.volume_id &&
          resultado.volume_id !==
            volumeId
        ) {
          throw new Error(
            "O volume retornado não corresponde ao volume selecionado."
          );
        }

        setContextoOficial(
          resultado
        );
      } catch (err) {
        if (
          !ativo ||
          requisicaoId !==
            requisicaoContextoRef
              .current
        ) {
          return;
        }

        setErroContexto(
          err?.message ||
            "Não foi possível carregar os dados deste volume."
        );
      } finally {
        if (
          ativo &&
          requisicaoId ===
            requisicaoContextoRef
              .current
        ) {
          setLoadingContexto(
            false
          );
        }
      }
    }

    carregar();

    return () => {
      ativo =
        false;

      ++requisicaoContextoRef.current;
    };
  }, [
    open,
    visualizandoVolume,
    volumeId,
  ]);

  // ==========================================================
  // MATCH AUTOMÁTICO
  // ==========================================================

  const possuiRastreio =
    Boolean(
      contextoOficial
        ?.rastreio_encontrado
    );

  const destinatarioAutomatico =
    useMemo(
      () => ({
        destinatarioTipo:
          contextoOficial
            ?.destinatario_tipo ||
          null,

        moradorUnidadeVinculoId:
          contextoOficial
            ?.destinatario_morador_vinculo_id ||
          null,

        dependenteId:
          contextoOficial
            ?.destinatario_dependente_id ||
          null,

        usuarioId:
          contextoOficial
            ?.destinatario_usuario_id ||
          null,

        pessoaId:
          contextoOficial
            ?.destinatario_pessoa_id ||
          null,

        nome:
          capitalizarNome(
            contextoOficial
              ?.beneficiario_nome
          ),

        unidadeId:
          contextoOficial
            ?.unidade_id ||
          null,

        unidadeOficialId:
          contextoOficial
            ?.unidade_oficial_id ||
          null,

        torre:
          contextoOficial
            ?.torre ||
          null,

        torreIdentificador:
          contextoOficial
            ?.torre_identificador ||
          null,

        bloco:
          contextoOficial
            ?.bloco ||
          null,

        unidade:
          contextoOficial
            ?.unidade ||
          null,
      }),
      [
        contextoOficial,
      ]
    );

  const identificacaoAutomaticaDisponivel =
    Boolean(
      possuiRastreio &&
      contextoOficial
        ?.preenchimento_automatico_disponivel &&
      destinatarioAutomatico
        .destinatarioTipo &&
      destinatarioAutomatico
        .nome &&
      destinatarioAutomatico
        .unidadeId
    );

  const necessitaIdentificacaoManual =
    Boolean(
      contextoOficial &&
      !identificacaoAutomaticaDisponivel
    );

  // ==========================================================
  // BUSCA MANUAL
  // ==========================================================

  useEffect(() => {
    if (
      !open ||
      !visualizandoVolume ||
      !volumeId ||
      !necessitaIdentificacaoManual ||
      candidatoSelecionado ||
      confirmando ||
      confirmacaoSucesso
    ) {
      return undefined;
    }

    /*
     * Candidatos vindos do OCR pertencem
     * a uma consulta backend independente.
     *
     * Não os apagamos só porque termoBusca
     * está vazio.
     */
    if (
      origemCandidatos ===
      "OCR" &&
      termoBusca.trim()
        .length === 0
    ) {
      return undefined;
    }

    const termo =
      termoBusca.trim();

    if (
      !buscaDestinatarioSuficiente(
        termo
      )
    ) {
      ++requisicaoBuscaRef.current;

      setCandidatos([]);
      setOrigemCandidatos(
        null
      );

      setBuscando(false);
      setErroBusca(null);
      setConsultaExecutada(
        false
      );

      return undefined;
    }

    const timer =
      window.setTimeout(
        async () => {
          const requisicaoId =
            ++requisicaoBuscaRef.current;

          setBuscando(true);
          setErroBusca(null);
          setOrigemCandidatos(
            "MANUAL"
          );

          try {
            const resultado =
              await buscarDestinatariosEntrada({
                volumeId,

                busca:
                  termo,

                limite:
                  12,
              });

            if (
              requisicaoId !==
              requisicaoBuscaRef
                .current
            ) {
              return;
            }

            setConsultaExecutada(
              resultado
                ?.consultaExecutada ===
                true
            );

            setCandidatos(
              Array.isArray(
                resultado
                  ?.resultados
              )
                ? resultado
                    .resultados
                : []
            );
          } catch (err) {
            if (
              requisicaoId !==
              requisicaoBuscaRef
                .current
            ) {
              return;
            }

            setCandidatos([]);
            setOrigemCandidatos(
              null
            );

            setConsultaExecutada(
              false
            );

            setErroBusca(
              err?.message ||
                "Não foi possível pesquisar."
            );
          } finally {
            if (
              requisicaoId ===
              requisicaoBuscaRef
                .current
            ) {
              setBuscando(
                false
              );
            }
          }
        },
        TEMPO_DEBOUNCE_MS
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    open,
    visualizandoVolume,
    volumeId,
    necessitaIdentificacaoManual,
    termoBusca,
    candidatoSelecionado,
    confirmando,
    confirmacaoSucesso,
    origemCandidatos,
  ]);

  // ==========================================================
  // DIGITAÇÃO MANUAL
  // ==========================================================

  function handleTermoBuscaChange(
    value
  ) {
    /*
     * Se o operador começar a digitar
     * depois de um resultado OCR,
     * a busca manual passa a assumir
     * o contexto da pesquisa.
     */
    if (
      origemCandidatos ===
      "OCR"
    ) {
      setCandidatos([]);
      setConsultaExecutada(
        false
      );

      setOrigemCandidatos(
        null
      );
    }

    setTermoBusca(
      value
    );
  }

  // ==========================================================
  // SELEÇÃO MANUAL / OCR
  // ==========================================================

  function selecionarCandidato(
    candidato
  ) {
    if (
      operacaoEmCurso
    ) {
      return;
    }

    ++requisicaoBuscaRef.current;

    setCandidatoSelecionado(
      candidato
    );

    setBuscando(false);
    setErroBusca(null);
    setCandidatos([]);
    setOrigemCandidatos(
      null
    );

    setErroConfirmacao(
      null
    );

    chaveConfirmacaoRef.current =
      null;
  }

  function trocarDestinatario() {
    if (
      operacaoEmCurso
    ) {
      return;
    }

    setCandidatoSelecionado(
      null
    );

    setCandidatos([]);
    setOrigemCandidatos(
      null
    );

    setConsultaExecutada(
      false
    );
    setErroConfirmacao(
      null
    );

    setTermoBusca("");

    chaveConfirmacaoRef.current =
      null;

    requestAnimationFrame(
      () => {
        searchInputRef
          .current
          ?.focus();
      }
    );
  }

  // ==========================================================
  // APRESENTAÇÃO
  // ==========================================================

  const destinatarioExibido =
    candidatoSelecionado ||
    (
      identificacaoAutomaticaDisponivel
        ? destinatarioAutomatico
        : null
    );

  const torreBlocoExibido =
    destinatarioExibido
      ? formatarTorreBloco({
          torre:
            destinatarioExibido
              .torre,

          torreIdentificador:
            destinatarioExibido
              .torreIdentificador,

          bloco:
            destinatarioExibido
              .bloco,
        })
      : "—";

  const unidadeExibida =
    destinatarioExibido
      ?.unidade ||
    "—";

  const transportadoraNome =
    capitalizarNome(
      contextoOficial
        ?.transportadora
    ) ||
    contextoVolume
      ?.transportadora ||
    "Não informada";

  const possuiAvaria =
    Boolean(
      contextoVolume
        ?.possuiAvaria
    );

  const codigoEsperado =
    textoOuNull(
      contextoOficial
        ?.codigo_lido
    ) ||
    textoOuNull(
      contextoVolume
        ?.codigoCapturado
    );

  // ==========================================================
  // LOTE
  // ==========================================================

  const statusLote =
    obterStatusLote(
      context,
      volumesLote
    );

  const totalConcluidos =
    volumesLote.filter(
      volumeConcluido
    ).length;

  // ==========================================================
  // HINT DA BUSCA
  // ==========================================================

  const termoAtual =
    termoBusca.trim();

  const minimoAtual =
    obterMinimoBuscaDestinatario(
      termoAtual
    );

  const quantidadeFaltante =
    Math.max(
      0,
      minimoAtual -
        termoAtual.length
    );

  // ==========================================================
  // PRONTO PARA CONFIRMAR
  // ==========================================================

  const destinatarioProntoParaConfirmar =
    Boolean(
      destinatarioExibido &&
      destinatarioExibido
        .destinatarioTipo &&
      destinatarioExibido
        .unidadeId &&
      (
        destinatarioExibido
          .pessoaId ||
        destinatarioExibido
          .dependenteId
      )
    );

  const entradaPodeSerConfirmada =
    Boolean(
      destinatarioProntoParaConfirmar &&
      !divergenciaCodigoAtiva
    );

  // ==========================================================
  // CONFIRMAR ENTRADA
  // ==========================================================

  async function handleConfirmarEntrada() {
    if (
      confirmando ||
      confirmacaoSucesso ||
      !volumeId ||
      !destinatarioProntoParaConfirmar
    ) {
      return;
    }

    if (
      divergenciaCodigoAtiva
    ) {
      setErroConfirmacao(
        "Existe uma divergência no código conferido. Faça uma nova leitura antes de confirmar."
      );

      return;
    }

    setConfirmando(true);
    setErroConfirmacao(
      null
    );
    setConfirmacaoSucesso(
      null
    );

    ++requisicaoBuscaRef.current;

    setBuscando(false);
    setCandidatos([]);
    setOrigemCandidatos(
      null
    );

    if (
      !chaveConfirmacaoRef.current
    ) {
      chaveConfirmacaoRef.current =
        criarChaveIdempotencia(
          volumeId
        );
    }

    try {
      const resultado =
        await confirmarEntrada({
          volumeId,

          unidadeId:
            destinatarioExibido
              .unidadeId,

          destinatarioTipo:
            destinatarioExibido
              .destinatarioTipo,

          destinatarioMoradorVinculoId:
            destinatarioExibido
              .moradorUnidadeVinculoId ||
            null,

          destinatarioDependenteId:
            destinatarioExibido
              .dependenteId ||
            null,

          destinatarioUsuarioId:
            destinatarioExibido
              .usuarioId ||
            null,

          destinatarioPessoaId:
            destinatarioExibido
              .pessoaId ||
            null,

          destinatarioNome:
            destinatarioExibido
              .nome ||
            null,

          tipoEntrega:
            null,

          prioridade:
            "NORMAL",

          observacoes:
            null,

          chaveIdempotencia:
            chaveConfirmacaoRef
              .current,
        });

      setConfirmacaoSucesso(
        resultado
      );

      if (
        contextoRaizEhLote &&
        volumeId
      ) {
        setVolumesLoteLocal(
          (atuais) =>
            atuais.map(
              (itemVolume) => {
                const id =
                  itemVolume
                    ?.volumeId ||
                  itemVolume?.id ||
                  null;

                if (
                  id !==
                  volumeId
                ) {
                  return itemVolume;
                }

                return {
                  ...itemVolume,

                  situacao:
                    "ENTRADA_CONCLUIDA",

                  situacaoLabel:
                    "Entrada concluída",

                  entradaOficial: {
                    ...(itemVolume
                      ?.entradaOficial ||
                      {}),

                    realizada:
                      true,

                    entradaId:
                      resultado
                        ?.entrada_id ||
                      null,

                    encomendaId:
                      resultado
                        ?.encomenda_id ||
                      null,

                    realizadaEm:
                      resultado
                        ?.confirmada_em ||
                      null,
                  },
                };
              }
            )
        );
      }

      await new Promise(
        (resolve) => {
          window.setTimeout(
            resolve,
            TEMPO_FEEDBACK_SUCESSO_MS
          );
        }
      );

      /*
       * A Entrada terminou, mas o contexto operacional permanece
       * aberto para o Armazenamento. A fila global só será
       * atualizada após o armazenamento, evitando desmontar o
       * Drawer no meio do fluxo físico.
       */
    } catch (err) {
      setErroConfirmacao(
        err?.message ||
          "Não foi possível confirmar a Entrada."
      );

      setConfirmacaoSucesso(
        null
      );

      setConfirmando(false);

      return;
    }

    setConfirmando(false);
  }

  // ==========================================================
  // ARMAZENAMENTO CONCLUÍDO
  // ==========================================================

  async function handleArmazenado(
    resultado
  ) {
    setArmazenamentoConcluido(
      resultado || true
    );

    if (
      contextoRaizEhLote &&
      volumeId
    ) {
      setVolumesLoteLocal(
        (atuais) =>
          atuais.map(
            (itemVolume) => {
              const id =
                itemVolume
                  ?.volumeId ||
                itemVolume?.id ||
                null;

              if (
                id !==
                volumeId
              ) {
                return itemVolume;
              }

              return {
                ...itemVolume,

                armazenamentoOficial: {
                  realizada: true,

                  localizacaoId:
                    resultado
                      ?.localizacaoId ||
                    null,

                  localizacaoNome:
                    resultado
                      ?.localizacaoNomeCompleto ||
                    resultado
                      ?.localizacaoNome ||
                    null,

                  armazenadoEm:
                    resultado
                      ?.armazenadoEm ||
                    null,
                },
              };
            }
          )
      );
    }

    try {
      await onEntradaConfirmada?.();
    } catch (
      refreshError
    ) {
      console.warn(
        "[Entrada] Armazenamento concluído, mas a atualização da fila falhou.",
        refreshError
      );
    }

    if (
      contextoRaizEhLote
    ) {
      voltarAoLote();
      return;
    }

    onClose?.();
  }

  async function handleArmazenadoNovaEntrada(
    resultado
  ) {
    setArmazenamentoConcluido(
      resultado || true
    );

    /*
    * A operação física já foi persistida.
    *
    * O EntradaArmazenamento será desmontado ao
    * avançarmos para DISPONIBILIZACAO. Portanto,
    * não podemos depender de um efeito interno
    * do componente filho para devolver
    * armazenamentoEmCurso=false após o unmount.
    *
    * O Drawer pai encerra explicitamente o estado
    * operacional do armazenamento antes de trocar
    * de etapa.
    */
    setArmazenamentoEmCurso(
      false
    );

    setEstadoAcaoArmazenamento({
      podeContinuar: false,
      confirmando: false,
      carregando: false,
      localizacaoSelecionadaId:
        null,
    });

    setEtapaOperacional(
      ETAPA_OPERACIONAL
        .DISPONIBILIZACAO
    );

    try {
      await onEntradaConfirmada?.();
    } catch (
      refreshError
    ) {
      console.warn(
        "[Entrada] Armazenamento concluído, mas a atualização da fila falhou.",
        refreshError
      );
    }
  }

  async function handleContinuarArmazenamento() {
    if (
      !armazenamentoNovaEntradaAtivo ||
      !estadoAcaoArmazenamento
        ?.podeContinuar ||
      armazenamentoEmCurso
    ) {
      return;
    }

    await armazenamentoRef
      .current
      ?.confirmar?.();
  }

  // ==========================================================
  // FECHADO
  // ==========================================================

  if (!open) {
    return null;
  }

  return (
    <div
      className="entrada-drawer-root"
      data-hide-mobile-nav="true"
    >
      <button
        type="button"
        className="entrada-drawer__backdrop"
        onClick={
          operacaoEmCurso ||
          cameraCapturaAberta ||
          armazenamentoPendente ||
          contextoRaizEhNovaEntrada
            ? undefined
            : fecharOuVoltar
        }
        aria-label={
          podeVoltarAoLote
            ? "Voltar aos volumes do lote"
            : "Fechar painel de Entrada"
        }
        disabled={
          operacaoEmCurso ||
          cameraCapturaAberta ||
          armazenamentoPendente ||
          contextoRaizEhNovaEntrada
        }
      />

      <aside
        className="entrada-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="entrada-drawer-title"
        aria-busy={
          operacaoEmCurso
        }
      >
        {/* ===================================================
            HEADER
            =================================================== */}

        <header className="entrada-drawer__header">
          <div className="entrada-drawer__identity">
            <div
              className="entrada-drawer__icon"
              aria-hidden="true"
            >
              {visualizandoLote ? (
                <Boxes
                  size={21}
                />
              ) : (
                <PackageSearch
                  size={21}
                />
              )}
            </div>

            <div>
              <span>
                Entrada de Encomendas
              </span>

              <h2 id="entrada-drawer-title">
                {visualizandoLote
                  ? "Volumes do lote"
                  : retomandoArmazenamento
                    ? "Armazenar encomenda"
                    : visualizandoNovaEntrada
                      ? "Nova Entrada"
                      : armazenamentoPendente
                        ? "Armazenar volume"
                        : "Conferir volume"}
              </h2>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            className={`entrada-drawer__close ${
              podeVoltarAoLote
                ? "entrada-drawer__close--back"
                : ""
            }`}
            onClick={
              fecharOuVoltar
            }
            disabled={
              operacaoEmCurso ||
              cameraCapturaAberta ||
              bloqueioArmazenamentoPendente
            }
            aria-label={
              podeVoltarAoLote
                ? "Voltar aos volumes do lote"
                : "Fechar"
            }
          >
            {podeVoltarAoLote ? (
              <>
                <ArrowLeft
                  size={18}
                />

                <span>
                  Voltar
                </span>
              </>
            ) : (
              <X
                size={19}
              />
            )}
          </button>
        </header>

        

        {/* ===================================================
            BODY
            =================================================== */}

        <div className="entrada-drawer__body">

          {visualizandoNovaEntrada &&
          etapaOperacional ===
            ETAPA_OPERACIONAL.POS_DISPONIBILIZACAO ? (
            <>
              {loadingWhatsapp ? (
                <section className="entrada-drawer__loading">
                  <LoaderCircle
                    size={28}
                    className="entrada-drawer__spinner"
                  />

                  <strong>
                    Carregando WhatsApp
                  </strong>

                  <p>
                    Conferindo o contato oficial e o
                    estado da comunicação.
                  </p>
                </section>
              ) : null}

              {!loadingWhatsapp &&
              erroWhatsapp ? (
                <section
                  className="entrada-drawer__confirm-state entrada-drawer__confirm-state--error"
                  role="alert"
                >
                  <AlertCircle
                    size={22}
                  />

                  <div>
                    <strong>
                      Não foi possível carregar
                    </strong>

                    <p>
                      {erroWhatsapp}
                    </p>
                  </div>
                </section>
              ) : null}

              {!loadingWhatsapp &&
              !erroWhatsapp &&
              contextoWhatsapp ? (
                <section className="entrada-drawer__section">
                  <div className="entrada-drawer__section-heading">
                    <CheckCircle2
                      size={19}
                      aria-hidden="true"
                    />

                    <div>
                      <span>
                        Pós-disponibilização
                      </span>

                      <h3>
                        Encomenda ID #
                        {String(
                          contextoWhatsapp
                            .numeroEncomenda ??
                            ""
                        ).padStart(
                          3,
                          "0"
                        )}
                      </h3>
                    </div>
                  </div>

                  <div className="entrada-drawer__details-grid">
                    <div className="entrada-drawer__detail">
                      <span>
                        Destinatário
                      </span>

                      <strong>
                        {contextoWhatsapp
                          .destinatarioNome ||
                          "—"}
                      </strong>
                    </div>

                    <div className="entrada-drawer__detail">
                      <span>
                        Torre / Unidade
                      </span>

                      <strong>
                        {contextoWhatsapp
                          .torreNome ||
                          "—"}
                        {" / "}
                        {contextoWhatsapp
                          .unidadeNumero ||
                          "—"}
                      </strong>
                    </div>

                    <div className="entrada-drawer__detail">
                      <span>
                        WhatsApp
                      </span>

                      <strong>
                        {contextoWhatsapp
                          .whatsappDisponivel
                          ? contextoWhatsapp
                              .telefoneMascarado ||
                            "Disponível"
                          : "Indisponível"}
                      </strong>
                    </div>

                    <div className="entrada-drawer__detail">
                      <span>
                        Situação
                      </span>

                      <strong>
                        {contextoWhatsapp
                          .whatsappEnvioConfirmadoOperador
                          ? "Envio confirmado pelo operador"
                          : contextoWhatsapp
                              .whatsappAberto
                            ? "WhatsApp já aberto"
                            : "Aguardando envio"}
                      </strong>
                    </div>
                  </div>

                  {erroAcaoWhatsapp ? (
                    <div
                      className="entrada-drawer__search-error"
                      role="alert"
                    >
                      <AlertCircle
                        size={18}
                        aria-hidden="true"
                      />

                      <div>
                        {erroAcaoWhatsapp}
                      </div>
                    </div>
                  ) : null}

                  {contextoWhatsapp
                    .whatsappDisponivel &&
                  !contextoWhatsapp
                    .whatsappEnvioConfirmadoOperador ? (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        gap: "10px",
                        flexWrap: "wrap",
                        marginTop: "16px",
                      }}
                    >
                      <button
                        type="button"
                        className="entrada-drawer__primary"
                        onClick={
                          handleAbrirWhatsapp
                        }
                        disabled={
                          operacaoEmCurso ||
                          !urlWhatsapp
                        }
                        aria-busy={
                          abrindoWhatsapp
                        }
                      >
                        {abrindoWhatsapp ? (
                          <>
                            <LoaderCircle
                              size={17}
                              className="entrada-drawer__spinner entrada-drawer__spinner--button"
                            />

                            Preparando WhatsApp...
                          </>
                        ) : (
                          <>
                            <ChevronRight
                              size={17}
                            />

                            {contextoWhatsapp
                              .whatsappAberto
                              ? "Abrir WhatsApp novamente"
                              : "Enviar WhatsApp"}
                          </>
                        )}
                      </button>


                      {contextoWhatsapp
                        .whatsappAberto ? (
                        <button
                          type="button"
                          className="entrada-drawer__primary"
                          onClick={
                            handleConfirmarEnvioWhatsapp
                          }
                          disabled={
                            operacaoEmCurso
                          }
                          aria-busy={
                            confirmandoEnvioWhatsapp
                          }
                        >
                          {confirmandoEnvioWhatsapp ? (
                            <>
                              <LoaderCircle
                                size={17}
                                className="entrada-drawer__spinner entrada-drawer__spinner--button"
                              />

                              Confirmando...
                            </>
                          ) : (
                            <>
                              <CheckCircle2
                                size={17}
                                aria-hidden="true"
                              />

                              WhatsApp Enviado
                            </>
                          )}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              ) : null}
            </>
          ) : null}

          {visualizandoNovaEntrada &&
          etapaOperacional ===
            ETAPA_OPERACIONAL.LOCALIZACAO ? (
            <section className="entrada-drawer__section">
              <div className="entrada-drawer__section-heading">
                <ScanLine
                  size={19}
                  aria-hidden="true"
                />

                <div>
                  <span>
                    Entrada Individual
                  </span>

                  <h3>
                    Leia o código da encomenda
                  </h3>
                </div>
              </div>

              <form
                onSubmit={
                  handleLocalizarNovaEntrada
                }
              >
                <label className="entrada-drawer__search-field">
                  <span>
                    Leitor ou digitação
                  </span>

                  <div className="entrada-drawer__search-control">
                    <ScanLine
                      size={18}
                      aria-hidden="true"
                    />

                    <input
                      ref={
                        newEntryInputRef
                      }
                      type="text"
                      value={
                        codigoNovaEntrada
                      }
                      onChange={
                        (event) => {
                          setCodigoNovaEntrada(
                            event.target.value
                          );

                          setErroNovaEntrada(
                            null
                          );
                        }
                      }
                      placeholder="Leia ou digite o código"
                      autoComplete="off"
                      spellCheck={false}
                      disabled={
                        localizandoNovaEntrada
                      }
                    />
                  </div>
                </label>

                <p className="entrada-drawer__search-hint">
                  A pesquisa ocorre somente no
                  condomínio operacional atual.
                </p>

                {erroNovaEntrada ? (
                  <div
                    className="entrada-drawer__search-error"
                    role="alert"
                  >
                    <AlertCircle
                      size={18}
                      aria-hidden="true"
                    />

                    <div>
                      {erroNovaEntrada}
                    </div>
                  </div>
                ) : null}

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "flex-end",
                    marginTop: "14px",
                  }}
                >
                  <button
                    type="submit"
                    className="entrada-drawer__primary"
                    disabled={
                      localizandoNovaEntrada ||
                      !textoOuNull(
                        codigoNovaEntrada
                      )
                    }
                  >
                    {localizandoNovaEntrada ? (
                      <>
                        <LoaderCircle
                          size={17}
                          className="entrada-drawer__spinner"
                        />

                        Localizando...
                      </>
                    ) : (
                      <>
                        <Search
                          size={17}
                        />

                        Localizar
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          {visualizandoNovaEntrada &&
          etapaOperacional &&
          etapaOperacional !==
            ETAPA_OPERACIONAL.LOCALIZACAO &&
          etapaOperacional !==
            ETAPA_OPERACIONAL.REQUER_ATENCAO &&
          etapaOperacional !==
            ETAPA_OPERACIONAL.ARMAZENAMENTO &&
          etapaOperacional !==
            ETAPA_OPERACIONAL.DISPONIBILIZACAO &&
          etapaOperacional !==
            ETAPA_OPERACIONAL.POS_DISPONIBILIZACAO ? (
            <section className="entrada-drawer__section">
              <div className="entrada-drawer__section-heading">
                <PackageSearch
                  size={19}
                  aria-hidden="true"
                />

                <div>
                  <span>
                    Encomenda localizada
                  </span>

                  <h3>
                    Retomada do processamento
                  </h3>
                </div>
              </div>

              <div className="entrada-drawer__guidance">
                <CheckCircle2
                  size={18}
                  aria-hidden="true"
                />

                <div>
                  <strong>
                    {etapaOperacional ===
                    ETAPA_OPERACIONAL
                      .ARMAZENAMENTO
                      ? "Seguir para Armazenamento"
                      : etapaOperacional ===
                          ETAPA_OPERACIONAL
                            .DISPONIBILIZACAO
                        ? "Seguir para Disponibilização"
                        : "Fluxo já finalizado"}
                  </strong>

                  <p>
                    O estado persistido da encomenda
                    foi reconhecido pelo backend.
                    Nenhuma etapa anterior será
                    executada novamente.
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {visualizandoNovaEntrada &&
          etapaOperacional ===
            ETAPA_OPERACIONAL.DISPONIBILIZACAO ? (
            <>
              {loadingDisponibilizacao ? (
                <section className="entrada-drawer__loading">
                  <LoaderCircle
                    size={28}
                    className="entrada-drawer__spinner"
                  />

                  <strong>
                    Carregando disponibilização
                  </strong>

                  <p>
                    Conferindo o estado atual da
                    encomenda.
                  </p>
                </section>
              ) : null}

              {!loadingDisponibilizacao &&
              erroDisponibilizacao ? (
                <section
                  className="entrada-drawer__confirm-state entrada-drawer__confirm-state--error"
                  role="alert"
                >
                  <AlertCircle
                    size={22}
                  />

                  <div>
                    <strong>
                      Não foi possível carregar
                    </strong>

                    <p>
                      {erroDisponibilizacao}
                    </p>
                  </div>
                </section>
              ) : null}

              {!loadingDisponibilizacao &&
              !erroDisponibilizacao &&
              contextoDisponibilizacao ? (
                <>
                  <section className="entrada-drawer__section">
                    <div className="entrada-drawer__section-heading">
                      <Package
                        size={19}
                        aria-hidden="true"
                      />

                      <div>
                        <span>
                          Disponibilização
                        </span>

                        <h3>
                          Encomenda ID #
                          {String(
                            contextoDisponibilizacao
                              .numeroEncomenda ??
                              ""
                          ).padStart(
                            3,
                            "0"
                          )}
                        </h3>
                      </div>
                    </div>

                    <div className="entrada-drawer__details-grid">
                      <div className="entrada-drawer__detail">
                        <span>
                          Encomenda
                        </span>

                        <strong>
                          ID #
                          {String(
                            contextoDisponibilizacao
                              .numeroEncomenda ??
                              ""
                          ).padStart(
                            3,
                            "0"
                          )}
                        </strong>
                      </div>

                      <div className="entrada-drawer__detail">
                        <span>
                          Localização física
                        </span>

                        <strong>
                          {contextoDisponibilizacao
                            .localizacaoNomeCompleto ||
                            contextoDisponibilizacao
                              .localizacaoNome ||
                            "—"}
                        </strong>
                      </div>

                      <div className="entrada-drawer__detail">
                        <span>
                          Destinatário
                        </span>

                        <strong>
                          {contextoDisponibilizacao
                            .destinatarioNome ||
                            "—"}
                        </strong>
                      </div>

                      <div className="entrada-drawer__detail">
                        <span>
                          Torre / Unidade
                        </span>

                        <strong>
                          {contextoDisponibilizacao
                            .torreNome ||
                            contextoDisponibilizacao
                              .torreIdentificador ||
                            "—"}
                          {" / "}
                          {contextoDisponibilizacao
                            .unidadeNumero ||
                            "—"}
                        </strong>
                      </div>
                    </div>
                  </section>

                  {!contextoDisponibilizacao
                    .elegivelDisponibilizacao ? (
                    <section
                      className="entrada-drawer__confirm-state entrada-drawer__confirm-state--error"
                      role="alert"
                    >
                      <AlertTriangle
                        size={22}
                      />

                      <div>
                        <strong>
                          Disponibilização bloqueada
                        </strong>

                        <p>
                          {contextoDisponibilizacao
                            .bloqueios
                            ?.map(
                              (item) =>
                                item.mensagem
                            )
                            .filter(Boolean)
                            .join(" ") ||
                            "O backend não autorizou a disponibilização desta encomenda."}
                        </p>
                      </div>
                    </section>
                  ) : (
                    <section className="entrada-drawer__guidance">
                      <CheckCircle2
                        size={18}
                      />

                      <div>
                        <strong>
                          Pronta para disponibilização
                        </strong>

                        <p>
                          Os dados oficiais da
                          encomenda foram conferidos
                          pelo backend.
                        </p>
                      </div>
                    </section>
                  )}
                </>
              ) : null}
            </>
          ) : null}

          {retomandoArmazenamento ? (
            <>
              <section className="entrada-drawer__notice entrada-drawer__notice--success">
                <CheckCircle2
                  size={21}
                  aria-hidden="true"
                />

                <div>
                  <strong>
                    Entrada já confirmada
                  </strong>

                  <p>
                    Esta encomenda já possui
                    Entrada Oficial registrada.
                    Continue a partir do
                    armazenamento físico.
                  </p>
                </div>
              </section>

              <EntradaArmazenamento
                ref={
                  armazenamentoRef
                }
                encomendaId={
                  encomendaIdRetomadaArmazenamento
                }
                condominioId={
                  condominioIdRetomadaArmazenamento
                }
                tipoEntrega={
                  resultadoNovaEntrada
                    ?.tipoEntrega
                }
                disabled={false}
                acaoExterna
                onEstadoOperacaoChange={
                  setArmazenamentoEmCurso
                }
                onEstadoAcaoChange={
                  setEstadoAcaoArmazenamento
                }
                onArmazenado={
                  handleArmazenadoNovaEntrada
                }
              />
            </>
          ) : null}

          {/* =================================================
              VISÃO DO LOTE
              ================================================= */}

          {visualizandoLote ? (
            <>
              <section className="entrada-drawer__lot-hero">
                <div>
                  <span>
                    Lote selecionado
                  </span>

                  <strong>
                    {referenciaLote ||
                      "Lote"}
                  </strong>
                </div>

                <div className="entrada-drawer__lot-summary">
                  <span
                    className={`entrada-drawer__lot-status ${
                      statusLote ===
                      "Entrada parcial"
                        ? "entrada-drawer__lot-status--partial"
                        : ""
                    }`}
                  >
                    {statusLote}
                  </span>

                  <div className="entrada-drawer__lot-count">
                    <strong>
                      {
                        volumesLote.length
                      }
                    </strong>

                    <span>
                      {volumesLote.length ===
                      1
                        ? "volume"
                        : "volumes"}
                    </span>
                  </div>
                </div>
              </section>

              {totalConcluidos >
              0 ? (
                <div className="entrada-drawer__lot-progress">
                  <div className="entrada-drawer__lot-progress-row">
                    <span>
                      Progresso da Entrada
                    </span>

                    <strong>
                      {totalConcluidos}/
                      {
                        volumesLote.length
                      }
                    </strong>
                  </div>

                  <div className="entrada-drawer__lot-progress-track">
                    <span
                      style={{
                        width: `${
                          volumesLote.length >
                          0
                            ? (
                                totalConcluidos /
                                volumesLote.length
                              ) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}

              {/* =============================================
                  PONTE MOBILE — ENTERPRISE
                  ============================================= */}

              {enterpriseAtivo &&
              preRecebimentoId ? (
                <EntradaPonteMobile
                  preRecebimentoId={
                    preRecebimentoId
                  }
                  referenciaLote={
                    referenciaLote
                  }
                  disabled={
                    operacaoEmCurso
                  }
                />
              ) : null}

              {/* =============================================
                  VOLUMES
                  ============================================= */}

              <section className="entrada-drawer__section">
                <div className="entrada-drawer__section-heading">
                  <Boxes
                    size={18}
                  />

                  <div>
                    <span>
                      Conteúdo do lote
                    </span>

                    <h3>
                      Volumes recebidos
                    </h3>
                  </div>
                </div>

                <div className="entrada-drawer__lot-volumes">
                  {volumesLote.map(
                    (
                      itemVolume
                    ) => {
                      const concluido =
                        volumeConcluido(
                          itemVolume
                        );

                      return (
                        <button
                          key={
                            itemVolume
                              .id ||
                            itemVolume
                              .volumeId
                          }
                          type="button"
                          className={`entrada-drawer__lot-volume ${
                            concluido
                              ? "entrada-drawer__lot-volume--completed"
                              : ""
                          }`}
                          onClick={() => {
                            if (
                              operacaoEmCurso
                            ) {
                              return;
                            }

                            setVolumeSelecionado(
                              itemVolume
                            );
                          }}
                        >
                          <div className="entrada-drawer__lot-volume-icon">
                            {concluido ? (
                              <Check
                                size={18}
                              />
                            ) : (
                              <Package
                                size={18}
                              />
                            )}
                          </div>

                          <div className="entrada-drawer__lot-volume-content">
                            <strong>
                              {itemVolume
                                .referencia ||
                                "Volume"}
                            </strong>

                            <span>
                              {itemVolume
                                .codigoCapturado ||
                                "Código não informado"}
                            </span>
                          </div>

                          <div className="entrada-drawer__lot-volume-status">
                            {concluido
                              ? "Entrada concluída"
                              : itemVolume
                                  .situacaoLabel ||
                                "Aguardando entrada"}
                          </div>

                          <ChevronRight
                            size={17}
                          />
                        </button>
                      );
                    }
                  )}
                </div>
              </section>

              <section className="entrada-drawer__guidance">
                <PackageSearch
                  size={18}
                />

                <div>
                  <strong>
                    Processamento por volume
                  </strong>

                  <p>
                    Selecione um volume
                    para conferir ou
                    identificar o
                    destinatário. Depois de
                    confirmar a Entrada e o
                    local de armazenamento,
                    você voltará para esta
                    visão do lote.
                  </p>
                </div>
              </section>
            </>
          ) : null}

          {/* =================================================
              CARREGAMENTO DO VOLUME
              ================================================= */}

          {exibindoEtapaEntradaVolume &&
          loadingContexto ? (
            <section className="entrada-drawer__loading">
              <LoaderCircle
                size={28}
                className="entrada-drawer__spinner"
              />

              <strong>
                Carregando volume
              </strong>

              <p>
                Conferindo as
                informações mais
                recentes.
              </p>
            </section>
          ) : null}

          {/* =================================================
              ERRO DO CONTEXTO
              ================================================= */}

          {exibindoEtapaEntradaVolume &&
          !loadingContexto &&
          erroContexto ? (
            <section
              className="entrada-drawer__error"
              role="alert"
            >
              <AlertCircle
                size={22}
              />

              <div>
                <strong>
                  Não foi possível
                  abrir este volume
                </strong>

                <p>
                  {erroContexto}
                </p>
              </div>
            </section>
          ) : null}

          {/* =================================================
              VOLUME OFICIAL
              ================================================= */}

          {exibindoEtapaEntradaVolume &&
          !loadingContexto &&
          !erroContexto &&
          contextoOficial ? (
            <>
              <section className="entrada-drawer__hero">
                <div className="entrada-drawer__hero-top">
                  <div>
                    <span>
                      Volume selecionado
                    </span>

                    <strong>
                      {contextoVolume
                        ?.referencia ||
                        `Volume ${
                          contextoVolume
                            ?.numeroVolume ||
                          ""
                        }`}
                    </strong>
                  </div>

                  <span
                    className={`entrada-drawer__status ${
                      identificacaoAutomaticaDisponivel ||
                      candidatoSelecionado
                        ? "entrada-drawer__status--success"
                        : "entrada-drawer__status--pending"
                    }`}
                  >
                    {armazenamentoConcluido
                      ? "Armazenada"
                      : armazenamentoPendente
                        ? "Aguardando armazenamento"
                        : confirmacaoSucesso
                          ? "Entrada confirmada"
                          : identificacaoAutomaticaDisponivel
                            ? "Sugestão encontrada"
                            : candidatoSelecionado
                              ? "Destinatário selecionado"
                              : "Identificação necessária"}
                  </span>
                </div>

                <div className="entrada-drawer__code">
                  <ScanLine
                    size={18}
                  />

                  <div>
                    <span>
                      Código capturado
                    </span>

                    <strong>
                      {codigoEsperado ||
                        "Não informado"}
                    </strong>
                  </div>
                </div>
              </section>

              {possuiAvaria ? (
                <section className="entrada-drawer__notice entrada-drawer__notice--warning">
                  <AlertTriangle
                    size={21}
                  />

                  <div>
                    <strong>
                      Avaria registrada
                    </strong>

                    <p>
                      Este volume possui
                      ocorrência registrada
                      no Recebimento.
                      Confira antes de
                      continuar.
                    </p>
                  </div>
                </section>
              ) : null}

              {identificacaoAutomaticaDisponivel ? (
                <section className="entrada-drawer__notice entrada-drawer__notice--success">
                  <BadgeCheck
                    size={22}
                  />

                  <div>
                    <strong>
                      Destinatário sugerido
                      pelo rastreio
                    </strong>

                    <p>
                      O Sistema encontrou
                      uma correspondência
                      com o rastreio
                      informado pelo
                      morador. Confira o
                      volume físico antes
                      de confirmar.
                    </p>
                  </div>
                </section>
              ) : null}

              {necessitaIdentificacaoManual &&
              !candidatoSelecionado &&
              !confirmacaoSucesso ? (
                <section className="entrada-drawer__notice entrada-drawer__notice--neutral">
                  <CircleUserRound
                    size={22}
                  />

                  <div>
                    <strong>
                      Destinatário ainda
                      não identificado
                    </strong>

                    <p>
                      Localize o morador
                      ou dependente
                      autorizado para
                      continuar a Entrada.
                    </p>
                  </div>
                </section>
              ) : null}

              {/* =============================================
                  CAPTURA OPERACIONAL
                  ============================================= */}

              {!confirmacaoSucesso ? (
                <EntradaCapturaCodigo
                  codigoEsperado={
                    codigoEsperado
                  }
                  disabled={
                    confirmando
                  }
                  onConferenciaChange={(
                    resultado
                  ) => {
                    setConferenciaCodigo(
                      resultado
                    );

                    if (
                      resultado
                        ?.divergente
                    ) {
                      setErroConfirmacao(
                        null
                      );
                    }
                  }}
                  onCameraOpenChange={
                    setCameraCapturaAberta
                  }
                />
              ) : null}

              {/* =============================================
                  OCR ASSISTIDO DA ETIQUETA
                  ============================================= */}

              {necessitaIdentificacaoManual &&
              !candidatoSelecionado &&
              !confirmacaoSucesso ? (
                <EntradaEtiquetaOCR
                  volumeId={
                    volumeId
                  }
                  disabled={
                    operacaoEmCurso
                  }
                  onCandidatosEncontrados={({
                    resultados,
                    consultaExecutada:
                      consultaOCRExecutada,
                  }) => {
                    ++requisicaoBuscaRef.current;

                    setErroBusca(
                      null
                    );

                    setBuscando(
                      false
                    );

                    setConsultaExecutada(
                      consultaOCRExecutada ===
                        true
                    );

                    setCandidatos(
                      Array.isArray(
                        resultados
                      )
                        ? resultados
                        : []
                    );

                    setOrigemCandidatos(
                      "OCR"
                    );

                    setCandidatoSelecionado(
                      null
                    );

                    /*
                     * Resultado OCR não deve
                     * ser confundido com uma
                     * busca textual manual.
                     */
                    setTermoBusca(
                      ""
                    );
                  }}
                />
              ) : null}

              {/* =============================================
                  BUSCA MANUAL
                  ============================================= */}

              {necessitaIdentificacaoManual &&
              !candidatoSelecionado &&
              !confirmacaoSucesso ? (
                <section className="entrada-drawer__section">
                  <div className="entrada-drawer__section-heading">
                    <UserRoundSearch
                      size={18}
                    />

                    <div>
                      <span>
                        Identificação
                      </span>

                      <h3>
                        Localizar
                        destinatário
                      </h3>
                    </div>
                  </div>

                  <label className="entrada-drawer__search-field">
                    <span>
                      Buscar
                    </span>

                    <div className="entrada-drawer__search-control">
                      <Search
                        size={18}
                      />

                      <input
                        ref={
                          searchInputRef
                        }
                        type="search"
                        value={
                          termoBusca
                        }
                        onChange={(
                          event
                        ) =>
                          handleTermoBuscaChange(
                            event
                              .target
                              .value
                          )
                        }
                        onKeyDown={(
                          event
                        ) => {
                          /*
                          * Inputs editáveis são soberanos sobre
                          * atalhos globais da aplicação.
                          *
                          * A barra de espaço deve permanecer como
                          * caractere de digitação e nunca retirar
                          * o foco deste campo.
                          */
                          if (
                            event.key === " " ||
                            event.code === "Space"
                          ) {
                            event.stopPropagation();
                          }
                        }}
                        placeholder="Nome, torre/bloco, unidade ou Moca/05"
                        autoComplete="off"
                        spellCheck="false"
                        disabled={
                          operacaoEmCurso
                        }
                      />

                      {buscando ? (
                        <LoaderCircle
                          size={17}
                          className="entrada-drawer__spinner"
                        />
                      ) : null}
                    </div>
                  </label>

                  {origemCandidatos !==
                    "OCR" &&
                  !buscaDestinatarioSuficiente(
                    termoAtual
                  ) ? (
                    <p className="entrada-drawer__search-hint">
                      {termoAtual.length ===
                      0
                        ? "Digite ao menos 3 letras ou 2 números."
                        : quantidadeFaltante >
                            0
                          ? `Digite mais ${quantidadeFaltante} ${
                              quantidadeFaltante ===
                              1
                                ? "caractere"
                                : "caracteres"
                            }.`
                          : ""}
                    </p>
                  ) : null}

                  {erroBusca ? (
                    <div
                      className="entrada-drawer__search-error"
                      role="alert"
                    >
                      <AlertCircle
                        size={17}
                      />

                      <span>
                        {erroBusca}
                      </span>
                    </div>
                  ) : null}

                  {!buscando &&
                  !erroBusca &&
                  consultaExecutada &&
                  candidatos.length ===
                    0 ? (
                    <div className="entrada-drawer__search-empty">
                      <UserRoundSearch
                        size={20}
                      />

                      <div>
                        <strong>
                          Nenhum resultado
                        </strong>

                        <p>
                          {origemCandidatos ===
                          "OCR"
                            ? "As informações identificadas na etiqueta não encontraram um destinatário compatível. Você pode tentar uma nova foto ou fazer a busca manual."
                            : "Confira o nome, Torre/Bloco ou Unidade pesquisada."}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {candidatos.length >
                  0 ? (
                    <div className="entrada-drawer__candidates">
                      {candidatos.map(
                        (
                          candidato
                        ) => (
                          <button
                            key={
                              candidato.key
                            }
                            type="button"
                            className="entrada-drawer__candidate"
                            disabled={
                              operacaoEmCurso
                            }
                            onClick={() =>
                              selecionarCandidato(
                                candidato
                              )
                            }
                          >
                            <div className="entrada-drawer__candidate-avatar">
                              <CircleUserRound
                                size={20}
                              />
                            </div>

                            <div className="entrada-drawer__candidate-content">
                              <strong>
                                {
                                  candidato.nome
                                }
                              </strong>

                              <span>
                                {formatarTorreBloco(
                                  {
                                    torre:
                                      candidato.torre,

                                    torreIdentificador:
                                      candidato
                                        .torreIdentificador,

                                    bloco:
                                      candidato.bloco,
                                  }
                                )}

                                {" • "}

                                Unidade{" "}

                                {candidato.unidade ||
                                  "—"}
                              </span>

                              <small>
                                {obterTipoLabel(
                                  candidato
                                    .destinatarioTipo
                                )}
                              </small>

                              {candidato
                                ?.origemIdentificacao ===
                                "OCR_ETIQUETA" &&
                              candidato
                                ?.correspondenciaLabel ? (
                                <small className="entrada-drawer__candidate-match">
                                  {
                                    candidato
                                      .correspondenciaLabel
                                  }
                                </small>
                              ) : null}
                            </div>

                            <span className="entrada-drawer__candidate-action">
                              Selecionar
                            </span>
                          </button>
                        )
                      )}
                    </div>
                  ) : null}
                </section>
              ) : null}

              {/* =============================================
                  DESTINATÁRIO
                  ============================================= */}

              {destinatarioExibido ? (
                <section className="entrada-drawer__section">
                  <div className="entrada-drawer__section-heading">
                    <CircleUserRound
                      size={18}
                    />

                    <div>
                      <span>
                        Destinatário
                      </span>

                      <h3>
                        Conferência do
                        morador
                      </h3>
                    </div>
                  </div>

                  <div className="entrada-drawer__recipient">
                    <div className="entrada-drawer__recipient-avatar">
                      <CircleUserRound
                        size={24}
                      />
                    </div>

                    <div className="entrada-drawer__recipient-content">
                      <span>
                        Destinatário
                      </span>

                      <strong>
                        {
                          destinatarioExibido
                            .nome
                        }
                      </strong>

                      <p>
                        {
                          torreBlocoExibido
                        }

                        {" • "}

                        Unidade{" "}

                        {
                          unidadeExibida
                        }
                      </p>
                    </div>

                    <CheckCircle2
                      size={20}
                      className="entrada-drawer__recipient-check"
                    />
                  </div>

                  {candidatoSelecionado &&
                  !confirmacaoSucesso ? (
                    <button
                      type="button"
                      className="entrada-drawer__change-recipient"
                      onClick={
                        trocarDestinatario
                      }
                      disabled={
                        operacaoEmCurso
                      }
                    >
                      Trocar
                      destinatário
                    </button>
                  ) : null}
                </section>
              ) : null}

              {/* =============================================
                  DESTINO
                  ============================================= */}

              <section className="entrada-drawer__section">
                <div className="entrada-drawer__section-heading">
                  <Building2
                    size={18}
                  />

                  <div>
                    <span>
                      Destino
                    </span>

                    <h3>
                      Unidade do
                      condomínio
                    </h3>
                  </div>
                </div>

                <div className="entrada-drawer__details-grid">
                  <div className="entrada-drawer__detail">
                    <span>
                      Torre / Bloco
                    </span>

                    <strong>
                      {
                        torreBlocoExibido
                      }
                    </strong>
                  </div>

                  <div className="entrada-drawer__detail">
                    <span>
                      Unidade
                    </span>

                    <strong>
                      {
                        unidadeExibida
                      }
                    </strong>
                  </div>
                </div>

                
              </section>

              {/* =============================================
                  RECEBIMENTO
                  ============================================= */}

              <section className="entrada-drawer__section">
                <div className="entrada-drawer__section-heading">
                  <Truck
                    size={18}
                  />

                  <div>
                    <span>
                      Origem
                    </span>

                    <h3>
                      Dados do
                      Recebimento
                    </h3>
                  </div>
                </div>

                <div className="entrada-drawer__info-list">
                  <div>
                    <span>
                      Transportadora
                    </span>

                    <strong>
                      {
                        transportadoraNome
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Origem
                    </span>

                    <strong>
                      Recebimento da
                      Portaria
                    </strong>
                  </div>

                  <div>
                    <span>
                      Próxima ação
                    </span>

                    <strong>
                      {armazenamentoConcluido
                        ? "Armazenamento concluído"
                        : armazenamentoPendente
                          ? "Armazenar encomenda"
                          : confirmacaoSucesso
                            ? "Entrada concluída"
                            : divergenciaCodigoAtiva
                              ? "Rever código"
                              : destinatarioExibido
                                ? "Confirmar entrada"
                                : "Identificar destinatário"}
                    </strong>
                  </div>
                </div>
              </section>

              {/* =============================================
                  ESTADOS DE CONFIRMAÇÃO
                  ============================================= */}

              {confirmando ? (
                <section
                  className="entrada-drawer__confirm-state entrada-drawer__confirm-state--loading"
                  role="status"
                  aria-live="polite"
                >
                  <LoaderCircle
                    size={22}
                    className="entrada-drawer__spinner"
                  />

                  <div>
                    <strong>
                      Confirmando entrada
                    </strong>

                    <p>
                      Registrando a
                      Entrada deste volume
                      com segurança.
                      Aguarde.
                    </p>
                  </div>
                </section>
              ) : null}

              {confirmacaoSucesso ? (
                <section
                  className="entrada-drawer__confirm-state entrada-drawer__confirm-state--success"
                  role="status"
                  aria-live="polite"
                >
                  <CheckCircle2
                    size={22}
                  />

                  <div>
                    <strong>
                      Entrada confirmada
                    </strong>

                    <p>
                      O volume foi
                      registrado com
                      sucesso. Agora
                      conclua o
                      armazenamento
                      físico.
                    </p>
                  </div>
                </section>
              ) : null}

              {confirmacaoSucesso &&
              contextoArmazenamentoPronto &&
              !armazenamentoConcluido ? (
                <EntradaArmazenamento
                  ref={
                    contextoRaizEhNovaEntrada
                      ? armazenamentoRef
                      : undefined
                  }
                  encomendaId={
                    encomendaIdArmazenamento
                  }
                  condominioId={
                    condominioIdArmazenamento
                  }
                  tipoEntrega={
                    tipoEntregaArmazenamento
                  }
                  disabled={
                    confirmando
                  }
                  acaoExterna={
                    contextoRaizEhNovaEntrada
                  }
                  onEstadoOperacaoChange={
                    setArmazenamentoEmCurso
                  }
                  onEstadoAcaoChange={
                    contextoRaizEhNovaEntrada
                      ? setEstadoAcaoArmazenamento
                      : undefined
                  }
                  onArmazenado={
                    contextoRaizEhNovaEntrada
                      ? handleArmazenadoNovaEntrada
                      : handleArmazenado
                  }
                />
              ) : null}

              {confirmacaoSucesso &&
              !contextoArmazenamentoPronto ? (
                <section
                  className="entrada-drawer__confirm-state entrada-drawer__confirm-state--error"
                  role="alert"
                >
                  <AlertCircle
                    size={22}
                  />

                  <div>
                    <strong>
                      Entrada confirmada,
                      mas sem contexto de
                      armazenamento
                    </strong>

                    <p>
                      A Entrada já foi
                      registrada. Feche e
                      atualize a fila antes
                      de qualquer nova ação;
                      não repita a Entrada.
                    </p>
                  </div>
                </section>
              ) : null}

              {erroConfirmacao ? (
                <section
                  className="entrada-drawer__confirm-state entrada-drawer__confirm-state--error"
                  role="alert"
                >
                  <AlertCircle
                    size={22}
                  />

                  <div>
                    <strong>
                      Não foi possível
                      confirmar
                    </strong>

                    <p>
                      {
                        erroConfirmacao
                      }
                    </p>
                  </div>
                </section>
              ) : null}

              {!confirmacaoSucesso ? (
                <section className="entrada-drawer__guidance">
                  <MapPin
                    size={18}
                  />

                  <div>
                    <strong>
                      Antes de
                      continuar
                    </strong>

                    <p>
                      Confira o volume
                      físico, o
                      destinatário e a
                      unidade antes de
                      confirmar a
                      Entrada.
                    </p>
                  </div>
                </section>
              ) : null}
            </>
          ) : null}
        </div>

        {/* ===================================================
            FOOTER
            =================================================== */}

        <footer className="entrada-drawer__footer">
          <button
            type="button"
            className="entrada-drawer__secondary"
            onClick={
              fecharOuVoltar
            }
            disabled={
              operacaoEmCurso ||
              cameraCapturaAberta ||
              bloqueioArmazenamentoPendente
            }
          >
            {podeVoltarAoLote ? (
              <>
                <ArrowLeft
                  size={16}
                />

                Voltar
              </>
            ) : (
              "Fechar"
            )}
          </button>

          {armazenamentoNovaEntradaAtivo ? (
            <button
              type="button"
              className="entrada-drawer__primary"
              onClick={
                handleContinuarArmazenamento
              }
              disabled={
                operacaoEmCurso ||
                !estadoAcaoArmazenamento
                  ?.podeContinuar
              }
              aria-busy={
                armazenamentoEmCurso
              }
            >
              {armazenamentoEmCurso ? (
                <>
                  <LoaderCircle
                    size={17}
                    className="entrada-drawer__spinner entrada-drawer__spinner--button"
                  />

                  Registrando...
                </>
              ) : (
                <>
                  <ChevronRight
                    size={17}
                  />

                  Continuar
                </>
              )}
            </button>
          ) : null}          

          {contextoRaizEhNovaEntrada &&
          etapaOperacional ===
            ETAPA_OPERACIONAL.DISPONIBILIZACAO &&
          contextoDisponibilizacao ? (
            <button
              type="button"
              className="entrada-drawer__primary"
              onClick={
                handleConfirmarDisponibilizacao
              }
              disabled={
                operacaoEmCurso ||
                !contextoDisponibilizacao
                  .elegivelDisponibilizacao
              }
              aria-busy={
                confirmandoDisponibilizacao
              }
            >
              {confirmandoDisponibilizacao ? (
                <>
                  <LoaderCircle
                    size={17}
                    className="entrada-drawer__spinner entrada-drawer__spinner--button"
                  />

                  Disponibilizando...
                </>
              ) : (
                <>
                  <CheckCircle2
                    size={17}
                  />

                  Confirmar Disponibilização
                </>
              )}
            </button>
          ) : null}

          {visualizandoVolume &&
          !confirmacaoSucesso ? (
            <button
              type="button"
              className="entrada-drawer__primary"
              onClick={
                handleConfirmarEntrada
              }
              disabled={
                operacaoEmCurso ||
                cameraCapturaAberta ||
                !entradaPodeSerConfirmada ||
                Boolean(
                  confirmacaoSucesso
                )
              }
              aria-busy={
                confirmando
              }
              aria-disabled={
                operacaoEmCurso ||
                cameraCapturaAberta ||
                !entradaPodeSerConfirmada ||
                Boolean(
                  confirmacaoSucesso
                )
              }
              title={
                divergenciaCodigoAtiva
                  ? "Faça uma nova conferência do código antes de confirmar."
                  : !destinatarioProntoParaConfirmar
                    ? "Identifique e confira o destinatário antes de confirmar."
                    : undefined
              }
            >
              {confirmando ? (
                <>
                  <LoaderCircle
                    size={17}
                    className="entrada-drawer__spinner entrada-drawer__spinner--button"
                  />

                  Confirmando...
                </>
              ) : confirmacaoSucesso ? (
                <>
                  <CheckCircle2
                    size={17}
                  />

                  Entrada confirmada
                </>
              ) : (
                <>
                  <Check
                    size={17}
                  />

                  Confirmar entrada
                </>
              )}
            </button>
          ) : null}
        </footer>
      </aside>
    </div>
  );
}