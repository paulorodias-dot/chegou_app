import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  Eye,
  EyeOff,
  HelpCircle,
  Info,
  LockKeyhole,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import { prepararSenhaWizardMorador } from "../../../services/wizardMoradorService";

import {
  obterChecklistWizardMorador,
  obterTermosWizardMorador,
} from "../wizardMoradorTermos";

import "../../../styles/wizardMorador/WizardMoradorTela7.css";

const VERSAO_TERMOS_FALLBACK = "1.0";

const aceiteInicial = Object.fromEntries(
  obterChecklistWizardMorador().map((item) => [item.id, false])
);

function somenteNumeros(valor = "") {
  return String(valor).replace(/\D/g, "");
}

function mascararCpf(cpf = "") {
  const valor = somenteNumeros(cpf);

  if (valor.length !== 11) return cpf || "Não informado";

  return `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(6, 9)}-${valor.slice(9, 11)}`;
}

function traduzirPerfil(perfil = "") {
  const mapa = {
    proprietario_morador: "Proprietário Morador",
    proprietario_residente: "Proprietário Morador",
    inquilino: "Morador Inquilino",
    proprietario_nao_residente: "Proprietário Não Residente",
    proprietario_unidade_alugada: "Proprietário Não Residente",
    unidade_vazia: "Unidade Vazia",
    unidade_corporativa: "Unidade Corporativa",
    responsavel_unidade_corporativa: "Unidade Corporativa",
  };

  return mapa[perfil] || "Perfil não identificado";
}

function obterPreCadastro(dadosWizard = {}) {
  return dadosWizard?.preCadastro || dadosWizard?.pre_cadastro || {};
}

function obterResumo(dadosWizard, formTela1, formMorador, dependentes = [], estrutura = {}) {
  const pre = obterPreCadastro(dadosWizard);
  const condominio = dadosWizard?.condominio || {};

  const perfil =
    formTela1?.perfilUnidade ||
    formTela1?.relacaoUnidade ||
    pre.relacao_unidade ||
    dadosWizard?.perfil_unidade ||
    "";

  const nomeExibicao =
    formMorador?.nomeSocial ||
    formMorador?.nome_exibicao ||
    formMorador?.nomeCompleto ||
    pre.nome ||
    "Não informado";

  return {
    condominio:
      condominio.nome_fantasia ||
      condominio.nome ||
      dadosWizard?.nome_condominio ||
      "Condomínio",
    torre: pre.torre_nome || pre.torre || dadosWizard?.torre || "Torre",
    unidade: pre.unidade_nome || pre.unidade || dadosWizard?.unidade || "Unidade",
    perfil,
    perfilTexto: traduzirPerfil(perfil),
    responsavel: nomeExibicao,
    nomeCompleto: formMorador?.nomeCompleto || pre.nome || "",
    nomeSocial: formMorador?.nomeSocial || formMorador?.nome_exibicao || "",
    email: formMorador?.emailPrincipal || pre.email || "",
    cpf: formMorador?.cpf || pre.cpf || "",
    dependentes: Array.isArray(dependentes) ? dependentes.length : 0,
    veiculos: Array.isArray(estrutura?.veiculos) ? estrutura.veiculos.length : 0,
    vagas: Array.isArray(estrutura?.vagas) ? estrutura.vagas.length : 0,
  };
}
function validarSenha(senha = "", confirmar = "") {
  return {
    minimo: senha.length >= 8,
    maiuscula: /[A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ]/.test(senha),
    numero: /\d/.test(senha),
    especial: /[^A-Za-zÀ-ÿ0-9]/.test(senha),
    iguais: senha.length > 0 && senha === confirmar,
  };
}

function senhaForte(regras) {
  return (
    regras.minimo &&
    regras.maiuscula &&
    regras.numero &&
    regras.especial &&
    regras.iguais
  );
}

function obterForcaSenha(regras) {
  const pontos = [
    regras.minimo,
    regras.maiuscula,
    regras.numero,
    regras.especial,
  ].filter(Boolean).length;

  if (pontos <= 1) return { texto: "Fraca", classe: "weak" };
  if (pontos <= 3) return { texto: "Média", classe: "medium" };
  return { texto: "Forte", classe: "strong" };
}

function obterVersaoTermos() {
  return VERSAO_TERMOS_FALLBACK;
}

function obterItensTermos() {
  const checklist = obterChecklistWizardMorador();

  return checklist.map((item) => ({
    chave: item.id,
    titulo: item.texto,
    descricao: item.obrigatorio
      ? "Aceite obrigatório para finalizar o cadastro."
      : "Aceite complementar.",
  }));
}

function todosAceitesMarcados(aceites) {
  return Object.keys(aceiteInicial).every((chave) => Boolean(aceites[chave]));
}

function obterTokenConvite(dadosWizard) {
  const tokenUrl = new URLSearchParams(window.location.search).get("token");

  return (
    tokenUrl ||
    dadosWizard?.token_convite ||
    dadosWizard?.preCadastro?.token_convite ||
    dadosWizard?.pre_cadastro?.token_convite ||
    dadosWizard?.preCadastro?.token ||
    dadosWizard?.pre_cadastro?.token ||
    dadosWizard?.token ||
    null
  );
}
export default function WizardMoradorTela7({
  dadosWizard,
  formTela1,
  formMorador,
  dependentes = [],
  estrutura = {},
  termos = {},
  onBack,
  onNext,
  onSaveDraft,
}) {

  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const senhaJaPreparada = Boolean(
    dadosWizard?.senha_preparada ||
      dadosWizard?.preCadastro?.senha_preparada ||
      dadosWizard?.pre_cadastro?.senha_preparada
  );

  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

  const [faqAberta, setFaqAberta] = useState(null);

  const [modalTermos, setModalTermos] = useState(null);

  const [aceites, setAceites] = useState(() => {
    if (termos?.aceiteTermos && termos?.aceiteLgpd) {
      return Object.fromEntries(
        Object.keys(aceiteInicial).map((chave) => [chave, true])
      );
    }

    return aceiteInicial;
  });

  const resumo = useMemo(
    () =>
      obterResumo(
        dadosWizard,
        formTela1,
        formMorador,
        dependentes,
        estrutura
      ),
    [
      dadosWizard,
      formTela1,
      formMorador,
      dependentes,
      estrutura,
    ]
  );

  const regras = validarSenha(
    senha,
    confirmarSenha
  );

  const forcaSenha = obterForcaSenha(regras);

  const senhaValida = senhaForte(regras);

  const aceitouTudo =
    todosAceitesMarcados(aceites);

  const podeContinuar =
    (senhaValida || senhaJaPreparada) && aceitouTudo;

  const itensTermos = useMemo(
    () => obterItensTermos(),
    []
  );

  const termosCompletos = useMemo(
  () => obterTermosWizardMorador(resumo.perfil),
  [resumo.perfil]
);

  const versaoTermos = obterVersaoTermos();

  function alterarAceite(chave) {
    setAceites((old) => ({
      ...old,
      [chave]: !old[chave],
    }));
  }

  function aceitarTodos() {
    const novoValor = !aceitouTudo;

    setAceites(
        Object.fromEntries(
        Object.keys(aceiteInicial).map((chave) => [chave, novoValor])
        )
    );
    }

  async function salvarRascunho() {
    await onSaveDraft?.({
      etapa_atual: 7,
      status_conta: "PENDENTE_APROVACAO",
      senha_preparada: false,
      atualizado_em: new Date().toISOString(),
    });

    toast.success(
      "Rascunho salvo com sucesso."
    );
  }

  async function finalizarEtapa() {
    if (!senhaValida && !senhaJaPreparada) {
      toast.error("Crie uma senha forte antes de continuar.");
      return;
    }

    if (!aceitouTudo) {
      toast.error(
        "É necessário aceitar todos os termos obrigatórios."
      );
      return;
    }

    const tokenConvite = obterTokenConvite(dadosWizard);

    const tokenEhSandbox =
      tokenConvite === "sandbox-token-morador" ||
      tokenConvite?.startsWith("sandbox-") ||
      tokenConvite?.startsWith("mock-") ||
      tokenConvite?.startsWith("teste-");

    const modoTeste =
      dadosWizard?.modoTeste === true ||
      dadosWizard?.modo_teste === true ||
      window.location.hostname === "localhost" ||
      tokenEhSandbox;
    
    if (modoTeste || tokenEhSandbox) {
      await onNext?.({
        etapa_atual: 7,
        senha_preparada: true,
        senha_definida: true,
        aceite_termos: true,
        aceite_lgpd: true,
        versao_termos: versaoTermos,
        versao_privacidade: versaoTermos,
        user_agent: navigator.userAgent,
        sistema_operacional: navigator.platform,
        aceito_em: new Date().toISOString(),
        status_conta: "PENDENTE_APROVACAO",
        modo_teste: true,
      });

      toast.success("Etapa validada em modo teste.");
      return;
    }



    try {
      if (!senhaJaPreparada) {
        await prepararSenhaWizardMorador({
          token: tokenConvite,
          senha,
          confirmarSenha,
          email: resumo.email,
          cpf: somenteNumeros(resumo.cpf),
        });
      }

      await onNext({
        etapa_atual: 7,

        senha_preparada: true,
        senha_definida: true,

        aceite_termos: true,
        aceite_lgpd: true,

        aceite_comunicacao_operacional: true,

        aceite_auditoria_administrativa: true,

        aceite_dados_complementares: true,

        versao_termos: versaoTermos,

        versao_privacidade: versaoTermos,

        versao_documento_juridico: versaoTermos,

        user_agent: navigator.userAgent,

        sistema_operacional: navigator.platform,

        aceito_em: new Date().toISOString(),

        status_conta: "PENDENTE_APROVACAO",
        });

      toast.success(
        "Senha e aceites registrados."
      );
    } catch (error) {
      toast.error(
        error?.message ||
          "Erro ao finalizar a etapa."
      );
    }
  }
  return (
    <div className="wm-t7-page">
      <section className="wm-t7-card">
        <header className="wm-t7-header">
          <div className="wm-t7-title">
            <span className="wm-t7-step">7</span>

            <div>
              <h1>Senha e aceites</h1>

              <p>
                Prepare seu acesso ao Sistema Chegou<span className="wm-orange">!</span> e confirme
                os termos obrigatórios para continuidade do cadastro.
              </p>
            </div>
          </div>

          <div className="wm-t7-security">
            <ShieldCheck size={34} />

            <div>
              <strong>Conta pendente de aprovação</strong>

              <p>
                Sua senha ficará preparada, mas o acesso só será liberado após
                validação administrativa.
              </p>
            </div>
          </div>
        </header>

        <div className="wm-t7-divider" />

        <div className="wm-t7-main-grid">
          <section className="wm-t7-left">
            <section className="wm-t7-section-card">
              <div className="wm-t7-section-title">
                <span>
                  <UserRound size={20} />
                </span>

                <div>
                  <h2>1. Dados de acesso</h2>
                  <p>Confira os dados que poderão ser usados para identificação.</p>
                </div>
              </div>

              <div className="wm-t7-login-grid">
                <ReadOnlyField
                  label="Nome de exibição"
                  value={resumo.responsavel}
                  icon={<UserRound size={16} />}
                />

                <ReadOnlyField
                  label="Nome completo"
                  value={resumo.nomeCompleto || resumo.responsavel}
                  icon={<UserRound size={16} />}
                />

                <ReadOnlyField
                  label="E-mail"
                  value={resumo.email || "Não informado"}
                  icon={<Mail size={16} />}
                />

                <ReadOnlyField
                  label="CPF"
                  value={mascararCpf(resumo.cpf)}
                  icon={<UserRound size={16} />}
                />
              </div>

              <div className="wm-t7-info-note">
                <Info size={17} />
                <span>
                  Após a aprovação, você poderá acessar com o e-mail cadastrado
                  ou CPF, conforme regras de autenticação do Sistema Chegou<span className="wm-orange">!</span>.
                </span>
              </div>
            </section>

            <section className="wm-t7-section-card">
              <div className="wm-t7-section-title">
                <span>
                  <LockKeyhole size={20} />
                </span>

                <div>
                  <h2>2. Crie sua senha segura</h2>
                  <p>
                    Use uma senha forte. O preenchimento automático fica desativado nesta etapa.
                  </p>
                </div>
              </div>
              <div className="wm-t7-password-layout">
                <div className="wm-t7-password-fields">
                  <PasswordField
                    label="Senha *"
                    value={senha}
                    onChange={setSenha}
                    mostrar={mostrarSenha}
                    onToggleMostrar={() => setMostrarSenha((old) => !old)}
                  />

                  <PasswordField
                    label="Confirmar senha *"
                    value={confirmarSenha}
                    onChange={setConfirmarSenha}
                    mostrar={mostrarConfirmar}
                    onToggleMostrar={() => setMostrarConfirmar((old) => !old)}
                  />

                  <div className="wm-t7-security-note">
                    <ShieldCheck size={18} />
                    <span>
                      A senha será preparada com segurança. Sua conta permanecerá
                      bloqueada até aprovação administrativa.
                    </span>
                  </div>
                </div>

                <div className="wm-t7-rules-card">
                  <div className={`wm-t7-strength ${forcaSenha.classe}`}>
                    <span>Força da senha</span>
                    <strong>{forcaSenha.texto}</strong>
                  </div>

                  <PasswordRule ok={regras.minimo} text="Mínimo de 8 caracteres" />
                  <PasswordRule ok={regras.maiuscula} text="Pelo menos 1 letra maiúscula" />
                  <PasswordRule ok={regras.numero} text="Pelo menos 1 número" />
                  <PasswordRule ok={regras.especial} text="Pelo menos 1 caractere especial" />
                  <PasswordRule ok={regras.iguais} text="As senhas precisam coincidir" />
                </div>
              </div>
            </section>

            <section className="wm-t7-section-card">
              <div className="wm-t7-section-title">
                <span>
                  <ClipboardCheck size={20} />
                </span>

                <div>
                  <h2>3. Aceites obrigatórios</h2>
                  <p>
                    Leia e confirme os termos necessários para continuidade do cadastro.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className={`wm-t7-accept-all ${aceitouTudo ? "active" : ""}`}
                onClick={aceitarTodos}
              >
                <span>{aceitouTudo ? <Check size={14} /> : null}</span>

                <div>
                  <strong>Selecionar e aceitar todos os termos</strong>
                  <small>
                    Versão dos termos: {versaoTermos}. O aceite será registrado
                    com data, hora e dispositivo.
                  </small>
                </div>
              </button>

              <div className="wm-t7-terms-list">
                {itensTermos.map((item) => (
                  <div
                    key={item.chave}
                    className={`wm-t7-term-item ${aceites[item.chave] ? "active" : ""}`}
                  >
                    <button
                      type="button"
                      className="wm-t7-term-check"
                      onClick={() => alterarAceite(item.chave)}
                      aria-label={`Aceitar ${item.titulo}`}
                    >
                      {aceites[item.chave] ? <Check size={13} /> : null}
                    </button>

                    <div>
                      <strong>{item.titulo}</strong>
                      <small>{item.descricao}</small>

                      <button
                        type="button"
                        className="wm-t7-view-term"
                        onClick={() => {
                          setModalTermos({
                            titulo: item.titulo,
                            termos: termosCompletos,
                          });
                        }}
                      >
                        Visualizar termos
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="wm-t7-section-card wm-t7-legal-card">
              <div className="wm-t7-section-title">
                <span>
                  <ShieldCheck size={20} />
                </span>

                <div>
                  <h2>4. Segurança e responsabilidade</h2>

                  <p>
                    Transparência sobre o tratamento dos dados e uso da plataforma.
                  </p>
                </div>
              </div>

              <div className="wm-t7-legal-content">
                <p>
                  O Sistema Chegou<span className="wm-orange">!</span> utiliza os
                  dados informados exclusivamente para fins operacionais,
                  segurança condominial, rastreabilidade, comunicação e execução
                  das funcionalidades autorizadas pelo usuário.
                </p>

                <p>
                  Os dados poderão ser utilizados para identificação de moradores,
                  dependentes, encomendas, acessos autorizados, veículos,
                  funcionários, prestadores, vagas de garagem e demais recursos
                  vinculados ao condomínio.
                </p>

                <p>
                  Toda alteração relevante poderá ser registrada em logs de
                  auditoria para garantir segurança, conformidade e
                  rastreabilidade operacional.
                </p>

                <div className="wm-t7-version-box">
                  <div>
                    <strong>Versão dos Termos</strong>
                    <span>{versaoTermos}</span>
                  </div>

                  <div>
                    <strong>Data do aceite</strong>
                    <span>{new Date().toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              </div>
            </section>

            <footer className="wm-t7-actions">
              <button
                type="button"
                className="secondary"
                onClick={onBack}
              >
                <ArrowLeft size={17} />
                Voltar
              </button>

              <button
                type="button"
                className="outline"
                onClick={salvarRascunho}
              >
                <Save size={17} />
                Salvar e continuar depois
              </button>

              <button
                type="button"
                className="primary"
                onClick={finalizarEtapa}
                disabled={!podeContinuar}
              >
                Finalizar cadastro
                <ArrowRight size={18} />
              </button>
            </footer>
          </section>
          <aside className="wm-t7-side">
            <section className="wm-t7-side-card">
              <span>
                <Info size={22} />
              </span>

              <h3>Resumo do cadastro</h3>

              <div className="wm-t7-summary-list">
                <p>
                  <strong>Condomínio:</strong> {resumo.condominio}
                </p>
                <p>
                  <strong>Unidade:</strong> {resumo.torre} • {resumo.unidade}
                </p>
                <p>
                  <strong>Perfil:</strong> {resumo.perfilTexto}
                </p>
                <p>
                  <strong>Dependentes:</strong> {resumo.dependentes}
                </p>
                <p>
                  <strong>Veículos:</strong> {resumo.veiculos}
                </p>
                <p>
                  <strong>Vagas:</strong> {resumo.vagas}
                </p>
              </div>
            </section>

            <section className="wm-t7-side-card green">
              <span>
                <ShieldCheck size={22} />
              </span>

              <h3>Status</h3>

              <div className="wm-t7-status-list">
                <p>
                  Senha forte: <strong>{senhaValida ? "SIM" : "NÃO"}</strong>
                </p>
                <p>
                  Aceites concluídos: <strong>{aceitouTudo ? "SIM" : "NÃO"}</strong>
                </p>
                <p>
                  Conta ativa: <strong>NÃO</strong>
                </p>
              </div>
            </section>

            <section className="wm-t7-side-card orange">
              <span>
                <ClipboardCheck size={22} />
              </span>

              <h3>Jurídico</h3>
              <p>
                Após o aceite, estes termos não serão solicitados novamente no
                Módulo Morador, exceto se houver alteração de versão jurídica.
              </p>
            </section>

            <section className="wm-t7-side-card">
              <span>
                <HelpCircle size={22} />
              </span>

              <h3>Dúvidas frequentes</h3>

              <FaqItem
                id="quando_acessar"
                pergunta="Quando poderei acessar?"
                resposta="Após aprovação administrativa do condomínio, sua conta será liberada para acesso."
                aberta={faqAberta}
                setAberta={setFaqAberta}
              />

              <FaqItem
                id="trocar_senha"
                pergunta="Posso trocar a senha depois?"
                resposta="Sim. Após a ativação da conta, você poderá alterar a senha na área de segurança do perfil."
                aberta={faqAberta}
                setAberta={setFaqAberta}
              />

              <FaqItem
                id="novo_aceite"
                pergunta="Vou aceitar estes termos novamente?"
                resposta="Não, salvo se houver nova versão dos termos, política de privacidade ou mudança jurídica relevante."
                aberta={faqAberta}
                setAberta={setFaqAberta}
              />
            </section>
          </aside>
                </div>
      </section>

      {modalTermos ? (
        <ModalTermos
          titulo={modalTermos.titulo}
          termos={modalTermos.termos}
          onClose={() => setModalTermos(null)}
        />
      ) : null}
    </div>
  );
}

function ModalTermos({ titulo, termos = [], onClose }) {
  return (
    <div className="wm-t7-modal-overlay" role="dialog" aria-modal="true">
      <div className="wm-t7-modal">
        <header className="wm-t7-modal-head">
          <div>
            <h2>{titulo}</h2>
            <p>Leia os termos antes de confirmar o aceite.</p>
          </div>

          <button type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div className="wm-t7-modal-body">
          {termos.map((termo) => (
            <section key={termo.id} className="wm-t7-modal-term">
              <h3>{termo.titulo}</h3>
              <p>{termo.resumo}</p>

              {termo.conteudo?.map((paragrafo, index) => (
                <p key={index}>{paragrafo}</p>
              ))}
            </section>
          ))}
        </div>

        <footer className="wm-t7-modal-actions">
          <button type="button" onClick={onClose}>
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value, icon }) {
  return (
    <label className="wm-t7-readonly">
      <span>{label}</span>

      <div>
        {icon}
        <strong>{value || "Não informado"}</strong>
      </div>
    </label>
  );
}

function PasswordField({ label, value, onChange, mostrar, onToggleMostrar }) {
  return (
    <label className="wm-t7-password-field">
      <span>{label}</span>

      <div>
        <LockKeyhole size={16} />

        <input
          type={mostrar ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          name={`chegou_${label.replace(/\s+/g, "_").toLowerCase()}_${Date.now()}`}
          id={`chegou_${label.replace(/\s+/g, "_").toLowerCase()}_field`}
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-lpignore="true"
          data-1p-ignore="true"
          data-bwignore="true"
          data-form-type="other"
        />

        <button type="button" onClick={onToggleMostrar}>
          {mostrar ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </label>
  );
}

function PasswordRule({ ok, text }) {
  return (
    <div className={`wm-t7-rule ${ok ? "ok" : ""}`}>
      <span>{ok ? <Check size={13} /> : <X size={13} />}</span>
      <p>{text}</p>
    </div>
  );
}

function FaqItem({ id, pergunta, resposta, aberta, setAberta }) {
  const ativo = aberta === id;

  return (
    <button
      type="button"
      className={`wm-t7-faq-item ${ativo ? "active" : ""}`}
      onClick={() => setAberta(ativo ? null : id)}
    >
      <strong>{pergunta}</strong>
      {ativo ? <p>{resposta}</p> : null}
    </button>
  );
}