import {
  AlertCircle,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  LoaderCircle,
  MapPin,
  PackageCheck,
  Search,
  Thermometer,
  Warehouse,
} from "lucide-react";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  confirmarArmazenamentoEntrada,
  listarLocalizacoesArmazenamento,
} from "../services/entradaArmazenamentoService";

import "./EntradaArmazenamento.css";

const DEBOUNCE_BUSCA_MS =
  350;

const TEMPO_FEEDBACK_SUCESSO_MS =
  850;

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

function formatarCapacidade(
  localizacao
) {
  if (
    localizacao
      ?.capacidadeMaxima ===
      null ||
    localizacao
      ?.capacidadeMaxima ===
      undefined
  ) {
    return "Sem limite cadastrado";
  }

  const ocupacao =
    Number(
      localizacao
        ?.ocupacaoAtual ||
        0
    );

  const capacidade =
    Number(
      localizacao
        ?.capacidadeMaxima ||
        0
    );

  return `${ocupacao} de ${capacidade} ocupados`;
}

function obterCapacidadePercentual(
  localizacao
) {
  if (
    localizacao
      ?.ocupacaoPercentual ===
      null ||
    localizacao
      ?.ocupacaoPercentual ===
      undefined
  ) {
    return null;
  }

  const percentual =
    Number(
      localizacao
        .ocupacaoPercentual
    );

  if (
    !Number.isFinite(
      percentual
    )
  ) {
    return null;
  }

  return Math.min(
    100,
    Math.max(
      0,
      percentual
    )
  );
}

function obterDisponibilidadeLabel(
  localizacao
) {
  if (
    localizacao
      ?.capacidadeEsgotada ===
    true
  ) {
    return "Lotado";
  }

  if (
    localizacao
      ?.capacidadeDisponivel !==
      null &&
    localizacao
      ?.capacidadeDisponivel !==
      undefined
  ) {
    const disponivel =
      Number(
        localizacao
          .capacidadeDisponivel
      );

    if (
      Number.isFinite(
        disponivel
      )
    ) {
      return `${disponivel} ${
        disponivel === 1
          ? "espaço disponível"
          : "espaços disponíveis"
      }`;
    }
  }

  return "Disponível";
}

function localizacaoSelecionavel(
  localizacao
) {
  return Boolean(
    localizacao?.id &&
    localizacao?.ativo ===
      true &&
    localizacao?.bloqueada !==
      true &&
    localizacao
      ?.capacidadeEsgotada !==
      true
  );
}

// ============================================================
// COMPONENT
// ============================================================

const EntradaArmazenamento =
  forwardRef(function EntradaArmazenamento(
    {
      encomendaId,
      condominioId,
      tipoEntrega,

      disabled = false,

      /*
       * Quando true, a ação produtiva é comandada
       * pelo Footer do Drawer.
       *
       * O fluxo antigo continua com false.
       */
      acaoExterna = false,

      onArmazenado,
      onEstadoOperacaoChange,
      onEstadoAcaoChange,
    },
    ref
  ) {
  const buscaRef =
    useRef(null);

  const requisicaoRef =
    useRef(0);

  const mountedRef =
    useRef(true);

  // ==========================================================
  // LISTAGEM
  // ==========================================================

  const [
    localizacoes,
    setLocalizacoes,
  ] =
    useState([]);

  const [
    carregando,
    setCarregando,
  ] =
    useState(false);

  const [
    erroListagem,
    setErroListagem,
  ] =
    useState(null);

  const [
    mensagemBackend,
    setMensagemBackend,
  ] =
    useState(null);

  const [
    armazenamentoHabilitado,
    setArmazenamentoHabilitado,
  ] =
    useState(true);

  // ==========================================================
  // BUSCA
  // ==========================================================

  const [
    busca,
    setBusca,
  ] =
    useState("");

  // ==========================================================
  // SELEÇÃO
  // ==========================================================

  const [
    localizacaoSelecionadaId,
    setLocalizacaoSelecionadaId,
  ] =
    useState(null);

  // ==========================================================
  // CONFIRMAÇÃO
  // ==========================================================

  const [
    confirmando,
    setConfirmando,
  ] =
    useState(false);

  const [
    erroConfirmacao,
    setErroConfirmacao,
  ] =
    useState(null);

  const [
    resultadoArmazenamento,
    setResultadoArmazenamento,
  ] =
    useState(null);

  // ==========================================================
  // MOUNT
  // ==========================================================

  useEffect(() => {
    mountedRef.current =
      true;

    return () => {
      mountedRef.current =
        false;

      ++requisicaoRef.current;
    };
  }, []);

  // ==========================================================
  // RESET QUANDO MUDAR A ENCOMENDA
  // ==========================================================

  useEffect(() => {
    ++requisicaoRef.current;

    setLocalizacoes([]);
    setCarregando(false);
    setErroListagem(null);
    setMensagemBackend(null);

    setBusca("");

    setLocalizacaoSelecionadaId(
      null
    );

    setConfirmando(false);
    setErroConfirmacao(null);

    setResultadoArmazenamento(
      null
    );

    setArmazenamentoHabilitado(
      true
    );
  }, [
    encomendaId,
    condominioId,
    tipoEntrega,
  ]);

  // ==========================================================
  // ESTADO DA OPERAÇÃO PARA O DRAWER
  // ==========================================================

  const operacaoEmCurso =
    carregando ||
    confirmando;

  useEffect(() => {
    onEstadoOperacaoChange?.(
      operacaoEmCurso
    );
  }, [
    operacaoEmCurso,
    onEstadoOperacaoChange,
  ]);

  // ==========================================================
  // CARREGAR LOCALIZAÇÕES
  // ==========================================================

  useEffect(() => {
    const condominio =
      textoOuNull(
        condominioId
      );

    const encomenda =
      textoOuNull(
        encomendaId
      );

    const tipoEntregaOficial =
      textoOuNull(
        tipoEntrega
      );

    if (
      !condominio ||
      !encomenda ||
      resultadoArmazenamento
    ) {
      return undefined;
    }

    if (!tipoEntregaOficial) {
      setLocalizacoes([]);
      setErroListagem(
        "O tipo oficial da encomenda não foi informado pelo backend."
      );
      return undefined;
    }

    const termo =
      busca.trim();

    const timer =
      window.setTimeout(
        async () => {
          const requisicaoId =
            ++requisicaoRef.current;

          setCarregando(true);
          setErroListagem(null);

          try {
            const resultado =
              await listarLocalizacoesArmazenamento({
                condominioId:
                  condominio,

                tipoEntrega:
                  tipoEntregaOficial,

                busca:
                  termo ||
                  null,

                apenasDisponiveis:
                  true,

                incluirOcupacao:
                  true,

                limite:
                  100,

                offset:
                  0,
              });

            if (
              !mountedRef.current ||
              requisicaoId !==
                requisicaoRef.current
            ) {
              return;
            }

            setArmazenamentoHabilitado(
              resultado
                .armazenamentoHabilitado ===
                true
            );

            setMensagemBackend(
              resultado.mensagem ||
                null
            );

            setLocalizacoes(
              Array.isArray(
                resultado.itens
              )
                ? resultado.itens
                : []
            );

            /*
             * Se uma localização previamente selecionada
             * deixar de estar na resposta atual, removemos
             * a seleção para não confirmar um item invisível.
             */
            setLocalizacaoSelecionadaId(
              (atual) => {
                const itens =
                  Array.isArray(
                    resultado.itens
                  )
                    ? resultado.itens
                    : [];

                /*
                * Se já existe uma escolha do operador,
                * ela sempre tem prioridade enquanto
                * continuar disponível.
                */
                if (atual) {
                  const continuaDisponivel =
                    itens.some(
                      (item) =>
                        item.id ===
                          atual &&
                        localizacaoSelecionavel(
                          item
                        )
                    );

                  if (
                    continuaDisponivel
                  ) {
                    return atual;
                  }
                }

                /*
                * SALA-ENC é apenas a preferência
                * operacional inicial.
                *
                * Nunca fixamos UUID.
                * Nunca selecionamos um local indisponível.
                * Não reaplicamos o default durante busca
                * textual do operador.
                */
                if (!termo) {
                  const localPadrao =
                    itens.find(
                      (item) =>
                        textoOuNull(
                          item?.codigo
                        )
                          ?.toLocaleUpperCase(
                            "pt-BR"
                          ) ===
                          "SALA-ENC" &&
                        localizacaoSelecionavel(
                          item
                        )
                    );

                  if (
                    localPadrao?.id
                  ) {
                    return localPadrao.id;
                  }
                }

                return null;
              }
            );
          } catch (err) {
            if (
              !mountedRef.current ||
              requisicaoId !==
                requisicaoRef.current
            ) {
              return;
            }

            setLocalizacoes([]);

            setErroListagem(
              err?.message ||
                "Não foi possível carregar os locais de armazenamento."
            );
          } finally {
            if (
              mountedRef.current &&
              requisicaoId ===
                requisicaoRef.current
            ) {
              setCarregando(
                false
              );
            }
          }
        },
        busca
          ? DEBOUNCE_BUSCA_MS
          : 0
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    encomendaId,
    condominioId,
    tipoEntrega,
    busca,
    resultadoArmazenamento,
  ]);

  // ==========================================================
  // LOCALIZAÇÃO SELECIONADA
  // ==========================================================

  const localizacaoSelecionada =
    useMemo(
      () =>
        localizacoes.find(
          (item) =>
            item.id ===
            localizacaoSelecionadaId
        ) ||
        null,
      [
        localizacoes,
        localizacaoSelecionadaId,
      ]
    );

    const podeConfirmarArmazenamento =
      Boolean(
        !disabled &&
        !carregando &&
        !confirmando &&
        !resultadoArmazenamento &&
        armazenamentoHabilitado &&
        localizacaoSelecionada &&
        localizacaoSelecionavel(
          localizacaoSelecionada
        )
      );

  // ==========================================================
  // SELEÇÃO
  // ==========================================================

  function selecionarLocalizacao(
    localizacao
  ) {
    if (
      disabled ||
      operacaoEmCurso ||
      resultadoArmazenamento ||
      !localizacaoSelecionavel(
        localizacao
      )
    ) {
      return;
    }

    setLocalizacaoSelecionadaId(
      localizacao.id
    );

    setErroConfirmacao(
      null
    );
  }

  // ==========================================================
  // CONFIRMAR
  // ==========================================================

  async function handleConfirmarArmazenamento() {
    if (
      disabled ||
      confirmando ||
      resultadoArmazenamento
    ) {
      return;
    }

    if (
      !localizacaoSelecionada?.id
    ) {
      setErroConfirmacao(
        "Selecione o local onde a encomenda foi armazenada."
      );

      return;
    }

    if (
      !localizacaoSelecionavel(
        localizacaoSelecionada
      )
    ) {
      setErroConfirmacao(
        "O local selecionado não está mais disponível."
      );

      return;
    }

    setConfirmando(true);
    setErroConfirmacao(null);

    try {
      const resultado =
        await confirmarArmazenamentoEntrada({
          encomendaId,

          localizacaoId:
            localizacaoSelecionada.id,

          observacoes:
            null,
        });

      if (
        !mountedRef.current
      ) {
        return;
      }

      setResultadoArmazenamento(
        resultado
      );

      await new Promise(
        (resolve) => {
          window.setTimeout(
            resolve,
            TEMPO_FEEDBACK_SUCESSO_MS
          );
        }
      );

      if (
        !mountedRef.current
      ) {
        return;
      }

      await onArmazenado?.(
        resultado
      );
    } catch (err) {
      if (
        !mountedRef.current
      ) {
        return;
      }

      setErroConfirmacao(
        err?.message ||
          "Não foi possível registrar o armazenamento."
      );
    } finally {
      if (
        mountedRef.current
      ) {
        setConfirmando(
          false
        );
      }
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      confirmar:
        handleConfirmarArmazenamento,

      podeConfirmar:
        podeConfirmarArmazenamento,

      confirmando,

      localizacaoSelecionada,
    }),
    [
      podeConfirmarArmazenamento,
      confirmando,
      localizacaoSelecionada,
    ]
  );

  useEffect(() => {
    onEstadoAcaoChange?.({
      podeContinuar:
        podeConfirmarArmazenamento,

      confirmando,

      carregando,

      localizacaoSelecionadaId:
        localizacaoSelecionada
          ?.id ||
        null,

      localizacaoSelecionadaCodigo:
        localizacaoSelecionada
          ?.codigo ||
        null,

      localizacaoSelecionadaNome:
        localizacaoSelecionada
          ?.nomeCompleto ||
        localizacaoSelecionada
          ?.nome ||
        null,
    });
  }, [
    podeConfirmarArmazenamento,
    confirmando,
    carregando,
    localizacaoSelecionada,
    onEstadoAcaoChange,
  ]);

  // ==========================================================
  // SUCESSO
  // ==========================================================

  if (
    resultadoArmazenamento
  ) {
    return (
      <section className="entrada-armazenamento entrada-armazenamento--success">
        <div className="entrada-armazenamento__success-icon">
          <CheckCircle2
            size={24}
          />
        </div>

        <div className="entrada-armazenamento__success-content">
          <span>
            Armazenamento
          </span>

          <h3>
            Encomenda armazenada
          </h3>

          <p>
            O local físico foi
            registrado com sucesso.
          </p>

          <div className="entrada-armazenamento__success-location">
            <MapPin
              size={17}
            />

            <div>
              <span>
                Local registrado
              </span>

              <strong>
                {resultadoArmazenamento
                  .localizacaoNomeCompleto ||
                  resultadoArmazenamento
                    .localizacaoNome ||
                  "Local de armazenamento"}
              </strong>

              {resultadoArmazenamento
                .localizacaoCodigo ? (
                <small>
                  Código{" "}
                  {
                    resultadoArmazenamento
                      .localizacaoCodigo
                  }
                </small>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    );
  }

  

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <section className="entrada-armazenamento">
      {/* =====================================================
          CABEÇALHO
          ===================================================== */}

      <div className="entrada-armazenamento__heading">
        <div className="entrada-armazenamento__heading-icon">
          <Warehouse
            size={19}
          />
        </div>

        <div>
          <span>
            Próxima etapa
          </span>

          <h3>
            Armazenamento
          </h3>

          <p>
            Informe onde o volume
            ficará guardado.
          </p>
        </div>
      </div>

      {/* =====================================================
          INFORMAÇÃO OPERACIONAL
          ===================================================== */}

      <div className="entrada-armazenamento__notice">
        <PackageCheck
          size={19}
        />

        <div>
          <strong>
            Entrada concluída
          </strong>

          <p>
            Agora selecione o local
            físico onde a encomenda
            foi armazenada.
          </p>
        </div>
      </div>

      {/* =====================================================
          ARMAZENAMENTO DESABILITADO
          ===================================================== */}

      {!armazenamentoHabilitado ? (
        <div
          className="entrada-armazenamento__error"
          role="status"
        >
          <AlertCircle
            size={19}
          />

          <div>
            <strong>
              Armazenamento indisponível
            </strong>

            <p>
              {mensagemBackend ||
                "O armazenamento não está habilitado para este condomínio."}
            </p>
          </div>
        </div>
      ) : null}

      {/* =====================================================
          BUSCA
          ===================================================== */}

      {armazenamentoHabilitado ? (
        <label className="entrada-armazenamento__search">
          <span>
            Local de armazenamento
          </span>

          <div className="entrada-armazenamento__search-control">
            <Search
              size={18}
            />

            <input
              ref={
                buscaRef
              }
              type="search"
              value={
                busca
              }
              onChange={(
                event
              ) => {
                setBusca(
                  event
                    .target
                    .value
                );
              }}
              placeholder="Buscar local ou código"
              autoComplete="off"
              spellCheck="false"
              disabled={
                disabled ||
                operacaoEmCurso
              }
            />

            {carregando ? (
              <LoaderCircle
                size={17}
                className="entrada-armazenamento__spinner"
              />
            ) : null}
          </div>
        </label>
      ) : null}

      {/* =====================================================
          ERRO DA LISTAGEM
          ===================================================== */}

      {erroListagem ? (
        <div
          className="entrada-armazenamento__error"
          role="alert"
        >
          <AlertCircle
            size={19}
          />

          <div>
            <strong>
              Não foi possível carregar
            </strong>

            <p>
              {erroListagem}
            </p>
          </div>
        </div>
      ) : null}

      {/* =====================================================
          LOADING INICIAL
          ===================================================== */}

      {carregando &&
      localizacoes.length ===
        0 ? (
        <div className="entrada-armazenamento__loading">
          <LoaderCircle
            size={24}
            className="entrada-armazenamento__spinner"
          />

          <div>
            <strong>
              Carregando locais
            </strong>

            <p>
              Verificando os locais
              disponíveis para esta
              encomenda.
            </p>
          </div>
        </div>
      ) : null}

      {/* =====================================================
          EMPTY STATE
          ===================================================== */}

      {!carregando &&
      !erroListagem &&
      armazenamentoHabilitado &&
      localizacoes.length ===
        0 ? (
        <div className="entrada-armazenamento__empty">
          <Boxes
            size={22}
          />

          <div>
            <strong>
              Nenhum local disponível
            </strong>

            <p>
              {busca
                ? "Nenhum local disponível corresponde à busca."
                : "Não há local compatível disponível para esta encomenda."}
            </p>
          </div>
        </div>
      ) : null}

      {/* =====================================================
          LOCALIZAÇÕES
          ===================================================== */}

      {localizacoes.length >
      0 ? (
        <div className="entrada-armazenamento__locations">
          {localizacoes.map(
            (
              localizacao
            ) => {
              const selecionada =
                localizacao.id ===
                localizacaoSelecionadaId;

              const percentual =
                obterCapacidadePercentual(
                  localizacao
                );

              const selecionavel =
                localizacaoSelecionavel(
                  localizacao
                );

              return (
                <button
                  key={
                    localizacao.id
                  }
                  type="button"
                  className={`entrada-armazenamento__location ${
                    selecionada
                      ? "entrada-armazenamento__location--selected"
                      : ""
                  } ${
                    !selecionavel
                      ? "entrada-armazenamento__location--disabled"
                      : ""
                  }`}
                  disabled={
                    disabled ||
                    operacaoEmCurso ||
                    !selecionavel
                  }
                  onClick={() =>
                    selecionarLocalizacao(
                      localizacao
                    )
                  }
                  aria-pressed={
                    selecionada
                  }
                >
                  <div className="entrada-armazenamento__location-icon">
                    {selecionada ? (
                      <Check
                        size={18}
                      />
                    ) : (
                      <MapPin
                        size={18}
                      />
                    )}
                  </div>

                  <div className="entrada-armazenamento__location-content">
                    <div className="entrada-armazenamento__location-title">
                      <strong>
                        {
                          localizacao
                            .nomeCompleto
                        }
                      </strong>

                      {localizacao.codigo ? (
                        <span>
                          {
                            localizacao.codigo
                          }
                        </span>
                      ) : null}
                    </div>

                    <div className="entrada-armazenamento__location-meta">
                      <span>
                        {formatarCapacidade(
                          localizacao
                        )}
                      </span>

                      <span
                        className={
                          localizacao
                            .capacidadeEsgotada
                            ? "entrada-armazenamento__availability entrada-armazenamento__availability--full"
                            : "entrada-armazenamento__availability"
                        }
                      >
                        {obterDisponibilidadeLabel(
                          localizacao
                        )}
                      </span>
                    </div>

                    {percentual !==
                    null ? (
                      <div
                        className="entrada-armazenamento__capacity"
                        aria-label={`Ocupação ${percentual}%`}
                      >
                        <span>
                          <i
                            style={{
                              width: `${percentual}%`,
                            }}
                          />
                        </span>

                        <small>
                          {percentual}%
                          ocupado
                        </small>
                      </div>
                    ) : null}

                    {localizacao
                      .possuiControleTemperatura ? (
                      <div className="entrada-armazenamento__temperature">
                        <Thermometer
                          size={14}
                        />

                        <span>
                          Local com controle
                          de temperatura
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <ChevronRight
                    size={17}
                    className="entrada-armazenamento__location-chevron"
                  />
                </button>
              );
            }
          )}
        </div>
      ) : null}

      {/* =====================================================
          RESUMO DA SELEÇÃO
          ===================================================== */}

      {localizacaoSelecionada ? (
        <div className="entrada-armazenamento__selection">
          <div className="entrada-armazenamento__selection-icon">
            <MapPin
              size={18}
            />
          </div>

          <div>
            <span>
              Local selecionado
            </span>

            <strong>
              {
                localizacaoSelecionada
                  .nomeCompleto
              }
            </strong>

            <p>
              {localizacaoSelecionada
                .codigo
                ? `Código ${localizacaoSelecionada.codigo} • `
                : ""}

              {obterDisponibilidadeLabel(
                localizacaoSelecionada
              )}
            </p>
          </div>

          <CheckCircle2
            size={20}
          />
        </div>
      ) : null}

      {/* =====================================================
          ERRO CONFIRMAÇÃO
          ===================================================== */}

      {erroConfirmacao ? (
        <div
          className="entrada-armazenamento__error"
          role="alert"
        >
          <AlertCircle
            size={19}
          />

          <div>
            <strong>
              Não foi possível armazenar
            </strong>

            <p>
              {erroConfirmacao}
            </p>
          </div>
        </div>
      ) : null}

      {/* =====================================================
          CONFIRMANDO
          ===================================================== */}

      {confirmando ? (
        <div
          className="entrada-armazenamento__processing"
          role="status"
          aria-live="polite"
        >
          <LoaderCircle
            size={21}
            className="entrada-armazenamento__spinner"
          />

          <div>
            <strong>
              Registrando armazenamento
            </strong>

            <p>
              Aguarde enquanto o local
              físico é confirmado.
            </p>
          </div>
        </div>
      ) : null}

      {/* =====================================================
          AÇÃO
          ===================================================== */}

      {!acaoExterna ? (
        <div className="entrada-armazenamento__actions">
          <button
            type="button"
            className="entrada-armazenamento__confirm"
            onClick={
              handleConfirmarArmazenamento
            }
            disabled={
              !podeConfirmarArmazenamento
            }
            aria-busy={
              confirmando
            }
          >
            {confirmando ? (
              <>
                <LoaderCircle
                  size={17}
                  className="entrada-armazenamento__spinner"
                />

                Registrando...
              </>
            ) : (
              <>
                <PackageCheck
                  size={17}
                />

                Confirmar armazenamento
              </>
            )}
          </button>
        </div>
      ) : null}
    </section>
    );
});

export default EntradaArmazenamento;