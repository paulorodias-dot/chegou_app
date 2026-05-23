import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { prepararSenhaWizardMorador } from "../../../services/wizardMoradorService";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCopy,
  Eye,
  EyeOff,
  HelpCircle,
  Info,
  KeyRound,
  LockKeyhole,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

function somenteNumeros(valor = "") {
  return String(valor).replace(/\D/g, "");
}

function mascararCpf(cpf = "") {
  const valor = somenteNumeros(cpf);

  if (valor.length !== 11) return cpf || "Não informado";

  return `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(
    6,
    9
  )}-${valor.slice(9, 11)}`;
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

function obterResumo(dadosWizard, formTela1, formMorador, dependentes = []) {
  const pre = dadosWizard?.pre_cadastro || {};
  const condominio = dadosWizard?.condominio || {};

  const perfil =
    formTela1?.perfilUnidade ||
    formTela1?.relacaoUnidade ||
    pre.relacao_unidade ||
    dadosWizard?.perfil_unidade ||
    "";

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
    responsavel: formMorador?.nomeCompleto || pre.nome || "Não informado",
    email: formMorador?.emailPrincipal || pre.email || "",
    cpf: formMorador?.cpf || pre.cpf || "",
    dependentes: dependentes?.length || 0,
    protocolo:
      dadosWizard?.protocolo ||
      dadosWizard?.codigo_protocolo ||
      `CHG-${new Date().getFullYear()}-${String(
        dadosWizard?.pre_cadastro_id || "000245"
      )
        .replace(/\D/g, "")
        .slice(-6)
        .padStart(6, "0")}`,
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

export default function WizardMoradorTela5({
  dadosWizard,
  formTela1,
  formMorador,
  dependentes = [],
  onBack,
  onNext,
  onSaveDraft,
}) {
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [faqAberta, setFaqAberta] = useState(null);

  const resumo = useMemo(
    () => obterResumo(dadosWizard, formTela1, formMorador, dependentes),
    [dadosWizard, formTela1, formMorador, dependentes]
  );

  const regras = validarSenha(senha, confirmarSenha);
  const senhaValida = senhaForte(regras);

  async function salvarRascunho() {
    await onSaveDraft({
      business_id: dadosWizard?.business_id || null,
      condominio_id: dadosWizard?.condominio_id || null,
      pre_cadastro_id: dadosWizard?.pre_cadastro_id || null,
      etapa_atual: 5,
      status_conta: "PENDENTE_APROVACAO",
      senha_preparada: false,
      atualizado_em: new Date().toISOString(),
    });

    toast.success("Rascunho salvo com sucesso.");
  }

async function salvarSenhaEContinuar() {
  if (!senhaValida) {
    toast.error("Crie uma senha forte e confirme corretamente antes de continuar.");
    return;
  }

  const tokenUrl = new URLSearchParams(window.location.search).get("token");

  const tokenConvite =
    tokenUrl ||
    dadosWizard?.token_convite ||
    dadosWizard?.preCadastro?.token_convite ||
    dadosWizard?.pre_cadastro?.token_convite ||
    dadosWizard?.preCadastro?.token ||
    dadosWizard?.pre_cadastro?.token ||
    dadosWizard?.token ||
    null;

  if (!tokenConvite) {
    toast.error("Token do convite não encontrado.");
    return;
  }

console.log("TOKEN URL:", tokenUrl);
console.log("TOKEN ENVIADO:", tokenConvite);
console.log("DADOS WIZARD:", dadosWizard);


  try {
    await prepararSenhaWizardMorador({
      token: tokenConvite,
      senha,
      confirmarSenha,
      email: resumo.email,
      cpf: somenteNumeros(resumo.cpf),
    });

    toast.success("Senha preparada com segurança.");

    await onNext({
      business_id: dadosWizard?.business_id || null,
      condominio_id: dadosWizard?.condominio_id || null,
      pre_cadastro_id: dadosWizard?.pre_cadastro_id || null,
      etapa_atual: 5,
      status_conta: "PENDENTE_APROVACAO",
      auth_ativo: false,
      senha_preparada: true,
      senha_definida: true,
      atualizado_em: new Date().toISOString(),
    });
  } catch (error) {
    toast.error(error.message || "Erro ao preparar senha.");
  }
}

  function copiarProtocolo() {
    navigator.clipboard?.writeText(resumo.protocolo);
    toast.success("Protocolo copiado.");
  }

  return (
    <div className="wm-t5-grid">
      <section className="wm-t5-main">
        <header className="wm-t5-hero">
          <span className="wm-t5-hero-icon">
            <KeyRound size={27} />
          </span>

          <div>
            <h1>
              Prepare seu acesso ao Sistema Chegou<span className="wm-orange">!</span>
            </h1>

            <p>
              Seu cadastro foi enviado para auditoria administrativa. Enquanto isso,
              defina sua senha para agilizar a ativação da conta após aprovação.
            </p>
          </div>

          <em>Conta pendente de aprovação</em>
        </header>

        <section className="wm-t5-timeline">
          <TimelineItem done label="Cadastro preenchido" />
          <TimelineItem done label="Revisão concluída" />
          <TimelineItem done label="Enviado para auditoria" />
          <TimelineItem active label="Preparando acesso" />
          <TimelineItem label="Aguardando aprovação" />
          <TimelineItem label="Conta ativa" />
        </section>

        <section className="wm-t5-card">
          <div className="wm-t5-section-title">
            <span>
              <UserRound size={20} />
            </span>

            <div>
              <h2>1. Seu login de acesso</h2>
              <p>Após aprovação, você poderá entrar usando e-mail ou CPF.</p>
            </div>
          </div>

          <div className="wm-t5-login-badges">
            <span>
              <Mail size={16} />
              E-mail cadastrado
            </span>

            <span>
              <UserRound size={16} />
              CPF cadastrado
            </span>
          </div>

          <div className="wm-t5-login-grid">
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

          <div className="wm-t5-info-note">
            <Info size={17} />
            <span>
              Se esquecer o e-mail, seu CPF poderá ser utilizado como identificador
              alternativo de acesso.
            </span>
          </div>
        </section>
        <section className="wm-t5-card">
          <div className="wm-t5-section-title">
            <span>
              <LockKeyhole size={20} />
            </span>

            <div>
              <h2>2. Crie sua senha segura</h2>
              <p>
                Sua senha ficará preparada, mas a conta só será ativada após aprovação administrativa.
              </p>
            </div>
          </div>

          <div className="wm-t5-password-layout">
            <div className="wm-t5-password-fields">
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

              <div className="wm-t5-security-note">
                <ShieldCheck size={18} />
                <span>
                  A senha será armazenada de forma segura. Sua conta permanecerá bloqueada
                  até a aprovação administrativa.
                </span>
              </div>
            </div>

            <div className="wm-t5-rules-card">
              <h3>Validação em tempo real</h3>

              <PasswordRule ok={regras.minimo} text="Mínimo de 8 caracteres" />
              <PasswordRule ok={regras.maiuscula} text="Pelo menos 1 letra maiúscula" />
              <PasswordRule ok={regras.numero} text="Pelo menos 1 número" />
              <PasswordRule ok={regras.especial} text="Pelo menos 1 caractere especial" />
              <PasswordRule ok={regras.iguais} text="As senhas precisam coincidir" />
            </div>
          </div>
        </section>

        <footer className="wm-t5-actions">
          <button type="button" className="secondary" onClick={onBack}>
            <ArrowLeft size={17} />
            Voltar
          </button>

          <button type="button" className="outline" onClick={salvarRascunho}>
            <Save size={17} />
            Salvar e continuar depois
          </button>

          <button
            type="button"
            className="primary"
            onClick={salvarSenhaEContinuar}
            disabled={!senhaValida}
          >
            Salvar senha e continuar
            <ArrowRight size={18} />
          </button>
        </footer>
      </section>

      <aside className="wm-t5-side">
        <section className="wm-t5-side-card">
          <span>
            <Info size={22} />
          </span>

          <h3>Resumo do cadastro</h3>

          <div className="wm-t5-summary-list">
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
              <strong>Pessoas vinculadas:</strong> {resumo.dependentes}
            </p>
          </div>
        </section>

        <section className="wm-t5-side-card orange">
          <span>
            <ClipboardCopy size={22} />
          </span>

          <h3>Protocolo</h3>
          <p className="wm-t5-protocol">{resumo.protocolo}</p>

          <button type="button" className="wm-t5-copy-btn" onClick={copiarProtocolo}>
            Copiar protocolo
          </button>
        </section>

        <section className="wm-t5-side-card green">
          <span>
            <ShieldCheck size={22} />
          </span>

          <h3>Status da conta</h3>

          <div className="wm-t5-status-list">
            <p>
              Senha preparada: <strong>{senhaValida ? "SIM" : "NÃO"}</strong>
            </p>
            <p>
              Conta ativa: <strong>NÃO</strong>
            </p>
            <p>
              Auditoria: <strong>EM FILA</strong>
            </p>
          </div>
        </section>

        <section className="wm-t5-side-card">
          <span>
            <HelpCircle size={22} />
          </span>

          <h3>Dúvidas frequentes</h3>

          <FaqItem
            id="quando_acessar"
            pergunta="Quando poderei acessar?"
            resposta="Após a aprovação administrativa do condomínio, sua conta será liberada para acesso."
            aberta={faqAberta}
            setAberta={setFaqAberta}
          />

          <FaqItem
            id="trocar_senha"
            pergunta="Posso trocar a senha depois?"
            resposta="Sim. Após a ativação da conta, você poderá alterar a senha pela área de segurança do perfil."
            aberta={faqAberta}
            setAberta={setFaqAberta}
          />

          <FaqItem
            id="cadastro_recusado"
            pergunta="Meu cadastro pode ser recusado?"
            resposta="Sim. Em caso de inconsistência, o condomínio poderá solicitar correção antes da aprovação."
            aberta={faqAberta}
            setAberta={setFaqAberta}
          />
        </section>
      </aside>
    </div>
  );
}
function TimelineItem({ done, active, label }) {
  return (
    <div className={`wm-t5-timeline-item ${done ? "done" : ""} ${active ? "active" : ""}`}>
      <span>{done ? <Check size={14} /> : null}</span>
      <strong>{label}</strong>
    </div>
  );
}

function ReadOnlyField({ label, value, icon }) {
  return (
    <label className="wm-t5-readonly">
      <span>{label}</span>

      <div>
        {icon}
        <strong>{value}</strong>
      </div>
    </label>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  mostrar,
  onToggleMostrar,
}) {
  return (
    <label className="wm-t5-password-field">
      <span>{label}</span>

      <div>
        <LockKeyhole size={16} />

        <input
          type={mostrar ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
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
    <div className={`wm-t5-rule ${ok ? "ok" : ""}`}>
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
      className={`wm-t5-faq-item ${ativo ? "active" : ""}`}
      onClick={() => setAberta(ativo ? null : id)}
    >
      <strong>{pergunta}</strong>
      {ativo ? <p>{resposta}</p> : null}
    </button>
  );
}