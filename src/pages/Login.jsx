import { useState } from "react";
import {
  User,
  BriefcaseBusiness,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  AtSign,
  Users,
} from "lucide-react";
import {
  loginComEmailSenha,
  loginFuncionarioCondominio,
  loginEquipeChegou,
} from "../services/authService";
import logo from "../assets/logo.png";
import "../App.css";

function normalizarCodigoCondominio(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .trim();
}

function normalizarEmailOuCpf(valor = "") {
  const texto = String(valor).trim();

  if (texto.includes("@")) {
    return texto.toLowerCase();
  }

  return texto.replace(/\D/g, "");
}

function normalizarUsername(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase()
    .trim();
}

function validarTipoAcesso(perfil, tipoAcesso, souEquipeChegou) {
  if (!perfil) {
    throw new Error("Perfil não encontrado.");
  }

  const nivel = Number(perfil.nivel_id);

  if (nivel === 1) {
    return true;
  }

  if (souEquipeChegou && nivel !== 1) {
    throw new Error("Este acesso é exclusivo para equipe Chegou!.");
  }

  if (tipoAcesso === "morador" && ![6, 7].includes(nivel)) {
    throw new Error("Este usuário não possui permissão para acessar pela aba Morador.");
  }

  if (tipoAcesso === "funcionario" && !souEquipeChegou && ![2, 3, 4, 5].includes(nivel)) {
    throw new Error("Este usuário deve acessar pela aba correta.");
  }

  return true;
}

function salvarSessaoLocal(perfil, lembrar) {
  localStorage.setItem("chegou_perfil", JSON.stringify(perfil));
  localStorage.setItem("chegou_ultimo_uso", String(Date.now()));

  if (lembrar) {
    localStorage.setItem("chegou_lembrar", "true");
  } else {
    localStorage.removeItem("chegou_lembrar");
  }
}

function Login({ onLogin }) {
  const [tipoAcesso, setTipoAcesso] = useState("morador");
  const [emailCpf, setEmailCpf] = useState("");
  const [codigoCondominio, setCodigoCondominio] = useState("");
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrarMe, setLembrarMe] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [souEquipeChegou, setSouEquipeChegou] = useState(false);
  const [capsLockAtivo, setCapsLockAtivo] = useState(false);
  const [erro, setErro] = useState("");
  const [status, setStatus] = useState("");
  const [carregando, setCarregando] = useState(false);

  function fecharTecladoMobile(e) {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  }

  function limparMensagens() {
    setErro("");
    setStatus("");
    setCapsLockAtivo(false);
  }

  function selecionarMorador() {
    setTipoAcesso("morador");
    setSouEquipeChegou(false);
    setCodigoCondominio("");
    setUsername("");
    limparMensagens();
  }

  function selecionarFuncionario() {
    setTipoAcesso("funcionario");
    limparMensagens();
  }

  async function handleLogin(e) {
    e.preventDefault();

    setErro("");
    setStatus("");
    setCarregando(true);

    try {
      setStatus("Conectando ao sistema...");
      await new Promise((resolve) => setTimeout(resolve, 250));

      let resultado;

      if (tipoAcesso === "morador") {
        const login = normalizarEmailOuCpf(emailCpf);

        setStatus("Verificando acesso do morador...");
        resultado = await loginComEmailSenha(login, senha);
      }

      if (tipoAcesso === "funcionario" && !souEquipeChegou) {
        const codigoNormalizado = normalizarCodigoCondominio(codigoCondominio);
        const usernameNormalizado = normalizarUsername(username);

        if (!codigoNormalizado) {
          throw new Error("Informe o código do condomínio.");
        }

        if (!usernameNormalizado) {
          throw new Error("Informe o usuário.");
        }

        setStatus("Verificando acesso do funcionário...");
        resultado = await loginFuncionarioCondominio(
          codigoNormalizado,
          usernameNormalizado,
          senha
        );
      }

      if (tipoAcesso === "funcionario" && souEquipeChegou) {
        const usernameNormalizado = normalizarUsername(username);

        if (!usernameNormalizado) {
          throw new Error("Informe o usuário institucional.");
        }

        setStatus("Verificando acesso institucional...");
        resultado = await loginEquipeChegou(usernameNormalizado, senha);
      }

      if (!resultado?.perfil) {
        throw new Error("Perfil de acesso não encontrado.");
      }

      validarTipoAcesso(resultado.perfil, tipoAcesso, souEquipeChegou);

      setStatus("Aplicando permissões...");
      await new Promise((resolve) => setTimeout(resolve, 250));

      salvarSessaoLocal(resultado.perfil, lembrarMe);

      onLogin(resultado.perfil);
    } catch (error) {
      setErro(error.message || "Não foi possível realizar o login.");
      setStatus("");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="login-page-new">
      <main className="login-wrapper-new">
        <section className="login-top-brand">
          <img src={logo} alt="Chegou!" className="login-logo-new" />
          <p>Mais controle. Mais segurança. Mais Chegou!</p>
        </section>

        <section className="login-card-new">
          <div className="login-card-title">
            <h1>Bem-vindo de volta!</h1>
            <p>Faça login para continuar</p>
          </div>

          <div className="login-tabs">
            <button
              type="button"
              className={`login-tab ${tipoAcesso === "morador" ? "active" : ""}`}
              onClick={selecionarMorador}
            >
              <User size={24} />
              Morador
            </button>

            <button
              type="button"
              className={`login-tab ${tipoAcesso === "funcionario" ? "active" : ""}`}
              onClick={selecionarFuncionario}
            >
              <BriefcaseBusiness size={24} />
              Funcionário
            </button>
          </div>

          <form onSubmit={handleLogin} className="login-form-new">
            <div className="login-dynamic">
              {tipoAcesso === "morador" ? (
                <>
                  <div className="login-section-text">
                    <h2>Acesso do morador</h2>
                    <p>Informe seu CPF ou e-mail para acessar sua conta.</p>
                  </div>

                  <div className="login-input-box">
                    <Mail size={22} />
                    <input
                      type="text"
                      value={emailCpf}
                      onChange={(e) => setEmailCpf(e.target.value)}
                      onKeyDown={fecharTecladoMobile}
                      placeholder="CPF ou e-mail"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="login-section-text">
                    <h2>{souEquipeChegou ? "Acesso institucional" : "Acesso do funcionário"}</h2>
                    <p>
                      {souEquipeChegou
                        ? "Informe seu usuário institucional e senha."
                        : "Informe o código do condomínio, usuário e senha."}
                    </p>
                  </div>

                  {!souEquipeChegou && (
                    <div className="login-input-box">
                      <Building2 size={22} />
                      <input
                        type="text"
                        value={codigoCondominio}
                        onChange={(e) =>
                          setCodigoCondominio(normalizarCodigoCondominio(e.target.value))
                        }
                        onKeyDown={fecharTecladoMobile}
                        placeholder="Código do condomínio"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck="false"
                        required
                      />
                    </div>
                  )}

                  <div className="login-input-box">
                    <AtSign size={22} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(normalizarUsername(e.target.value))}
                      onKeyDown={fecharTecladoMobile}
                      placeholder={souEquipeChegou ? "Usuário institucional" : "Usuário"}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      required
                    />
                  </div>
                </>
              )}

              <div className="login-input-box">
                <Lock size={22} />
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onKeyUp={(e) => setCapsLockAtivo(e.getModifierState("CapsLock"))}
                  onKeyDown={fecharTecladoMobile}
                  placeholder="Senha"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {mostrarSenha ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>

              {capsLockAtivo && <div className="caps-warning">Caps Lock ativado</div>}

              {erro && <div className="error-message-new">{erro}</div>}

              {status && (
                <div className="status-box-new">
                  <span className="status-dot-new"></span>
                  {status}
                </div>
              )}
            </div>

            <div className="login-fixed-bottom">
              <div className="login-options-new">
                <label>
                  <input
                    type="checkbox"
                    checked={lembrarMe}
                    onChange={(e) => setLembrarMe(e.target.checked)}
                  />
                  Lembrar-me
                </label>

                <button type="button" className="forgot-button-new">
                  Esqueci minha senha
                </button>
              </div>

              <button className="login-button-new" type="submit" disabled={carregando}>
                {carregando ? "Entrando..." : "Entrar"}
              </button>

              <div className="login-divider">
                <span></span>
                <p>ou acesse como</p>
                <span></span>
              </div>

              <label
                className={`chegou-team-box ${souEquipeChegou ? "active" : ""}`}
                onClick={selecionarFuncionario}
              >
                <div className="chegou-team-left">
                  <input
                    type="checkbox"
                    checked={souEquipeChegou}
                    onChange={(e) => {
                      const checked = e.target.checked;

                      setSouEquipeChegou(checked);
                      setTipoAcesso("funcionario");
                      setErro("");
                      setStatus("");

                      if (checked) {
                        setCodigoCondominio("");
                      }
                    }}
                  />

                  <div>
                    <strong>
                      Sou equipe Chegou<span className="brand-orange">!</span>
                    </strong>
                    <p>Marque esta opção para acessar sua conta institucional.</p>
                  </div>
                </div>

                <div className="chegou-team-icon">
                  <Users size={34} />
                </div>
              </label>
            </div>
          </form>
        </section>

        <footer className="login-footer-new">
          © 2026 Chegou<span>!</span> Todos os direitos reservados.
        </footer>
      </main>
    </div>
  );
}

export default Login;