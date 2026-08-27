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
  obterContextoVolumeEntrada,
} from "../services/entradaService";

import {
  buscarDestinatariosEntrada,
  buscaDestinatarioSuficiente,
  obterMinimoBuscaDestinatario,
} from "../services/entradaIdentificacaoService";

import EntradaCapturaCodigo
  from "./EntradaCapturaCodigo";

import EntradaEtiquetaOCR
  from "./EntradaEtiquetaOCR";

import "./EntradaDrawer.css";

const TEMPO_DEBOUNCE_MS =
  450;

const TEMPO_FEEDBACK_SUCESSO_MS =
  850;

// ============================================================
// HELPERS
// ============================================================

function textoOuNull(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const texto =
    String(value).trim();

  return texto || null;
}

function capitalizarNome(value) {
  const texto =
    textoOuNull(value);

  if (!texto) {
    return null;
  }

  return texto
    .toLocaleLowerCase("pt-BR")
    .replace(
      /(^|[\s'-])([\p{L}])/gu,
      (_, separador, letra) =>
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
    capitalizarNome(torre);

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
    capitalizarNome(bloco);

  return blocoNome || "—";
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
    volume?.entradaOficial
      ?.realizada === true ||
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
    !Array.isArray(volumes) ||
    volumes.length === 0
  ) {
    return (
      lote?.situacaoLabel ||
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

  if (concluidos > 0) {
    return "Entrada parcial";
  }

  return (
    lote?.situacaoLabel ||
    "Aguardando entrada"
  );
}

function criarChaveIdempotencia(
  volumeId
) {
  let nonce = null;

  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
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

// ============================================================
// COMPONENT
// ============================================================

export default function EntradaDrawer({
  open,
  context,
  onClose,
  onEntradaConfirmada,
}) {
  const closeButtonRef =
    useRef(null);

  const searchInputRef =
    useRef(null);

  const requisicaoContextoRef =
    useRef(0);

  const requisicaoBuscaRef =
    useRef(0);

  const chaveConfirmacaoRef =
    useRef(null);

  // ==========================================================
  // CONTEXTO RAIZ
  // ==========================================================

  const contextoRaizEhVolume =
    context?.contextType ===
      "volume";

  const contextoRaizEhLote =
    Boolean(
      context &&
      !contextoRaizEhVolume
    );

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
    context?.preRecebimentoId,
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
      ? contextoVolume?.volumeId ||
        contextoVolume?.id ||
        null
      : null;

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
    context?.preRecebimentoId,
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
  // IDENTIFICAÇÃO MANUAL
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
        ?.divergente === true
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
  // RESET DO VOLUME
  // ==========================================================

  useEffect(() => {
    ++requisicaoBuscaRef.current;

    setTermoBusca("");
    setCandidatos([]);
    setBuscando(false);
    setErroBusca(null);
    setConsultaExecutada(false);

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
    setConfirmacaoSucesso(null);
    setErroConfirmacao(null);

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

    setContextoOficial(null);
    setErroContexto(null);
    setLoadingContexto(false);

    setTermoBusca("");
    setCandidatos([]);
    setErroBusca(null);
    setBuscando(false);
    setConsultaExecutada(false);

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
    setConfirmacaoSucesso(null);
    setErroConfirmacao(null);

    chaveConfirmacaoRef.current =
      null;
  }

  const operacaoEmCurso =
    loadingContexto ||
    buscando ||
    confirmando;

  function fecharOuVoltar() {
    if (
      operacaoEmCurso ||
      cameraCapturaAberta
    ) {
      return;
    }

    if (podeVoltarAoLote) {
      voltarAoLote();
      return;
    }

    onClose?.();
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
        /*
         * O modal da câmera possui seu próprio ESC.
         */
        if (
          cameraCapturaAberta
        ) {
          return;
        }

        if (
          event.key ===
            "Escape" &&
          !operacaoEmCurso
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

      setContextoOficial(null);
      setErroContexto(null);
      setLoadingContexto(false);

      return undefined;
    }

    const requisicaoId =
      ++requisicaoContextoRef.current;

    let ativo =
      true;

    async function carregar() {
      setLoadingContexto(true);
      setErroContexto(null);
      setContextoOficial(null);

      try {
        const resultado =
          await obterContextoVolumeEntrada({
            volumeId,
          });

        if (
          !ativo ||
          requisicaoId !==
            requisicaoContextoRef.current
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
            requisicaoContextoRef.current
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
            requisicaoContextoRef.current
        ) {
          setLoadingContexto(false);
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

    const termo =
      termoBusca.trim();

    if (
      !buscaDestinatarioSuficiente(
        termo
      )
    ) {
      ++requisicaoBuscaRef.current;

      setCandidatos([]);
      setBuscando(false);
      setErroBusca(null);
      setConsultaExecutada(false);

      return undefined;
    }

    const timer =
      window.setTimeout(
        async () => {
          const requisicaoId =
            ++requisicaoBuscaRef.current;

          setBuscando(true);
          setErroBusca(null);

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
                requisicaoBuscaRef.current
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
                requisicaoBuscaRef.current
            ) {
              return;
            }

            setCandidatos([]);
            setConsultaExecutada(false);

            setErroBusca(
              err?.message ||
                "Não foi possível pesquisar."
            );
          } finally {
            if (
              requisicaoId ===
                requisicaoBuscaRef.current
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
  ]);

  // ==========================================================
  // SELEÇÃO MANUAL
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

    setErroConfirmacao(null);

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
    setConsultaExecutada(false);
    setErroConfirmacao(null);

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
    setErroConfirmacao(null);
    setConfirmacaoSucesso(null);

    ++requisicaoBuscaRef.current;

    setBuscando(false);
    setCandidatos([]);

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
            chaveConfirmacaoRef.current,
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
              (volume) => {
                const id =
                  volume?.volumeId ||
                  volume?.id ||
                  null;

                if (
                  id !==
                  volumeId
                ) {
                  return volume;
                }

                return {
                  ...volume,

                  situacao:
                    "ENTRADA_CONCLUIDA",

                  situacaoLabel:
                    "Entrada concluída",

                  entradaOficial: {
                    ...(volume
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

      try {
        await onEntradaConfirmada?.();
      } catch (
        refreshError
      ) {
        console.warn(
          "[Entrada] Entrada confirmada, mas a atualização da fila falhou.",
          refreshError
        );
      }

      if (
        contextoRaizEhLote
      ) {
        voltarAoLote();
      } else {
        onClose?.();
      }
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
          cameraCapturaAberta
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
          cameraCapturaAberta
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
              cameraCapturaAberta
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

        <div className="entrada-drawer__body">
          {visualizandoLote ? (
            <>
              <section className="entrada-drawer__lot-hero">
                <div>
                  <span>
                    Lote selecionado
                  </span>

                  <strong>
                    {context
                      ?.referenciaLote ||
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
                    (volume) => {
                      const concluido =
                        volumeConcluido(
                          volume
                        );

                      return (
                        <button
                          key={
                            volume.id ||
                            volume.volumeId
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
                              volume
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
                              {volume.referencia ||
                                "Volume"}
                            </strong>

                            <span>
                              {volume.codigoCapturado ||
                                "Código não informado"}
                            </span>
                          </div>

                          <div className="entrada-drawer__lot-volume-status">
                            {concluido
                              ? "Entrada concluída"
                              : volume.situacaoLabel ||
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
                    destinatário. Depois
                    de cada confirmação,
                    você voltará para
                    esta visão do lote.
                  </p>
                </div>
              </section>
            </>
          ) : null}

          {visualizandoVolume &&
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

          {visualizandoVolume &&
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

          {visualizandoVolume &&
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
                    {confirmacaoSucesso
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
                  onConferenciaChange={
                    (
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
                    }
                  }
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
                      consultaExecutada,
                    }) => {
                      /*
                      * O React NÃO calcula identidade.
                      *
                      * Apenas recebe os candidatos
                      * canônicos ordenados pelo backend.
                      */

                      setErroBusca(
                        null
                      );

                      setConsultaExecutada(
                        consultaExecutada ===
                        true
                      );

                      setCandidatos(
                        Array.isArray(
                          resultados
                        )
                          ? resultados
                          : []
                      );

                      setCandidatoSelecionado(
                        null
                      );

                      /*
                      * Limpamos a busca textual para não
                      * misturar resultado manual e OCR.
                      */
                      setTermoBusca(
                        ""
                      );
                    }}
                  />
                ) : null}

              {/* =============================================
                  BUSCA MANUAL DE DESTINATÁRIO
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
                          setTermoBusca(
                            event
                              .target
                              .value
                          )
                        }
                        placeholder="Nome, torre/bloco ou unidade"
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

                  {!buscaDestinatarioSuficiente(
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
                          Confira o nome,
                          Torre/Bloco ou
                          Unidade
                          pesquisada.
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
                      {confirmacaoSucesso
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
                      sucesso.
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
              Boolean(
                confirmacaoSucesso
              )
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

          {visualizandoVolume ? (
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