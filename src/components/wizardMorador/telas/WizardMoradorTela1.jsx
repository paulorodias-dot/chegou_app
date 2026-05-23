import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  DoorClosed,
  HelpCircle,
  Home,
  Info,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

const PERFIS_UNIDADE = [
  {
    id: "proprietario_residente",
    titulo: "Proprietário residente",
    descricao: "Moro na unidade e sou o proprietário.",
    icon: Home,
  },
  {
    id: "proprietario_nao_residente",
    titulo: "Proprietário não residente",
    descricao: "Sou proprietário, mas a unidade está alugada ou cedida.",
    icon: DoorClosed,
  },
  {
    id: "inquilino",
    titulo: "Morador inquilino",
    descricao: "Alugo a unidade e sou o morador responsável.",
    icon: UserRound,
  },
  {
    id: "responsavel_unidade_corporativa",
    titulo: "Responsável por unidade corporativa",
    descricao: "Represento uma empresa que ocupa esta unidade.",
    icon: Building2,
  },
  {
    id: "unidade_vazia",
    titulo: "Unidade vazia",
    descricao: "A unidade está vazia, mas sou o proprietário ou responsável.",
    icon: DoorClosed,
  },
];

const FAQS = [
  {
    pergunta: "Por que preciso selecionar meu perfil?",
    resposta:
      "Isso ajuda a identificar corretamente quem receberá notificações de encomendas e qual vínculo será auditado.",
  },
  {
    pergunta: "Posso alterar meus dados depois?",
    resposta:
      "Sim. Os dados do convite aparecem bloqueados nesta etapa, mas correções poderão ser feitas em Dados Pessoais.",
  },
  {
    pergunta: "O proprietário também precisa fazer cadastro?",
    resposta:
      "Sim, quando tiver convite próprio. Proprietário e morador/inquilino são acessos diferentes vinculados à mesma unidade.",
  },
  {
    pergunta: "Minhas encomendas serão confidenciais?",
    resposta:
      "Sim. As notificações são direcionadas ao perfil vinculado à encomenda, evitando mistura entre proprietário e inquilino.",
  },
  {
    pergunta: "O que acontece se eu escolher o perfil errado?",
    resposta:
      "Você poderá corrigir antes de finalizar. Se houver divergência, o Administrativo poderá ajustar na auditoria.",
  },
];

function marcaChegou() {
  return (
    <span className="wm-brand-text-inline">
      Chegou<span>!</span>
    </span>
  );
}

function obterDadosConvite(dadosWizard) {
  const pre = dadosWizard?.pre_cadastro || {};
  const condominio = dadosWizard?.condominio || {};

  const ddi = String(pre.ddi || dadosWizard?.ddi || "55").replace(/\D/g, "") || "55";
  const ddd = String(pre.ddd || dadosWizard?.ddd || "").replace(/\D/g, "");
  const telefoneBruto = String(pre.telefone || dadosWizard?.telefone || "").replace(/\D/g, "");

  let dddFinal = ddd;
  let numeroFinal = telefoneBruto;

  if (!dddFinal && telefoneBruto.length >= 10) {
    dddFinal = telefoneBruto.slice(0, 2);
    numeroFinal = telefoneBruto.slice(2);
  }

  return {
    nome: pre.nome || dadosWizard?.nome || "",
    email: pre.email || dadosWizard?.email || "",
    whatsapp:
      numeroFinal && dddFinal
        ? `+${ddi} (${dddFinal}) ${numeroFinal}`
        : numeroFinal
          ? `+${ddi} ${numeroFinal}`
          : "",
    condominio:
      condominio.nome_fantasia ||
      condominio.nome ||
      dadosWizard?.nome_condominio ||
      "",
    torre: pre.torre_nome || pre.torre || dadosWizard?.torre || "",
    unidade: pre.unidade_nome || pre.unidade || dadosWizard?.unidade || "",
  };
}

function montarPayloadTela1({ dadosWizard, formTela1 }) {
  const pre = dadosWizard?.pre_cadastro || {};

  return {
    id_business: dadosWizard?.business_id || null,
    pre_cadastro_id: dadosWizard?.pre_cadastro_id || null,
    condominio_id: dadosWizard?.condominio_id || null,
    torre_id: pre.torre_id || null,
    unidade_id: pre.unidade_id || null,
    perfil_unidade: formTela1.perfilUnidade,
    confirmou_dados_convite: true,
    status: "RASCUNHO",
    etapa_atual: 1,
    atualizado_em: new Date().toISOString(),
  };
}

export default function WizardMoradorTela1({
  dadosWizard,
  formTela1,
  setFormTela1,
  onNext,
  onCancel,
}) {
  const [faqAberta, setFaqAberta] = useState(null);
  const [modalAjuda, setModalAjuda] = useState(false);
  const [tentouAvancar, setTentouAvancar] = useState(false);

  const dadosConvite = useMemo(() => obterDadosConvite(dadosWizard), [dadosWizard]);

  useEffect(() => {
    function abrirAjuda() {
      setModalAjuda(true);
    }

    window.addEventListener("wizard-morador-ajuda", abrirAjuda);
    return () => window.removeEventListener("wizard-morador-ajuda", abrirAjuda);
  }, []);

  function selecionarPerfil(perfil) {
    setFormTela1("perfilUnidade", perfil);
    setFormTela1("confirmouDadosConvite", true);
  }

  function mensagemFluxoPorPerfil() {
    if (formTela1?.perfilUnidade === "unidade_vazia") {
      return "Como a unidade foi marcada como vazia, algumas etapas de dependentes poderão ser puladas para agilizar o cadastro.";
    }

    if (formTela1?.perfilUnidade === "proprietario_nao_residente") {
      return "Como proprietário não residente, seu acesso será separado do morador/inquilino para evitar mistura de notificações.";
    }

    return "";
  }

  async function avancar() {
    if (!formTela1?.perfilUnidade) {
      setTentouAvancar(true);
      toast.error("Selecione seu perfil em relação à unidade.");
      return;
    }

    const msg = mensagemFluxoPorPerfil();
    if (msg) toast(msg);

    await onNext(
      montarPayloadTela1({
        dadosWizard,
        formTela1: {
          ...formTela1,
          confirmouDadosConvite: true,
        },
      })
    );
  }

  return (
    <>
      <div className="wm-t1-grid">
        <section className="wm-t1-card">
          <header className="wm-t1-title">
            <span className="wm-t1-title-icon">
              <Building2 size={30} />
            </span>

            <div>
              <h1>1. Identificação da Unidade e do Perfil</h1>
              <p>Confirme os dados da unidade e selecione o seu perfil para continuarmos.</p>
            </div>
          </header>

          <div className="wm-t1-divider" />

          <section className="wm-t1-section">
            <div className="wm-t1-section-head">
              <span className="wm-t1-section-icon">
                <Mail size={23} />
              </span>

              <div>
                <h2 className="wm-inline-title">
                  Dados do convite <small>(preenchidos automaticamente)</small>
                </h2>
                <p>Confira as informações recebidas.</p>
              </div>
            </div>

            <div className="wm-t1-readonly-grid">
              <ReadOnlyField label="Nome completo" value={dadosConvite.nome} />
              <ReadOnlyField label="E-mail" value={dadosConvite.email} />
              <ReadOnlyField label="WhatsApp" value={dadosConvite.whatsapp} />
              <ReadOnlyField label="Condomínio" value={dadosConvite.condominio} />
              <ReadOnlyField label="Torre / Bloco" value={dadosConvite.torre} />
              <ReadOnlyField label="Unidade" value={dadosConvite.unidade} />
            </div>

            <div className="wm-t1-info-note">
              <Info size={18} />
              <span>
                Se algum dado estiver incorreto, você poderá corrigir ou atualizar na próxima
                etapa (Dados Pessoais).
              </span>
            </div>
          </section>

          <section className="wm-t1-section profile wm-profile-full">
            <div className="wm-t1-section-head wm-profile-head">
              <span className="wm-t1-section-icon">
                <UserRound size={23} />
              </span>

              <div>
                <h2>Qual é o seu perfil em relação a esta unidade?</h2>
                <p>Essa informação nos ajuda a personalizar sua experiência no sistema.</p>
              </div>
            </div>

            <div
              className={`wm-t1-profile-grid ${
                tentouAvancar && !formTela1?.perfilUnidade ? "invalid" : ""
              }`}
            >
              {PERFIS_UNIDADE.map((perfil) => {
                const Icon = perfil.icon;
                const ativo = formTela1?.perfilUnidade === perfil.id;

                return (
                  <button
                    key={perfil.id}
                    type="button"
                    className={`wm-t1-profile-card ${ativo ? "active" : ""}`}
                    onClick={() => selecionarPerfil(perfil.id)}
                  >
                    <span className="wm-t1-profile-radio">
                      {ativo ? <CheckCircle2 size={18} /> : null}
                    </span>

                    <span className="wm-t1-profile-icon">
                      <Icon size={27} />
                    </span>

                    <strong>{perfil.titulo}</strong>
                    <p>{perfil.descricao}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <footer className="wm-t1-actions">
            <button type="button" className="wm-t1-btn secondary" onClick={onCancel}>
              <X size={18} />
              Sair do cadastro
            </button>

            <button type="button" className="wm-t1-btn primary" onClick={avancar}>
              Continuar
              <ArrowRight size={20} />
            </button>
          </footer>
        </section>

        <aside className="wm-t1-right">
          <section className="wm-t1-side-card highlight">
            <span className="wm-t1-side-icon orange">
              <ShieldCheck size={25} />
            </span>

            <div>
              <h3>Segurança em primeiro lugar</h3>
              <p>
                Seus dados são protegidos e utilizados apenas para gestão de encomendas
                e comunicação condominial.
              </p>
            </div>
          </section>

          <section className="wm-t1-side-card">
            <h3>Por que pedimos essas informações?</h3>

            <ul className="wm-t1-check-list">
              <li>Para garantir que suas encomendas sejam entregues com segurança.</li>
              <li>Para permitir comunicações importantes do condomínio.</li>
              <li>Para identificar corretamente quem deve receber cada encomenda.</li>
            </ul>
          </section>

          <section className="wm-t1-side-card">
            <h3>Dúvidas frequentes</h3>

            <div className="wm-t1-faq-list">
              {FAQS.map((faq, index) => {
                const aberta = faqAberta === index;

                return (
                  <button
                    type="button"
                    key={faq.pergunta}
                    className={`wm-t1-faq-item ${aberta ? "active" : ""}`}
                    onClick={() => setFaqAberta(aberta ? null : index)}
                  >
                    <span>
                      <strong>{faq.pergunta}</strong>
                      {aberta ? <p>{faq.resposta}</p> : null}
                    </span>

                    <ChevronDown size={17} />
                  </button>
                );
              })}
            </div>

            <div className="wm-t1-important">
              <Info size={19} />
              <div>
                <strong>Importante</strong>
                <p>
                  As notificações de encomendas serão sempre enviadas ao perfil que está
                  sendo cadastrado neste momento.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {modalAjuda ? (
        <div className="wm-modal-overlay" role="dialog" aria-modal="true">
          <div className="wm-modal-card">
            <button
              type="button"
              className="wm-modal-close"
              onClick={() => setModalAjuda(false)}
            >
              <X size={18} />
            </button>

            <h2>Precisa de ajuda?</h2>
            <p>
              Caso tenha dúvidas sobre o convite, seus dados ou perfil da unidade, entre em
              contato com a administração do condomínio ou suporte {marcaChegou()}.
            </p>

            <div className="wm-modal-actions">
              <button
                type="button"
                className="wm-modal-primary"
                onClick={() => setModalAjuda(false)}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <label className="wm-t1-readonly-field">
      <span>{label}</span>
      <input value={value || "Não informado"} readOnly tabIndex={-1} />
    </label>
  );
}