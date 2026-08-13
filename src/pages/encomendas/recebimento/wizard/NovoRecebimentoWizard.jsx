import { useEffect, useMemo } from "react";

import "./NovoRecebimentoWizard.css";

import {
  WizardHeader,
  WizardStepper,
  WizardBody,
  WizardFooter,
  WizardNavigation,
} from "./components";

import {
  StepIdentificacao,
  StepCapturaVolumes,
  StepFinalizacao,
} from "./steps";

import {
  useNovoRecebimentoWizard,
} from "./hooks";

import {
  NOVO_RECEBIMENTO_PRIMEIRA_ETAPA,
  NOVO_RECEBIMENTO_ULTIMA_ETAPA,
} from "./constants";


// ============================================================
// SISTEMA CHEGOU!
// NOVO RECEBIMENTO WIZARD
//
// Responsabilidade:
// - composição visual do Wizard;
// - ligação dos Steps com o hook;
// - bloqueio de fechamento acidental;
// - apresentação dos estados de recuperação.
//
// Toda persistência, recuperação e processamento ficam
// fora deste componente.
// ============================================================


export default function NovoRecebimentoWizard({
  open,

  operadorNome,

  condominioId,

  onCancel,

  onConcluido,
}) {
  const {
    state,

    etapaAtual,

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
  } = useNovoRecebimentoWizard({
    open,
    condominioId,
    onConcluido,
  });


  // ==========================================================
  // DATA/HORA DE ABERTURA
  // ==========================================================

  const dataHoraAbertura = useMemo(() => {
    if (!state?.abertoEm) {
      return null;
    }

    const data = new Date(
      state.abertoEm
    );

    if (
      Number.isNaN(
        data.getTime()
      )
    ) {
      return null;
    }

    return data;
  }, [state?.abertoEm]);


  // ==========================================================
  // BLOQUEIO DE ESC / SCROLL EXTERNO
  // ==========================================================

  useEffect(() => {
    if (!open) {
      return undefined;
    }


    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
      }
    }


    document.body.classList.add(
      "novo-recebimento-wizard-open"
    );


    window.addEventListener(
      "keydown",
      handleKeyDown,
      true
    );


    return () => {
      document.body.classList.remove(
        "novo-recebimento-wizard-open"
      );


      window.removeEventListener(
        "keydown",
        handleKeyDown,
        true
      );
    };
  }, [open]);


  // ==========================================================
  // CANCELAMENTO
  //
  // Neste momento o clique continua sendo encaminhado para
  // o fluxo de cancelamento do componente pai.
  //
  // O descarte definitivo do IndexedDB será conectado ao
  // modal de confirmação de cancelamento na próxima etapa.
  // ==========================================================

  async function handleCancelar() {
    if (isProcessing) {
      return;
    }

    /*
    * Se existe uma conclusão cuja resposta do servidor
    * ainda é desconhecida, o rascunho NÃO pode ser apagado.
    *
    * Primeiro é obrigatório reconciliar a operação
    * através da retomada idempotente.
    */
    if (state?.conclusaoPendente) {
      return;
    }

    try {
      /*
      * Cancelar significa abandonar este Novo Recebimento.
      *
      * Portanto:
      * - remove o registro do IndexedDB;
      * - limpa o recebimento ativo do dispositivo;
      * - limpa o estado do hook.
      *
      * Isso vale inclusive quando o operador apenas abriu
      * o Wizard e não digitou nenhum dado.
      */
      await descartarRecebimentoLocal();

      if (
        typeof onCancel === "function"
      ) {
        onCancel();
      }
    } catch (error) {
      console.error(
        "[Recebimento] Não foi possível cancelar o recebimento:",
        error
      );
    }
  }


  // ==========================================================
  // PRÓXIMO
  // ==========================================================

  function handleProximo() {
    if (isProcessing) {
      return;
    }


    /*
     * Etapa 1:
     * entregador + transportadora.
     */
    if (
      etapaAtual === 1 &&
      !canAdvanceIdentification
    ) {
      return;
    }


    /*
     * Etapa 2:
     * quantidade informada obrigatória
     * antes de avançar.
     */
    if (
      etapaAtual === 2 &&
      !canCapture
    ) {
      return;
    }


    irParaProximaEtapa();
  }


  // ==========================================================
  // VOLTAR
  // ==========================================================

  function handleVoltar() {
    if (isProcessing) {
      return;
    }

    voltarEtapa();
  }


  // ==========================================================
  // CONCLUIR RECEBIMENTO
  // ==========================================================

  async function handleConcluir() {
    if (
      !canFinish ||
      isProcessing
    ) {
      return;
    }


    try {
      await concluirRecebimento();
    } catch (error) {
      console.error(
        "[Recebimento] Falha ao concluir:",
        error
      );
    }
  }


  // ==========================================================
  // RETOMAR APÓS INTERRUPÇÃO
  // ==========================================================

  async function handleRetomarConclusao() {
    try {
      await retomarConclusaoPendente();
    } catch (error) {
      console.error(
        "[Recebimento] Falha ao retomar conclusão:",
        error
      );
    }
  }


  // ==========================================================
  // STEP ATUAL
  // ==========================================================

  function renderEtapaAtual() {
    if (!state) {
      return null;
    }


    if (etapaAtual === 1) {
      return (
        <StepIdentificacao
          identificacao={
            state.identificacao
          }

          transportadoras={
            transportadoras
          }

          carregandoTransportadoras={
            carregandoTransportadoras
          }

          erroTransportadoras={
            erroTransportadoras
          }

          documentoObrigatorio={false}

          onChange={
            atualizarIdentificacao
          }
        />
      );
    }


    if (etapaAtual === 2) {
      return (
        <StepCapturaVolumes
          quantidadeInformada={
            quantidadeInformada
          }

          quantidadeBipada={
            quantidadeBipada
          }

          diferencaQuantidade={
            diferencaQuantidade
          }

          volumes={
            state.captura?.volumes ||
            []
          }

          capturaHabilitada={
            canCapture
          }

          condominioId={
            condominioId
          }

          clientReceiptId={
            state.clientReceiptId
          }

          onChangeQuantidadeInformada={
            atualizarQuantidadeInformada
          }

          onAdicionarVolume={
            adicionarVolumeLocal
          }

          onRemoverVolume={
            removerVolumeLocal
          }

          onAtualizarAvaria={
            atualizarAvariaVolume
          }

          onAdicionarEvidencia={
            adicionarEvidenciaVolume
          }
        />
      );
    }


    return (
      <StepFinalizacao
        condominioId={
          condominioId
        }

        clientReceiptId={
          state.clientReceiptId
        }

        operadorNome={
          operadorNome
        }

        entregadorNome={
          state.identificacao
            ?.entregadorNome ||
          ""
        }

        transportadoraNome={
          state.identificacao
            ?.transportadoraNome ||
          ""
        }

        quantidadeInformada={
          quantidadeInformada
        }

        quantidadeBipada={
          quantidadeBipada
        }

        diferencaQuantidade={
          diferencaQuantidade
        }

        volumes={
          state.captura?.volumes ||
          []
        }

        assinatura={
          state.assinatura
        }

        observacoes={
          state.observacoes ||
          ""
        }

        justificativaDivergencia={
          state.justificativaDivergencia ||
          ""
        }

        possuiDivergenciaQuantidade={
          state.possuiDivergenciaQuantidade
        }

        onChangeAssinatura={
          definirAssinatura
        }

        onChangeObservacoes={
          definirObservacoes
        }

        onChangeJustificativaDivergencia={
          definirJustificativaDivergencia
        }
      />
    );
  }


  // ==========================================================
  // FECHADO
  // ==========================================================

  if (!open) {
    return null;
  }


  // ==========================================================
  // CARREGANDO RECUPERAÇÃO
  // ==========================================================

  if (
    carregandoRecuperacao ||
    !state
  ) {
    return (
      <div
        className="novo-recebimento-overlay"
        role="presentation"
      >
        <section
          className="novo-recebimento-wizard"
          role="dialog"
          aria-modal="true"
          aria-labelledby="novo-recebimento-title"
        >
          <WizardHeader
            operadorNome={
              operadorNome
            }
            dataHora={null}
          />

          <WizardBody>
            <div className="novo-recebimento-placeholder">
              Recuperando o recebimento neste dispositivo...
            </div>
          </WizardBody>
        </section>
      </div>
    );
  }


  // ==========================================================
  // WIZARD
  // ==========================================================

  return (
    <div
      className="novo-recebimento-overlay"
      role="presentation"
    >
      <section
        className="novo-recebimento-wizard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="novo-recebimento-title"
      >
        <WizardHeader
          operadorNome={
            operadorNome
          }
          dataHora={
            dataHoraAbertura
          }
        />


        <WizardStepper
          etapaAtual={
            etapaAtual
          }
        />


        <WizardBody>

          {/* ==================================================
              RECEBIMENTO RECUPERADO
          ================================================== */}

          {recuperacaoEncontrada &&
            !conclusaoPendenteEncontrada && (
              <div
                className="
                  novo-recebimento-feedback
                  novo-recebimento-feedback--info
                "
                role="status"
              >
                Foi encontrado um recebimento em andamento
                neste dispositivo. Os dados anteriores foram
                recuperados.
              </div>
            )}


          {/* ==================================================
              CONCLUSÃO PENDENTE
          ================================================== */}

          {conclusaoPendenteEncontrada && (
            <div
              className="
                novo-recebimento-feedback
                novo-recebimento-feedback--warning
              "
              role="alert"
            >
              <div>
                <strong>
                  Recebimento aguardando verificação
                </strong>

                <p>
                  A operação foi interrompida durante a
                  conclusão. Verifique o registro anterior
                  antes de iniciar outro recebimento.
                </p>
              </div>

              <button
                type="button"
                className="
                  novo-recebimento-button
                  novo-recebimento-button--primary
                "
                onClick={
                  handleRetomarConclusao
                }
                disabled={
                  isProcessing
                }
              >
                {isProcessing
                  ? "Verificando..."
                  : "Verificar recebimento"}
              </button>
            </div>
          )}


          {/* ==================================================
              ERRO
          ================================================== */}

          {erroInterface && (
            <div
              className="
                novo-recebimento-feedback
                novo-recebimento-feedback--danger
              "
              role="alert"
            >
              {erroInterface}
            </div>
          )}


          {renderEtapaAtual()}
        </WizardBody>


        <WizardFooter>
          <WizardNavigation
            etapaAtual={
              etapaAtual
            }

            primeiraEtapa={
              NOVO_RECEBIMENTO_PRIMEIRA_ETAPA
            }

            ultimaEtapa={
              NOVO_RECEBIMENTO_ULTIMA_ETAPA
            }

            canNext={
              etapaAtual === 1
                ? canAdvanceIdentification
                : canCapture
            }

            canFinish={
              canFinish
            }

            isProcessing={
              isProcessing
            }

            conclusaoPendente={
              Boolean(
                state.conclusaoPendente
              )
            }

            onCancel={
              handleCancelar
            }

            onBack={
              handleVoltar
            }

            onNext={
              handleProximo
            }

            onFinish={
              handleConcluir
            }
          />
        </WizardFooter>
      </section>
    </div>
  );
}