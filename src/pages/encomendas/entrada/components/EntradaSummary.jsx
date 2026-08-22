import {
  Activity,
  Boxes,
  ShieldCheck,
} from "lucide-react";

import "./EntradaSummary.css";

export default function EntradaSummary({
  available = false,
}) {
  return (
    <section
      className="entrada-summary"
      aria-labelledby="entrada-summary-title"
    >
      <div className="entrada-summary__heading">
        <div>
          <span>Visão operacional</span>
          <h2 id="entrada-summary-title">
            Resumo da Entrada
          </h2>
        </div>

        <Activity size={19} aria-hidden="true" />
      </div>

      <div className="entrada-summary__grid">
        <article className="entrada-summary__card">
          <div className="entrada-summary__card-icon">
            <Boxes size={19} />
          </div>

          <div>
            <span className="entrada-summary__label">
              Fila operacional
            </span>

            <strong className="entrada-summary__value">
              {available ? "—" : "—"}
            </strong>

            <p>
              Indicadores serão apresentados a partir do contrato
              operacional autorizado.
            </p>
          </div>
        </article>

        <article className="entrada-summary__card">
          <div className="entrada-summary__card-icon">
            <ShieldCheck size={19} />
          </div>

          <div>
            <span className="entrada-summary__label">
              Processamento
            </span>

            <strong className="entrada-summary__value">
              —
            </strong>

            <p>
              Nenhum estado operacional é inferido pelo frontend.
            </p>
          </div>
        </article>

        <article className="entrada-summary__card entrada-summary__card--accent">
          <div className="entrada-summary__status-dot" />

          <div>
            <span className="entrada-summary__label">
              Estrutura preparada
            </span>

            <strong className="entrada-summary__status">
              Entrada Oficial
            </strong>

            <p>
              Pronta para receber contratos homologados sem reconstruir
              fatos do Recebimento.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}