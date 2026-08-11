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
// - chamada ao service;
// - retomada idempotente.
//
// NÃO:
// - acessa Supabase diretamente;
// - executa regra autoritativa de backend;
// - faz matching do Morador;
// - promove Encomenda Oficial.
// ============================================================


const AUTOSAVE_DELAY_MS = 250;


// ============================================================
// HOOK
// ============================================================

export default function useNovoRecebimentoWizard({
  open,
  condominioId,
  onConcluido,
} = {}) {
  const [state, setState] = useState(null);

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

  const autosaveTimerRef = useRef(null);

  const inicializacaoRef = useRef(false);


  // ==========================================================
  // CRIAR NOVO ESTADO LOCAL
  // ==========================================================

  const criarNovoEstado = useCallback(() => {
    const novo =
      iniciarNovoRecebimentoLocal();

    setState(novo);

    setRecuperacaoEncontrada(false);
    setConclusaoPendenteEncontrada(false);
    setErroInterface(null);

    return novo;
  }, []);


  // ==========================================================
  // RECUPERAÇÃO INICIAL
  // ==========================================================

  useEffect(() => {
    if (!open) {
      inicializacaoRef.current = false;
      return;
    }

    if (inicializacaoRef.current) {
      return;
    }

    inicializacaoRef.current = true;

    let ativo = true;


    async function inicializar() {
      try {
        setCarregandoRecuperacao(true);

        const salvo =
          await obterRecebimentoAtivoLocal();

        if (!ativo) {
          return;
        }


        if (salvo) {
          setState(salvo);

          setRecuperacaoEncontrada(true);

          setConclusaoPendenteEncontrada(
            Boolean(
              salvo.conclusaoPendente &&
              salvo.payloadConclusao &&
              salvo.chaveIdempotencia
            )
          );

          return;
        }


        const novo =
          iniciarNovoRecebimentoLocal();

        setState(novo);

        await salvarRecebimentoLocal(novo);
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
          setCarregandoRecuperacao(false);
        }
      }
    }


    inicializar();


    return () => {
      ativo = false;
    };
  }, [open]);

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


    let ativo = true;


    async function carregarTransportadoras() {
      try {
        setCarregandoTransportadoras(true);
        setErroTransportadoras(null);


        const resultado =
          await listarTransportadorasRecebimento({
            condominioId,
            limite: 100,
            offset: 0,
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


        setTransportadoras([]);

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


    carregarTransportadoras();


    return () => {
      ativo = false;
    };
  }, [
    open,
    condominioId,
  ]);


  // ==========================================================
  // AUTOSAVE
  // ==========================================================

  useEffect(() => {
    if (!open || !state?.clientReceiptId) {
      return undefined;
    }


    if (autosaveTimerRef.current) {
      clearTimeout(
        autosaveTimerRef.current
      );
    }


    autosaveTimerRef.current =
      setTimeout(async () => {
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
      }, AUTOSAVE_DELAY_MS);


    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(
          autosaveTimerRef.current
        );
      }
    };
  }, [open, state]);


  // ==========================================================
  // ATUALIZAÇÃO GENÉRICA
  // ==========================================================

  const atualizarState = useCallback(
    (updater) => {
      setState((atual) => {
        if (!atual) {
          return atual;
        }

        const proximo =
          typeof updater === "function"
            ? updater(atual)
            : updater;

        if (!proximo) {
          return atual;
        }

        return {
          ...proximo,
          atualizadoEm:
            new Date().toISOString(),
        };
      });
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
      transportadoras.length === 0
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


    atualizarState((atual) => ({
      ...atual,

      identificacao: {
        ...atual.identificacao,

        transportadoraNome:
          encontrada.nomeFantasia,
      },
    }));
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
      (campo, valor) => {
        atualizarState((atual) => ({
          ...atual,

          identificacao: {
            ...atual.identificacao,
            [campo]: valor,
          },
        }));
      },
      [atualizarState]
    );


  // ==========================================================
  // QUANTIDADE INFORMADA
  // ==========================================================

  const atualizarQuantidadeInformada =
    useCallback(
      (valor) => {
        atualizarState((atual) => {
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
        });
      },
      [atualizarState]
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
        if (!codigoLido?.trim()) {
          return {
            ok: false,
            motivo: "CODIGO_VAZIO",
          };
        }


        if (!podeIniciarCaptura(state)) {
          return {
            ok: false,
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
            ok: false,
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


        atualizarState((atual) =>
          recalcularEstadoCaptura({
            ...atual,

            captura: {
              ...atual.captura,

              volumes: [
                ...atual.captura.volumes,
                volume,
              ],
            },
          })
        );


        return {
          ok: true,
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
  // Enquanto usamos Modelo A, nenhum Volume foi persistido
  // no backend antes de Concluir Recebimento.
  // ==========================================================

  const removerVolumeLocal =
    useCallback(
      (clientVolumeId) => {
        atualizarState((atual) => {
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
        });
      },
      [atualizarState]
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
        atualizarState((atual) => ({
          ...atual,

          captura: {
            ...atual.captura,

            volumes:
              atual.captura.volumes.map(
                (volume) =>
                  volume.clientVolumeId ===
                  clientVolumeId
                    ? {
                        ...volume,
                        avaria:
                          avaria || null,
                      }
                    : volume
              ),
          },
        }));
      },
      [atualizarState]
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
        atualizarState((atual) => ({
          ...atual,

          captura: {
            ...atual.captura,

            volumes:
              atual.captura.volumes.map(
                (volume) =>
                  volume.clientVolumeId ===
                  clientVolumeId
                    ? {
                        ...volume,

                        evidencias: [
                          ...(volume.evidencias ||
                            []),

                          evidencia,
                        ],
                      }
                    : volume
              ),
          },
        }));
      },
      [atualizarState]
    );


  // ==========================================================
  // ASSINATURA
  // ==========================================================

  const definirAssinatura =
    useCallback(
      (assinatura) => {
        atualizarState((atual) => ({
          ...atual,
          assinatura:
            assinatura || null,
        }));
      },
      [atualizarState]
    );


  // ==========================================================
  // OBSERVAÇÕES
  // ==========================================================

  const definirObservacoes =
    useCallback(
      (valor) => {
        atualizarState((atual) => ({
          ...atual,
          observacoes: valor,
        }));
      },
      [atualizarState]
    );


  const definirJustificativaDivergencia =
    useCallback(
      (valor) => {
        atualizarState((atual) => ({
          ...atual,

          justificativaDivergencia:
            valor,
        }));
      },
      [atualizarState]
    );


  // ==========================================================
  // NAVEGAÇÃO
  // ==========================================================

  const irParaProximaEtapa =
    useCallback(() => {
      atualizarState((atual) => ({
        ...atual,

        etapaAtual:
          Math.min(
            atual.etapaAtual + 1,
            NOVO_RECEBIMENTO_ULTIMA_ETAPA
          ),
      }));
    }, [atualizarState]);


  const voltarEtapa =
    useCallback(() => {
      atualizarState((atual) => ({
        ...atual,

        etapaAtual:
          Math.max(
            atual.etapaAtual - 1,
            NOVO_RECEBIMENTO_PRIMEIRA_ETAPA
          ),
      }));
    }, [atualizarState]);


  // ==========================================================
  // PERSISTIR TENTATIVA DE CONCLUSÃO
  //
  // MUITO IMPORTANTE:
  // chave + payload ficam congelados ANTES da RPC.
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

          conclusaoPendente: true,

          conclusaoIniciadaEm:
            new Date().toISOString(),
        };


        /*
         * Primeiro IndexedDB.
         *
         * Só depois tentaremos o servidor.
         */
        await salvarRecebimentoLocal(
          congelado
        );


        setState(congelado);


        return congelado;
      },
      [
        state,
        condominioId,
      ]
    );


  // ==========================================================
  // RESULTADO DE SUCESSO
  // ==========================================================

  const tratarSucessoConclusao =
    useCallback(
      async (
        estadoCongelado,
        resultado
      ) => {
        const concluido = {
          ...marcarRecebimentoConcluido(
            estadoCongelado,
            resultado
          ),

          conclusaoPendente: false,

          resultadoConclusao:
            resultado,

          concluidoEm:
            new Date().toISOString(),
        };


        /*
         * Persiste primeiro o resultado do servidor.
         */
        await salvarRecebimentoLocal(
          concluido
        );


        setState(concluido);


        /*
         * Agora que existe confirmação inequívoca,
         * podemos apagar o rascunho local.
         */
        await concluirPersistenciaLocal(
          concluido.clientReceiptId
        );


        setConclusaoPendenteEncontrada(
          false
        );

        setRecuperacaoEncontrada(false);


        if (
          typeof onConcluido ===
          "function"
        ) {
          onConcluido(resultado);
        }


        return resultado;
      },
      [onConcluido]
    );


  // ==========================================================
  // CONCLUIR RECEBIMENTO
  // ==========================================================

  const concluirRecebimento =
    useCallback(
      async () => {
        setErroInterface(null);

        let congelado = null;


        try {
          congelado =
            await prepararConclusao();


          if (!navegadorEstaOnline()) {
            const pendente =
              marcarRecebimentoAguardandoSincronizacao(
                congelado
              );

            pendente.payloadConclusao =
              congelado.payloadConclusao;

            pendente.conclusaoPendente =
              true;

            pendente.conclusaoIniciadaEm =
              congelado.conclusaoIniciadaEm;


            await salvarRecebimentoLocal(
              pendente
            );

            setState(pendente);

            setConclusaoPendenteEncontrada(
              true
            );


            return {
              ok: false,
              pendenteSincronizacao: true,
            };
          }


          const resultado =
            await processarRecebimento({
              chaveIdempotencia:
                congelado.chaveIdempotencia,

              payload:
                congelado.payloadConclusao,
            });


          return await tratarSucessoConclusao(
            congelado,
            resultado
          );
        } catch (error) {
          const base =
            congelado || state;


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

              conclusaoPendente:
                Boolean(
                  base.payloadConclusao
                ),
            };


            await salvarRecebimentoLocal(
              pendente
            );

            setState(pendente);

            setConclusaoPendenteEncontrada(
              true
            );


            return {
              ok: false,
              pendenteSincronizacao: true,
              error,
            };
          }


          /*
           * Rejeição conhecida do backend:
           * mantemos os dados para correção.
           */
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

              registradoEm:
                new Date().toISOString(),
            },

            conclusaoPendente: false,
          };


          await salvarRecebimentoLocal(
            comErro
          );

          setState(comErro);

          setErroInterface(
            error?.message ||
              "Não foi possível concluir o recebimento."
          );


          throw error;
        }
      },
      [
        prepararConclusao,
        tratarSucessoConclusao,
        state,
      ]
    );


  // ==========================================================
  // RETOMAR APÓS QUEDA / DESLIGAMENTO
  // ==========================================================

  const retomarConclusaoPendente =
    useCallback(
      async () => {
        if (
          !state?.conclusaoPendente ||
          !state?.payloadConclusao ||
          !state?.chaveIdempotencia
        ) {
          return {
            ok: false,
            semOperacaoPendente: true,
          };
        }


        if (!navegadorEstaOnline()) {
          return {
            ok: false,
            pendenteSincronizacao: true,
          };
        }


        setErroInterface(null);


        const sincronizando = {
          ...state,

          statusLocal:
            NOVO_RECEBIMENTO_LOCAL_STATUS
              .CONCLUINDO,

          syncStatus:
            NOVO_RECEBIMENTO_SYNC_STATUS
              .SINCRONIZANDO,

          ultimoErro: null,
        };


        await salvarRecebimentoLocal(
          sincronizando
        );

        setState(sincronizando);


        try {
          const resultado =
            await retomarRecebimento({
              chaveIdempotencia:
                sincronizando.chaveIdempotencia,

              payload:
                sincronizando.payloadConclusao,
            });


          return await tratarSucessoConclusao(
            sincronizando,
            resultado
          );
        } catch (error) {
          if (
            erroPareceConectividade(
              error
            )
          ) {
            const pendente = {
              ...marcarRecebimentoAguardandoSincronizacao(
                sincronizando,
                error
              ),

              payloadConclusao:
                sincronizando.payloadConclusao,

              conclusaoPendente:
                true,
            };


            await salvarRecebimentoLocal(
              pendente
            );

            setState(pendente);


            return {
              ok: false,
              pendenteSincronizacao: true,
              error,
            };
          }


          setErroInterface(
            error?.message ||
              "Não foi possível verificar o recebimento anterior."
          );


          throw error;
        }
      },
      [
        state,
        tratarSucessoConclusao,
      ]
    );


  // ==========================================================
  // DESCARTAR RASCUNHO LOCAL
  //
  // Não deve ser usado para uma conclusão ambígua.
  // Se conclusaoPendente=true, primeiro reconciliar servidor.
  // ==========================================================

  const descartarRecebimentoLocal =
    useCallback(
      async () => {
        if (!state?.clientReceiptId) {
          return;
        }


        if (state.conclusaoPendente) {
          throw new Error(
            "Existe uma conclusão pendente. Verifique o recebimento antes de descartá-lo."
          );
        }


        await removerRecebimentoLocal(
          state.clientReceiptId
        );


        setState(null);

        setRecuperacaoEncontrada(false);
        setConclusaoPendenteEncontrada(false);
        setErroInterface(null);
      },
      [state]
    );


  // ==========================================================
  // NOVO RECEBIMENTO APÓS O ANTERIOR ESTAR RESOLVIDO
  // ==========================================================

  const iniciarOutroRecebimento =
    useCallback(
      async () => {
        if (state?.conclusaoPendente) {
          throw new Error(
            "Verifique primeiro o recebimento pendente antes de iniciar outro."
          );
        }


        if (state?.clientReceiptId) {
          await removerRecebimentoLocal(
            state.clientReceiptId
          );
        }


        const novo =
          iniciarNovoRecebimentoLocal();


        await salvarRecebimentoLocal(
          novo
        );


        setState(novo);

        setRecuperacaoEncontrada(false);
        setConclusaoPendenteEncontrada(false);
        setErroInterface(null);


        return novo;
      },
      [state]
    );


  // ==========================================================
  // DERIVADOS
  // ==========================================================

  const quantidadeBipada =
    state?.captura?.quantidadeBipada || 0;


  const quantidadeInformada =
    state?.captura?.quantidadeInformada ?? "";


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


  const canAdvanceIdentification =
    useMemo(
      () =>
        Boolean(
          state &&
          podeAvancarIdentificacao(
            state
          )
        ),
      [state]
    );


  const canCapture =
    useMemo(
      () =>
        Boolean(
          state &&
          podeIniciarCaptura(state)
        ),
      [state]
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
      [state]
    );


  const isProcessing =
    state?.statusLocal ===
      NOVO_RECEBIMENTO_LOCAL_STATUS
        .CONCLUINDO;


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