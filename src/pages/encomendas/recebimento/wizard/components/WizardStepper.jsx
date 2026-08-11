const WIZARD_STEPS = [
  {
    id: 1,
    label: "Identificação",
  },
  {
    id: 2,
    label: "Captura",
  },
  {
    id: 3,
    label: "Finalização",
  },
];

export default function WizardStepper({
  etapaAtual,
}) {
  return (
    <div
      className="novo-recebimento-stepper"
      aria-label="Etapas do recebimento"
    >
      {WIZARD_STEPS.map((step) => {
        const active =
          step.id === etapaAtual;

        const complete =
          step.id < etapaAtual;

        const classNames = [
          "novo-recebimento-step",
          active
            ? "novo-recebimento-step--active"
            : "",
          complete
            ? "novo-recebimento-step--complete"
            : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div
            key={step.id}
            className={classNames}
          >
            <div className="novo-recebimento-step__content">
              <span className="novo-recebimento-step__number">
                {step.id}
              </span>

              <span className="novo-recebimento-step__label">
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}