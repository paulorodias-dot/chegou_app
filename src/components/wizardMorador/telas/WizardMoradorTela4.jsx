import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Edit3,
  FileText,
  Home,
  Info,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import {
  obterChecklistWizardMorador,
  obterResumoTermosPorPerfil,
  obterTermosWizardMorador,
  normalizarPerfilWizardMorador,
} from "../wizardMoradorTermos";

function mascararCpf(cpf = "") {
  const valor = String(cpf || "").replace(/\D/g, "");

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

function resumoWizard(dadosWizard, formTela1, formMorador, dependentes = []) {
  const pre = dadosWizard?.pre_cadastro || {};
  const cond = dadosWizard?.condominio || {};

  const perfil =
    formTela1?.perfilUnidade ||
    formTela1?.relacaoUnidade ||
    pre.relacao_unidade ||
    dadosWizard?.perfil_unidade ||
    "";

  return {
    perfil,
    condominio:
      cond.nome_fantasia ||
      cond.nome ||
      dadosWizard?.nome_condominio ||
      "Condomínio",
    endereco: cond.endereco || dadosWizard?.endereco || "",
    cidadeUf: cond.cidade_uf || dadosWizard?.cidade_uf || "",
    cep: cond.cep || dadosWizard?.cep || "",
    token:
      dadosWizard?.token_publico ||
      dadosWizard?.codigo_convite ||
      dadosWizard?.token ||
      "Token não disponível",
    idCondominio:
      dadosWizard?.condominio_id ||
      dadosWizard?.business_id ||
      "Não informado",
    torre: pre.torre_nome || pre.torre || dadosWizard?.torre || "Não informado",
    unidade:
      pre.unidade_nome || pre.unidade || dadosWizard?.unidade || "Não informado",
    nome: formMorador?.nomeCompleto || pre.nome || "Não informado",
    cpf: formMorador?.cpf || pre.cpf || "",
    email: formMorador?.emailPrincipal || pre.email || "",
    whatsapp: `+${formMorador?.ddi || "55"} (${formMorador?.ddd || ""}) ${
      formMorador?.whatsapp || ""
    }`,
    dependentes,
  };
}

function montarPayloadTela4({
  dadosWizard,
  checklist,
  perfil,
}) {
  return {
    business_id: dadosWizard?.business_id || null,
    condominio_id: dadosWizard?.condominio_id || null,
    pre_cadastro_id: dadosWizard?.pre_cadastro_id || null,
    etapa_atual: 4,
    status: "EM_AUDITORIA",
    perfil_unidade: perfil,
    checklist_revisao: checklist,
    enviado_auditoria_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };
}

export default function WizardMoradorTela4({
  dadosWizard,
  formTela1,
  formMorador,
  dependentes = [],
  onBack,
  onNext,
  onSaveDraft,
}) {
  const resumo = useMemo(
    () => resumoWizard(dadosWizard, formTela1, formMorador, dependentes),
    [dadosWizard, formTela1, formMorador, dependentes]
  );

  const perfilNormalizado = normalizarPerfilWizardMorador(resumo.perfil);

  const termos = useMemo(
    () => obterTermosWizardMorador(perfilNormalizado),
    [perfilNormalizado]
  );

  const checklistBase = useMemo(
    () => obterChecklistWizardMorador(),
    []
  );

  const [accordionTela1, setAccordionTela1] = useState(false);
  const [accordionTela2, setAccordionTela2] = useState(false);
  const [accordionTela3, setAccordionTela3] = useState(false);

  const [termoAberto, setTermoAberto] = useState(null);

  const [checklist, setChecklist] = useState(
    checklistBase.reduce((acc, item) => {
      acc[item.id] = false;
      return acc;
    }, {})
  );
  function alternarChecklist(id) {
    setChecklist((old) => ({
      ...old,
      [id]: !old[id],
    }));
  }

  function validarChecklist() {
    const pendentes = checklistBase.filter(
      (item) => item.obrigatorio && !checklist[item.id]
    );

    if (pendentes.length > 0) {
      toast.error("Confirme todos os itens obrigatórios antes de enviar para auditoria.");
      return false;
    }

    return true;
  }

  async function salvarRascunho() {
    await onSaveDraft({
      business_id: dadosWizard?.business_id || null,
      condominio_id: dadosWizard?.condominio_id || null,
      pre_cadastro_id: dadosWizard?.pre_cadastro_id || null,
      etapa_atual: 4,
      status: "RASCUNHO",
      perfil_unidade: perfilNormalizado,
      checklist_revisao: checklist,
      atualizado_em: new Date().toISOString(),
    });

    toast.success("Rascunho salvo com sucesso.");
  }

  async function enviarAuditoria() {
    if (!validarChecklist()) return;

    const payload = montarPayloadTela4({
      dadosWizard,
      checklist,
      perfil: perfilNormalizado,
    });

    await onNext(payload);
  }

  return (
    <div className="wm-t4-grid">
      <section className="wm-t4-main">
        <header className="wm-t4-hero">
          <span className="wm-t4-hero-icon">
            <ClipboardCheck size={26} />
          </span>

          <div>
            <h1>Revisão final do cadastro</h1>
            <p>
              Revise suas informações, leia os termos aplicáveis e confirme o envio
              para auditoria administrativa do condomínio.
            </p>
          </div>
        </header>

        <section className="wm-t4-profile-note">
          <Info size={18} />
          <div>
            <strong>{traduzirPerfil(perfilNormalizado)}</strong>
            <p>{obterResumoTermosPorPerfil(perfilNormalizado)}</p>
          </div>
        </section>
        <section className="wm-t4-review-stack">
          <ReviewAccordion
            titulo="Tela 1 — Identificação da unidade"
            resumo={`${resumo.condominio} • ${resumo.torre} • ${resumo.unidade}`}
            icon={<Home size={20} />}
            aberto={accordionTela1}
            onToggle={() => setAccordionTela1((old) => !old)}
            onEdit={() => toast("Volte para a etapa 1 para editar estes dados.")}
          >
            <div className="wm-t4-review-grid">
              <InfoItem label="Condomínio" value={resumo.condominio} />
              <InfoItem label="Endereço" value={resumo.endereco} />
              <InfoItem label="Cidade / UF" value={resumo.cidadeUf || "Não informado"} />
              <InfoItem label="CEP" value={resumo.cep || "Não informado"} />
              <InfoItem label="Torre / Bloco" value={resumo.torre} />
              <InfoItem label="Unidade" value={resumo.unidade} />
              <InfoItem label="Perfil" value={traduzirPerfil(perfilNormalizado)} />
              <InfoItem label="Token do convite" value={resumo.token} />
            </div>
          </ReviewAccordion>

          <ReviewAccordion
            titulo="Tela 2 — Dados pessoais"
            resumo={`${resumo.nome} • ${resumo.email || "e-mail não informado"}`}
            icon={<Mail size={20} />}
            aberto={accordionTela2}
            onToggle={() => setAccordionTela2((old) => !old)}
            onEdit={() => toast("Volte para a etapa 2 para editar seus dados pessoais.")}
          >
            <div className="wm-t4-review-grid">
              <InfoItem label="Nome completo" value={resumo.nome} />
              <InfoItem label="CPF" value={mascararCpf(resumo.cpf)} />
              <InfoItem label="E-mail" value={resumo.email || "Não informado"} />
              <InfoItem label="WhatsApp" value={resumo.whatsapp || "Não informado"} />
            </div>
          </ReviewAccordion>

          <ReviewAccordion
            titulo="Tela 3 — Pessoas vinculadas"
            resumo={
              dependentes.length > 0
                ? `${dependentes.length} pessoa(s) vinculada(s)`
                : "Nenhuma pessoa vinculada cadastrada"
            }
            icon={<UsersRound size={20} />}
            aberto={accordionTela3}
            onToggle={() => setAccordionTela3((old) => !old)}
            onEdit={() => toast("Volte para a etapa 3 para editar pessoas vinculadas.")}
          >
            {dependentes.length > 0 ? (
              <div className="wm-t4-linked-list">
                {dependentes.map((pessoa) => (
                  <div key={pessoa.id} className="wm-t4-linked-item">
                    <strong>{pessoa.nome}</strong>
                    <span>{pessoa.tipo_vinculo}</span>
                    <small>
                      {pessoa.recebe_encomendas_nome ? "Recebe no nome" : "Não recebe no nome"} •{" "}
                      {pessoa.retira_portaria ? "Retira na portaria" : "Não retira"} •{" "}
                      {pessoa.acesso_proprio ? "Acesso próprio" : "Sem acesso próprio"}
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <div className="wm-t4-empty-review">
                Nenhuma pessoa vinculada foi cadastrada nesta etapa.
              </div>
            )}
          </ReviewAccordion>
        </section>
        <section className="wm-t4-terms-card">
          <div className="wm-t4-section-title">
            <span>
              <FileText size={20} />
            </span>

            <div>
              <h2>Termos, privacidade e responsabilidade</h2>
              <p>
                Leia os termos aplicáveis ao seu perfil antes de enviar o cadastro para auditoria.
              </p>
            </div>
          </div>

          <div className="wm-t4-terms-list">
            {termos.map((termo, index) => {
              const aberto = termoAberto === termo.id;

              return (
                <div key={termo.id} className={`wm-t4-term-item ${aberto ? "active" : ""}`}>
                  <button
                    type="button"
                    className="wm-t4-term-head"
                    onClick={() => setTermoAberto(aberto ? null : termo.id)}
                  >
                    <div>
                      <strong>{termo.titulo}</strong>
                      <p>{termo.resumo}</p>
                    </div>

                    {aberto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>

                  {aberto ? (
                    <div className="wm-t4-term-body">
                      {termo.conteudo.map((paragrafo, itemIndex) => (
                        <p key={`${termo.id}-${itemIndex}`}>
                          {paragrafo}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="wm-t4-checklist-card">
          <div className="wm-t4-section-title">
            <span>
              <Check size={20} />
            </span>

            <div>
              <h2>Confirmações obrigatórias</h2>
              <p>
                Confirme os itens abaixo para enviar seu cadastro à auditoria administrativa.
              </p>
            </div>
          </div>

          <div className="wm-t4-checklist">
            {checklistBase.map((item) => (
              <label
                key={item.id}
                className={`wm-t4-check-item ${checklist[item.id] ? "active" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={!!checklist[item.id]}
                  onChange={() => alternarChecklist(item.id)}
                />

                <span>
                  <Check size={15} />
                </span>

                <p>{item.texto}</p>
              </label>
            ))}
          </div>
        </section>

        <footer className="wm-t4-actions">
          <button type="button" className="secondary" onClick={onBack}>
            <ArrowLeft size={17} />
            Voltar
          </button>

          <button type="button" className="outline" onClick={salvarRascunho}>
            <Save size={17} />
            Salvar e continuar depois
          </button>

          <button type="button" className="primary" onClick={enviarAuditoria}>
            Enviar para auditoria
            <ArrowRight size={18} />
          </button>
        </footer>
      </section>
      <aside className="wm-t4-side">
        <SideCard
          icon={<ShieldCheck size={22} />}
          title="Por que existe auditoria?"
          text="A auditoria protege o condomínio, o morador e o Sistema Chegou!, validando dados, permissões e vínculos antes da liberação."
        />

        <SideCard
          icon={<Info size={22} />}
          title="O que acontece depois?"
          text="Após o envio, o cadastro seguirá para análise administrativa. Você será avisado pelos canais informados."
          orange
        />

        <SideCard
          icon={<UsersRound size={22} />}
          title="Pessoas vinculadas"
          text="Convites de acesso próprio para pessoas vinculadas não são enviados automaticamente. Após aprovação, poderão ser enviados pelo Portal do Morador."
          green
        />

        <SideCard
          icon={<LockIcon />}
          title="Segurança dos dados"
          text="Dados, logs, localização quando aplicável e operações críticas poderão ser registrados para segurança, auditoria e prevenção de fraude."
        />
      </aside>
    </div>
  );
}

function ReviewAccordion({
  titulo,
  resumo,
  icon,
  aberto,
  onToggle,
  onEdit,
  children,
}) {
  return (
    <article className={`wm-t4-accordion ${aberto ? "active" : ""}`}>
      <button type="button" className="wm-t4-accordion-head" onClick={onToggle}>
        <span className="wm-t4-accordion-icon">{icon}</span>

        <div>
          <strong>{titulo}</strong>
          <p>{resumo}</p>
        </div>

        <i>{aberto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</i>
      </button>

      {aberto ? (
        <div className="wm-t4-accordion-body">
          {children}

          <button type="button" className="wm-t4-edit-btn" onClick={onEdit}>
            <Edit3 size={15} />
            Editar esta etapa
          </button>
        </div>
      ) : null}
    </article>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="wm-t4-info-item">
      <span>{label}</span>
      <strong>{value || "Não informado"}</strong>
    </div>
  );
}

function SideCard({ icon, title, text, orange, green }) {
  return (
    <section
      className={`wm-t4-side-card ${orange ? "orange" : ""} ${
        green ? "green" : ""
      }`}
    >
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </section>
  );
}

function LockIcon() {
  return <ShieldCheck size={22} />;
}