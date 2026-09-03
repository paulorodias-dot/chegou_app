import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  PackageCheck,
  ScanLine,
  ShieldCheck,
} from "lucide-react";

import "./EntregaEncomendas.css";


export default function EntregaEncomendas() {
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
              <div className="entrega-empty-state">
                <div
                  className="entrega-empty-state__icon"
                  aria-hidden="true"
                >
                  <PackageCheck size={27} />
                </div>

                <h3>
                  Pronto para iniciar
                </h3>

                <p>
                  As encomendas disponíveis para retirada
                  aparecerão aqui.
                </p>
              </div>
            </div>
          </section>
        </div>


        {/* =====================================================
            PAINEL OPERACIONAL DIREITO
        ===================================================== */}

        <aside
          className="entrega-operational-panel"
          aria-label="Painel de apoio à retirada"
        >
          <div className="entrega-operational-panel__surface">

            {/* =================================================
                CABEÇALHO
            ================================================= */}

            <header className="entrega-operational-panel__header">
              <div
                className="entrega-operational-panel__header-icon"
                aria-hidden="true"
              >
                <ClipboardList size={19} />
              </div>

              <div>
                <span className="entrega-operational-panel__eyebrow">
                  Painel Operacional
                </span>

                <h2>
                  Retirada
                </h2>
              </div>
            </header>


            <p className="entrega-operational-panel__description">
              Acompanhe aqui as orientações e ações
              necessárias durante a retirada.
            </p>


            {/* =================================================
                PASSO A PASSO
            ================================================= */}

            <section className="entrega-operational-section">
              <h3>
                Passo a passo
              </h3>

              <div className="entrega-operational-steps">

                <div className="entrega-operational-step">
                  <span>1</span>

                  <p>
                    Localize a encomenda
                  </p>
                </div>

                <div className="entrega-operational-step">
                  <span>2</span>

                  <p>
                    Inicie a retirada
                  </p>
                </div>

                <div className="entrega-operational-step">
                  <span>3</span>

                  <p>
                    Confira o código ou QR
                  </p>
                </div>

                <div className="entrega-operational-step">
                  <span>4</span>

                  <p>
                    Confirme a entrega
                  </p>
                </div>
              </div>
            </section>


            {/* =================================================
                ORIENTAÇÕES
            ================================================= */}

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


            {/* =================================================
                ATENÇÃO
            ================================================= */}

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


            {/* =================================================
                ÁREA FLEXÍVEL

                Futuramente poderá receber:
                - orientação específica;
                - cancelamento;
                - bloqueio;
                - solicitação;
                - dados da retirada;
                - ações permitidas.
            ================================================= */}

            <div className="entrega-operational-panel__spacer" />


            {/* =================================================
                RODAPÉ
            ================================================= */}

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