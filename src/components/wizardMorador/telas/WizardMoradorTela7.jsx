import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { consultarStatusWizardMorador } from "../../../services/wizardMoradorService";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  Clock,
  HelpCircle,
  Info,
  KeyRound,
  LockKeyhole,
  RefreshCcw,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";

import mascoteApontando from "../../../assets/mascote_apontando.png";

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

  return mapa[perfil] || "Morador";
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
    torre: pre.torre_nome || pre.torre || "Torre",
    unidade: pre.unidade_nome || pre.unidade || "Unidade",
    perfilTexto: traduzirPerfil(perfil),
    responsavel: formMorador?.nomeCompleto || pre.nome || "Não informado",
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
    tokenAcompanhamento:
      dadosWizard?.token_acompanhamento ||
      dadosWizard?.token_status ||
      "TK-98XF-23AB-77KL",
  };
}

const STATUS_CONFIG = {
  fila_auditoria: {
    titulo: "Em fila para auditoria",
    texto: "Seu cadastro aguarda o início da análise administrativa do condomínio.",
    cor: "orange",
    etapaAtiva: "fila_auditoria",
    previsao: "1 a 2 dias úteis",
  },
  auditoria_iniciada: {
    titulo: "Auditoria iniciada",
    texto: "A administração iniciou a validação dos seus dados.",
    cor: "blue",
    etapaAtiva: "auditoria_iniciada",
    previsao: "Em andamento",
  },
  em_analise: {
    titulo: "Em análise administrativa",
    texto: "Seus dados estão sendo conferidos pela administração do condomínio.",
    cor: "orange",
    etapaAtiva: "em_analise",
    previsao: "Em andamento",
  },
  aprovado: {
    titulo: "Cadastro aprovado",
    texto: "Sua conta está pronta para ativação e acesso ao sistema.",
    cor: "green",
    etapaAtiva: "aprovado",
    previsao: "Aprovado",
  },
  recusado: {
    titulo: "Cadastro precisa de ajustes",
    texto: "Foram encontradas pendências que precisam ser corrigidas.",
    cor: "red",
    etapaAtiva: "recusado",
    previsao: "Aguardando correção",
  },
};

const ORDEM_ETAPAS = [
  "cadastro_enviado",
  "senha_preparada",
  "fila_auditoria",
  "auditoria_iniciada",
  "em_analise",
  "aprovado",
  "conta_ativa",
];

function obterIndiceStatus(status) {
  const mapa = {
    fila_auditoria: 2,
    auditoria_iniciada: 3,
    em_analise: 4,
    aprovado: 5,
    conta_ativa: 6,
    recusado: 4,
  };

  return mapa[status] ?? 2;
}

function montarEventos(statusAtual) {
  const agora = new Date();

  const eventos = [
    {
      id: "cadastro",
      titulo: "Cadastro enviado com sucesso",
      texto: "Seu cadastro foi registrado no sistema.",
      status: "done",
      data: agora.toLocaleDateString("pt-BR"),
      hora: "10:42",
    },
    {
      id: "senha",
      titulo: "Senha preparada",
      texto: "Sua senha foi preparada para ativação após aprovação.",
      status: "done",
      data: agora.toLocaleDateString("pt-BR"),
      hora: "10:48",
    },
  ];

  if (["fila_auditoria", "auditoria_iniciada", "em_analise", "aprovado"].includes(statusAtual)) {
    eventos.push({
      id: "fila",
      titulo: "Em fila para auditoria",
      texto: "Seu cadastro aguarda início da análise.",
      status: statusAtual === "fila_auditoria" ? "current" : "done",
      data: agora.toLocaleDateString("pt-BR"),
      hora: "11:17",
    });
  }

  if (["auditoria_iniciada", "em_analise", "aprovado"].includes(statusAtual)) {
    eventos.push({
      id: "auditoria",
      titulo: "Auditoria iniciada",
      texto: "A administração iniciou a validação dos dados.",
      status: statusAtual === "auditoria_iniciada" ? "current" : "done",
      data: agora.toLocaleDateString("pt-BR"),
      hora: "—",
    });
  }

  if (["em_analise", "aprovado"].includes(statusAtual)) {
    eventos.push({
      id: "analise",
      titulo: "Em análise administrativa",
      texto: "Os dados estão sendo conferidos.",
      status: statusAtual === "em_analise" ? "current" : "done",
      data: agora.toLocaleDateString("pt-BR"),
      hora: "—",
    });
  }

  if (statusAtual === "aprovado") {
    eventos.push({
      id: "aprovado",
      titulo: "Cadastro aprovado",
      texto: "Sua conta está pronta para acesso.",
      status: "done",
      data: agora.toLocaleDateString("pt-BR"),
      hora: "—",
    });
  }

  if (statusAtual === "recusado") {
    eventos.push({
      id: "recusado",
      titulo: "Cadastro precisa de ajustes",
      texto: "A administração solicitou correções no cadastro.",
      status: "error",
      data: agora.toLocaleDateString("pt-BR"),
      hora: "—",
    });
  }

  eventos.push({
    id: "proximo",
    titulo: statusAtual === "aprovado" ? "Próximo passo" : "Próximo passo",
    texto:
      statusAtual === "aprovado"
        ? "Acesse o sistema com seu e-mail ou CPF."
        : "A auditoria será atualizada conforme avanço da análise.",
    status: "pending",
    data: "—",
    hora: "—",
  });

  return eventos;
}
export default function WizardMoradorTela7({
  dadosWizard,
  formTela1,
  formMorador,
  dependentes = [],
  onBack,
  onEntrarSistema,
  onCorrigirCadastro,
}) {
  const resumo = useMemo(
    () => obterResumo(dadosWizard, formTela1, formMorador, dependentes),
    [dadosWizard, formTela1, formMorador, dependentes]
  );

  const [statusAtual, setStatusAtual] = useState(
    dadosWizard?.status_acompanhamento ||
      "fila_auditoria"
  );

  const [timelineReal, setTimelineReal] = useState([]);
  const [statusTecnico, setStatusTecnico] = useState({
    senha_preparada: true,
    auth_ativo: false,
    status_conta: "PENDENTE_APROVACAO",
  });

  const [faqAberta, setFaqAberta] = useState(null);

  const statusConfig = STATUS_CONFIG[statusAtual] || STATUS_CONFIG.fila_auditoria;
  const indiceStatus = obterIndiceStatus(statusAtual);
  const eventos =
    timelineReal.length > 0
      ? timelineReal
      : montarEventos(statusAtual);

  function copiarProtocolo() {
    navigator.clipboard?.writeText(resumo.protocolo);
    toast.success("Protocolo copiado.");
  }

  function copiarToken() {
    navigator.clipboard?.writeText(resumo.tokenAcompanhamento);
    toast.success("Token copiado.");
  }

  async function atualizarStatus() {
    try {
      const tokenUrl = new URLSearchParams(window.location.search).get("token");

      const tokenConsulta =
        tokenUrl ||
        dadosWizard?.token_acompanhamento ||
        dadosWizard?.token_convite ||
        dadosWizard?.token ||
        resumo.tokenAcompanhamento ||
        null;

      const resposta = await consultarStatusWizardMorador({
        token: tokenConsulta,
        email: null,
        protocolo: null,
      });

      const novoStatus =
        resposta?.status_acompanhamento ||
        resposta?.status_auditoria ||
        resposta?.status_cadastro ||
        "fila_auditoria";

      setStatusAtual(novoStatus);
      setTimelineReal(resposta?.timeline || []);

      setStatusTecnico({
        senha_preparada: resposta?.senha_preparada || false,
        auth_ativo: resposta?.auth_ativo || false,
        status_conta: resposta?.status_conta || "PENDENTE_APROVACAO",
      });

      toast.success("Status atualizado.");
    } catch (error) {
      toast.error(error.message || "Erro ao consultar status.");
    }
  }

  useEffect(() => {
    const carregarStatusInicial = async () => {
      await atualizarStatus();
    };

    carregarStatusInicial();

    const intervalo = setInterval(() => {
      atualizarStatus();
    }, 30000);

    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleEntrarSistema() {
    if (statusAtual !== "aprovado") {
      toast("O acesso será liberado após aprovação.");
      return;
    }

    if (onEntrarSistema) {
      onEntrarSistema();
      return;
    }

    window.location.href = "/login";
  }

  function handleCorrigirCadastro() {
    if (onCorrigirCadastro) {
      onCorrigirCadastro();
      return;
    }

    toast("Fluxo de correção será aberto quando houver pendência administrativa.");
  }

  return (
    <div className="wm-t7-grid">
      <section className="wm-t7-main">
        <header className="wm-t7-hero">
          <div className="wm-t7-hero-visual">
            <ShieldCheck size={54} />
          </div>

          <div>
            <span>Token seguro ativo</span>
            <h1>Acompanhe seu cadastro</h1>
            <p>
              Seu cadastro foi enviado e está sendo acompanhado pela auditoria
              administrativa do condomínio.
            </p>
          </div>
        </header>

        <section className={`wm-t7-status-card ${statusConfig.cor}`}>
          <div className="wm-t7-status-icon">
            {statusAtual === "recusado" ? (
              <XCircle size={38} />
            ) : statusAtual === "aprovado" ? (
              <Check size={38} />
            ) : (
              <Clock size={38} />
            )}
          </div>

          <div className="wm-t7-status-info">
            <span>Status atual</span>
            <h2>{statusConfig.titulo}</h2>
            <p>{statusConfig.texto}</p>
          </div>

          <div className="wm-t7-status-actions">
            <div>
              <strong>Previsão média</strong>
              <p>{statusConfig.previsao}</p>
            </div>

            <button type="button" onClick={atualizarStatus}>
              <RefreshCcw size={17} />
              Atualizar status
            </button>
          </div>
        </section>

        <section className="wm-t7-timeline">
          <TimelineStep
            label="Cadastro enviado"
            done={indiceStatus >= 0}
            active={false}
          />
          <TimelineStep
            label="Senha preparada"
            done={indiceStatus >= 1}
            active={false}
          />
          <TimelineStep
            label="Em fila para auditoria"
            done={indiceStatus > 2}
            active={indiceStatus === 2}
          />
          <TimelineStep
            label="Auditoria iniciada"
            done={indiceStatus > 3}
            active={indiceStatus === 3}
          />
          <TimelineStep
            label="Em análise"
            done={indiceStatus > 4}
            active={indiceStatus === 4}
          />
          <TimelineStep
            label="Aprovação final"
            done={indiceStatus > 5}
            active={indiceStatus === 5}
          />
          <TimelineStep
            label="Conta ativa"
            done={indiceStatus >= 6}
            active={indiceStatus === 6}
          />
        </section>
        <section className="wm-t7-bottom-grid">
          <section className="wm-t7-card">
            <div className="wm-t7-card-title">
              <Clock size={20} />
              <h3>Histórico de eventos</h3>
            </div>

            <div className="wm-t7-events">
              {eventos.map((evento) => (
                <EventItem key={evento.id} evento={evento} />
              ))}
            </div>
          </section>

          <section className="wm-t7-card">
            <div className="wm-t7-card-title">
              <HelpCircle size={20} />
              <h3>Perguntas frequentes</h3>
            </div>

            <FaqItem
              id="tempo"
              aberta={faqAberta}
              setAberta={setFaqAberta}
              pergunta="Quanto tempo leva para aprovação?"
              resposta="O tempo pode variar conforme a administração do condomínio. Em média, a validação ocorre entre algumas horas e até 2 dias úteis."
            />

            <FaqItem
              id="recusa"
              aberta={faqAberta}
              setAberta={setFaqAberta}
              pergunta="O que acontece se meu cadastro for recusado?"
              resposta="Se houver pendências ou inconsistências, você poderá retornar ao fluxo de correção do cadastro utilizando seu token de acompanhamento."
            />

            <FaqItem
              id="dependentes"
              aberta={faqAberta}
              setAberta={setFaqAberta}
              pergunta="Dependentes também precisam aguardar aprovação?"
              resposta="Sim. Pessoas vinculadas seguem o fluxo de validação conforme as regras administrativas do condomínio."
            />

            <FaqItem
              id="suporte"
              aberta={faqAberta}
              setAberta={setFaqAberta}
              pergunta="Como entro em contato com suporte?"
              resposta="O suporte principal é realizado pela administração do condomínio. Futuramente o suporte Chegou! poderá complementar conforme plano contratado."
            />
          </section>
        </section>

        <footer className="wm-t7-footer-note">
          <Info size={18} />
          <p>
            Mantenha seus dados atualizados e acompanhe periodicamente este painel.
            Alterações de status poderão gerar notificações futuras.
          </p>
        </footer>
      </section>
      <aside className="wm-t7-side">
        <section className="wm-t7-mascot-card">
          <div>
            <span>Acompanhamento ativo</span>
            <h3>
              Estamos acompanhando seu cadastro no Chegou
              <span className="wm-orange">!</span>
            </h3>
            <p>
              Consulte o andamento da auditoria e acompanhe a ativação da sua conta.
            </p>
          </div>

          <img src={mascoteApontando} alt="Mascote Chegou!" />
        </section>

        <section className="wm-t7-side-card">
          <span>
            <ClipboardCopy size={22} />
          </span>

          <h3>Protocolo</h3>
          <p className="wm-t7-protocol">{resumo.protocolo}</p>

          <button type="button" onClick={copiarProtocolo}>
            Copiar protocolo
          </button>
        </section>

        <section className="wm-t7-side-card">
          <span>
            <KeyRound size={22} />
          </span>

          <h3>Token de acompanhamento</h3>
          <p className="wm-t7-token">{resumo.tokenAcompanhamento}</p>

          <small>Válido até ativação real da conta</small>

          <button type="button" onClick={copiarToken}>
            Copiar token
          </button>
        </section>

        <section className="wm-t7-side-card">
          <span>
            <UserRound size={22} />
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
              <strong>Responsável:</strong> {resumo.responsavel}
            </p>
            <p>
              <strong>Pessoas vinculadas:</strong> {resumo.dependentes}
            </p>
          </div>
        </section>

        <section className="wm-t7-side-card green">
          <span>
            <LockKeyhole size={22} />
          </span>

          <h3>Status técnico</h3>

          <div className="wm-t7-summary-list">
            <p>
              <strong>Senha preparada:</strong>{" "}
                {statusTecnico.senha_preparada ? "SIM" : "NÃO"}
            </p>
            <p>
              <strong>Auth criado:</strong>{" "}
              {statusTecnico.auth_ativo ? "SIM" : "NÃO"}
            </p>
            <p>
              <strong>Conta ativa:</strong>{" "}
              {statusTecnico.status_conta === "LIBERADO" ? "SIM" : "NÃO"}
            </p>
          </div>
        </section>
        {statusAtual === "aprovado" ? (
          <button type="button" className="wm-t7-main-action" onClick={handleEntrarSistema}>
            Entrar no sistema
            <ChevronRight size={18} />
          </button>
        ) : null}

        {statusAtual === "recusado" ? (
          <button type="button" className="wm-t7-main-action danger" onClick={handleCorrigirCadastro}>
            Corrigir cadastro
            <ChevronRight size={18} />
          </button>
        ) : null}
      </aside>
    </div>
  );
}

function TimelineStep({ label, done, active }) {
  return (
    <div className={`wm-t7-timeline-step ${done ? "done" : ""} ${active ? "active" : ""}`}>
      <span>{done ? <Check size={13} /> : null}</span>
      <strong>{label}</strong>
    </div>
  );
}

function EventItem({ evento }) {
  return (
    <div className={`wm-t7-event ${evento.status}`}>
      <span>
        {evento.status === "error" ? (
          <AlertTriangle size={15} />
        ) : evento.status === "done" ? (
          <Check size={15} />
        ) : evento.status === "current" ? (
          <Clock size={15} />
        ) : (
          <Info size={15} />
        )}
      </span>

      <div>
        <strong>{evento.titulo}</strong>
        <p>{evento.texto}</p>
        <small>
          {evento.data} • {evento.hora}
        </small>
      </div>
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
      <div>
        <strong>{pergunta}</strong>
        {ativo ? <p>{resposta}</p> : null}
      </div>

      <ChevronDown size={17} />
    </button>
  );
}