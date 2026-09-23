import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  PackageCheck,
  ScanLine,
  ShieldCheck,
} from "lucide-react";

import EntregaBusca from "./components/EntregaBusca";
import EntregaDetalhe from "./components/EntregaDetalhe";
import EntregaResultados from "./components/EntregaResultados";
import useEntregaEncomendas from "./hooks/useEntregaEncomendas";

import "./EntregaEncomendas.css";


// ============================================================
// SISTEMA CHEGOU!
// CENTRAL DE ENCOMENDAS — ENTREGA
// PÁGINA PRINCIPAL
//
// Responsabilidade:
// - compor a experiência da Portaria;
// - fornecer contexto do condomínio;
// - coordenar busca, resultados e detalhe;
// - manter o shell visual da operação.
//
// NÃO:
// - acessa Supabase diretamente;
// - decide elegibilidade;
// - inicia retirada;
// - valida Código/QR;
// - conclui retirada;
// - cria regra de domínio.
// ============================================================


export default function EntregaEncomendas({
  perfil,
}) {

  // ==========================================================
  // CONTEXTO
  // ==========================================================

  const condominioId =
    perfil?.condominio_id ||
    null;


  // ==========================================================
  // FLUXO OPERACIONAL DA ENTREGA
  // ==========================================================

  const {
    modoBusca,
    termoBusca,

    carregandoBusca,
    carregandoDetalhe,

    erro,

    tipoResultado,
    resultados,
    nenhumResultado,

        detalhe,
        possuiDetalhe,

        encomendaSelecionadaId,

        retiranteSelecionado,
        retiradaEmAndamento,

        metodoCredencial,
        tokenDigitado,

        identidadeConfirmada,
        carregandoOperacao,
        credencialConfirmada,
        resultadoRetirada,
        erroOperacao,
        mensagemOperacao,

        confirmarEntrega,

        podeBuscar,

    setModoBusca,
    setTermoBusca,

        buscar,
        abrirDetalhe,

        selecionarRetirante,
        setMetodoCredencial,
        setTokenDigitado,
        setIdentidadeConfirmada,

        iniciarComToken,
        conferirCredencial,

        fecharDetalhe,
        resetarFluxo,
        limparResultados,
  } = useEntregaEncomendas({
    condominioId,
  });


  // ==========================================================
  // EXECUTAR BUSCA
  // ==========================================================

  const handleBuscar =
    async () => {
      if (!condominioId) {
        return;
      }

      await buscar();
    };
  
    // ==========================================================
    // CREDENCIAL — CÓDIGO
    // ==========================================================

    const handleConferirCodigo =
      async () => {
        const codigo =
          String(
            tokenDigitado || ""
          )
            .replace(
              /\D/g,
              ""
            )
            .slice(
              0,
              6
            );

        if (
          carregandoOperacao ||
          !identidadeConfirmada ||
          metodoCredencial !== "TOKEN" ||
          codigo.length !== 6
        ) {
          return;
        }

        const preparacao =
          await iniciarComToken();

        if (
          !preparacao ||
          preparacao?.ok === false ||
          !preparacao?.retirada_id
        ) {
          return;
        }

        await conferirCredencial({
          retiradaId:
            preparacao.retirada_id,

          token:
            codigo,
        });
      };


    const handleConfirmarEntrega =
      async () => {
        if (
          carregandoOperacao ||
          !credencialConfirmada
        ) {
          return;
        }

        const encomenda =
          detalhe?.encomenda ||
          null;

        const candidatos = [
          encomenda?.quantidade_conferida,
          encomenda?.quantidade_bipada,
          encomenda?.quantidade_informada,
        ];

        let totalVolumesEntregues =
          null;

        for (
          const valor of candidatos
        ) {
          const numero =
            Number(valor);

          if (
            Number.isFinite(numero) &&
            numero > 0
          ) {
            totalVolumesEntregues =
              numero;

            break;
          }
        }

        if (
          !totalVolumesEntregues
        ) {
          return;
        }

        await confirmarEntrega({
          totalVolumesEntregues,
        });
      };


    const handleLerQrVisual =
      () => {
        // Leitura real será feita no próximo gate.
      };


    const handleOutrasOpcoesVisual =
      () => {
        // Autorização da Portaria entra no gate próprio.
      };

    // ==========================================================
    // ENTREGA CONCLUÍDA — CONTEXTO DA PÁGINA
    // ==========================================================

    const retiradaConcluida =
      resultadoRetirada === "CONCLUIDA" ||
      detalhe?.retirada_atual?.resultado === "CONCLUIDA" ||
      detalhe?.encomenda?.status === "FINALIZADA";


  return (
    <main className="entrega-page">

      <div className="entrega-layout">


        {/* =====================================================
            CONTEÚDO PRINCIPAL
        ===================================================== */}

        <div className="entrega-content">


          {/* ===================================================
              HEADER
          =================================================== */}

          <header className="entrega-header">

            <div className="entrega-header__breadcrumb">

              <span>
                Módulo Portaria
              </span>

              <span
                className="entrega-header__separator"
                aria-hidden="true"
              >
                /
              </span>

              <span className="entrega-header__current">
                Entrega
              </span>

            </div>


            <span className="entrega-header__eyebrow">
              Central de Encomendas
            </span>


            <h1 className="entrega-header__title">
              Entrega de Encomendas
            </h1>


            <p className="entrega-header__description">
              Localize a encomenda e acompanhe a retirada
              de forma simples e segura.
            </p>

          </header>


          {/* ===================================================
              OPERAÇÃO
          =================================================== */}

          <section className="entrega-toolbar">

            <div className="entrega-toolbar__content">

              <h2 className="entrega-toolbar__title">
                Operação de Entrega
              </h2>

              <p className="entrega-toolbar__description">
                Consulte as encomendas disponíveis,
                inicie a retirada e acompanhe cada etapa.
              </p>

            </div>

          </section>


          {/* ===================================================
              RESUMO
          =================================================== */}

          <section
            className="entrega-summary"
            aria-label="Resumo das entregas"
          >

            <article
              className="
                entrega-summary-card
                entrega-summary-card--blue
              "
            >

              <div
                className="entrega-summary-card__icon"
                aria-hidden="true"
              >
                <PackageCheck size={19} />
              </div>


              <div className="entrega-summary-card__content">

                <strong className="entrega-summary-card__value">
                  —
                </strong>

                <span className="entrega-summary-card__label">
                  Disponíveis
                </span>

                <span className="entrega-summary-card__helper">
                  Aguardando retirada
                </span>

              </div>

            </article>


            <article
              className="
                entrega-summary-card
                entrega-summary-card--green
              "
            >

              <div
                className="entrega-summary-card__icon"
                aria-hidden="true"
              >
                <ScanLine size={19} />
              </div>


              <div className="entrega-summary-card__content">

                <strong className="entrega-summary-card__value">
                  —
                </strong>

                <span className="entrega-summary-card__label">
                  Em retirada
                </span>

                <span className="entrega-summary-card__helper">
                  Atendimento iniciado
                </span>

              </div>

            </article>


            <article
              className="
                entrega-summary-card
                entrega-summary-card--orange
              "
            >

              <div
                className="entrega-summary-card__icon"
                aria-hidden="true"
              >
                <AlertTriangle size={19} />
              </div>


              <div className="entrega-summary-card__content">

                <strong className="entrega-summary-card__value">
                  —
                </strong>

                <span className="entrega-summary-card__label">
                  Atenção
                </span>

                <span className="entrega-summary-card__helper">
                  Precisam de cuidado
                </span>

              </div>

            </article>


            <article
              className="
                entrega-summary-card
                entrega-summary-card--red
              "
            >

              <div
                className="entrega-summary-card__icon"
                aria-hidden="true"
              >
                <CheckCircle2 size={19} />
              </div>


              <div className="entrega-summary-card__content">

                <strong className="entrega-summary-card__value">
                  —
                </strong>

                <span className="entrega-summary-card__label">
                  Entregues hoje
                </span>

                <span className="entrega-summary-card__helper">
                  Retiradas concluídas
                </span>

              </div>

            </article>

          </section>


          {/* ===================================================
              ÁREA DE ENCOMENDAS
          =================================================== */}

          <section
            className="entrega-workspace"
            aria-label="Encomendas para entrega"
          >

            <header className="entrega-workspace__header">

              <div>

                <h2 className="entrega-workspace__title">
                  Encomendas para entrega
                </h2>

                <p className="entrega-workspace__description">
                  Encontre a encomenda que será retirada
                  e inicie o atendimento.
                </p>

              </div>

            </header>


            <div className="entrega-workspace__body">

              {!condominioId ? (

                <div
                  className="entrega-empty-state"
                  role="alert"
                >

                  <div
                    className="entrega-empty-state__icon"
                    aria-hidden="true"
                  >
                    <AlertTriangle size={27} />
                  </div>


                  <h3>
                    Condomínio não identificado
                  </h3>


                  <p>
                    Não foi possível identificar o condomínio
                    atual para iniciar a operação.
                  </p>

                </div>

              ) : (

                <>

                  {/* =============================================
                      BUSCA
                  ============================================= */}

                  <EntregaBusca
                    modo={modoBusca}
                    termo={termoBusca}
                    carregando={carregandoBusca}
                    podeBuscar={podeBuscar}
                    erro={erro}
                    onModoChange={setModoBusca}
                    onTermoChange={setTermoBusca}
                    onBuscar={handleBuscar}
                    onLimpar={limparResultados}
                  />


                  {/* =============================================
                      DETALHE OU RESULTADOS
                  ============================================= */}

                  {possuiDetalhe ? (

                    <EntregaDetalhe
                      detalhe={detalhe}
                      timezoneIana={null}

                      retiranteSelecionado={
                        retiranteSelecionado
                      }

                      onSelecionarRetirante={
                        selecionarRetirante
                      }

                      retiradaEmAndamento={
                        retiradaEmAndamento
                      }

                      metodoCredencial={
                        metodoCredencial
                      }

                      codigoCredencial={
                        tokenDigitado
                      }

                      identidadeConfirmada={
                        identidadeConfirmada
                      }

                      credencialConfirmada={
                        credencialConfirmada
                      }

                      resultadoRetirada={
                        resultadoRetirada
                      }

                      erroOperacao={
                        erroOperacao
                      }

                      mensagemOperacao={
                        mensagemOperacao
                      }

                      carregandoCredencial={
                        carregandoOperacao
                      }

                      carregandoConfirmacao={
                        carregandoOperacao
                      }

                      onConfirmarEntrega={
                        handleConfirmarEntrega
                      }

                      onMetodoCredencialChange={
                        setMetodoCredencial
                      }

                      onCodigoCredencialChange={
                        setTokenDigitado
                      }

                      onIdentidadeConfirmadaChange={
                        setIdentidadeConfirmada
                      }

                      onConferirCodigo={
                        handleConferirCodigo
                      }

                      onLerQr={
                        handleLerQrVisual
                      }

                      onOutrasOpcoes={
                        handleOutrasOpcoesVisual
                      }

                      onVoltar={
                        retiradaConcluida
                          ? resetarFluxo
                          : fecharDetalhe
                      }
                    />

                  ) : (

                    <EntregaResultados
                      resultados={resultados}
                      tipoResultado={tipoResultado}
                      carregandoDetalhe={carregandoDetalhe}
                      encomendaSelecionadaId={
                        encomendaSelecionadaId
                      }
                      onVisualizar={abrirDetalhe}
                    />

                  )}


                  {/* =============================================
                      NENHUM RESULTADO
                  ============================================= */}

                  {!possuiDetalhe &&
                  nenhumResultado ? (

                    <div className="entrega-empty-state">

                      <div
                        className="entrega-empty-state__icon"
                        aria-hidden="true"
                      >
                        <PackageCheck size={27} />
                      </div>


                      <h3>
                        Nenhuma encomenda encontrada
                      </h3>


                      <p>
                        Confira os dados informados e tente
                        novamente.
                      </p>

                    </div>

                  ) : null}

                </>

              )}

            </div>

          </section>

        </div>


        {/* =====================================================
            PAINEL OPERACIONAL DIREITO
        ===================================================== */}

        <aside
          className="entrega-operational-panel"
          aria-label={
            retiradaConcluida
              ? "Resumo da entrega concluída"
              : "Painel de apoio à retirada"
          }
        >

          <div className="entrega-operational-panel__surface">

            <header className="entrega-operational-panel__header">

              <div
                className="entrega-operational-panel__header-icon"
                aria-hidden="true"
              >
                {retiradaConcluida ? (
                  <CheckCircle2 size={19} />
                ) : (
                  <ClipboardList size={19} />
                )}
              </div>

              <div>
                <span className="entrega-operational-panel__eyebrow">
                  {retiradaConcluida
                    ? "Entrega finalizada"
                    : "Painel Operacional"}
                </span>

                <h2>
                  {retiradaConcluida
                    ? "Entrega concluída"
                    : "Retirada"}
                </h2>
              </div>

            </header>


            <p className="entrega-operational-panel__description">
              {retiradaConcluida
                ? "Esta encomenda já foi entregue e permanece disponível apenas para consulta."
                : "Acompanhe aqui as orientações e ações necessárias durante a retirada."}
            </p>


            {retiradaConcluida ? (

              <>
                <section className="entrega-operational-section">

                  <div className="entrega-operational-section__heading">
                    <CheckCircle2
                      size={16}
                      aria-hidden="true"
                    />

                    <h3>
                      Tudo concluído
                    </h3>
                  </div>


                  <div className="entrega-operational-card">
                    <strong>
                      Encomenda entregue
                    </strong>

                    <p>
                      Consulte os dados e o histórico da retirada
                      na tela ao lado.
                    </p>
                  </div>

                </section>


                <section className="entrega-operational-section">

                  <div className="entrega-operational-section__heading">
                    <PackageCheck
                      size={16}
                      aria-hidden="true"
                    />

                    <h3>
                      Próxima entrega
                    </h3>
                  </div>


                  <div className="entrega-operational-card">
                    <p>
                      Para atender outra encomenda, selecione
                      <strong> Nova entrega</strong> na tela ao lado.
                    </p>
                  </div>

                </section>
              </>

            ) : (

              <>
                <section className="entrega-operational-section">

                  <h3>
                    Passo a passo
                  </h3>


                  <div className="entrega-operational-steps">

                    <div className="entrega-operational-step">
                      <span>1</span>
                      <p>Localize a encomenda</p>
                    </div>

                    <div className="entrega-operational-step">
                      <span>2</span>
                      <p>Inicie a retirada</p>
                    </div>

                    <div className="entrega-operational-step">
                      <span>3</span>
                      <p>Confira o código ou QR</p>
                    </div>

                    <div className="entrega-operational-step">
                      <span>4</span>
                      <p>Confirme a entrega</p>
                    </div>

                  </div>

                </section>


                <section className="entrega-operational-section">

                  <div className="entrega-operational-section__heading">
                    <ShieldCheck
                      size={16}
                      aria-hidden="true"
                    />

                    <h3>
                      Orientações
                    </h3>
                  </div>


                  <div className="entrega-operational-card">
                    <p>
                      Antes de entregar a encomenda,
                      confirme a retirada seguindo
                      as etapas mostradas na tela.
                    </p>
                  </div>

                </section>


                <section className="entrega-operational-section">

                  <div className="entrega-operational-section__heading">
                    <AlertTriangle
                      size={16}
                      aria-hidden="true"
                    />

                    <h3>
                      Precisa de atenção
                    </h3>
                  </div>


                  <div
                    className="
                      entrega-operational-card
                      entrega-operational-card--empty
                    "
                  >
                    <strong>
                      Tudo certo por enquanto
                    </strong>

                    <p>
                      Se surgir alguma situação que precise
                      da sua atenção, ela será mostrada aqui.
                    </p>
                  </div>

                </section>
              </>

            )}


            <div className="entrega-operational-panel__spacer" />


            <footer className="entrega-operational-panel__footer">

              <ShieldCheck
                size={14}
                aria-hidden="true"
              />

              <span>
                Retirada segura com o Sistema Chegou!
              </span>

            </footer>

          </div>

        </aside>

      </div>

    </main>
  );
}