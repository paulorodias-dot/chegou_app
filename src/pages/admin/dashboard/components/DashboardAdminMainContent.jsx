import {
  ArrowRight,
  BarChart3,
  Database,
  Sparkles,
} from "lucide-react";

import {
  getAdminAnalyticsItem,
} from "../navigation/adminAnalyticsCatalog";

import "./DashboardAdminMainContent.css";

function IntelligenceFoundation() {
  return (
    <div className="dashboard-admin-main-content__stack">
      <section className="dashboard-admin-intelligence-hero">
        <div className="dashboard-admin-intelligence-hero__icon">
          <Sparkles size={22} aria-hidden="true" />
        </div>

        <div className="dashboard-admin-intelligence-hero__content">
          <span className="dashboard-admin-intelligence-hero__eyebrow">
            INTELIGÊNCIA DO CONDOMÍNIO
          </span>

          <h2>O que merece atenção agora?</h2>

          <p>
            Esta área reunirá fatos relevantes, mudanças de comportamento,
            riscos e oportunidades identificados exclusivamente a partir dos
            dados reais do condomínio atual.
          </p>
        </div>
      </section>

      <section className="dashboard-admin-foundation-grid">
        <article className="dashboard-admin-foundation-card">
          <span className="dashboard-admin-foundation-card__icon">
            <Database size={19} aria-hidden="true" />
          </span>

          <div>
            <strong>Indicadores reais</strong>

            <p>
              Os contratos analíticos ainda serão conectados. Nenhum volume,
              percentual ou alerta será simulado.
            </p>
          </div>
        </article>

        <article className="dashboard-admin-foundation-card">
          <span className="dashboard-admin-foundation-card__icon">
            <BarChart3 size={19} aria-hidden="true" />
          </span>

          <div>
            <strong>Análise explicável</strong>

            <p>
              Cada insight futuro deverá apresentar métrica, período,
              evidência, impacto e recomendação.
            </p>
          </div>
        </article>
      </section>

      <section className="dashboard-admin-empty-analysis">
        <div className="dashboard-admin-empty-analysis__visual">
          <Sparkles size={25} aria-hidden="true" />
        </div>

        <div className="dashboard-admin-empty-analysis__content">
          <span className="dashboard-admin-empty-analysis__status">
            Integração em preparação
          </span>

          <h3>Aguardando contratos analíticos do condomínio</h3>

          <p>
            Assim que os serviços oficiais estiverem conectados, esta área
            exibirá automaticamente os fatos mais relevantes da operação,
            sem utilizar dados demonstrativos em produção.
          </p>
        </div>
      </section>
    </div>
  );
}

function PreparingAnalysis({ analysis }) {
  const Icon = analysis?.icon || BarChart3;

  return (
    <section className="dashboard-admin-preparing-view">
      <div className="dashboard-admin-preparing-view__icon">
        <Icon size={26} aria-hidden="true" />
      </div>

      <span className="dashboard-admin-preparing-view__eyebrow">
        ANÁLISE PREMIUM
      </span>

      <h2>{analysis?.label || "Análise"}</h2>

      <p>
        {analysis?.description ||
          "Esta análise está sendo preparada para integração com dados reais."}
      </p>

      <div className="dashboard-admin-preparing-view__notice">
        <span>Dados disponíveis</span>
        <strong>—</strong>
      </div>

      <div className="dashboard-admin-preparing-view__footer">
        <span>Integração em preparação</span>
        <ArrowRight size={16} aria-hidden="true" />
      </div>
    </section>
  );
}

function DashboardAdminMainContent({
  selectedAnalysis = "inteligencia",
}) {
  if (selectedAnalysis === "inteligencia") {
    return <IntelligenceFoundation />;
  }

  const analysis =
    getAdminAnalyticsItem(selectedAnalysis);

  return (
    <PreparingAnalysis
      analysis={analysis}
    />
  );
}

export default DashboardAdminMainContent;