import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MailCheck,
  Send,
  ShieldCheck,
} from "lucide-react";

import logoAzul from "../assets/logo_azulroyal.png";
import {
  PASSWORD_RECOVERY_PUBLIC_MESSAGE,
  solicitarRecuperacaoSenha,
} from "../services/passwordRecoveryService";
import "./RecuperarSenha.css";

function normalizarEmail(valor = "") {
  return String(valor).trim().toLowerCase();
}

function emailValido(valor = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

function RecuperarSenha() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [solicitacaoRegistrada, setSolicitacaoRegistrada] =
    useState(false);
  const [mensagemConfirmacao, setMensagemConfirmacao] =
    useState(PASSWORD_RECOVERY_PUBLIC_MESSAGE);
  const [correlationId, setCorrelationId] = useState(null);

  const emailNormalizado = useMemo(
    () => normalizarEmail(email),
    [email]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setErro("");

    if (!emailNormalizado) {
      setErro("Informe seu e-mail.");
      return;
    }

    if (!emailValido(emailNormalizado)) {
      setErro("Informe um e-mail válido.");
      return;
    }

    setEnviando(true);

    try {
      const result = await solicitarRecuperacaoSenha(
        emailNormalizado
      );

      setMensagemConfirmacao(result.message);
      setCorrelationId(result.correlationId);
      setSolicitacaoRegistrada(true);
    } catch {
      setErro(
        "Não foi possível concluir a solicitação neste momento. Aguarde alguns instantes e tente novamente."
      );
    } finally {
      setEnviando(false);
    }
  }

  function voltarAoLogin() {
    navigate("/login");
  }

  return (
    <main className="recovery-page">
      <section className="recovery-shell">
        <aside className="recovery-visual-panel">
          <div className="recovery-brand-copy">
            <h1>
              Seu acesso está seguro.
              <span>A gente te ajuda!</span>
            </h1>

            <p>
              Recupere seu acesso e continue aproveitando os
              recursos do Sistema Chegou! com segurança e
              praticidade.
            </p>
          </div>

          <div className="recovery-illustration-wrap">
            <img
              src="/images/mascot-recuperacao-senha-hero.png"
              alt="Mascote oficial do Sistema Chegou! protegendo o acesso do usuário."
              className="recovery-illustration"
              onError={(event) => {
                event.currentTarget.style.display = "none";
                event.currentTarget.nextElementSibling?.classList.add(
                  "visible"
                );
              }}
            />

            <div
              className="recovery-illustration-fallback"
              aria-hidden="true"
            >
              <ShieldCheck size={118} />
              <LockKeyhole size={54} />
            </div>
          </div>
        </aside>

        <section className="recovery-form-panel">
          <div className="recovery-mobile-brand">
            <img src={logoAzul} alt="Sistema Chegou!" />
          </div>

          <div className="recovery-card">
            {!solicitacaoRegistrada ? (
              <>
                <div className="recovery-icon-badge">
                  <LockKeyhole size={28} />
                </div>

                <header className="recovery-header">
                  <h2>Recupere seu acesso</h2>
                  <span className="recovery-title-line" />
                  <p>
                    Informe o e-mail vinculado à sua conta para
                    receber as instruções de redefinição de senha.
                  </p>

                  <div className="recovery-delivery-note">
                    <MailCheck size={18} />
                    <span>
                      O e-mail pode levar até <strong>3 minutos</strong>{" "}
                      para chegar.
                    </span>
                  </div>
                </header>

                <form
                  className="recovery-form"
                  onSubmit={handleSubmit}
                  noValidate
                >
                  <label htmlFor="recovery-email">E-mail</label>

                  <div
                    className={`recovery-input-box ${
                      erro ? "has-error" : ""
                    }`}
                  >
                    <Mail size={20} aria-hidden="true" />
                    <input
                      id="recovery-email"
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (erro) setErro("");
                      }}
                      placeholder="seuemail@exemplo.com"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      inputMode="email"
                      disabled={enviando}
                      aria-invalid={Boolean(erro)}
                      aria-describedby={
                        erro ? "recovery-email-error" : undefined
                      }
                    />
                  </div>

                  {erro && (
                    <div
                      id="recovery-email-error"
                      className="recovery-error"
                      role="alert"
                    >
                      {erro}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="recovery-submit-button"
                    disabled={enviando}
                    aria-busy={enviando}
                  >
                    {enviando ? (
                      <LoaderCircle
                        size={20}
                        className="recovery-spinner"
                      />
                    ) : (
                      <Send size={20} />
                    )}
                    {enviando
                      ? "Enviando com segurança..."
                      : "Enviar instruções"}
                  </button>
                </form>
              </>
            ) : (
              <section
                className="recovery-success"
                aria-live="polite"
              >
                <div className="recovery-success-icon">
                  <CheckCircle2 size={42} />
                </div>

                <h2>Verifique seu e-mail</h2>
                <span className="recovery-title-line" />
                <p>{mensagemConfirmacao}</p>

                <div className="recovery-success-guidance">
                  <MailCheck size={22} />
                  <p>
                    Caso não localize o e-mail em até 3 minutos,
                    verifique também a caixa de spam ou lixo
                    eletrônico.
                  </p>
                </div>

                {correlationId && (
                  <p className="recovery-correlation">
                    Referência da solicitação: <strong>{correlationId}</strong>
                  </p>
                )}

                <button
                  type="button"
                  className="recovery-submit-button"
                  onClick={voltarAoLogin}
                >
                  Ir para o login
                </button>
              </section>
            )}

            {!solicitacaoRegistrada && (
              <button
                type="button"
                className="recovery-back-button"
                onClick={voltarAoLogin}
                disabled={enviando}
              >
                <ArrowLeft size={18} />
                Voltar ao login
              </button>
            )}

            <aside className="recovery-security-note">
              <ShieldCheck size={22} />
              <p>
                Por segurança, não informaremos se o e-mail possui
                ou não uma conta cadastrada.
              </p>
            </aside>
          </div>
        </section>

        <footer className="recovery-footer">
          <img src={logoAzul} alt="Sistema Chegou!" />
          <p>
            © {new Date().getFullYear()} Sistema Chegou!. Todos os
            direitos reservados.
          </p>
        </footer>
      </section>
    </main>
  );
}

export default RecuperarSenha;