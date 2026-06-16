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
import "../../../styles/wizardMorador/WizardMoradorTela9.css";

function somenteNumeros(valor = "") {
  return String(valor).replace(/\D/g, "");
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

  return mapa[perfil] || "Morador";
}

function obterPreCadastro(dadosWizard = {}) {
  return dadosWizard?.preCadastro || dadosWizard?.pre_cadastro || {};
}

function gerarProtocolo(dadosWizard = {}) {
  return (
    dadosWizard?.protocolo ||
    dadosWizard?.codigo_protocolo ||
    `CHG-${new Date().getFullYear()}-${String(
      dadosWizard?.pre_cadastro_id || "000245"
    )
      .replace(/\D/g, "")
      .slice(-6)
      .padStart(6, "0")}`
  );
}

function ehAmbienteTeste(dadosWizard = {}) {
  const cnpj =
    dadosWizard?.cnpj ||
    dadosWizard?.condominio?.cnpj ||
    dadosWizard?.empresa?.cnpj ||
    "";

  const cnpjLimpo = somenteNumeros(cnpj);
  const host = window.location.hostname;

  return (
    cnpjLimpo === "123456" ||
    dadosWizard?.modoTeste === true ||
    dadosWizard?.modo_teste === true ||
    dadosWizard?.token === "sandbox-token-morador" ||
    dadosWizard?.token?.startsWith("sandbox-") ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    host.startsWith("172.")
  );
}
function obterResumo(dadosWizard, formTela1, formMorador, dependentes = []) {
  const pre = obterPreCadastro(dadosWizard);
  const condominio = dadosWizard?.condominio || {};

  const perfil =
    formTela1?.perfilUnidade ||
    formTela1?.relacaoUnidade ||
    pre.relacao_unidade ||
    dadosWizard?.perfil_unidade ||
    "";

  const responsavel =
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

    torre:
      pre.torre_nome ||
      pre.torre ||
      dadosWizard?.torre ||
      "Torre",

    unidade:
      pre.unidade_nome ||
      pre.unidade ||
      dadosWizard?.unidade ||
      "Unidade",

    perfilTexto: traduzirPerfil(perfil),

    responsavel,

    dependentes: Array.isArray(dependentes) ? dependentes.length : 0,

    protocolo: gerarProtocolo(dadosWizard),

    tokenAcompanhamento:
      dadosWizard?.token_acompanhamento ||
      dadosWizard?.token_status ||
      (ehAmbienteTeste(dadosWizard) ? "SANDBOX-ACOMPANHAMENTO" : ""),
  };
}

const STATUS_CONFIG = {
  fila_auditoria: {
    titulo: "Em fila para auditoria",
    texto: "Seu cadastro aguarda o início da análise administrativa do condomínio.",
    cor: "orange",
    previsao: "1 a 2 dias úteis",
  },

  auditoria_iniciada: {
    titulo: "Auditoria iniciada",
    texto: "A administração iniciou a validação dos seus dados.",
    cor: "blue",
    previsao: "Em andamento",
  },

  em_analise: {
    titulo: "Em análise administrativa",
    texto: "Seus dados estão sendo conferidos pela administração do condomínio.",
    cor: "orange",
    previsao: "Em andamento",
  },

  aprovado: {
    titulo: "Cadastro aprovado",
    texto: "Sua conta está pronta para ativação e acesso ao sistema.",
    cor: "green",
    previsao: "Aprovado",
  },

  recusado: {
    titulo: "Cadastro precisa de ajustes",
    texto: "Foram encontradas pendências que precisam ser corrigidas.",
    cor: "red",
    previsao: "Aguardando correção",
  },
};

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
  const dataHoje = agora.toLocaleDateString("pt-BR");

  const eventos = [
    {
      id: "cadastro",
      titulo: "Cadastro enviado com sucesso",
      texto: "Seu cadastro foi registrado no sistema.",
      status: "done",
      data: dataHoje,
      hora: agora.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
    {
      id: "senha",
      titulo: "Senha e aceites concluídos",
      texto: "Sua senha foi preparada e os termos obrigatórios foram aceitos.",
      status: "done",
      data: dataHoje,
      hora: "—",
    },
    {
      id: "nps",
      titulo: "Pesquisa de experiência concluída",
      texto: "Sua experiência foi registrada ou ignorada conforme sua escolha.",
      status: "done",
      data: dataHoje,
      hora: "—",
    },
  ];

  if (
    ["fila_auditoria", "auditoria_iniciada", "em_analise", "aprovado"].includes(
      statusAtual
    )
  ) {
    eventos.push({
      id: "fila",
      titulo: "Em fila para auditoria",
      texto: "Seu cadastro aguarda o início da análise administrativa.",
      status: statusAtual === "fila_auditoria" ? "current" : "done",
      data: dataHoje,
      hora: "—",
    });
  }

  if (["auditoria_iniciada", "em_analise", "aprovado"].includes(statusAtual)) {
    eventos.push({
      id: "auditoria",
      titulo: "Auditoria iniciada",
      texto: "A administração iniciou a validação dos seus dados.",
      status: statusAtual === "auditoria_iniciada" ? "current" : "done",
      data: dataHoje,
      hora: "—",
    });
  }

  if (["em_analise", "aprovado"].includes(statusAtual)) {
    eventos.push({
      id: "analise",
      titulo: "Em análise administrativa",
      texto: "Os dados estão sendo conferidos.",
      status: statusAtual === "em_analise" ? "current" : "done",
      data: dataHoje,
      hora: "—",
    });
  }

  if (statusAtual === "aprovado") {
    eventos.push({
      id: "aprovado",
      titulo: "Cadastro aprovado",
      texto: "Sua conta está pronta para acesso.",
      status: "done",
      data: dataHoje,
      hora: "—",
    });
  }

  if (statusAtual === "recusado") {
    eventos.push({
      id: "recusado",
      titulo: "Cadastro precisa de ajustes",
      texto: "A administração solicitou correções no cadastro.",
      status: "error",
      data: dataHoje,
      hora: "—",
    });
  }

  eventos.push({
    id: "proximo",
    titulo: statusAtual === "aprovado" ? "Próximo passo" : "Aguardando atualização",
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

function obterTokenConsulta(dadosWizard, resumo) {
  const tokenUrl = new URLSearchParams(window.location.search).get("token");

  return (
    tokenUrl ||
    dadosWizard?.token_acompanhamento ||
    dadosWizard?.token_status ||
    dadosWizard?.token_convite ||
    resumo?.tokenAcompanhamento ||
    null
  );
}
export default function WizardMoradorTela9({
  dadosWizard,
  formTela1,
  formMorador,
  dependentes = [],
  ecossistema = {},
  estrutura = {},
  termos = {},
  pesquisa = {},
  onFinish,
}) {
  const resumo = useMemo(
    () => obterResumo(dadosWizard, formTela1, formMorador, dependentes),
    [dadosWizard, formTela1, formMorador, dependentes]
  );

  const ambienteTeste = ehAmbienteTeste(dadosWizard);

  const [faqAberta, setFaqAberta] = useState(null);

  const [statusAtual, setStatusAtual] = useState(
    ambienteTeste
      ? "fila_auditoria"
      : dadosWizard?.status_acompanhamento || "fila_auditoria"
  );

  const [consultando, setConsultando] = useState(false);

  const [finalizando, setFinalizando] = useState(false);
  const [finalizado, setFinalizado] = useState(false);

  const statusInfo =
    STATUS_CONFIG[statusAtual] || STATUS_CONFIG.fila_auditoria;

  const eventosTimeline = useMemo(
    () => montarEventos(statusAtual),
    [statusAtual]
  );

  async function atualizarStatus() {
    if (ambienteTeste) {
      toast.success("Ambiente de validação.");
      return;
    }

    const token = obterTokenConsulta(dadosWizard, resumo);

    if (!token) {
      toast.error("Token de acompanhamento não encontrado.");
      return;
    }

    try {
      setConsultando(true);

      const retorno = await consultarStatusWizardMorador({
        token,
        protocolo: resumo.protocolo,
      });

      const novoStatus =
        retorno?.status_acompanhamento ||
        retorno?.status ||
        "fila_auditoria";

      setStatusAtual(novoStatus);

      toast.success("Status atualizado.");
    } catch (error) {
      toast.error(
        error?.message || "Não foi possível atualizar o status."
      );
    } finally {
      setConsultando(false);
    }
  }

  function copiarProtocolo() {
    navigator.clipboard?.writeText(resumo.protocolo);

    toast.success("Protocolo copiado.");
  }

  function copiarToken() {
    if (!resumo.tokenAcompanhamento) {
      toast.error("Token indisponível.");
      return;
    }

    navigator.clipboard?.writeText(resumo.tokenAcompanhamento);

    toast.success("Token copiado.");
  }

  useEffect(() => {
    if (ambienteTeste) return;

    const intervalo = setInterval(() => {
      atualizarStatus();
    }, 120000);

    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    async function finalizarCadastro() {
      const tokenReal = obterTokenConsulta(dadosWizard, resumo);

      const tokenSandbox =
        !tokenReal ||
        tokenReal === "sandbox-token-morador" ||
        tokenReal?.startsWith("sandbox-") ||
        tokenReal?.startsWith("mock-") ||
        tokenReal?.startsWith("teste-");

      if (ambienteTeste && tokenSandbox) {
        setFinalizado(true);
        return;
      }

      if (finalizado || finalizando) return;

      if (typeof onFinish !== "function") {
        toast.error("Função de finalização não encontrada.");
        return;
      }

      try {
        setFinalizando(true);

        await onFinish({
          tela1: formTela1,
          tela2: formMorador,
          tela3: {
            dependentes,
          },
          tela4: ecossistema,
          tela5: estrutura,
          tela7: termos,
          tela8: pesquisa,
        });

        setFinalizado(true);
        setStatusAtual("fila_auditoria");
      } catch (error) {
        toast.error(error?.message || "Erro ao enviar cadastro para auditoria.");
      } finally {
        setFinalizando(false);
      }
    }

    finalizarCadastro();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="wm-t9-page">
      <section className="wm-t9-card">
        <div className="wm-t9-main-grid">
          <section className="wm-t9-main">
            <header className="wm-t9-hero">
              <div className="wm-t9-hero-icon">
                <ShieldCheck size={54} />
              </div>

              <div>
                <span>Cadastro enviado</span>

                <h1>Acompanhe seu cadastro</h1>

                <p>
                  Seu cadastro foi finalizado e agora será analisado pela
                  administração do condomínio.
                </p>

                <strong>
                  Guarde seu protocolo para acompanhar o andamento da auditoria.
                </strong>

                {ambienteTeste ? (
                  <em>
                    Ambiente de validação: status exibido apenas para teste.
                  </em>
                ) : null}
              </div>
            </header>

            <section className={`wm-t9-status-card ${statusInfo.cor}`}>
              <div className="wm-t9-status-icon">
                {statusAtual === "recusado" ? (
                  <XCircle size={38} />
                ) : statusAtual === "aprovado" ? (
                  <Check size={38} />
                ) : (
                  <Clock size={38} />
                )}
              </div>

              <div className="wm-t9-status-info">
                <span>Status atual</span>

                <h2>{statusInfo.titulo}</h2>

                <p>{statusInfo.texto}</p>
              </div>

              <div className="wm-t9-status-actions">
                <div>
                  <strong>Previsão média</strong>
                  <p>{statusInfo.previsao}</p>
                </div>

                <button
                  type="button"
                  onClick={atualizarStatus}
                  disabled={consultando || finalizando}
                >
                  <RefreshCcw size={17} />
                  {finalizando
                    ? "Enviando..."
                    : consultando
                      ? "Atualizando..."
                      : "Atualizar status"}
                </button>
              </div>
            </section>

            <section className="wm-t9-timeline">
              <TimelineStep
                label="Cadastro enviado"
                done
              />

              <TimelineStep
                label="Senha preparada"
                done
              />

              <TimelineStep
                label="Termos aceitos"
                done
              />

              <TimelineStep
                label="Pesquisa concluída"
                done
              />

              <TimelineStep
                label="Em auditoria"
                done={obterIndiceStatus(statusAtual) > 2}
                active={obterIndiceStatus(statusAtual) === 2}
              />

              <TimelineStep
                label="Aprovação"
                done={statusAtual === "aprovado"}
                active={["auditoria_iniciada", "em_analise"].includes(statusAtual)}
              />

              <TimelineStep
                label="Conta ativa"
                done={statusAtual === "conta_ativa"}
              />
            </section>
            <section className="wm-t9-bottom-grid">
              <section className="wm-t9-section-card">
                <div className="wm-t9-card-title">
                  <Clock size={20} />
                  <h3>Histórico de eventos</h3>
                </div>

                <div className="wm-t9-events">
                  {eventosTimeline.map((evento) => (
                    <EventItem key={evento.id} evento={evento} />
                  ))}
                </div>
              </section>

              <section className="wm-t9-section-card">
                <div className="wm-t9-card-title">
                  <HelpCircle size={20} />
                  <h3>Dúvidas frequentes</h3>
                </div>

                <FaqItem
                  id="tempo"
                  aberta={faqAberta}
                  setAberta={setFaqAberta}
                  pergunta="Quanto tempo leva para aprovação?"
                  resposta="O prazo pode variar conforme a administração do condomínio. Em média, a validação ocorre entre algumas horas e até 2 dias úteis."
                />

                <FaqItem
                  id="recusa"
                  aberta={faqAberta}
                  setAberta={setFaqAberta}
                  pergunta="O que acontece se meu cadastro precisar de ajuste?"
                  resposta="Se houver pendências ou inconsistências, a administração poderá solicitar correções antes da aprovação."
                />

                <FaqItem
                  id="acesso"
                  aberta={faqAberta}
                  setAberta={setFaqAberta}
                  pergunta="Quando poderei acessar o sistema?"
                  resposta="O acesso será liberado após aprovação administrativa e ativação da conta."
                />

                <FaqItem
                  id="senha"
                  aberta={faqAberta}
                  setAberta={setFaqAberta}
                  pergunta="A senha que criei já está ativa?"
                  resposta="A senha fica preparada, mas a conta permanece bloqueada até a aprovação."
                />
              </section>
            </section>

            <footer className="wm-t9-footer-note">
              <Info size={18} />

              <p>
                Mantenha seus dados atualizados e acompanhe periodicamente este
                painel. Alterações de status poderão gerar notificações futuras.
              </p>
            </footer>
          </section>
          <aside className="wm-t9-side">
            <section className="wm-t9-mascot-card">
              <div>
                <span>Acompanhamento ativo</span>

                <h3>
                  Estamos acompanhando seu cadastro no Chegou
                  <span className="wm-orange">!</span>
                </h3>

                <p>
                  Consulte o andamento da auditoria e acompanhe a ativação da
                  sua conta.
                </p>
              </div>

              <img src={mascoteApontando} alt="Mascote Chegou!" />
            </section>

            <section className="wm-t9-side-card orange">
              <span>
                <Clock size={22} />
              </span>

              <h3>Consultar andamento</h3>

              <p>
                Enquanto o cadastro não for aprovado, você poderá retornar a
                esta tela usando o token de acompanhamento enviado.
              </p>

              <button type="button" onClick={atualizarStatus}>
                <RefreshCcw size={16} />
                Consultar andamento
              </button>
            </section>

            <section className="wm-t9-side-card">
              <span>
                <ClipboardCopy size={22} />
              </span>

              <h3>Protocolo</h3>

              <p className="wm-t9-protocol">{resumo.protocolo}</p>

              <button type="button" onClick={copiarProtocolo}>
                Copiar protocolo
              </button>
            </section>

            <section className="wm-t9-side-card">
              <span>
                <KeyRound size={22} />
              </span>

              <h3>Token de acompanhamento</h3>

              <p className="wm-t9-token">
                {resumo.tokenAcompanhamento || "Disponível após envio"}
              </p>

              <small>
                Este token será usado para consultar a aprovação enquanto a
                conta ainda não estiver ativa.
              </small>

              <button type="button" onClick={copiarToken}>
                Copiar token
              </button>
            </section>

            <section className="wm-t9-side-card">
              <span>
                <UserRound size={22} />
              </span>

              <h3>Resumo do cadastro</h3>

              <div className="wm-t9-summary-list">
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

            <section className="wm-t9-side-card green">
              <span>
                <LockKeyhole size={22} />
              </span>

              <h3>Regra de acesso</h3>

              <div className="wm-t9-summary-list">
                <p>
                  <strong>Consulta:</strong> Liberada pelo token
                </p>

                <p>
                  <strong>Edição:</strong> Apenas se o Admin devolver para
                  reedição
                </p>

                <p>
                  <strong>Acesso ao sistema:</strong> Após aprovação
                </p>
              </div>
            </section>

            {ambienteTeste ? (
              <section className="wm-t9-side-card orange">
                <span>
                  <Info size={22} />
                </span>

                <h3>Ambiente de validação</h3>

                <p>
                  Esta tela está em localhost, sandbox ou IP local. As consultas
                  reais de status ficam simuladas para validação visual e de
                  fluxo.
                </p>
              </section>
            ) : null}
          </aside>
        </div>
      </section>
    </div>
  );
}

function TimelineStep({ label, done, active }) {
  return (
    <div
      className={`wm-t9-timeline-step ${done ? "done" : ""} ${
        active ? "active" : ""
      }`}
    >
      <span>{done ? <Check size={13} /> : null}</span>
      <strong>{label}</strong>
    </div>
  );
}

function EventItem({ evento }) {
  return (
    <div className={`wm-t9-event ${evento.status}`}>
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
      className={`wm-t9-faq-item ${ativo ? "active" : ""}`}
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