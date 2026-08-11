import { SlidersHorizontal } from "lucide-react";

import { PORTARIA_KPI_DEFINITIONS } from "../config/dashboardPortaria.constants";
import { formatarValorOperacional } from "../encomendas/encomendasPortaria.mapper";

import "./PortariaOperationalSummary.css";

function PortariaOperationalSummary({
  resumo,
  carregando = false,
  somenteMeusProcessos = false,
  onToggleMeusProcessos,
  onOpenKpi,
}) {
  return (
    <section
      className="portaria-operational-summary"
      aria-labelledby="portaria-operational-summary-title"
    >
      <div className="portaria-operational-summary-header">
        <div>
          <span>RESUMO OPERACIONAL</span>

          <h2 id="portaria-operational-summary-title">
            Situação das encomendas
          </h2>
        </div>

        <label className="portaria-process-filter">
          <input
            type="checkbox"
            checked={somenteMeusProcessos}
            onChange={(event) =>
              onToggleMeusProcessos?.(
                event.target.checked
              )
            }
          />

          <span className="portaria-process-filter-box">
            <SlidersHorizontal size={14} />
          </span>

          <span>Visualizar apenas meus processos</span>
        </label>
      </div>

      <div className="portaria-operational-kpis">
        {PORTARIA_KPI_DEFINITIONS.map((item) => {
          const Icon = item.icon;
          const valor = resumo?.[item.id];

          return (
            <button
              key={item.id}
              type="button"
              className="portaria-operational-kpi"
              onClick={() => onOpenKpi?.(item.id)}
            >
              <span className="portaria-operational-kpi-icon">
                <Icon size={21} />
              </span>

              <span className="portaria-operational-kpi-copy">
                <small>{item.label}</small>

                {carregando ? (
                  <span className="portaria-kpi-skeleton" />
                ) : (
                  <strong>
                    {formatarValorOperacional(valor)}
                  </strong>
                )}

                <span>{item.helper}</span>

                <em>Ver mais detalhes</em>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default PortariaOperationalSummary;