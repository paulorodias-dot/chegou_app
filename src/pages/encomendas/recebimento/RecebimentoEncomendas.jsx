import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Printer,
} from "lucide-react";

import "./RecebimentoEncomendas.css";

import {
  RecebimentoHeader,
  RecebimentoToolbar,
  RecebimentoSummary,
  RecebimentoFilters,
  RecebimentoTable,
  RecebimentoDetailsDrawer,
  RecebimentoPrintView,
} from "./components";

import {
  listarPreRecebimentosRecebimento,
  listarTransportadorasFiltroRecebimento,
  obterResumoRecebimento,
} from "./services";

import NovoRecebimentoWizard from "./wizard";

// ============================================================
// LABEL DO PERÍODO
// ============================================================

function obterPeriodoLabel(
  periodo
) {
  switch (periodo) {
    case "HOJE":
      return "Hoje";

    case "ONTEM":
      return "Ontem";

    case "ULTIMOS_3_DIAS":
      return "Últimos 3 dias";

    case "ULTIMOS_7_DIAS":
      return "Últimos 7 dias";

    case "TODOS":
    default:
      return "Todos";
  }
}


// ============================================================
// SISTEMA CHEGOU!
// TELA PRINCIPAL — RECEBIMENTO DE ENCOMENDAS
//
// Responsabilidades:
// - carregar fila operacional;
// - carregar resumo;
// - filtros operacionais;
// - atualização sem F5;
// - Wizard;
// - Drawer;
// - Entrada;
// - Impressão.
//
// NÃO:
// - acessa Supabase diretamente;
// - promove Encomenda;
// - altera lote ao navegar para Entrada;
// - calcula KPI pela tabela;
// - realiza matching do Morador;
// - usa dados simulados.
// ============================================================


// ============================================================
// PERÍODO
//
// TODOS é obrigatório como padrão operacional para impedir
// que uma pendência antiga fique invisível ao operador.
//
// Limite visual da consulta:
// - Todos;
// - Hoje;
// - Ontem;
// - Últimos 3 dias;
// - Últimos 7 dias.
//
// Relatórios tratam períodos maiores.
// ============================================================

function montarPeriodoFiltro(
  periodo
) {
  if (
    !periodo ||
    periodo === "TODOS"
  ) {
    return {
      dataInicio:
        null,

      dataFim:
        null,
    };
  }


  const agora =
    new Date();


  const inicioHoje =
    new Date(
      agora.getFullYear(),
      agora.getMonth(),
      agora.getDate(),
      0,
      0,
      0,
      0
    );


  function inicioDiasAtras(
    dias
  ) {
    const data =
      new Date(
        inicioHoje
      );

    data.setDate(
      data.getDate() -
      dias
    );

    return data;
  }


  function fimDoDia(
    dataBase
  ) {
    return new Date(
      dataBase.getFullYear(),
      dataBase.getMonth(),
      dataBase.getDate(),
      23,
      59,
      59,
      999
    );
  }


  switch (periodo) {
    case "ONTEM": {
      const ontem =
        inicioDiasAtras(
          1
        );

      return {
        dataInicio:
          ontem.toISOString(),

        dataFim:
          fimDoDia(
            ontem
          ).toISOString(),
      };
    }


    case "ULTIMOS_3_DIAS":
      return {
        dataInicio:
          inicioDiasAtras(
            2
          ).toISOString(),

        dataFim:
          fimDoDia(
            agora
          ).toISOString(),
      };


    case "ULTIMOS_7_DIAS":
      return {
        dataInicio:
          inicioDiasAtras(
            6
          ).toISOString(),

        dataFim:
          fimDoDia(
            agora
          ).toISOString(),
      };


    case "HOJE":
    default:
      return {
        dataInicio:
          inicioHoje.toISOString(),

        dataFim:
          fimDoDia(
            agora
          ).toISOString(),
      };
  }
}


// ============================================================
// COMPONENT
// ============================================================

export default function RecebimentoEncomendas({
  perfil,
  onNavigate,
}) {

  // ==========================================================
  // WIZARD
  // ==========================================================

  const [
    wizardAberto,
    setWizardAberto,
  ] = useState(false);


  // ==========================================================
  // DRAWER
  // ==========================================================

  const [
    recebimentoSelecionado,
    setRecebimentoSelecionado,
  ] = useState(null);


  // ==========================================================
  // DADOS
  // ==========================================================

  const [
    recebimentos,
    setRecebimentos,
  ] = useState([]);


  const [
    resumo,
    setResumo,
  ] = useState(null);


  const [
    totalRecebimentos,
    setTotalRecebimentos,
  ] = useState(0);


  const [
    timezoneIana,
    setTimezoneIana,
  ] = useState(null);


  // ==========================================================
  // FILTROS
  // ==========================================================

  const [
    transportadorasFiltro,
    setTransportadorasFiltro,
  ] = useState([]);


  const [
    buscaFiltro,
    setBuscaFiltro,
  ] = useState("");


  const [
    buscaAplicada,
    setBuscaAplicada,
  ] = useState("");


  const [
    situacaoFiltro,
    setSituacaoFiltro,
  ] = useState("");


  /*
   * filtroKey identifica inclusive nomes diferentes
   * associados à transportadora técnica "Outras".
   */
  const [
    transportadoraFiltroKey,
    setTransportadoraFiltroKey,
  ] = useState("");


  const [
    periodoFiltro,
    setPeriodoFiltro,
  ] = useState("TODOS");


  // ==========================================================
  // LOADING
  // ==========================================================

  const [
    carregandoTela,
    setCarregandoTela,
  ] = useState(false);


  const [
    atualizandoTela,
    setAtualizandoTela,
  ] = useState(false);


  const [
    erroTela,
    setErroTela,
  ] = useState(null);


  const requisicaoAtualRef =
    useRef(0);


  // ==========================================================
  // CONTEXTO
  // ==========================================================

  const operadorNome =
    perfil?.nome_social ||
    perfil?.nome ||
    perfil?.nome_completo ||
    perfil?.email ||
    "Operador";


  const condominioId =
    perfil?.condominio_id ||
    null;


  const condominioNome =
    perfil?.condominio_nome ||
    perfil?.nome_condominio ||
    perfil?.condominio?.nome ||
    "Condomínio";


  // ==========================================================
  // TRANSPORTADORA SELECIONADA
  // ==========================================================

  const transportadoraSelecionada =
    transportadorasFiltro.find(
      (item) =>
        item.filtroKey ===
        transportadoraFiltroKey
    ) ||
    null;


  /*
   * Nesta fase a listar_v2 ainda filtra tecnicamente
   * pelo UUID da transportadora.
   *
   * A chave composta fica preservada para a próxima
   * evolução que distinguirá exatamente nomes diferentes
   * da entidade "Outras".
   */
  const transportadoraIdAplicada =
    transportadoraSelecionada
      ?.transportadoraId ||
    null;


  // ==========================================================
  // DERIVADOS
  // ==========================================================

  


  const impressaoDisponivel =
    totalRecebimentos > 0;


  // ==========================================================
  // TRANSPORTADORAS DO PERÍODO
  // ==========================================================

  const carregarTransportadorasDoFiltro =
    useCallback(
      async () => {
        if (!condominioId) {
          setTransportadorasFiltro(
            []
          );

          return;
        }


        const {
          dataInicio,
          dataFim,
        } =
          montarPeriodoFiltro(
            periodoFiltro
          );


        try {
          const resultado =
            await listarTransportadorasFiltroRecebimento({
              condominioId,
              dataInicio,
              dataFim,
            });


          const itens =
            Array.isArray(
              resultado
                ?.transportadoras
            )
              ? resultado
                  .transportadoras
              : [];


          setTransportadorasFiltro(
            itens
          );


          /*
           * Se uma troca de período removeu a
           * transportadora selecionada do universo,
           * limpamos somente este filtro.
           */
          setTransportadoraFiltroKey(
            (atual) => {
              if (!atual) {
                return "";
              }


              const aindaExiste =
                itens.some(
                  (item) =>
                    item.filtroKey ===
                    atual
                );


              return aindaExiste
                ? atual
                : "";
            }
          );
        } catch (error) {
          console.error(
            "[Recebimento] Falha ao carregar transportadoras presentes na fila:",
            error
          );


          setTransportadorasFiltro(
            []
          );

          setTransportadoraFiltroKey(
            ""
          );
        }
      },
      [
        condominioId,
        periodoFiltro,
      ]
    );


  // ==========================================================
  // CARREGAR TELA
  // ==========================================================

  const carregarTelaRecebimento =
    useCallback(
      async ({
        modoAtualizacao = false,
      } = {}) => {
        if (!condominioId) {
          setRecebimentos([]);
          setResumo(null);
          setTotalRecebimentos(0);
          setTimezoneIana(null);

          setErroTela(
            "Não foi possível identificar o condomínio atual."
          );

          return {
            ok: false,
            condominioNaoIdentificado:
              true,
          };
        }


        const requisicaoId =
          requisicaoAtualRef.current + 1;


        requisicaoAtualRef.current =
          requisicaoId;


        const {
          dataInicio,
          dataFim,
        } =
          montarPeriodoFiltro(
            periodoFiltro
          );


        try {
          setErroTela(null);


          if (modoAtualizacao) {
            setAtualizandoTela(
              true
            );
          } else {
            setCarregandoTela(
              true
            );
          }


          const [
            resultadoResumo,
            resultadoFila,
          ] =
            await Promise.all([
              obterResumoRecebimento({
                condominioId,
              }),

              listarPreRecebimentosRecebimento({
                condominioId,

                busca:
                  buscaAplicada ||
                  null,

                status:
                  situacaoFiltro ||
                  null,

                transportadoraId:
                  transportadoraIdAplicada,

                apenasMeusProcessos:
                  false,

                dataInicio,

                dataFim,

                limite:
                  100,

                offset:
                  0,
              }),
            ]);


          if (
            requisicaoAtualRef.current !==
            requisicaoId
          ) {
            return {
              ok: false,
              respostaObsoleta:
                true,
            };
          }


          const fila =
            Array.isArray(
              resultadoFila
                ?.recebimentos
            )
              ? resultadoFila
                  .recebimentos
              : [];


          const total =
            Number(
              resultadoFila
                ?.total ??
              fila.length
            );


          setRecebimentos(
            fila
          );


          setTotalRecebimentos(
            Number.isFinite(
              total
            )
              ? total
              : fila.length
          );


          setResumo(
            resultadoResumo ||
            null
          );


          setTimezoneIana(
            resultadoResumo
              ?.timezoneIana ||
            resultadoFila
              ?.timezoneIana ||
            null
          );


          setRecebimentoSelecionado(
            (selecionadoAtual) => {
              if (
                !selecionadoAtual
                  ?.id
              ) {
                return null;
              }


              return (
                fila.find(
                  (item) =>
                    item.id ===
                    selecionadoAtual.id
                ) ||
                null
              );
            }
          );


          return {
            ok: true,
            recebimentos:
              fila,
            total:
              Number.isFinite(
                total
              )
                ? total
                : fila.length,
          };
        } catch (error) {
          if (
            requisicaoAtualRef.current !==
            requisicaoId
          ) {
            return {
              ok: false,
              respostaObsoleta:
                true,
              error,
            };
          }


          console.error(
            "[Recebimento] Falha ao carregar a Tela Principal:",
            error
          );


          setErroTela(
            error?.message ||
              "Não foi possível carregar os dados do Recebimento."
          );


          return {
            ok: false,
            error,
          };
        } finally {
          if (
            requisicaoAtualRef.current ===
            requisicaoId
          ) {
            setCarregandoTela(
              false
            );

            setAtualizandoTela(
              false
            );
          }
        }
      },
      [
        condominioId,
        buscaAplicada,
        situacaoFiltro,
        transportadoraIdAplicada,
        periodoFiltro,
      ]
    );


  // ==========================================================
  // CARREGAR OPÇÕES DE TRANSPORTADORA
  // ==========================================================

  useEffect(() => {
    carregarTransportadorasDoFiltro();
  }, [
    carregarTransportadorasDoFiltro,
  ]);


  // ==========================================================
  // CARREGAR TELA
  // ==========================================================

  useEffect(() => {
    requisicaoAtualRef.current += 1;


    if (!condominioId) {
      setRecebimentos([]);
      setResumo(null);
      setTotalRecebimentos(0);
      setTimezoneIana(null);

      setCarregandoTela(false);
      setAtualizandoTela(false);

      return;
    }


    carregarTelaRecebimento();
  }, [
    condominioId,
    carregarTelaRecebimento,
  ]);


  // ==========================================================
  // FILTROS
  // ==========================================================

  function handlePesquisar() {
    setBuscaAplicada(
      buscaFiltro.trim()
    );
  }


  function handleLimparFiltros() {
    setBuscaFiltro("");
    setBuscaAplicada("");

    setSituacaoFiltro("");

    setTransportadoraFiltroKey(
      ""
    );

    setPeriodoFiltro(
      "TODOS"
    );
  }


  // ==========================================================
  // NOVO RECEBIMENTO
  // ==========================================================

  function handleNovoRecebimento() {
    setWizardAberto(
      true
    );
  }


  function handleCancelarWizard() {
    setWizardAberto(
      false
    );
  }


  // ==========================================================
  // ENTRADA
  // ==========================================================

  function handleIrParaEntrada() {
    if (
      typeof onNavigate !==
      "function"
    ) {
      console.warn(
        "[Recebimento] Navegação para Entrada indisponível."
      );

      return;
    }


    /*
    * Acesso GLOBAL à Tela de Entrada.
    *
    * Não transporta lote.
    * Não executa operação.
    * Não altera banco.
    */
    onNavigate(
      "entrada-encomenda"
    );
  }


  // ==========================================================
  // IMPRESSÃO
  // ==========================================================

  function handleImprimir() {
    if (!impressaoDisponivel) {
      return;
    }

    window.print();
  }


  // ==========================================================
  // CONCLUSÃO DO RECEBIMENTO
  // ==========================================================

  async function handleRecebimentoConcluido(
    resultado
  ) {
    console.info(
      "[Recebimento] Recebimento concluído:",
      resultado
    );


    setWizardAberto(
      false
    );


    await carregarTransportadorasDoFiltro();


    const atualizacao =
      await carregarTelaRecebimento({
        modoAtualizacao:
          true,
      });


    if (!atualizacao?.ok) {
      console.warn(
        "[Recebimento] O lote foi concluído, mas a Tela Principal não pôde ser atualizada imediatamente.",
        atualizacao?.error ||
          null
      );
    }
  }


  // ==========================================================
  // DRAWER
  // ==========================================================

  function handleVisualizar(
    recebimento
  ) {
    setRecebimentoSelecionado(
      recebimento
    );
  }


  function handleFecharDrawer() {
    setRecebimentoSelecionado(
      null
    );
  }


  function handleContinuarRecebimento() {
    if (
      !recebimentoSelecionado
    ) {
      return;
    }


    console.info(
      "[Recebimento] Solicitação de Entrada pelo Drawer:",
      {
        preRecebimentoId:
          recebimentoSelecionado
            .preRecebimentoId,

        referenciaLote:
          recebimentoSelecionado
            .referenciaLote,
      }
    );
  }


  // ==========================================================
  // RECARREGAR
  // ==========================================================

  async function handleRecarregarTela() {
    await Promise.all([
      carregarTransportadorasDoFiltro(),

      carregarTelaRecebimento({
        modoAtualizacao:
          true,
      }),
    ]);
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <main className="recebimento-page">
        <RecebimentoHeader />


        <RecebimentoToolbar
          onNovoRecebimento={
            handleNovoRecebimento
          }

          onEntrada={
            handleIrParaEntrada
          }
        />


        <RecebimentoSummary
          resumo={
            resumo
          }

          loading={
            carregandoTela
          }

          updating={
            atualizandoTela
          }
        />


        <section
          className="recebimento-workspace"
          aria-labelledby="recebimentos-title"
          aria-busy={
            carregandoTela ||
            atualizandoTela
          }
        >
          <div className="recebimento-workspace__header">
            <div>
              <h2
                id="recebimentos-title"
                className="recebimento-workspace__title"
              >
                Pré-Recebimentos
              </h2>


              <p className="recebimento-workspace__description">
                Consulte os lotes que ainda possuem
                volumes aguardando Entrada.
              </p>


              {atualizandoTela && (
                <p
                  className="recebimento-workspace__description"
                  role="status"
                  aria-live="polite"
                >
                  Atualizando dados do recebimento...
                </p>
              )}


              {erroTela && (
                <div
                  role="alert"
                  aria-live="assertive"
                >
                  <p className="recebimento-workspace__description">
                    {erroTela}
                  </p>


                  <button
                    type="button"
                    className="recebimento-table__view-button"
                    onClick={
                      handleRecarregarTela
                    }
                    disabled={
                      carregandoTela ||
                      atualizandoTela
                    }
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
            </div>


            {!carregandoTela &&
              !erroTela && (
                <div className="recebimento-workspace__actions">
                  <span className="recebimento-workspace__queue-count">
                    {totalRecebimentos === 1
                      ? "1 lote na fila"
                      : `${totalRecebimentos} lotes na fila`}
                  </span>


                  <button
                    type="button"
                    className="
                      recebimento-print-button
                      recebimento-print-button--desktop
                    "
                    onClick={
                      handleImprimir
                    }
                    disabled={
                      !impressaoDisponivel
                    }
                  >
                    <Printer
                      size={16}
                      strokeWidth={2}
                      aria-hidden="true"
                    />

                    Imprimir
                  </button>
                </div>
              )}
          </div>


          <RecebimentoFilters
            busca={
              buscaFiltro
            }

            situacao={
              situacaoFiltro
            }

            transportadoraFiltroKey={
              transportadoraFiltroKey
            }

            periodo={
              periodoFiltro
            }

            transportadoras={
              transportadorasFiltro
            }

            onChangeBusca={
              setBuscaFiltro
            }

            onChangeSituacao={
              setSituacaoFiltro
            }

            onChangeTransportadora={
              setTransportadoraFiltroKey
            }

            onChangePeriodo={
              setPeriodoFiltro
            }

            onPesquisar={
              handlePesquisar
            }

            onLimpar={
              handleLimparFiltros
            }

            onImprimir={
              handleImprimir
            }

            imprimirDisabled={
              !impressaoDisponivel
            }

            loading={
              carregandoTela ||
              atualizandoTela
            }
          />


          <RecebimentoTable
            recebimentos={
              recebimentos
            }

            loading={
              carregandoTela
            }

            updating={
              atualizandoTela
            }

            onVisualizar={
              handleVisualizar
            }
          />
        </section>


        <span
          hidden
          data-recebimento-timezone={
            timezoneIana ||
            ""
          }
        />
      </main>


      <NovoRecebimentoWizard
        open={
          wizardAberto
        }

        operadorNome={
          operadorNome
        }

        condominioId={
          condominioId
        }

        onCancel={
          handleCancelarWizard
        }

        onConcluido={
          handleRecebimentoConcluido
        }
      />


      <RecebimentoDetailsDrawer
        recebimento={
          recebimentoSelecionado
        }

        open={
          Boolean(
            recebimentoSelecionado
          )
        }

        onClose={
          handleFecharDrawer
        }

        onContinuar={
          handleContinuarRecebimento
        }
      />

      <RecebimentoPrintView
        recebimentos={
          recebimentos
        }

        resumo={
          resumo
        }

        condominioNome={
          condominioNome
        }

        periodoLabel={
          obterPeriodoLabel(
            periodoFiltro
          )
        }
      />
    </>
  );
}