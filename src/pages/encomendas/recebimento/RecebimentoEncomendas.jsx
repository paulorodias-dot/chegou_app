import { useState } from "react";

import "./RecebimentoEncomendas.css";

import {
  RecebimentoHeader,
  RecebimentoToolbar,
  RecebimentoSummary,
  RecebimentoFilters,
  RecebimentoTable,
  RecebimentoDetailsDrawer,
} from "./components";

import NovoRecebimentoWizard from "./wizard";


export default function RecebimentoEncomendas({
  perfil,
}) {
  const [
    wizardAberto,
    setWizardAberto,
  ] = useState(false);

  const [
    recebimentoSelecionado,
    setRecebimentoSelecionado,
  ] = useState(null);


  /*
   * Nesta etapa não existem dados simulados.
   *
   * Futuramente esta coleção será fornecida pelo hook/service
   * oficial do domínio de Pré-Recebimento.
   */
  const recebimentos = [];


  // ==========================================================
  // CONTEXTO DO OPERADOR
  // ==========================================================

  const operadorNome =
    perfil?.nome_social ||
    perfil?.nome ||
    perfil?.nome_completo ||
    perfil?.email ||
    "Operador";


  /*
   * O Wizard precisa do condomínio atual para consumir
   * contratos backend vinculados ao tenant, como:
   *
   * - transportadoras disponíveis;
   * - configurações operacionais;
   * - Pré-Recebimento;
   * - retomada;
   * - processamento.
   *
   * Não usar fallback fictício.
   */
  const condominioId =
    perfil?.condominio_id ||
    null;


  // ==========================================================
  // NOVO RECEBIMENTO
  // ==========================================================

  function handleNovoRecebimento() {
    setWizardAberto(true);
  }


  function handleCancelarWizard() {
    setWizardAberto(false);
  }


  // ==========================================================
  // RECEBIMENTO CONCLUÍDO
  // ==========================================================

  function handleRecebimentoConcluido(
    resultado
  ) {
    /*
     * Neste momento ainda não carregamos a listagem oficial
     * de Pré-Recebimentos nesta página.
     *
     * Portanto:
     * - fechamos o Wizard somente após confirmação positiva;
     * - futuramente este ponto disparará o refresh oficial
     *   da tabela.
     */

    console.info(
      "[Recebimento] Recebimento concluído:",
      resultado
    );


    setWizardAberto(false);
  }


  // ==========================================================
  // DRAWER
  // ==========================================================

  function handleVisualizar(recebimento) {
    setRecebimentoSelecionado(
      recebimento
    );
  }


  function handleFecharDrawer() {
    setRecebimentoSelecionado(null);
  }


  function handleContinuarRecebimento() {
    /*
     * A retomada visual pela tabela será conectada quando
     * a listagem real de Pré-Recebimentos estiver integrada.
     *
     * A retomada local após interrupção do Wizard já pertence
     * ao fluxo IndexedDB + retomar_v1.
     */
  }


  return (
    <>
      <main className="recebimento-page">
        <RecebimentoHeader />


        <RecebimentoToolbar
          onNovoRecebimento={
            handleNovoRecebimento
          }
        />


        <RecebimentoSummary />


        <section
          className="recebimento-workspace"
          aria-labelledby="recebimentos-title"
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
                Consulte os lotes recebidos e acompanhe
                ocorrências operacionais.
              </p>
            </div>
          </div>


          <RecebimentoFilters />


          <RecebimentoTable
            recebimentos={
              recebimentos
            }
            onVisualizar={
              handleVisualizar
            }
          />
        </section>
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
    </>
  );
}