import { useState } from 'react'
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
} from 'lucide-react'
import {
  loginComEmailSenha,
  loginFuncionarioCondominio,
  loginEquipeChegou,
} from '../services/authService'
import logo from '../assets/logo.png'
import '../App.css'

function Login({ onLogin }) {
  const [tipoAcesso, setTipoAcesso] = useState('morador')
  const [emailCpf, setEmailCpf] = useState('')
  const [codigoCondominio, setCodigoCondominio] = useState('')
  const [username, setUsername] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [souEquipeChegou, setSouEquipeChegou] = useState(false)
  const [capsLockAtivo, setCapsLockAtivo] = useState(false)

  const [erro, setErro] = useState('')
  const [status, setStatus] = useState('')
  const [carregando, setCarregando] = useState(false)

  function fecharTecladoMobile(e) {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
  }

  function limparMensagens() {
    setErro('')
    setStatus('')
    setCapsLockAtivo(false)
  }

  function selecionarMorador() {
    setTipoAcesso('morador')
    setSouEquipeChegou(false)
    limparMensagens()
  }

  function selecionarFuncionario() {
    setTipoAcesso('funcionario')
    limparMensagens()
  }

  async function handleLogin(e) {
    e.preventDefault()

    setErro('')
    setStatus('')
    setCarregando(true)

    try {
      setStatus('Conectando ao sistema...')
      await new Promise((resolve) => setTimeout(resolve, 300))

      setStatus('Verificando credenciais...')

      let resultado

      if (tipoAcesso === 'morador') {
        resultado = await loginComEmailSenha(emailCpf, senha)
      }

      if (tipoAcesso === 'funcionario' && !souEquipeChegou) {
        resultado = await loginFuncionarioCondominio(
          codigoCondominio,
          username,
          senha
        )
      }

      if (tipoAcesso === 'funcionario' && souEquipeChegou) {
        resultado = await loginEquipeChegou(username, senha)
      }

      setStatus('Validando acesso...')
      await new Promise((resolve) => setTimeout(resolve, 300))

      setStatus('Carregando ambiente...')
      await new Promise((resolve) => setTimeout(resolve, 300))

      setStatus('Aplicando permissões...')
      await new Promise((resolve) => setTimeout(resolve, 300))

      onLogin(resultado.perfil)
    } catch (error) {
      setErro(error.message || 'Não foi possível realizar o login.')
      setStatus('')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="login-page-new">
      <main className="login-wrapper-new">
        <section className="login-top-brand">
          <img src={logo} alt="Chegou!" className="login-logo-new" />
          <p>Mais Controle. Mais segurança. Mais Chegou!</p>
        </section>

        <section className="login-card-new">
          <div className="login-card-title">
            <h1>Bem-vindo de volta!</h1>
            <p>Faça login para continuar</p>
          </div>

          <div className="login-tabs">
            <button
              type="button"
              className={`login-tab ${tipoAcesso === 'morador' ? 'active' : ''}`}
              onClick={selecionarMorador}
            >
              <User size={24} />
              Morador
            </button>

            <button
              type="button"
              className={`login-tab ${tipoAcesso === 'funcionario' ? 'active' : ''}`}
              onClick={selecionarFuncionario}
            >
              <BriefcaseBusiness size={24} />
              Funcionário
            </button>
          </div>

          <form onSubmit={handleLogin} className="login-form-new">
            <div className="login-dynamic">
              {tipoAcesso === 'morador' ? (
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
                      onChange={(e) => setEmailCpf(e.target.value.toLowerCase())}
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
                    <h2>
                      {souEquipeChegou
                        ? 'Acesso institucional'
                        : 'Acesso do funcionário'}
                    </h2>
                    <p>
                      {souEquipeChegou
                        ? 'Informe seu usuário institucional e senha.'
                        : 'Informe o código do condomínio, usuário e senha.'}
                    </p>
                  </div>

                  {!souEquipeChegou && (
                    <div className="login-input-box">
                      <Building2 size={22} />
                      <input
                        type="text"
                        value={codigoCondominio}
                        onChange={(e) => setCodigoCondominio(e.target.value.toLowerCase())}
                        onKeyDown={fecharTecladoMobile}
                        placeholder="Código do condomínio"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck="false"
                        required={!souEquipeChegou}
                      />
                    </div>
                  )}

                  <div className="login-input-box">
                    <AtSign size={22} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase())}
                      onKeyDown={fecharTecladoMobile}
                      placeholder="Usuário"
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
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onKeyUp={(e) => setCapsLockAtivo(e.getModifierState('CapsLock'))}
                  onKeyDown={fecharTecladoMobile}
                  placeholder="Senha"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {mostrarSenha ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>

              {capsLockAtivo && (
                <div className="caps-warning">
                  Caps Lock ativado
                </div>
              )}

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
                  <input type="checkbox" />
                  Lembrar-me
                </label>

                <button type="button" className="forgot-button-new">
                  Esqueci minha senha
                </button>
              </div>

              <button className="login-button-new" type="submit" disabled={carregando}>
                {carregando ? 'Entrando...' : 'Entrar'}
              </button>

              <div className="login-divider">
                <span></span>
                <p>ou acesse como</p>
                <span></span>
              </div>

              <label
                className={`chegou-team-box ${souEquipeChegou ? 'active' : ''}`}
                onClick={selecionarFuncionario}
              >
                <div className="chegou-team-left">
                  <input
                    type="checkbox"
                    checked={souEquipeChegou}
                    onChange={(e) => {
                      setSouEquipeChegou(e.target.checked)
                      setTipoAcesso('funcionario')
                      setErro('')
                      setStatus('')

                      if (e.target.checked) {
                        setCodigoCondominio('')
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
  )
}

export default Login