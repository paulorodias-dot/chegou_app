import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  ArrowRight,
  Building2,
  CheckCircle,
  Eye,
  EyeOff,
  Headphones,
  HelpCircle,
  Info,
  Lock,
  Mail,
  Moon,
  Monitor,
  ShieldCheck,
  Sun,
  Truck,
  UserCheck,
} from "lucide-react";

import toast from "react-hot-toast";
import { supabase } from "../services/supabase";

import logo from "../assets/logo.png";
import sidebarImage from "../assets/sidebar-criar-senha.png";

import "../styles/CriarSenhaResponsavel.css";

export default function CriarSenhaResponsavel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");
  const tipo = searchParams.get("tipo");

  const [primeiroAcesso, setPrimeiroAcesso] = useState(false);
  const [dadosPrimeiroAcesso, setDadosPrimeiroAcesso] = useState(null);
  const [erroToken, setErroToken] = useState(null);

  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [validandoSessao, setValidandoSessao] = useState(true);

  const [usuarioAuth, setUsuarioAuth] = useState(null);
  const [usuarioSistema, setUsuarioSistema] = useState(null);
  const [condominio, setCondominio] = useState(null);

  const [tema, setTema] = useState(() => {
    return localStorage.getItem("chegou_tema") || "system";
  });

  useEffect(() => {
    validarSessaoOuToken();
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    if (tema === "system") {
      root.removeAttribute("data-chegou-theme");
      localStorage.setItem("chegou_tema", "system");
      return;
    }

    root.setAttribute("data-chegou-theme", tema);
    localStorage.setItem("chegou_tema", tema);
  }, [tema]);

  function alternarTema() {
    setTema((temaAtual) => {
      if (temaAtual === "system") return "light";
      if (temaAtual === "light") return "dark";
      return "system";
    });
  }

  function iconeTema() {
    if (tema === "light") return <Sun size={18} />;
    if (tema === "dark") return <Moon size={18} />;
    return <Monitor size={18} />;
  }

  function textoTema() {
    if (tema === "light") return "Tema claro";
    if (tema === "dark") return "Tema escuro";
    return "Tema automático";
  }

  async function validarSessaoOuToken() {
    try {
      setValidandoSessao(true);

      if (token) {
        setPrimeiroAcesso(true);

        const tipoNormalizado = String(tipo || "").toLowerCase();

        if (tipoNormalizado === "funcionario") {
          const { data, error } = await supabase.rpc(
            "rpc_funcionario_validar_token_acesso_v1",
            {
              p_token: token,
            }
          );

          if (error) throw error;

          setDadosPrimeiroAcesso(data);
          return;
        }

        setErroToken("Tipo de acesso não reconhecido.");
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session?.user) {
        toast.error("Link inválido ou expirado.");
        navigate("/login");
        return;
      }

      const user = session.user;
      setUsuarioAuth(user);

      const { data: usuarioData, error: usuarioError } = await supabase
        .from("usuarios")
        .select(
          `
          id,
          nome,
          email,
          username,
          business_id,
          condominio_id,
          nivel_id,
          ativo
        `
        )
        .eq("id", user.id)
        .maybeSingle();

      if (usuarioError) throw usuarioError;

      setUsuarioSistema(usuarioData || null);

      const condominioId =
        usuarioData?.condominio_id || user.user_metadata?.condominio_id || null;

      if (condominioId) {
        const { data: condominioData, error: condominioError } = await supabase
          .from("condominios")
          .select(
            `
            id,
            nome_fantasia,
            razao_social,
            codigo_condominio,
            cnpj,
            status_cadastro
          `
          )
          .eq("id", condominioId)
          .maybeSingle();

        if (condominioError) throw condominioError;

        setCondominio(condominioData || null);
      }
    } catch (error) {
      console.error("Erro ao validar acesso:", error);

      if (token) {
        setErroToken(
          error?.message ||
            "Não foi possível validar este convite. Solicite um novo acesso ao administrador."
        );
        return;
      }

      toast.error("Não foi possível validar o acesso.");
      navigate("/login");
    } finally {
      setValidandoSessao(false);
    }
  }

  const fluxoFuncionario =
    primeiroAcesso &&
    String(dadosPrimeiroAcesso?.tipo_convite || "").toUpperCase() ===
      "FUNCIONARIO";

  const emailExibido = fluxoFuncionario
    ? dadosPrimeiroAcesso?.funcionario?.email || ""
    : usuarioSistema?.email || usuarioAuth?.email || "";

  const nomeExibido = fluxoFuncionario
    ? dadosPrimeiroAcesso?.funcionario?.nome || "Funcionário"
    : usuarioSistema?.nome || usuarioAuth?.user_metadata?.nome || "Responsável";

  const loginExibido = fluxoFuncionario
    ? dadosPrimeiroAcesso?.convite?.username || ""
    : usuarioSistema?.username || usuarioAuth?.user_metadata?.username || "";

  const nomeCondominio = fluxoFuncionario
    ? dadosPrimeiroAcesso?.condominio?.nome || "seu condomínio"
    : condominio?.nome_fantasia || condominio?.razao_social || "seu condomínio";

  const codigoCondominio = fluxoFuncionario
    ? dadosPrimeiroAcesso?.condominio?.codigo || "Não informado"
    : condominio?.codigo_condominio || "Não informado";

  const cargoOuPerfil = fluxoFuncionario
    ? dadosPrimeiroAcesso?.cargo?.cargo ||
      dadosPrimeiroAcesso?.cargo?.funcao ||
      "Funcionário"
    : "Responsável Logístico";

  const labelEmail = fluxoFuncionario
    ? "E-mail do funcionário"
    : "E-mail do responsável";

  const tituloSidebar = fluxoFuncionario
    ? "Bem-vindo ao Sistema Chegou!"
    : "Sua conta foi aprovada!";

  const textoSidebar = fluxoFuncionario
    ? `Você foi convidado para acessar o sistema como ${cargoOuPerfil} do condomínio ${nomeCondominio}.`
    : `Agora você precisa criar uma senha segura para acessar o sistema e gerenciar as operações logísticas do condomínio ${nomeCondominio}.`;

  const tituloPrincipal = fluxoFuncionario
    ? "Crie sua senha de acesso"
    : "Crie sua senha de acesso";

  const subtituloPrincipal = fluxoFuncionario
    ? "Defina uma senha forte e segura para concluir seu primeiro acesso ao Sistema Chegou!."
    : "Defina uma senha forte e segura para acessar o sistema Chegou! e gerenciar as operações logísticas do seu condomínio.";

  const requisitos = useMemo(() => {
    return [
      { texto: "Mínimo de 8 caracteres", valido: senha.length >= 8 },
      {
        texto: "Pelo menos 1 letra maiúscula (A-Z)",
        valido: /[A-Z]/.test(senha),
      },
      {
        texto: "Pelo menos 1 letra minúscula (a-z)",
        valido: /[a-z]/.test(senha),
      },
      { texto: "Pelo menos 1 número (0-9)", valido: /\d/.test(senha) },
      {
        texto: "Pelo menos 1 caractere especial (!@#$%)",
        valido: /[!@#$%^&*(),.?":{}|<>_\-+=]/.test(senha),
      },
      {
        texto: "Não pode conter espaços",
        valido: senha.length > 0 && !/\s/.test(senha),
      },
      {
        texto: "Não pode ser igual ao e-mail",
        valido:
          senha.length > 0 &&
          senha.toLowerCase() !== String(emailExibido || "").toLowerCase(),
      },
      {
        texto: "Não pode conter sequências simples",
        valido:
          senha.length > 0 &&
          !["123456", "abcdef", "qwerty", "senha", "password"].some((item) =>
            senha.toLowerCase().includes(item)
          ),
      },
    ];
  }, [senha, emailExibido]);

  const requisitosValidos = requisitos.filter((item) => item.valido).length;
  const senhaForte = requisitosValidos >= 7;

  const senhasIguais =
    senha.length > 0 && confirmarSenha.length > 0 && senha === confirmarSenha;

  const podeEnviar = senhaForte && senhasIguais && !erroToken;

  function textoForcaSenha() {
    if (!senha) return "Não informada";
    if (requisitosValidos <= 3) return "Fraca";
    if (requisitosValidos <= 6) return "Média";
    return "Forte";
  }

  async function criarSenha(e) {
    e.preventDefault();

    if (!podeEnviar) {
      toast.error("Confira os requisitos da senha antes de continuar.");
      return;
    }

    try {
      setCarregando(true);

      if (fluxoFuncionario) {
        const tipoFluxo =
          dadosPrimeiroAcesso?.convite?.tipo_fluxo ||
          "PRIMEIRO_ACESSO_FUNCIONARIO";

        const { data, error } = await supabase.functions.invoke(
          "gerenciar-acesso-usuario",
          {
            body: {
              tipo_fluxo: tipoFluxo,
              token,
              senha,
              confirmar_senha: confirmarSenha,
            },
          }
        );

        if (error) throw error;

        if (!data?.success) {
          throw new Error(
            data?.message || "Não foi possível criar o acesso."
          );
        }

        toast.success("Senha criada com sucesso!");

        setTimeout(() => {
          navigate("/login", {
            state: {
              mensagem:
                "Senha criada com sucesso. Faça login com o código do condomínio, seu login de usuário e sua senha.",
            },
          });
        }, 1400);

        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: senha,
      });

      if (error) throw error;

      toast.success("Senha criada com sucesso!");

      await supabase.auth.signOut();

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (error) {
      console.error("Erro ao criar senha:", error);
      toast.error(error.message || "Não foi possível criar a senha.");
    } finally {
      setCarregando(false);
    }
  }

  if (validandoSessao) {
    return (
      <div className="senha-loading">
        <img src={logo} alt="Chegou!" />
        <div className="spinner" />
        <p>Validando acesso seguro...</p>
      </div>
    );
  }

  if (erroToken) {
    return (
      <div className="senha-loading">
        <img src={logo} alt="Chegou!" />
        <p>{erroToken}</p>
        <button
          type="button"
          className="senha-submit"
          style={{ maxWidth: 280, margin: "18px auto 0" }}
          onClick={() => navigate("/login")}
        >
          Ir para o login
        </button>
      </div>
    );
  }

  return (
    <div className="senha-page">
      <aside className="senha-sidebar">
        <div className="senha-sidebar-top">
          <img src={logo} alt="Chegou!" className="senha-logo" />
          <span>Gestão Inteligente de Encomendas</span>
        </div>

        <div className="senha-sidebar-image">
          <img src={sidebarImage} alt="Logística Chegou!" />
        </div>

        <div className="senha-sidebar-content">
          <div className="senha-shield">
            <ShieldCheck size={38} />
          </div>

          <h2>{tituloSidebar}</h2>

          <p>{textoSidebar}</p>

          <div className="senha-sidebar-list">
            <div>
              <ShieldCheck size={20} />
              <span>
                <strong>Ambiente seguro</strong>
                <small>
                  Seus dados são protegidos com criptografia avançada.
                </small>
              </span>
            </div>

            <div>
              <UserCheck size={20} />
              <span>
                <strong>Acesso pessoal</strong>
                <small>
                  Utilize sua senha para acessar de forma segura e individual.
                </small>
              </span>
            </div>

            <div>
              <Truck size={20} />
              <span>
                <strong>Gestão completa</strong>
                <small>
                  Acesse os recursos autorizados para o seu perfil.
                </small>
              </span>
            </div>
          </div>
        </div>

        <footer>© 2026 Chegou! Todos os direitos reservados.</footer>
      </aside>

      <main className="senha-main">
        <header className="senha-topbar">
          <div className="senha-breadcrumb">
            <span>Início</span>
            <b>›</b>
            <span>Aprovação</span>
            <b>›</b>
            <strong>Criar Senha</strong>
          </div>

          <div className="senha-topbar-actions">
            <button type="button">
              <HelpCircle size={17} />
              Precisa de ajuda?
            </button>

            <button
              type="button"
              className="senha-icon-button"
              onClick={alternarTema}
              title={textoTema()}
              aria-label={textoTema()}
            >
              {iconeTema()}
            </button>
          </div>
        </header>

        <section className="senha-content">
          <div className="senha-form-area">
            <div className="senha-title-box">
              <h1>{tituloPrincipal}</h1>
              <p>{subtituloPrincipal}</p>
            </div>

            <div className="senha-info-box">
              <Info size={23} />
              <div>
                <strong>Esta é sua primeira etapa de acesso.</strong>
                <p>
                  Após criar sua senha, você poderá fazer login com o código do
                  condomínio, seu login de usuário e sua senha.
                </p>
              </div>
            </div>

            <div className="senha-access-card">
              <div className="senha-access-card-header">
                <div className="senha-access-icon">
                  <UserCheck size={20} />
                </div>

                <div>
                  <span>Dados do acesso</span>
                  <strong>Confira as informações antes de criar sua senha.</strong>
                </div>
              </div>

              <div className="senha-access-grid">
                <div>
                  <span>Nome</span>
                  <strong>{nomeExibido}</strong>
                </div>

                <div>
                  <span>Perfil</span>
                  <strong>{cargoOuPerfil}</strong>
                </div>

                <div>
                  <span>Condomínio</span>
                  <strong>{nomeCondominio}</strong>
                </div>

                <div>
                  <span>Código do condomínio</span>
                  <strong>{codigoCondominio}</strong>
                </div>

                <div className="span-2">
                  <span>Login de usuário</span>
                  <strong>{loginExibido || "Será definido após a validação."}</strong>
                </div>
              </div>
            </div>

            <form className="senha-form" onSubmit={criarSenha}>
              <div className="senha-field-group">
                <label>{labelEmail}</label>

                <div className="senha-input-wrapper senha-input-disabled">
                  <Mail size={18} />
                  <input value={emailExibido} disabled />
                </div>
              </div>

              <div className="senha-grid">
                <div className="senha-field-group">
                  <label>Nova senha</label>

                  <div className="senha-input-wrapper">
                    <input
                      type={mostrarSenha ? "text" : "password"}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      onClick={() => setMostrarSenha((prev) => !prev)}
                    >
                      {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="senha-field-group">
                  <label>Confirmar nova senha</label>

                  <div className="senha-input-wrapper">
                    <input
                      type={mostrarConfirmar ? "text" : "password"}
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      onClick={() => setMostrarConfirmar((prev) => !prev)}
                    >
                      {mostrarConfirmar ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="senha-strength">
                <div>
                  Força da senha: <strong>{textoForcaSenha()}</strong>
                </div>

                <div className="senha-strength-bars">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <span
                      key={item}
                      className={requisitosValidos >= item + 2 ? "active" : ""}
                    />
                  ))}
                </div>
              </div>

              {senha && (
                <div
                  className={`senha-alert ${
                    senhaForte ? "success" : "warning"
                  }`}
                >
                  <CheckCircle size={20} />
                  {senhaForte
                    ? "Excelente! Sua senha atende aos requisitos de segurança."
                    : "Continue ajustando sua senha para atender aos requisitos."}
                </div>
              )}

              {confirmarSenha && !senhasIguais && (
                <div className="senha-alert warning">
                  As senhas informadas ainda não conferem.
                </div>
              )}

              <button
                className="senha-submit"
                type="submit"
                disabled={!podeEnviar || carregando}
              >
                <Lock size={18} />
                {carregando
                  ? "Criando senha..."
                  : "Criar senha e acessar o sistema"}
                <ArrowRight size={20} />
              </button>

              <p className="senha-secure-note">
                <Lock size={14} />
                Suas informações estão protegidas e criptografadas.
              </p>
            </form>

            <div className="senha-help-box">
              <Headphones size={25} />
              <div>
                <strong>Precisa de ajuda?</strong>
                <p>
                  Se você não solicitou este acesso ou precisa de suporte, entre
                  em contato com o administrador do sistema.
                </p>
              </div>
            </div>

            <div className="senha-benefits">
              <div>
                <Lock size={22} />
                <strong>Acesso seguro</strong>
                <p>Protegemos seus dados com tecnologia avançada.</p>
              </div>

              <div>
                <Building2 size={22} />
                <strong>Condomínio</strong>
                <p>Acesse somente o condomínio autorizado.</p>
              </div>

              <div>
                <Truck size={22} />
                <strong>Operação eficiente</strong>
                <p>Tenha acesso aos recursos liberados para sua função.</p>
              </div>

              <div>
                <Headphones size={22} />
                <strong>Suporte dedicado</strong>
                <p>Nossa equipe está sempre pronta para ajudar.</p>
              </div>
            </div>
          </div>

          <aside className="senha-side-cards">
            <div className="senha-card">
              <h3>Requisitos da senha</h3>

              <div className="senha-requisitos">
                {requisitos.map((item) => (
                  <div key={item.texto} className={item.valido ? "ok" : ""}>
                    <CheckCircle size={18} />
                    <span>{item.texto}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="senha-card tip">
              <Info size={22} />
              <strong>Dicas para uma senha forte</strong>
              <p>
                Use uma combinação de letras, números e símbolos. Evite
                informações pessoais como nomes, datas de nascimento ou
                sequências como 123456.
              </p>
            </div>

            <div className="senha-card">
              <h3>Segurança da sua conta</h3>

              <div className="senha-security-list">
                <div>
                  <ShieldCheck size={19} />
                  <span>
                    <strong>Token único e temporário</strong>
                    <small>Este link expira em 5 dias.</small>
                  </span>
                </div>

                <div>
                  <Lock size={19} />
                  <span>
                    <strong>Acesso exclusivo</strong>
                    <small>Este link pode ser usado apenas uma vez.</small>
                  </span>
                </div>

                <div>
                  <ShieldCheck size={19} />
                  <span>
                    <strong>Ambiente protegido</strong>
                    <small>Todas as informações são criptografadas.</small>
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}