import {
  PORTARIA_WORK_ACTIONS,
} from "../config/dashboardPortaria.constants";

import "./PortariaWorkActions.css";

function PortariaWorkActions({
  onAction,
}) {
  return (
    <section
      className="portaria-work-actions-section"
      aria-labelledby="portaria-work-actions-title"
    >
      <div className="portaria-work-actions-heading">
        <div>
          <span className="portaria-work-actions-eyebrow">
            Acesso rápido
          </span>

          <h2 id="portaria-work-actions-title">
            Ações de trabalho
          </h2>
        </div>

        <p>
          Acesse rapidamente as principais operações da Portaria.
        </p>
      </div>

      <div className="portaria-work-actions-grid">
        {PORTARIA_WORK_ACTIONS.map(
          (acao) => {
            const Icon = acao.icon;

            return (
              <button
                key={acao.id}
                type="button"
                className={[
                  "portaria-work-action-card",
                  `tone-${acao.tone}`,
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() =>
                  onAction?.(acao.id)
                }
                aria-label={`${acao.label}. Atalho ${acao.shortcut}.`}
              >
                <span className="portaria-work-action-shortcut">
                  {acao.shortcut}
                </span>

                <span className="portaria-work-action-icon">
                  <Icon
                    size={24}
                    strokeWidth={1.9}
                    aria-hidden="true"
                  />
                </span>

                <strong>
                  {acao.label}
                </strong>

                <p>
                  {acao.description}
                </p>

                <span className="portaria-work-action-cta">
                  Abrir
                </span>
              </button>
            );
          }
        )}
      </div>
    </section>
  );
}

export default PortariaWorkActions;