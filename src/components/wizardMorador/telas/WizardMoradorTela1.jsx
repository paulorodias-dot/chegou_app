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
    descricao: "Sou proprietário e moro nesta unidade.",
    icon: Home,
  },
  {
    id: "proprietario_nao_residente",
    titulo: "Proprietário não residente",
    descricao: "Sou proprietário, mas não moro nesta unidade.",
    icon: DoorClosed,
  },
  {
    id: "inquilino",
    titulo: "Morador inquilino",
    descricao: "Alugo esta unidade e sou o morador responsável.",
    icon: UserRound,
  },
  {
    id: "responsavel_unidade_corporativa",
    titulo: "Responsável por unidade corporativa",
    descricao: "Sou responsável por uma empresa que ocupa esta unidade.",
    icon: Building2,
  },
  {
    id: "unidade_vazia",
    titulo: "Responsável por unidade vazia",
    descricao: "A unidade está vazia e sou o proprietário ou responsável.",
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

function formatarTelefoneInternacional({
  ddi = "55",
  numero = "",
}) {
  const ddiLimpo =
    somenteNumeros(ddi) || "55";

  const numeroLimpo =
    somenteNumeros(numero);

  if (!numeroLimpo) return "";

  if (ddiLimpo === "55") {
    return `+55 ${formatarTelefoneBR(numeroLimpo)}`;
  }

  const agrupado = numeroLimpo
    .replace(/(\d{3})(?=\d)/g, "$1 ")
    .trim();

  return `+${ddiLimpo} ${agrupado}`;
}

function extrairTelefoneConvite(
  pre = {},
  dadosWizard = {}
) {
  const ddi =
    somenteNumeros(
      pre.ddi ||
        dadosWizard?.ddi ||
        "55"
    ) || "55";

  let telefoneBruto = somenteNumeros(
    pre.telefone ||
      pre.whatsapp ||
      dadosWizard?.telefone ||
      dadosWizard?.whatsapp ||
      ""
  );

  if (
    telefoneBruto.startsWith(ddi) &&
    telefoneBruto.length > 10
  ) {
    telefoneBruto =
      telefoneBruto.slice(ddi.length);
  }

  return formatarTelefoneInternacional({
    ddi,
    numero: telefoneBruto,
  });
}

function obterDadosConvite(dadosWizard) {
  const pre =
    dadosWizard?.preCadastro ||
    dadosWizard?.pre_cadastro ||
    {};

  const condominio =
    dadosWizard?.condominio || {};

  return {
    nome:
      pre.nome ||
      dadosWizard?.nome ||
      "",

    email:
      pre.email ||
      dadosWizard?.email ||
      "",

    whatsapp:
      extrairTelefoneConvite(
        pre,
        dadosWizard
      ),

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

function montarPayloadTela1({
  formTela1,
}) {
  return {
    tela1: {
      perfilUnidade:
        formTela1.perfilUnidade,

      perfil_unidade:
        formTela1.perfilUnidade,

      confirmouDadosConvite: true,

      confirmou_dados_convite: true,
    },
  };
}

export default function WizardMoradorTela1({
  dadosWizard,
  formTela1,
  setFormTela1,
  onNext,
  onCancel,
}) {
  const [
    tentouAvancar,
    setTentouAvancar,
  ] = useState(false);

  const [
    processando,
    setProcessando,
  ] = useState(false);

  const dadosConvite = useMemo(
    () => obterDadosConvite(dadosWizard),
    [dadosWizard]
  );

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant",
    });
  }, []);

  function selecionarPerfil(perfil) {
    setTentouAvancar(false);

    setFormTela1(
      "perfilUnidade",
      perfil
    );

    setFormTela1(
      "confirmouDadosConvite",
      true
    );
  }

  function mensagemFluxoPorPerfil() {
    if (
      formTela1?.perfilUnidade ===
      "unidade_vazia"
    ) {
      return "Como a unidade está vazia, algumas etapas serão adaptadas ao seu cadastro.";
    }

    if (
      formTela1?.perfilUnidade ===
      "proprietario_nao_residente"
    ) {
      return "Como você não reside na unidade, algumas informações solicitadas serão diferentes.";
    }

    return "";
  }

  async function avancar() {
    if (processando) {
      return;
    }

    if (!formTela1?.perfilUnidade) {
      setTentouAvancar(true);

      toast.error(
        "Selecione sua relação com a unidade para continuar."
      );

      return;
    }

    const mensagem =
      mensagemFluxoPorPerfil();

    if (mensagem) {
      toast(mensagem);
    }

    try {
      setProcessando(true);

      const sucesso =
        await onNext(
          montarPayloadTela1({
            formTela1: {
              ...formTela1,
              confirmouDadosConvite:
                true,
            },
          })
        );

      /*
      * O WizardMorador.jsx troca a etapa somente
      * quando o salvamento realmente funciona.
      *
      * Se retornar false, permanecemos nesta tela.
      */
      if (sucesso === false) {
        setProcessando(false);
      }
    } catch (error) {
      console.error(
        "Erro ao continuar a Tela 1:",
        error
      );

      setProcessando(false);
    }
  }

  return (
    <div className="wm-t1-page">
      <section className="wm-t1-card">
        <header className="wm-t1-title">
          <span className="wm-t1-title-icon">
            <Building2 size={24} />
          </span>

          <div>
            <h1>
              1. Unidade e sua relação
            </h1>

            <p>
              Confira as informações recebidas e informe sua relação com esta unidade.
            </p>
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
                <h2>
                  Informações do convite
                </h2>

                <small>
                  Preenchidas automaticamente
                </small>
              </div>

              <p>
                Confira se as informações abaixo estão corretas.
              </p>
            </div>
          </div>

          <div className="wm-t1-readonly-grid">
            <ReadOnlyField
              label="Nome completo"
              value={dadosConvite.nome}
              icon={
                <UserRound size={15} />
              }
            />

            <ReadOnlyField
              label="E-mail"
              value={dadosConvite.email}
              icon={<Mail size={15} />}
            />

            <ReadOnlyField
              label="WhatsApp"
              value={dadosConvite.whatsapp}
              icon={<Phone size={15} />}
            />

            <ReadOnlyField
              label="Condomínio"
              value={dadosConvite.condominio}
              icon={
                <Building2 size={15} />
              }
            />

            <ReadOnlyField
              label="Torre / Bloco"
              value={dadosConvite.torre}
              icon={
                <Building2 size={15} />
              }
            />

            <ReadOnlyField
              label="Unidade"
              value={dadosConvite.unidade}
              icon={
                <DoorClosed size={15} />
              }
            />
          </div>

          <div className="wm-t1-info-note">
            <Info size={16} />

            <span>
              Você poderá revisar seus dados pessoais e de contato na próxima etapa. Se o condomínio, a torre, o bloco ou a unidade estiverem incorretos, entre em contato com a administração do condomínio.
            </span>
          </div>
        </section>

        <section className="wm-t1-section">
          <div className="wm-t1-section-head">
            <span className="wm-t1-section-icon">
              <UserRound size={20} />
            </span>

            <div className="wm-t1-section-title-block">
              <h2>
                Qual é a sua relação com esta unidade?
              </h2>

              <p>
                Sua resposta define quais informações serão necessárias nas próximas etapas.
              </p>
            </div>
          </div>

          <div
            className={`wm-t1-profile-grid ${
              tentouAvancar &&
              !formTela1?.perfilUnidade
                ? "invalid"
                : ""
            }`}
          >
            {PERFIS_UNIDADE.map(
              (perfil) => {
                const Icon =
                  perfil.icon;

                const ativo =
                  formTela1?.perfilUnidade ===
                  perfil.id;

                return (
                  <button
                    key={perfil.id}
                    type="button"
                    className={`wm-t1-profile-card ${
                      ativo
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      selecionarPerfil(
                        perfil.id
                      )
                    }
                    aria-pressed={ativo}
                  >
                    <span className="wm-t1-profile-radio">
                      {ativo ? (
                        <CheckCircle2
                          size={16}
                        />
                      ) : null}
                    </span>

                    <span className="wm-t1-profile-icon">
                      <Icon size={23} />
                    </span>

                    <strong>
                      {perfil.titulo}
                    </strong>

                    <p>
                      {perfil.descricao}
                    </p>
                  </button>
                );
              }
            )}
          </div>
        </section>

        <footer className="wm-t1-actions">
          <button
            type="button"
            className="wm-t1-btn secondary"
            onClick={onCancel}
            disabled={processando}
          >
            <X size={16} />
            Sair do cadastro
          </button>

          <button
            type="button"
            className="wm-t1-btn primary"
            onClick={avancar}
            disabled={processando}
            aria-busy={processando}
          >
            {processando ? (
              <>
                <span
                  className="wm-t1-btn-spinner"
                  aria-hidden="true"
                />
                Salvando...
              </>
            ) : (
              <>
                Continuar
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </footer>
      </section>
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  icon,
}) {
  const valorExibido =
    String(value || "").trim() ||
    "Não informado";

  return (
    <label className="wm-t1-readonly-field">
      <span>{label}</span>

      <div className="wm-t1-readonly-input">
        {icon ? <i>{icon}</i> : null}

        <input
          value={valorExibido}
          readOnly
          tabIndex={-1}
          aria-label={label}
        />
      </div>
    </label>
  );
}