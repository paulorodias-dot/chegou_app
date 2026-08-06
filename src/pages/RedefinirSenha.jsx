import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  X,
} from "lucide-react";

import logoAzul from "../assets/logo_azulroyal.png";
import {
  atualizarSenhaRecuperada,
  encerrarSessaoRecuperacao,
  observarRecuperacaoSenha,
  prepararSessaoRecuperacaoSenha,
} from "../services/passwordRecoveryService";
import "./RedefinirSenha.css";

const PASSWORD_RULES = [
  ["length", "Pelo menos 8 caracteres", (value) => value.length >= 8],
  ["uppercase", "Uma letra maiúscula", (value) => /[A-Z]/.test(value)],
  ["lowercase", "Uma letra minúscula", (value) => /[a-z]/.test(value)],
  ["number", "Um número", (value) => /\d/.test(value)],
  ["special", "Um caractere especial", (value) => /[^A-Za-z0-9]/.test(value)],
];

function RedefinirSenha() {
  const navigate = useNavigate();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [estadoLink, setEstadoLink] = useState("validando");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const rulesState = useMemo(
    () =>
      PASSWORD_RULES.map(([id, label, validate]) => ({
        id,
        label,
        valid: validate(novaSenha),
      })),
    [novaSenha]
  );

  const senhaValida = rulesState.every((rule) => rule.valid);
  const senhasIguais = Boolean(confirmacao) && novaSenha === confirmacao;

  useEffect(() => {
    let active = true;

    const stopObserving = observarRecuperacaoSenha(
      ({ isPasswordRecovery, session }) => {
        if (active && (isPasswordRecovery || session)) {
          setEstadoLink("valido");
        }
      }
    );

    async function initialize() {
      try {
        const session = await prepararSessaoRecuperacaoSenha();
        if (active) setEstadoLink(session ? "valido" : "invalido");
      } catch {
        if (active) setEstadoLink("invalido");
      }
    }

    initialize();

    return () => {
      active = false;
      stopObserving();
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setErro("");

    if (!senhaValida) {
      setErro("A nova senha ainda não atende a todos os requisitos de segurança.");
      return;
    }

    if (!senhasIguais) {
      setErro("A confirmação deve ser idêntica à nova senha.");
      return;
    }

    setSalvando(true);

    try {
      await atualizarSenhaRecuperada(novaSenha);
      setSucesso(true);

      try {
        await encerrarSessaoRecuperacao();
      } catch {
        // A senha já foi alterada; o login seguinte exigirá nova autenticação.
      }
    } catch {
      setErro(
        "Não foi possível alterar sua senha. O link pode ter expirado ou já ter sido utilizado. Solicite uma nova recuperação."
      );
    } finally {
      setSalvando(false);
    }
  }

  function irParaLogin() {
    navigate("/login", {
      replace: true,
      state: sucesso
        ? { mensagem: "Senha alterada com sucesso. Entre novamente com sua nova senha." }
        : undefined,
    });
  }

  return (
    <main className="password-reset-page">
      <section className="password-reset-shell">
        <aside className="password-reset-visual">
          <div className="password-reset-copy">
            <span className="password-reset-eyebrow">Segurança da conta</span>
            <h1>
              Crie uma nova senha
              <span>forte e exclusiva.</span>
            </h1>
            <p>
              Proteja sua conta do Sistema Chegou! utilizando uma senha que você
              não usa em outros serviços.
            </p>
          </div>

          <div className="password-reset-art">
            <img
              src="/images/mascot-recuperacao-senha-hero.png"
              alt="Mascote oficial do Sistema Chegou! representando proteção de acesso."
            />
          </div>
        </aside>

        <section className="password-reset-form-panel">
          <div className="password-reset-mobile-brand">
            <img src={logoAzul} alt="Sistema Chegou!" />
          </div>

          <div className="password-reset-card">
            {estadoLink === "validando" && (
              <section className="password-reset-state" aria-live="polite">
                <div className="password-reset-icon">
                  <LoaderCircle size={34} className="password-reset-spinner" />
                </div>
                <h2>Validando link seguro</h2>
                <p>Aguarde enquanto confirmamos sua solicitação de recuperação.</p>
              </section>
            )}

            {estadoLink === "invalido" && (
              <section className="password-reset-state password-reset-invalid" aria-live="polite">
                <div className="password-reset-icon">
                  <AlertTriangle size={34} />
                </div>
                <h2>Link inválido ou expirado</h2>
                <p>Este endereço não pode mais ser utilizado. Solicite um novo e-mail de recuperação.</p>
                <button
                  type="button"
                  className="password-reset-primary"
                  onClick={() => navigate("/recuperar-senha", { replace: true })}
                >
                  Solicitar novo link
                </button>
                <button
                  type="button"
                  className="password-reset-secondary"
                  onClick={irParaLogin}
                >
                  Voltar ao login
                </button>
              </section>
            )}

            {estadoLink === "valido" && !sucesso && (
              <>
                <div className="password-reset-icon">
                  <KeyRound size={30} />
                </div>

                <header className="password-reset-header">
                  <h2>Redefina sua senha</h2>
                  <span />
                  <p>Escolha uma senha segura para concluir a recuperação da sua conta.</p>
                </header>

                <form className="password-reset-form" onSubmit={handleSubmit} noValidate>
                  <label htmlFor="new-password">Nova senha</label>
                  <div className="password-reset-input">
                    <LockKeyhole size={20} />
                    <input
                      id="new-password"
                      type={mostrarSenha ? "text" : "password"}
                      value={novaSenha}
                      onChange={(event) => {
                        setNovaSenha(event.target.value);
                        setErro("");
                      }}
                      autoComplete="new-password"
                      disabled={salvando}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha((current) => !current)}
                      aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                      disabled={salvando}
                    >
                      {mostrarSenha ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>

                  <div className="password-reset-rules">
                    {rulesState.map((rule) => (
                      <div key={rule.id} className={rule.valid ? "is-valid" : ""}>
                        {rule.valid ? <Check size={16} /> : <X size={16} />}
                        <span>{rule.label}</span>
                      </div>
                    ))}
                  </div>

                  <label htmlFor="confirm-password">Confirme a nova senha</label>
                  <div className={`password-reset-input ${confirmacao && !senhasIguais ? "has-error" : ""}`}>
                    <LockKeyhole size={20} />
                    <input
                      id="confirm-password"
                      type={mostrarSenha ? "text" : "password"}
                      value={confirmacao}
                      onChange={(event) => {
                        setConfirmacao(event.target.value);
                        setErro("");
                      }}
                      autoComplete="new-password"
                      disabled={salvando}
                    />
                  </div>

                  {erro && <div className="password-reset-error" role="alert">{erro}</div>}

                  <button
                    type="submit"
                    className="password-reset-primary"
                    disabled={salvando || !senhaValida || !senhasIguais}
                    aria-busy={salvando}
                  >
                    {salvando ? (
                      <LoaderCircle size={20} className="password-reset-spinner" />
                    ) : (
                      <ShieldCheck size={20} />
                    )}
                    {salvando ? "Protegendo sua conta..." : "Salvar nova senha"}
                  </button>
                </form>

                <aside className="password-reset-note">
                  <ShieldCheck size={21} />
                  <p>Após a alteração, você precisará entrar novamente com a nova senha.</p>
                </aside>
              </>
            )}

            {estadoLink === "valido" && sucesso && (
              <section className="password-reset-state password-reset-success" aria-live="polite">
                <div className="password-reset-icon">
                  <CheckCircle2 size={38} />
                </div>
                <h2>Senha alterada com sucesso</h2>
                <p>Sua conta está protegida novamente. Entre no sistema utilizando sua nova senha.</p>
                <button type="button" className="password-reset-primary" onClick={irParaLogin}>
                  Ir para o login
                </button>
              </section>
            )}
          </div>
        </section>

        <footer className="password-reset-footer">
          <img src={logoAzul} alt="Sistema Chegou!" />
          <p>© {new Date().getFullYear()} Sistema Chegou!. Todos os direitos reservados.</p>
        </footer>
      </section>
    </main>
  );
}

export default RedefinirSenha;