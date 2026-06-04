import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  DoorClosed,
  Home,
  Info,
  Mail,
  Phone,
  UserRound,
  X,
} from "lucide-react";

import "../../../styles/wizardMorador/WizardMoradorTela1.css";

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

function somenteNumeros(valor = "") {
  return String(valor).replace(/\D/g, "");
}

function formatarTelefoneBR(numero = "") {
  const n = somenteNumeros(numero).slice(0, 11);

  if (!n) return "";

  if (n.length <= 2) {
    return `(${n}`;
  }

  if (n.length <= 6) {
    return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  }

  if (n.length <= 10) {
    return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  }

  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

function formatarTelefoneInternacional({ ddi = "55", numero = "" }) {
  const ddiLimpo = somenteNumeros(ddi) || "55";
  const numeroLimpo = somenteNumeros(numero);

  if (!numeroLimpo) return "";

  if (ddiLimpo === "55") {
    return `+55 ${formatarTelefoneBR(numeroLimpo)}`;
  }

  const agrupado = numeroLimpo.replace(/(\d{3})(?=\d)/g, "$1 ").trim();

  return `+${ddiLimpo} ${agrupado}`;
}

function extrairTelefoneConvite(pre = {}, dadosWizard = {}) {
  const ddi = somenteNumeros(pre.ddi || dadosWizard?.ddi || "55") || "55";

  let telefoneBruto = somenteNumeros(
    pre.telefone ||
      pre.whatsapp ||
      dadosWizard?.telefone ||
      dadosWizard?.whatsapp ||
      ""
  );

  if (telefoneBruto.startsWith(ddi) && telefoneBruto.length > 10) {
    telefoneBruto = telefoneBruto.slice(ddi.length);
  }

  return formatarTelefoneInternacional({
    ddi,
    numero: telefoneBruto,
  });
}

function obterDadosConvite(dadosWizard) {
  const pre = dadosWizard?.preCadastro || dadosWizard?.pre_cadastro || {};
  const condominio = dadosWizard?.condominio || {};

  return {
    nome: pre.nome || dadosWizard?.nome || "",
    email: pre.email || dadosWizard?.email || "",
    whatsapp: extrairTelefoneConvite(pre, dadosWizard),
    condominio:
      condominio.nome_fantasia ||
      condominio.nome ||
      dadosWizard?.nome_condominio ||
      "",
    torre:
      pre.torre_nome ||
      pre.torre ||
      pre.bloco_nome ||
      pre.bloco ||
      dadosWizard?.torre_nome ||
      dadosWizard?.torre ||
      dadosWizard?.bloco ||
      "",
    unidade:
      pre.unidade_nome ||
      pre.unidade ||
      dadosWizard?.unidade_nome ||
      dadosWizard?.unidade ||
      "",
  };
}

function montarPayloadTela1({ dadosWizard, formTela1 }) {
  const pre = dadosWizard?.preCadastro || dadosWizard?.pre_cadastro || {};

  return {
    id_business: dadosWizard?.business_id || null,
    business_id: dadosWizard?.business_id || null,
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
  const [tentouAvancar, setTentouAvancar] = useState(false);

  const dadosConvite = useMemo(() => obterDadosConvite(dadosWizard), [dadosWizard]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  function selecionarPerfil(perfil) {
    setFormTela1("perfilUnidade", perfil);
    setFormTela1("confirmouDadosConvite", true);
  }

  function mensagemFluxoPorPerfil() {
    if (formTela1?.perfilUnidade === "unidade_vazia") {
      return "Como a unidade foi marcada como vazia, algumas etapas poderão ser simplificadas para agilizar o cadastro.";
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
    <div className="wm-t1-page">
      <section className="wm-t1-card">
        <header className="wm-t1-title">
          <span className="wm-t1-title-icon">
            <Building2 size={24} />
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
              <Mail size={20} />
            </span>

            <div className="wm-t1-section-title-block">
              <div className="wm-t1-title-row">
                <h2>Dados do convite</h2>
                <small>Preenchidos automaticamente</small>
              </div>

              <p>Confira as informações recebidas.</p>
            </div>
          </div>

          <div className="wm-t1-readonly-grid">
            <ReadOnlyField label="Nome completo" value={dadosConvite.nome} icon={<UserRound size={15} />} />
            <ReadOnlyField label="E-mail" value={dadosConvite.email} icon={<Mail size={15} />} />
            <ReadOnlyField label="WhatsApp" value={dadosConvite.whatsapp} icon={<Phone size={15} />} />
            <ReadOnlyField label="Condomínio" value={dadosConvite.condominio} icon={<Building2 size={15} />} />
            <ReadOnlyField label="Torre / Bloco" value={dadosConvite.torre} icon={<Building2 size={15} />} />
            <ReadOnlyField label="Unidade" value={dadosConvite.unidade} icon={<DoorClosed size={15} />} />
          </div>

          <div className="wm-t1-info-note">
            <Info size={16} />
            <span>
              Se algum dado estiver incorreto, você poderá corrigir ou atualizar na próxima etapa
              (Dados Pessoais).
            </span>
          </div>
        </section>

        <section className="wm-t1-section">
          <div className="wm-t1-section-head">
            <span className="wm-t1-section-icon">
              <UserRound size={20} />
            </span>

            <div className="wm-t1-section-title-block">
              <h2>Qual é o seu perfil em relação a esta Unidade?</h2>
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
                    {ativo ? <CheckCircle2 size={16} /> : null}
                  </span>

                  <span className="wm-t1-profile-icon">
                    <Icon size={23} />
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
            <X size={16} />
            Sair do cadastro
          </button>

          <button type="button" className="wm-t1-btn primary" onClick={avancar}>
            Continuar
            <ArrowRight size={18} />
          </button>
        </footer>
      </section>
    </div>
  );
}

function ReadOnlyField({ label, value, icon }) {
  return (
    <label className="wm-t1-readonly-field">
      <span>{label}</span>

      <div className="wm-t1-readonly-input">
        {icon ? <i>{icon}</i> : null}
        <input value={value || "Não informado"} readOnly tabIndex={-1} />
      </div>
    </label>
  );
} 