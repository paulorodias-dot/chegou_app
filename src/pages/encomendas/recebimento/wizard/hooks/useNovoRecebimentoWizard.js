import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  concluirPersistenciaLocal,
  obterRecebimentoAtivoLocal,
  removerRecebimentoLocal,
  salvarRecebimentoLocal,

  erroPareceConectividade,
  navegadorEstaOnline,

  processarRecebimento,
  retomarRecebimento,
  concluirLoteRecebimento,

  listarTransportadorasRecebimento,
} from "../../services";

import {
  NOVO_RECEBIMENTO_ETAPAS,
  NOVO_RECEBIMENTO_LOCAL_STATUS,
  NOVO_RECEBIMENTO_PRIMEIRA_ETAPA,
  NOVO_RECEBIMENTO_SYNC_STATUS,
  NOVO_RECEBIMENTO_ULTIMA_ETAPA,
} from "../constants";

import {
  calcularDiferencaQuantidade,
  codigoJaExisteLocalmente,
  criarVolumeLocal,
  iniciarNovoRecebimentoLocal,
  marcarRecebimentoAguardandoSincronizacao,
  marcarRecebimentoConcluido,
  marcarRecebimentoConcluindo,
  montarPayloadProcessarRecebimento,
  normalizarQuantidadeLocal,
  podeAvancarIdentificacao,
  podeConcluirRecebimento,
  podeIniciarCaptura,
  recalcularEstadoCaptura,
} from "../utils";


// ============================================================
// SISTEMA CHEGOU!
// HOOK — NOVO RECEBIMENTO
//
// Responsabilidades:
// - estado do Wizard;
// - navegação;
// - captura local;
// - autosave IndexedDB;
// - recuperação após interrupção;
// - congelamento da tentativa de conclusão;
// - Fase 1: materialização do Pré-Recebimento;
// - Fase 2: conclusão do Lote;
// - retomada idempotente.
//
// NÃO:
// - acessa Supabase diretamente;
// - executa regra autoritativa de backend;
// - faz matching do Morador;
// - promove Encomenda Oficial;
// - executa Entrada Oficial.
//
// CONTRATO DE CONCLUSÃO:
//
// IndexedDB
// ↓
// processar_v2(confirmar=false)
// ↓
// Pré-Recebimento materializado
// ↓
// persistir preRecebimentoId localmente
// ↓
// lote_concluir_v3
// ↓
// LOTE_CONCLUIDO
// ↓
// somente então:
// - finalizar estado local;
// - disparar onConcluido;
// - remover rascunho.
//
// Recebimento ≠ Entrada Oficial.
// ============================================================


const AUTOSAVE_DELAY_MS = 250;


// ============================================================
// STATUS DE LOTE QUE REPRESENTAM CONCLUSÃO OU ESTADO POSTERIOR
//
// LOTE_CONCLUIDO:
// conclusão normal deste fluxo.
//
// PARCIALMENTE_PROCESSADO / PROCESSADO:
// o lote já avançou posteriormente. Em uma reconciliação,
// não devemos interpretar isso como falha do Recebimento.
// ============================================================

const STATUS_LOTE_RESOLVIDOS =
  new Set([
    "LOTE_CONCLUIDO",
    "PARCIALMENTE_PROCESSADO",
    "PROCESSADO",
  ]);


// ============================================================
// HELPERS — CONCLUSÃO
// ============================================================

function obterPreRecebimentoIdResultado(
  resultado
) {
  return (
    resultado?.pre_recebimento_id ||
    resultado?.pre_recebimento?.id ||
    resultado?.preRecebimentoId ||
    null
  );
}


function obterStatusLote(
  resultado
) {
  return (
    resultado?.status_lote ||
    resultado?.status ||
    null
  );
}


function statusLoteEstaResolvido(
  resultado
) {
  const status =
    obterStatusLote(
      resultado
    );

  return STATUS_LOTE_RESOLVIDOS.has(
    status
  );
}


function estadoPossuiDivergenciaQuantidade(
  estado
) {
  const quantidadeInformada =
    estado?.captura
      ?.quantidadeInformada;

  const quantidadeBipada =
    estado?.captura
      ?.quantidadeBipada ||
    0;

  const diferenca =
    calcularDiferencaQuantidade(
      quantidadeInformada,
      quantidadeBipada
    );

  return (
    diferenca !== null &&
    diferenca !== undefined &&
    diferenca !== 0
  );
}


function montarResultadoFinalConclusao({
  estado,
  resultadoProcessamento = null,
  resultadoLote,
}) {
  const status =
    obterStatusLote(
      resultadoLote
    );


  return {
    ok: true,

    pre_recebimento_id:
      estado.preRecebimentoId,

    processamento:
      resultadoProcessamento,

    lote:
      resultadoLote,

    status,

    status_lote:
      status,

    possui_pendencia_foto_avaria:
      Boolean(
        resultadoLote
          ?.possui_pendencia_foto_avaria ??
        resultadoLote
          ?.possui_pendencia_foto
      ),

    possui_pendencia_foto:
      Boolean(
        resultadoLote
          ?.possui_pendencia_foto ??
        resultadoLote
          ?.possui_pendencia_foto_avaria
      ),

    possui_pendencia_assinatura:
      Boolean(
        resultadoLote
          ?.possui_pendencia_assinatura
      ),

    entrada_oficial_liberada:
      Boolean(
        resultadoLote
          ?.entrada_oficial_liberada
      ),

    entregador_liberado:
      resultadoLote
        ?.entregador_liberado !==
      false,
  };
}


// ============================================================
// HOOK
// ============================================================

export default function useNovoRecebimentoWizard({
  open,
  condominioId,
  onConcluido,
} = {}) {
  const [
    state,
    setState,
  ] = useState(null);


  const [
    carregandoRecuperacao,
    setCarregandoRecuperacao,
  ] = useState(false);


  const [
    recuperacaoEncontrada,
    setRecuperacaoEncontrada,
  ] = useState(false);


  const [
    conclusaoPendenteEncontrada,
    setConclusaoPendenteEncontrada,
  ] = useState(false);


  const [
    erroInterface,
    setErroInterface,
  ] = useState(null);


  const [
    transportadoras,
    setTransportadoras,
  ] = useState([]);


  const [
    carregandoTransportadoras,
    setCarregandoTransportadoras,
  ] = useState(false);


  const [
    erroTransportadoras,
    setErroTransportadoras,
  ] = useState(null);


  const autosaveTimerRef =
    useRef(null);


  const inicializacaoRef =
    useRef(false);


  // ==========================================================
  // CRIAR NOVO ESTADO LOCAL
  // ==========================================================

  const criarNovoEstado =
    useCallback(
      () => {
        const novo =
          iniciarNovoRecebimentoLocal();


        setState(
          novo
        );


        setRecuperacaoEncontrada(
          false
        );


        setConclusaoPendenteEncontrada(
          false
        );


        setErroInterface(
          null
        );


        return novo;
      },
      []
    );


  // ==========================================================
  // RECUPERAÇÃO INICIAL
  // ==========================================================

  useEffect(() => {
    if (!open) {
      inicializacaoRef.current =
        false;

      return;
    }


    if (
      inicializacaoRef.current
    ) {
      return;
    }


    inicializacaoRef.current =
      true;


    let ativo =
      true;


    async function inicializar() {
      try {
        setCarregandoRecuperacao(
          true
        );


        const salvo =
          await obterRecebimentoAtivoLocal();


        if (!ativo) {
          return;
        }


        if (salvo) {
          setState(
            salvo
          );


          setRecuperacaoEncontrada(
            true
          );


          /*
           * Uma conclusão pendente possui:
           *
           * - payload/chave para recuperar a Fase 1; OU
           * - preRecebimentoId para retomar diretamente
           *   a Fase 2.
           */
          setConclusaoPendenteEncontrada(
            Boolean(
              salvo.conclusaoPendente &&
              (
                salvo.preRecebimentoId ||
                (
                  salvo.payloadConclusao &&
                  salvo.chaveIdempotencia
                )
              )
            )
          );


          return;
        }


        const novo =
          iniciarNovoRecebimentoLocal();


        setState(
          novo
        );


        await salvarRecebimentoLocal(
          novo
        );
      } catch (error) {
        if (!ativo) {
          return;
        }


        setErroInterface(
          error?.message ||
          "Não foi possível preparar o recebimento."
        );


        setState(
          iniciarNovoRecebimentoLocal()
        );
      } finally {
        if (ativo) {
          setCarregandoRecuperacao(
            false
          );
        }
      }
    }


    void inicializar();


    return () => {
      ativo =
        false;
    };
  }, [
    open,
  ]);


  // ==========================================================
  // TRANSPORTADORAS OFICIAIS
  // ==========================================================

  useEffect(() => {
    if (
      !open ||
      !condominioId
    ) {
      return undefined;
    }


    let ativo =
      true;


    async function carregarTransportadoras() {
      try {
        setCarregandoTransportadoras(
          true
        );


        setErroTransportadoras(
          null
        );


        const resultado =
          await listarTransportadorasRecebimento({
            condominioId,

            limite:
              100,

            offset:
              0,
          });


        if (!ativo) {
          return;
        }


        setTransportadoras(
          resultado.transportadoras ||
          []
        );
      } catch (error) {
        if (!ativo) {
          return;
        }


        console.error(
          "[Recebimento] Falha ao carregar transportadoras:",
          error
        );


        setTransportadoras(
          []
        );


        setErroTransportadoras(
          error?.message ||
          "Não foi possível carregar as transportadoras."
        );
      } finally {
        if (ativo) {
          setCarregandoTransportadoras(
            false
          );
        }
      }
    }


    void carregarTransportadoras();


    return () => {
      ativo =
        false;
    };
  }, [
    open,
    condominioId,
  ]);


  // ==========================================================
  // AUTOSAVE
  // ==========================================================

  useEffect(() => {
    if (
      !open ||
      !state?.clientReceiptId
    ) {
      return undefined;
    }


    if (
      autosaveTimerRef.current
    ) {
      clearTimeout(
        autosaveTimerRef.current
      );
    }


    autosaveTimerRef.current =
      setTimeout(
        async () => {
          try {
            await salvarRecebimentoLocal(
              state
            );
          } catch (error) {
            console.error(
              "[Recebimento] Falha no autosave local:",
              error
            );
          }
        },
        AUTOSAVE_DELAY_MS
      );


    return () => {
      if (
        autosaveTimerRef.current
      ) {
        clearTimeout(
          autosaveTimerRef.current
        );
      }
    };
  }, [
    open,
    state,
  ]);


  // ==========================================================
  // ATUALIZAÇÃO GENÉRICA
  // ==========================================================

  const atualizarState =
    useCallback(
      (updater) => {
        setState(
          (atual) => {
            if (!atual) {
              return atual;
            }


            const proximo =
              typeof updater ===
              "function"
                ? updater(atual)
                : updater;


            if (!proximo) {
              return atual;
            }


            return {
              ...proximo,

              atualizadoEm:
                new Date()
                  .toISOString(),
            };
          }
        );
      },
      []
    );


  // ==========================================================
  // RECONCILIAR TRANSPORTADORA DO RASCUNHO RECUPERADO
  // ==========================================================

  useEffect(() => {
    const transportadoraId =
      state?.identificacao
        ?.transportadoraId;


    if (
      !transportadoraId ||
      transportadoras.length ===
        0
    ) {
      return;
    }


    const encontrada =
      transportadoras.find(
        (transportadora) =>
          transportadora.id ===
          transportadoraId
      );


    if (!encontrada) {
      return;
    }


    const nomeAtual =
      state.identificacao
        ?.transportadoraNome ||
      "";


    if (
      nomeAtual ===
      encontrada.nomeFantasia
    ) {
      return;
    }


    atualizarState(
      (atual) => ({
        ...atual,

        identificacao: {
          ...atual.identificacao,

          transportadoraNome:
            encontrada.nomeFantasia,
        },
      })
    );
  }, [
    state?.identificacao
      ?.transportadoraId,

    state?.identificacao
      ?.transportadoraNome,

    transportadoras,

    atualizarState,
  ]);


  // ==========================================================
  // IDENTIFICAÇÃO
  // ==========================================================

  const atualizarIdentificacao =
    useCallback(
      (
        campo,
        valor
      ) => {
        atualizarState(
          (atual) => ({
            ...atual,

            identificacao: {
              ...atual.identificacao,

              [campo]:
                valor,
            },
          })
        );
      },
      [
        atualizarState,
      ]
    );


  // ==========================================================
  // QUANTIDADE INFORMADA
  // ==========================================================

  const atualizarQuantidadeInformada =
    useCallback(
      (valor) => {
        atualizarState(
          (atual) => {
            const quantidade =
              normalizarQuantidadeLocal(
                valor
              );


            return recalcularEstadoCaptura({
              ...atual,

              captura: {
                ...atual.captura,

                quantidadeInformada:
                  quantidade,
              },
            });
          }
        );
      },
      [
        atualizarState,
      ]
    );


  // ==========================================================
  // CAPTURA LOCAL
  // ==========================================================

  const adicionarVolumeLocal =
    useCallback(
      ({
        codigoLido,
        formatoCodigo,
        origemCaptura,
        confianca,
      } = {}) => {
        if (
          !codigoLido?.trim()
        ) {
          return {
            ok:
              false,

            motivo:
              "CODIGO_VAZIO",
          };
        }


        if (
          !podeIniciarCaptura(
            state
          )
        ) {
          return {
            ok:
              false,

            motivo:
              "QUANTIDADE_NAO_INFORMADA",
          };
        }


        if (
          codigoJaExisteLocalmente(
            state?.captura?.volumes,
            codigoLido
          )
        ) {
          return {
            ok:
              false,

            motivo:
              "CODIGO_DUPLICADO_LOCAL",
          };
        }


        const volume =
          criarVolumeLocal({
            codigoLido,
            formatoCodigo,
            origemCaptura,
            confianca,
          });


        atualizarState(
          (atual) =>
            recalcularEstadoCaptura({
              ...atual,

              captura: {
                ...atual.captura,

                volumes: [
                  ...atual.captura
                    .volumes,

                  volume,
                ],
              },
            })
        );


        return {
          ok:
            true,

          volume,
        };
      },
      [
        state,
        atualizarState,
      ]
    );


  // ==========================================================
  // REMOVER VOLUME LOCAL
  //
  // Enquanto nenhum Pré foi materializado, o volume existe
  // somente no modelo local.
  //
  // Depois da Fase 1, não devemos tratar uma alteração local
  // como se ela automaticamente alterasse o Pré já persistido.
  // A UI será refinada posteriormente para bloquear edição
  // incompatível durante uma conclusão parcialmente executada.
  // ==========================================================

  const removerVolumeLocal =
    useCallback(
      (clientVolumeId) => {
        atualizarState(
          (atual) => {
            const volumes =
              atual.captura.volumes.filter(
                (volume) =>
                  volume.clientVolumeId !==
                  clientVolumeId
              );


            return recalcularEstadoCaptura({
              ...atual,

              captura: {
                ...atual.captura,

                volumes,
              },
            });
          }
        );
      },
      [
        atualizarState,
      ]
    );


  // ==========================================================
  // AVARIA LOCAL
  // ==========================================================

  const atualizarAvariaVolume =
    useCallback(
      (
        clientVolumeId,
        avaria
      ) => {
        atualizarState(
          (atual) => ({
            ...atual,

            captura: {
              ...atual.captura,

              volumes:
                atual.captura
                  .volumes
                  .map(
                    (volume) =>
                      volume.clientVolumeId ===
                      clientVolumeId
                        ? {
                            ...volume,

                            avaria:
                              avaria ||
                              null,
                          }
                        : volume
                  ),
            },
          })
        );
      },
      [
        atualizarState,
      ]
    );


  // ==========================================================
  // EVIDÊNCIA LOCAL
  // ==========================================================

  const adicionarEvidenciaVolume =
    useCallback(
      (
        clientVolumeId,
        evidencia
      ) => {
        atualizarState(
          (atual) => ({
            ...atual,

            captura: {
              ...atual.captura,

              volumes:
                atual.captura
                  .volumes
                  .map(
                    (volume) =>
                      volume.clientVolumeId ===
                      clientVolumeId
                        ? {
                            ...volume,

                            evidencias: [
                              ...(
                                volume.evidencias ||
                                []
                              ),

                              evidencia,
                            ],
                          }
                        : volume
                  ),
            },
          })
        );
      },
      [
        atualizarState,
      ]
    );


  // ==========================================================
  // ASSINATURA
  // ==========================================================

  const definirAssinatura =
    useCallback(
      (assinatura) => {
        atualizarState(
          (atual) => ({
            ...atual,

            assinatura:
              assinatura ||
              null,
          })
        );
      },
      [
        atualizarState,
      ]
    );


  // ==========================================================
  // OBSERVAÇÕES
  // ==========================================================

  const definirObservacoes =
    useCallback(
      (valor) => {
        atualizarState(
          (atual) => ({
            ...atual,

            observacoes:
              valor,
          })
        );
      },
      [
        atualizarState,
      ]
    );


  const definirJustificativaDivergencia =
    useCallback(
      (valor) => {
        atualizarState(
          (atual) => ({
            ...atual,

            justificativaDivergencia:
              valor,
          })
        );
      },
      [
        atualizarState,
      ]
    );


  // ==========================================================
  // NAVEGAÇÃO
  // ==========================================================

  const irParaProximaEtapa =
    useCallback(
      () => {
        atualizarState(
          (atual) => ({
            ...atual,

            etapaAtual:
              Math.min(
                atual.etapaAtual +
                  1,

                NOVO_RECEBIMENTO_ULTIMA_ETAPA
              ),
          })
        );
      },
      [
        atualizarState,
      ]
    );


  const voltarEtapa =
    useCallback(
      () => {
        atualizarState(
          (atual) => ({
            ...atual,

            etapaAtual:
              Math.max(
                atual.etapaAtual -
                  1,

                NOVO_RECEBIMENTO_PRIMEIRA_ETAPA
              ),
          })
        );
      },
      [
        atualizarState,
      ]
    );


  // ==========================================================
  // PERSISTIR TENTATIVA DE CONCLUSÃO
  //
  // Chave + payload ficam congelados ANTES da primeira RPC.
  //
  // Se já existe preRecebimentoId, a Fase 1 já foi confirmada.
  // Nesse caso continuamos preservando o payload congelado,
  // mas NÃO precisaremos executar processar_v2 novamente.
  // ==========================================================

  const prepararConclusao =
    useCallback(
      async () => {
        if (!state) {
          throw new Error(
            "Recebimento não iniciado."
          );
        }


        if (!condominioId) {
          throw new Error(
            "Condomínio não identificado."
          );
        }


        if (
          !podeConcluirRecebimento(
            state
          )
        ) {
          throw new Error(
            "O recebimento ainda não possui os dados necessários para conclusão."
          );
        }


        const payload =
          montarPayloadProcessarRecebimento({
            state,
            condominioId,
          });


        const congelado = {
          ...marcarRecebimentoConcluindo(
            state
          ),

          payloadConclusao:
            payload,

          conclusaoPendente:
            true,

          conclusaoIniciadaEm:
            state.conclusaoIniciadaEm ||
            new Date()
              .toISOString(),

          /*
           * Não apagamos um Pré já materializado.
           */
          preRecebimentoId:
            state.preRecebimentoId ||
            null,

          faseConclusao:
            state.preRecebimentoId
              ? "PRE_RECEBIMENTO_PROCESSADO"
              : "PREPARADA",
        };


        /*
         * IndexedDB primeiro.
         *
         * Só depois o servidor.
         */
        await salvarRecebimentoLocal(
          congelado
        );


        setState(
          congelado
        );


        return congelado;
      },
      [
        state,
        condominioId,
      ]
    );


  // ==========================================================
  // REGISTRAR FASE 1 CONCLUÍDA
  //
  // O Pré já existe no servidor.
  //
  // Persistir preRecebimentoId ANTES da Fase 2 é obrigatório
  // para recuperação segura após:
  // - queda de internet;
  // - timeout;
  // - fechamento do navegador;
  // - desligamento do computador.
  // ==========================================================

  const registrarPreRecebimentoProcessado =
    useCallback(
      async (
        estadoAtual,
        resultadoProcessamento
      ) => {
        const preRecebimentoId =
          obterPreRecebimentoIdResultado(
            resultadoProcessamento
          );


        if (!preRecebimentoId) {
          throw new Error(
            "O processamento não retornou o identificador do Pré-Recebimento."
          );
        }


        const atualizado = {
          ...estadoAtual,

          preRecebimentoId,

          faseConclusao:
            "PRE_RECEBIMENTO_PROCESSADO",

          resultadoProcessamento:
            resultadoProcessamento,

          conclusaoPendente:
            true,

          atualizadoEm:
            new Date()
              .toISOString(),
        };


        await salvarRecebimentoLocal(
          atualizado
        );


        setState(
          atualizado
        );


        return atualizado;
      },
      []
    );


  // ==========================================================
  // EXECUTAR FASE 2 — CONCLUIR LOTE
  // ==========================================================

  const executarConclusaoLote =
    useCallback(
      async (
        estadoAtual
      ) => {
        if (
          !estadoAtual
            ?.preRecebimentoId
        ) {
          throw new Error(
            "Pré-Recebimento não identificado para conclusão do lote."
          );
        }


        const possuiDivergencia =
          estadoPossuiDivergenciaQuantidade(
            estadoAtual
          );


        const resultadoLote =
          await concluirLoteRecebimento({
            preRecebimentoId:
              estadoAtual
                .preRecebimentoId,

            quantidadeConferida:
              estadoAtual.captura
                ?.quantidadeBipada,

            decisaoRecebimento:
              possuiDivergencia
                ? "ACEITO_COM_RESSALVA"
                : "ACEITO_NORMALMENTE",

            justificativaDivergencia:
              possuiDivergencia
                ? (
                    estadoAtual
                      .justificativaDivergencia ||
                    null
                  )
                : null,

            observacoes:
              estadoAtual.observacoes ||
              null,
          });


        if (
          !statusLoteEstaResolvido(
            resultadoLote
          )
        ) {
          throw new Error(
            `O lote não confirmou sua conclusão. Status retornado: ${
              obterStatusLote(
                resultadoLote
              ) ||
              "não informado"
            }.`
          );
        }


        return resultadoLote;
      },
      []
    );


  // ==========================================================
  // RESULTADO DE SUCESSO FINAL
  //
  // SOMENTE chamar após a Fase 2 estar confirmada.
  // ==========================================================

  const tratarSucessoConclusao =
    useCallback(
      async (
        estadoResolvido,
        resultado
      ) => {
        const concluido = {
          ...marcarRecebimentoConcluido(
            estadoResolvido,
            resultado
          ),

          conclusaoPendente:
            false,

          faseConclusao:
            "LOTE_CONCLUIDO",

          resultadoConclusao:
            resultado,

          concluidoEm:
            new Date()
              .toISOString(),
        };


        /*
         * Persiste primeiro a confirmação inequívoca
         * de sucesso.
         */
        await salvarRecebimentoLocal(
          concluido
        );


        setState(
          concluido
        );


        /*
         * Agora o rascunho pode ser removido.
         */
        await concluirPersistenciaLocal(
          concluido.clientReceiptId
        );


        setConclusaoPendenteEncontrada(
          false
        );


        setRecuperacaoEncontrada(
          false
        );


        setErroInterface(
          null
        );


        if (
          typeof onConcluido ===
          "function"
        ) {
          onConcluido(
            resultado
          );
        }


        return resultado;
      },
      [
        onConcluido,
      ]
    );


  // ==========================================================
  // CONCLUIR RECEBIMENTO
  //
  // FASE 1
  // processar_v2(confirmar=false)
  //
  // FASE 2
  // lote_concluir_v3
  //
  // Se preRecebimentoId já existir, pulamos a Fase 1.
  // ==========================================================

  const concluirRecebimento =
    useCallback(
      async () => {
        setErroInterface(
          null
        );


        /*
         * Esta variável acompanha a fase MAIS AVANÇADA
         * comprovadamente persistida.
         *
         * Ela é essencial no catch.
         *
         * Se a internet cair depois da Fase 1,
         * precisamos salvar comPre — não o congelado anterior.
         */
        let estadoConclusaoAtual =
          null;


        let resultadoProcessamento =
          null;


        try {
          const congelado =
            await prepararConclusao();


          estadoConclusaoAtual =
            congelado;


          if (
            !navegadorEstaOnline()
          ) {
            const pendente =
              marcarRecebimentoAguardandoSincronizacao(
                estadoConclusaoAtual
              );


            pendente.payloadConclusao =
              estadoConclusaoAtual
                .payloadConclusao;


            pendente.conclusaoPendente =
              true;


            pendente.conclusaoIniciadaEm =
              estadoConclusaoAtual
                .conclusaoIniciadaEm;


            pendente.preRecebimentoId =
              estadoConclusaoAtual
                .preRecebimentoId ||
              null;


            pendente.faseConclusao =
              estadoConclusaoAtual
                .preRecebimentoId
                ? "PRE_RECEBIMENTO_PROCESSADO"
                : "AGUARDANDO_SINCRONIZACAO";


            await salvarRecebimentoLocal(
              pendente
            );


            setState(
              pendente
            );


            setConclusaoPendenteEncontrada(
              true
            );


            return {
              ok:
                false,

              pendenteSincronizacao:
                true,
            };
          }


          // ==================================================
          // FASE 1
          //
          // Só executamos quando o Pré ainda NÃO está
          // confirmado localmente.
          // ==================================================

          if (
            !estadoConclusaoAtual
              .preRecebimentoId
          ) {
            resultadoProcessamento =
              await processarRecebimento({
                chaveIdempotencia:
                  estadoConclusaoAtual
                    .chaveIdempotencia,

                payload:
                  estadoConclusaoAtual
                    .payloadConclusao,
              });


            estadoConclusaoAtual =
              await registrarPreRecebimentoProcessado(
                estadoConclusaoAtual,
                resultadoProcessamento
              );
          } else {
            resultadoProcessamento =
              estadoConclusaoAtual
                .resultadoProcessamento ||
              null;
          }
          
          // ==================================================
          // FASE 2
          // ==================================================

          const resultadoLote =
            await executarConclusaoLote(
              estadoConclusaoAtual
            );


          const resultadoFinal =
            montarResultadoFinalConclusao({
              estado:
                estadoConclusaoAtual,

              resultadoProcessamento,

              resultadoLote,
            });


          return await tratarSucessoConclusao(
            estadoConclusaoAtual,
            resultadoFinal
          );
        } catch (error) {
          const base =
            estadoConclusaoAtual ||
            state;


          // ==================================================
          // FALHA PROVÁVEL DE CONECTIVIDADE
          // ==================================================

          if (
            base &&
            erroPareceConectividade(
              error
            )
          ) {
            const pendente = {
              ...marcarRecebimentoAguardandoSincronizacao(
                base,
                error
              ),

              payloadConclusao:
                base.payloadConclusao ||
                null,

              preRecebimentoId:
                base.preRecebimentoId ||
                null,

              resultadoProcessamento:
                base.resultadoProcessamento ||
                resultadoProcessamento ||
                null,

              conclusaoPendente:
                Boolean(
                  base.preRecebimentoId ||
                  (
                    base.payloadConclusao &&
                    base.chaveIdempotencia
                  )
                ),

              faseConclusao:
                base.preRecebimentoId
                  ? "PRE_RECEBIMENTO_PROCESSADO"
                  : "AGUARDANDO_SINCRONIZACAO",
            };


            await salvarRecebimentoLocal(
              pendente
            );


            setState(
              pendente
            );


            setConclusaoPendenteEncontrada(
              true
            );


            return {
              ok:
                false,

              pendenteSincronizacao:
                true,

              preRecebimentoId:
                pendente
                  .preRecebimentoId,

              faseConclusao:
                pendente
                  .faseConclusao,

              error,
            };
          }


          // ==================================================
          // REJEIÇÃO CONHECIDA / ERRO OPERACIONAL
          //
          // Se a Fase 1 já ocorreu, preservamos o
          // preRecebimentoId.
          //
          // Um novo clique poderá retentar somente V3.
          // ==================================================

          const comErro = {
            ...base,

            statusLocal:
              NOVO_RECEBIMENTO_LOCAL_STATUS
                .ERRO,

            syncStatus:
              NOVO_RECEBIMENTO_SYNC_STATUS
                .ERRO,

            ultimoErro: {
              message:
                error?.message ||
                "Não foi possível concluir o recebimento.",

              code:
                error?.code ||
                null,

              registradoEm:
                new Date()
                  .toISOString(),
            },

            /*
             * Não há ambiguidade de rede neste ramo.
             *
             * Permitimos nova tentativa manual.
             */
            conclusaoPendente:
              false,

            /*
             * IMPORTANTE:
             * não apagamos a Fase 1 já confirmada.
             */
            preRecebimentoId:
              base?.preRecebimentoId ||
              null,

            faseConclusao:
              base?.preRecebimentoId
                ? "PRE_RECEBIMENTO_PROCESSADO"
                : "ERRO",
          };


          await salvarRecebimentoLocal(
            comErro
          );


          setState(
            comErro
          );


          setConclusaoPendenteEncontrada(
            false
          );


          setErroInterface(
            error?.message ||
            "Não foi possível concluir o recebimento."
          );


          throw error;
        }
      },
      [
        prepararConclusao,

        registrarPreRecebimentoProcessado,

        executarConclusaoLote,

        tratarSucessoConclusao,

        state,
      ]
    );


  // ==========================================================
  // RETOMAR APÓS QUEDA / DESLIGAMENTO
  //
  // Caso A:
  // preRecebimentoId existe
  // → Fase 1 já foi confirmada
  // → executar SOMENTE V3.
  //
  // Caso B:
  // preRecebimentoId não existe
  // → reconciliar processar_v2 via retomar_v2
  // → persistir Pré
  // → executar V3.
  // ==========================================================

  const retomarConclusaoPendente =
    useCallback(
      async () => {
        if (
          !state
            ?.conclusaoPendente
        ) {
          return {
            ok:
              false,

            semOperacaoPendente:
              true,
          };
        }


        /*
         * Para recuperar a Fase 1 precisamos da chave/payload.
         *
         * Para recuperar somente a Fase 2 basta o
         * preRecebimentoId.
         */
        if (
          !state.preRecebimentoId &&
          (
            !state.payloadConclusao ||
            !state.chaveIdempotencia
          )
        ) {
          return {
            ok:
              false,

            semOperacaoPendente:
              true,
          };
        }


        if (
          !navegadorEstaOnline()
        ) {
          return {
            ok:
              false,

            pendenteSincronizacao:
              true,
          };
        }


        setErroInterface(
          null
        );


        /*
        * A conclusão pendente foi recuperada e o operador
        * iniciou explicitamente a verificação.
        *
        * A partir deste instante existe novamente uma
        * operação ativa no frontend.
        *
        * Isso faz isProcessing voltar a true assim que
        * o estado CONCLUINDO for aplicado, bloqueando
        * duplo clique durante a reconciliação.
        */
        setConclusaoPendenteEncontrada(
          false
        );


        let estadoConclusaoAtual = {
          ...state,

          statusLocal:
            NOVO_RECEBIMENTO_LOCAL_STATUS
              .CONCLUINDO,

          syncStatus:
            NOVO_RECEBIMENTO_SYNC_STATUS
              .SINCRONIZANDO,

          ultimoErro:
            null,
        };


        let resultadoProcessamento =
          estadoConclusaoAtual
            .resultadoProcessamento ||
          null;


        await salvarRecebimentoLocal(
          estadoConclusaoAtual
        );


        setState(
          estadoConclusaoAtual
        );


        try {
          // ==================================================
          // RECUPERAR FASE 1, SE NECESSÁRIO
          // ==================================================

          if (
            !estadoConclusaoAtual
              .preRecebimentoId
          ) {
            resultadoProcessamento =
              await retomarRecebimento({
                chaveIdempotencia:
                  estadoConclusaoAtual
                    .chaveIdempotencia,

                payload:
                  estadoConclusaoAtual
                    .payloadConclusao,
              });


            estadoConclusaoAtual =
              await registrarPreRecebimentoProcessado(
                estadoConclusaoAtual,
                resultadoProcessamento
              );
          }


          // ==================================================
          // RECUPERAR / EXECUTAR FASE 2
          // ==================================================

          const resultadoLote =
            await executarConclusaoLote(
              estadoConclusaoAtual
            );


          const resultadoFinal =
            montarResultadoFinalConclusao({
              estado:
                estadoConclusaoAtual,

              resultadoProcessamento,

              resultadoLote,
            });


          return await tratarSucessoConclusao(
            estadoConclusaoAtual,
            resultadoFinal
          );
        } catch (error) {

          // ==================================================
          // NOVA FALHA DE CONECTIVIDADE
          // ==================================================

          if (
            erroPareceConectividade(
              error
            )
          ) {
            const pendente = {
              ...marcarRecebimentoAguardandoSincronizacao(
                estadoConclusaoAtual,
                error
              ),

              payloadConclusao:
                estadoConclusaoAtual
                  .payloadConclusao ||
                null,

              preRecebimentoId:
                estadoConclusaoAtual
                  .preRecebimentoId ||
                null,

              resultadoProcessamento:
                estadoConclusaoAtual
                  .resultadoProcessamento ||
                resultadoProcessamento ||
                null,

              conclusaoPendente:
                true,

              faseConclusao:
                estadoConclusaoAtual
                  .preRecebimentoId
                  ? "PRE_RECEBIMENTO_PROCESSADO"
                  : "AGUARDANDO_SINCRONIZACAO",
            };


            await salvarRecebimentoLocal(
              pendente
            );


            setState(
              pendente
            );


            setConclusaoPendenteEncontrada(
              true
            );


            return {
              ok:
                false,

              pendenteSincronizacao:
                true,

              preRecebimentoId:
                pendente
                  .preRecebimentoId,

              faseConclusao:
                pendente
                  .faseConclusao,

              error,
            };
          }


          // ==================================================
          // ERRO EXPLÍCITO DO BACKEND
          // ==================================================

          const comErro = {
            ...estadoConclusaoAtual,

            statusLocal:
              NOVO_RECEBIMENTO_LOCAL_STATUS
                .ERRO,

            syncStatus:
              NOVO_RECEBIMENTO_SYNC_STATUS
                .ERRO,

            ultimoErro: {
              message:
                error?.message ||
                "Não foi possível verificar o recebimento anterior.",

              code:
                error?.code ||
                null,

              registradoEm:
                new Date()
                  .toISOString(),
            },

            conclusaoPendente:
              false,

            faseConclusao:
              estadoConclusaoAtual
                .preRecebimentoId
                ? "PRE_RECEBIMENTO_PROCESSADO"
                : "ERRO",
          };


          await salvarRecebimentoLocal(
            comErro
          );


          setState(
            comErro
          );


          setConclusaoPendenteEncontrada(
            false
          );


          setErroInterface(
            error?.message ||
            "Não foi possível verificar o recebimento anterior."
          );


          throw error;
        }
      },
      [
        state,

        registrarPreRecebimentoProcessado,

        executarConclusaoLote,

        tratarSucessoConclusao,
      ]
    );


  // ==========================================================
  // DESCARTAR RASCUNHO LOCAL
  //
  // Não deve ser usado quando existe conclusão ambígua.
  // ==========================================================

  const descartarRecebimentoLocal =
    useCallback(
      async () => {
        if (
          !state?.clientReceiptId
        ) {
          return;
        }


        if (
          state.conclusaoPendente
        ) {
          throw new Error(
            "Existe uma conclusão pendente. Verifique o recebimento antes de descartá-lo."
          );
        }


        /*
         * Atenção:
         *
         * Se preRecebimentoId existir, já há materialização
         * no backend.
         *
         * O descarte local NÃO desfaz o Pré.
         *
         * A UX de cancelamento deverá distinguir esse cenário
         * antes de habilitarmos descarte irrestrito.
         */
        if (
          state.preRecebimentoId
        ) {
          throw new Error(
            "Este recebimento já possui Pré-Recebimento no servidor e não pode ser descartado apenas localmente."
          );
        }


        await removerRecebimentoLocal(
          state.clientReceiptId
        );


        setState(
          null
        );


        setRecuperacaoEncontrada(
          false
        );


        setConclusaoPendenteEncontrada(
          false
        );


        setErroInterface(
          null
        );
      },
      [
        state,
      ]
    );


  // ==========================================================
  // NOVO RECEBIMENTO APÓS O ANTERIOR ESTAR RESOLVIDO
  // ==========================================================

  const iniciarOutroRecebimento =
    useCallback(
      async () => {
        if (
          state?.conclusaoPendente
        ) {
          throw new Error(
            "Verifique primeiro o recebimento pendente antes de iniciar outro."
          );
        }


        /*
         * Não abandonamos silenciosamente um Pré materializado
         * que ainda não teve a conclusão do lote resolvida.
         */
        if (
          state?.preRecebimentoId &&
          state?.faseConclusao !==
            "LOTE_CONCLUIDO"
        ) {
          throw new Error(
            "O recebimento atual já existe no servidor e precisa ser resolvido antes de iniciar outro."
          );
        }


        if (
          state?.clientReceiptId
        ) {
          await removerRecebimentoLocal(
            state.clientReceiptId
          );
        }


        const novo =
          iniciarNovoRecebimentoLocal();


        await salvarRecebimentoLocal(
          novo
        );


        setState(
          novo
        );


        setRecuperacaoEncontrada(
          false
        );


        setConclusaoPendenteEncontrada(
          false
        );


        setErroInterface(
          null
        );


        return novo;
      },
      [
        state,
      ]
    );


  // ==========================================================
  // DERIVADOS
  // ==========================================================

  const quantidadeBipada =
    state?.captura
      ?.quantidadeBipada ||
    0;


  const quantidadeInformada =
    state?.captura
      ?.quantidadeInformada ??
    "";


  const diferencaQuantidade =
    useMemo(
      () =>
        calcularDiferencaQuantidade(
          quantidadeInformada,
          quantidadeBipada
        ),
      [
        quantidadeInformada,
        quantidadeBipada,
      ]
    );


  const possuiDivergenciaQuantidade =
    useMemo(
      () =>
        (
          diferencaQuantidade !==
            null &&
          diferencaQuantidade !==
            undefined &&
          diferencaQuantidade !==
            0
        ),
      [
        diferencaQuantidade,
      ]
    );


  const canAdvanceIdentification =
    useMemo(
      () =>
        Boolean(
          state &&
          podeAvancarIdentificacao(
            state
          )
        ),
      [
        state,
      ]
    );


  const canCapture =
    useMemo(
      () =>
        Boolean(
          state &&
          podeIniciarCaptura(
            state
          )
        ),
      [
        state,
      ]
    );


  const canFinish =
    useMemo(
      () =>
        Boolean(
          state &&

          podeConcluirRecebimento(
            state
          ) &&

          !state.conclusaoPendente &&

          state.statusLocal !==
            NOVO_RECEBIMENTO_LOCAL_STATUS
              .CONCLUINDO
        ),
      [
        state,
      ]
    );


  const isProcessing =
    state?.statusLocal ===
      NOVO_RECEBIMENTO_LOCAL_STATUS
        .CONCLUINDO &&
    !conclusaoPendenteEncontrada;


  // ==========================================================
  // API PÚBLICA DO HOOK
  // ==========================================================

  return {
    state,


    etapaAtual:
      state?.etapaAtual ||
      NOVO_RECEBIMENTO_ETAPAS
        .IDENTIFICACAO,


    carregandoRecuperacao,

    recuperacaoEncontrada,

    conclusaoPendenteEncontrada,

    erroInterface,


    transportadoras,

    carregandoTransportadoras,

    erroTransportadoras,


    quantidadeInformada,

    quantidadeBipada,

    diferencaQuantidade,

    possuiDivergenciaQuantidade,


    canAdvanceIdentification,

    canCapture,

    canFinish,

    isProcessing,


    online:
      navegadorEstaOnline(),


    criarNovoEstado,


    atualizarIdentificacao,

    atualizarQuantidadeInformada,


    adicionarVolumeLocal,

    removerVolumeLocal,


    atualizarAvariaVolume,

    adicionarEvidenciaVolume,


    definirAssinatura,

    definirObservacoes,

    definirJustificativaDivergencia,


    irParaProximaEtapa,

    voltarEtapa,


    concluirRecebimento,

    retomarConclusaoPendente,


    descartarRecebimentoLocal,

    iniciarOutroRecebimento,
  };
}