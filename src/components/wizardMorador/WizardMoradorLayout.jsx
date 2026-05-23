import { Check, HelpCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import logoBranco from "../../assets/logo_branco.png";
import logoAzulRoyal from "../../assets/logo_azulroyal.png";

const ETAPAS = [
  { numero: 1, titulo: "Identificação", subtitulo: "da Unidade" },
  { numero: 2, titulo: "Dados", subtitulo: "Pessoais" },
  { numero: 3, titulo: "Dependentes", subtitulo: "Autorizados" },
  { numero: 4, titulo: "Termos e", subtitulo: "Segurança" },
  { numero: 5, titulo: "Revisão dos", subtitulo: "Dados" },
  { numero: 6, titulo: "Pesquisa", subtitulo: "(opcional)" },
  { numero: 7, titulo: "Conclusão", subtitulo: "" },
];

export default function WizardMoradorLayout({ etapaAtual, dadosWizard, children }) {
  function abrirAjuda() {
    window.dispatchEvent(new CustomEvent("wizard-morador-ajuda"));
  }

  return (
    <div className="wm-page">
      <header className="wm-header">
        <div className="wm-header-inner">
          <div className="wm-header-brand">
            <img src={logoBranco} alt="Chegou!" className="wm-header-logo" />

            <div className="wm-header-title">
              <h1>Cadastro do Morador</h1>
              <p>Ativação do acesso ao Sistema Chegou<span className="wm-orange">!</span></p>
            </div>
          </div>

          <button type="button" className="wm-help-top" onClick={abrirAjuda}>
            <HelpCircle size={21} />
            <span>Precisa de ajuda?</span>
          </button>
        </div>
      </header>

      <main className="wm-main">
        <section className="wm-shell">
          <nav className="wm-stepper" aria-label="Etapas do Wizard Morador">
            {ETAPAS.map((etapa) => {
              const ativa = etapa.numero === etapaAtual;
              const concluida = etapa.numero < etapaAtual;

              return (
                <div
                  key={etapa.numero}
                  className={`wm-stepper-item ${ativa ? "active" : ""} ${
                    concluida ? "done" : ""
                  }`}
                >
                  <span className="wm-stepper-line" />

                  <span className="wm-stepper-circle">
                    {concluida ? <Check size={14} /> : etapa.numero}
                  </span>

                  <span className="wm-stepper-label">
                    <strong>{etapa.titulo}</strong>
                    {etapa.subtitulo ? <small>{etapa.subtitulo}</small> : null}
                  </span>
                </div>
              );
            })}
          </nav>

          {children}
        </section>
      </main>

      <footer className="wm-footer">
        <div className="wm-footer-inner">
          <div className="wm-footer-safe">
            <span>
              <LockKeyhole size={17} />
            </span>

            <div>
              <strong>Ambiente seguro</strong>
              <p>Seus dados estão protegidos com criptografia de ponta.</p>
            </div>
          </div>

          <img src={logoAzulRoyal} alt="Chegou!" className="wm-footer-logo" />

          <div className="wm-footer-help">
            <strong>Precisa de ajuda?</strong>
            <p>Fale com o condomínio ou suporte Chegou<span className="wm-orange">!</span></p>
          </div>
        </div>
      </footer>

      <div className="wm-mobile-safe-footer">
        <ShieldCheck size={16} />
        Ambiente seguro
      </div>
    </div>
  );
}
