import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

import "./PortariaAlerts.css";

function PortariaAlerts({
  alertas = [],
  carregando = false,
  erro = "",
  onOpenAlert,
}) {
  return (
    <section className="portaria-alerts-card">
      <div className="portaria-alerts-header">
        <div>
          <span>ATENÇÃO OPERACIONAL</span>
          <h2>Alertas e pendências</h2>
        </div>

        <AlertTriangle size={20} />
      </div>

      {carregando ? (
        <div className="portaria-alerts-loading">
          <span />
          <span />
          <span />
        </div>
      ) : erro ? (
        <div className="portaria-alerts-state is-error">
          <AlertTriangle size={19} />

          <div>
            <strong>Informação indisponível</strong>
            <p>{erro}</p>
          </div>
        </div>
      ) : alertas.length === 0 ? (
        <div className="portaria-alerts-state">
          <CheckCircle2 size={20} />

          <div>
            <strong>Aguardando atualização</strong>

            <p>
              Os alertas operacionais aparecerão aqui assim que
              a integração com os dados oficiais estiver ativa.
            </p>
          </div>
        </div>
      ) : (
        <div className="portaria-alerts-list">
          {alertas.map((alerta) => (
            <button
              key={alerta.id}
              type="button"
              className={`portaria-alert-item priority-${
                alerta.prioridade || "attention"
              }`}
              onClick={() => onOpenAlert?.(alerta)}
            >
              <span>
                <strong>{alerta.titulo}</strong>
                <small>{alerta.descricao}</small>
              </span>

              <ChevronRight size={17} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export default PortariaAlerts;