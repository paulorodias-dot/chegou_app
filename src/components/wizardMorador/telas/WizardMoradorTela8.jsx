import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { salvarPesquisaWizardMorador } from "../../../services/wizardMoradorService";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCopy,
  HeartHandshake,
  Info,
  Mail,
  MessageCircle,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import mascoteNps from "../../../assets/mascote_nps.png";
import coracaoNps from "../../../assets/coracao_nps.png";

import "../../../styles/wizardMorador/WizardMoradorTela8.css";

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

  return mapa[perfil] || "Perfil não identificado";
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

  return {
    condominio:
      condominio.nome_fantasia ||
      condominio.nome ||
      dadosWizard?.nome_condominio ||
      "Condomínio",
    torre: pre.torre_nome || pre.torre || dadosWizard?.torre || "Torre",
    unidade: pre.unidade_nome || pre.unidade || dadosWizard?.unidade || "Unidade",
    perfilTexto: traduzirPerfil(perfil),
    responsavel:
      formMorador?.nomeSocial ||
      formMorador?.nome_exibicao ||
      formMorador?.nomeCompleto ||
      pre.nome ||
      "Não informado",
    dependentes: Array.isArray(dependentes) ? dependentes.length : 0,
    protocolo: gerarProtocolo(dadosWizard),
  };
}

const opcoesDificuldade = [
  { id: "identificacao", label: "Identificação", icon: <UserRound size={15} /> },
  { id: "dados_pessoais", label: "Dados pessoais", icon: <UserRound size={15} /> },
  { id: "dependentes", label: "Dependentes", icon: <Users size={15} /> },
  { id: "funcionarios_pets", label: "Funcionários/Pets", icon: <Users size={15} /> },
  { id: "veiculos_garagem", label: "Veículos/Garagem", icon: <Building2 size={15} /> },
  { id: "termos_senha", label: "Termos e senha", icon: <ShieldCheck size={15} /> },
  { id: "nenhuma", label: "Nenhuma", icon: <CheckCircle2 size={15} /> },
];

const opcoesProblema = [
  { id: "lentidao", label: "Lentidão" },
  { id: "layout", label: "Layout" },
  { id: "mobile", label: "Mobile" },
  { id: "validacao", label: "Validação" },
  { id: "upload_foto", label: "Upload de foto" },
  { id: "outro", label: "Outro" },
];

const opcoesInfluencia = [
  { id: "facilidade_uso", label: "Facilidade de uso" },
  { id: "visual_moderno", label: "Visual moderno" },
  { id: "rapidez", label: "Rapidez" },
  { id: "seguranca", label: "Segurança" },
  { id: "organizacao", label: "Organização" },
  { id: "outro", label: "Outro" },
];

const experiencias = [
  { id: "muito_facil", emoji: "😄", label: "Muito fácil" },
  { id: "facil", emoji: "🙂", label: "Fácil" },
  { id: "regular", emoji: "😐", label: "Regular" },
  { id: "dificil", emoji: "🙁", label: "Difícil" },
  { id: "muito_dificil", emoji: "😣", label: "Muito difícil" },
];

function montarPayloadNps({
  dadosWizard,
  resumo,
  notaNps,
  experienciaCadastro,
  influenciasNota,
  dificuldades,
  problemasTecnicos,
  comentario,
  permiteContato,
  canaisContato,
}) {
  const ambienteTeste = ehAmbienteTeste(dadosWizard);

  return {
    business_id: dadosWizard?.business_id || null,
    condominio_id: dadosWizard?.condominio_id || null,
    pre_cadastro_id: dadosWizard?.pre_cadastro_id || null,
    etapa_atual: 8,
    protocolo: resumo.protocolo,

    feedback_nps: {
      origem: "wizard_morador",
      nota_nps: notaNps,
      facilidade_preenchimento: experienciaCadastro,
      influencias_nota: influenciasNota,
      etapas_dificeis: dificuldades,
      problemas_encontrados: problemasTecnicos,
      sugestao: comentario?.trim() || null,
      permite_contato: permiteContato,
      canal_contato: permiteContato ? canaisContato.join(",") : null,
      ambiente_teste: ambienteTeste,
      contabilizar_nps: !ambienteTeste,
      enviado_em: new Date().toISOString(),
    },
  };
}
export default function WizardMoradorTela8({
  dadosWizard,
  formTela1,
  formMorador,
  dependentes = [],
  onBack,
  onNext,
}) {
  const resumo = useMemo(
    () => obterResumo(dadosWizard, formTela1, formMorador, dependentes),
    [dadosWizard, formTela1, formMorador, dependentes]
  );

  const ambienteTeste = ehAmbienteTeste(dadosWizard);

  const [notaNps, setNotaNps] = useState(null);

  const [experienciaCadastro, setExperienciaCadastro] =
    useState("muito_facil");

  const [influenciasNota, setInfluenciasNota] = useState([]);

  const [dificuldades, setDificuldades] = useState([]);

  const [problemasTecnicos, setProblemasTecnicos] = useState([]);

  const [comentario, setComentario] = useState("");

  const [permiteContato, setPermiteContato] = useState(true);

  const [canaisContato, setCanaisContato] = useState(["email"]);

  function alternarLista(valor, lista, setLista) {
    if (valor === "nenhuma") {
      setLista((old) =>
        old.includes("nenhuma") ? [] : ["nenhuma"]
      );
      return;
    }

    setLista((old) => {
      const semNenhuma = old.filter(
        (item) => item !== "nenhuma"
      );

      if (semNenhuma.includes(valor)) {
        return semNenhuma.filter(
          (item) => item !== valor
        );
      }

      return [...semNenhuma, valor];
    });
  }

  function alternarCanal(canal) {
    setCanaisContato((old) =>
      old.includes(canal)
        ? old.filter((item) => item !== canal)
        : [...old, canal]
    );
  }

  function copiarProtocolo() {
    navigator.clipboard?.writeText(resumo.protocolo);

    toast.success("Protocolo copiado.");
  }

  async function enviarFeedback() {
    if (notaNps === null) {
      toast.error(
        "Selecione uma nota de 0 a 10 para continuar."
      );
      return;
    }

    try {
      const payloadPesquisa = montarPayloadNps({
        dadosWizard,
        resumo,
        notaNps,
        experienciaCadastro,
        influenciasNota,
        dificuldades,
        problemasTecnicos,
        comentario,
        permiteContato,
        canaisContato,
      });
      
      const tokenPesquisa =
        dadosWizard?.token_convite ||
        dadosWizard?.preCadastro?.token_convite ||
        dadosWizard?.pre_cadastro?.token_convite ||
        null;

      const tokenInvalidoParaEdge =
        !tokenPesquisa ||
        tokenPesquisa === "sandbox-token-morador" ||
        tokenPesquisa?.startsWith("sandbox-") ||
        tokenPesquisa?.startsWith("mock-") ||
        tokenPesquisa?.startsWith("teste-");

      if (!ambienteTeste && !tokenInvalidoParaEdge) {
        await salvarPesquisaWizardMorador({
          token: tokenPesquisa,
          protocolo: resumo.protocolo,
          pesquisa: payloadPesquisa.feedback_nps,
        });
      }

      toast.success(
        ambienteTeste
          ? "Pesquisa validada em ambiente de testes."
          : "Pesquisa registrada com sucesso."
      );

      await onNext({
        ...payloadPesquisa,
      });
    } catch (error) {
      toast.error(
        error.message || "Erro ao salvar pesquisa."
      );
    }
  }

  async function pularPesquisa() {
    toast(
      "Pesquisa ignorada. Prosseguindo para a finalização."
    );

    await onNext({
      business_id: dadosWizard?.business_id || null,
      condominio_id: dadosWizard?.condominio_id || null,
      pre_cadastro_id:
        dadosWizard?.pre_cadastro_id || null,

      etapa_atual: 8,

      feedback_nps: {
        pulado: true,
        ambiente_teste: ambienteTeste,
        contabilizar_nps: false,
        enviado_em: new Date().toISOString(),
      },
    });
  }
    return (
    <div className="wm-t8-page">
      <section className="wm-t8-card">
        <div className="wm-t8-main-grid">
          <section className="wm-t8-main">
            <header className="wm-t8-hero">
              <div className="wm-t8-hero-image">
                <img src={coracaoNps} alt="Sua opinião importa" />
              </div>

              <div>
                <span>Tela 8 de 9</span>

                <h1>Sua opinião importa</h1>

                <p>
                  Antes de finalizar, conte rapidamente como foi sua experiência
                  no cadastro.
                </p>

                <strong>
                  Sua opinião ajuda a tornar o Sistema Chegou
                  <span className="wm-orange">!</span> ainda melhor para todos.
                </strong>

                {ambienteTeste ? (
                  <em>
                    Ambiente de validação: esta resposta não contará nas métricas oficiais.
                  </em>
                ) : null}
              </div>
            </header>

            <section className="wm-t8-section-card">
              <div className="wm-t8-question nps">
                <div className="wm-t8-question-title">
                  <span>1</span>

                  <h2>
                    De 0 a 10, quanto você recomendaria o Sistema Chegou
                    <span className="wm-orange">!</span>?
                  </h2>
                </div>

                <div className="wm-t8-nps-scale">
                  {Array.from({ length: 11 }, (_, numero) => (
                    <button
                      key={numero}
                      type="button"
                      className={notaNps === numero ? "active" : ""}
                      onClick={() => setNotaNps(numero)}
                    >
                      {numero}
                    </button>
                  ))}
                </div>

                <div className="wm-t8-nps-labels">
                  <small>Nada provável</small>
                  <small>Extremamente provável</small>
                </div>
              </div>

              <div className="wm-t8-question">
                <div className="wm-t8-question-title">
                  <span>2</span>
                  <h2>O que mais influenciou sua nota?</h2>
                </div>

                <div className="wm-t8-chip-grid">
                  {opcoesInfluencia.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={influenciasNota.includes(item.id) ? "active" : ""}
                      onClick={() =>
                        alternarLista(item.id, influenciasNota, setInfluenciasNota)
                      }
                    >
                      <StarIcon />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="wm-t8-question experience">
                <div className="wm-t8-question-title">
                  <span>3</span>
                  <h2>Como foi a experiência de cadastro?</h2>
                </div>

                <div className="wm-t8-experience-grid">
                  {experiencias.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={experienciaCadastro === item.id ? "active" : ""}
                      onClick={() => setExperienciaCadastro(item.id)}
                    >
                      <strong>{item.emoji}</strong>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
                            <div className="wm-t8-divider" />

              <div className="wm-t8-question">
                <div className="wm-t8-question-title">
                  <span>4</span>
                  <h2>Onde você teve mais dificuldade?</h2>
                </div>

                <div className="wm-t8-chip-grid">
                  {opcoesDificuldade.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={dificuldades.includes(item.id) ? "active" : ""}
                      onClick={() =>
                        alternarLista(
                          item.id,
                          dificuldades,
                          setDificuldades
                        )
                      }
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="wm-t8-question">
                <div className="wm-t8-question-title">
                  <span>5</span>
                  <h2>Encontrou algum problema técnico?</h2>
                </div>

                <div className="wm-t8-check-grid">
                  {opcoesProblema.map((item) => (
                    <label
                      key={item.id}
                      className={
                        problemasTecnicos.includes(item.id)
                          ? "active"
                          : ""
                      }
                    >
                      <input
                        type="checkbox"
                        checked={problemasTecnicos.includes(item.id)}
                        onChange={() =>
                          alternarLista(
                            item.id,
                            problemasTecnicos,
                            setProblemasTecnicos
                          )
                        }
                      />

                      <span>
                        <CheckCircle2 size={13} />
                      </span>

                      {item.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="wm-t8-question">
                <div className="wm-t8-question-title">
                  <span>6</span>
                  <h2>Comentário adicional (opcional)</h2>
                </div>

                <textarea
                  className="wm-t8-textarea"
                  placeholder="Compartilhe sugestões, elogios, melhorias ou observações sobre o cadastro..."
                  value={comentario}
                  onChange={(event) =>
                    setComentario(event.target.value)
                  }
                  maxLength={1200}
                />

                <small className="wm-t8-char-counter">
                  {comentario.length}/1200 caracteres
                </small>
              </div>

              <div className="wm-t8-question">
                <div className="wm-t8-question-title">
                  <span>7</span>
                  <h2>Podemos entrar em contato sobre seu feedback?</h2>
                </div>

                <div className="wm-t8-contact-choice">
                  <button
                    type="button"
                    className={permiteContato ? "active" : ""}
                    onClick={() => setPermiteContato(true)}
                  >
                    Sim
                  </button>

                  <button
                    type="button"
                    className={!permiteContato ? "active" : ""}
                    onClick={() => setPermiteContato(false)}
                  >
                    Não
                  </button>
                </div>

                {permiteContato ? (
                  <div className="wm-t8-contact-channels">
                    <button
                      type="button"
                      className={
                        canaisContato.includes("email")
                          ? "active"
                          : ""
                      }
                      onClick={() => alternarCanal("email")}
                    >
                      <Mail size={16} />
                      E-mail
                    </button>

                    <button
                      type="button"
                      className={
                        canaisContato.includes("whatsapp")
                          ? "active"
                          : ""
                      }
                      onClick={() => alternarCanal("whatsapp")}
                    >
                      <MessageCircle size={16} />
                      WhatsApp
                    </button>
                  </div>
                ) : null}
              </div>
            </section>

            <footer className="wm-t8-actions">
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
                onClick={pularPesquisa}
              >
                Pular pesquisa
              </button>

              <button
                type="button"
                className="primary"
                onClick={enviarFeedback}
              >
                Enviar feedback e continuar
                <ArrowRight size={18} />
              </button>
            </footer>
          </section>
                    <aside className="wm-t8-side">
            <section className="wm-t8-mascot-card">
              <div>
                <span>Feedback rápido</span>

                <h3>
                  Ajude o Chegou{" "}
                  <span className="wm-brand-inline">
                    <span className="wm-orange">!</span>
                  </span>{" "}
                  a melhorar
                </h3>

                <p>
                  Sua resposta ajuda a deixar o cadastro mais simples, seguro e rápido.
                </p>
              </div>

              <img src={mascoteNps} alt="Mascote Chegou!" />
            </section>

            {ambienteTeste ? (
              <section className="wm-t8-side-card orange">
                <span>
                  <Info size={22} />
                </span>

                <h3>Ambiente de validação</h3>

                <p>
                  Esta resposta será salva apenas como teste e não contará nas
                  métricas oficiais de NPS.
                </p>
              </section>
            ) : null}

            <section className="wm-t8-side-card">
              <span>
                <ClipboardCopy size={22} />
              </span>

              <h3>Protocolo</h3>

              <p className="wm-t8-protocol">{resumo.protocolo}</p>

              <button type="button" onClick={copiarProtocolo}>
                Copiar protocolo
              </button>
            </section>

            <section className="wm-t8-side-card">
              <span>
                <Building2 size={22} />
              </span>

              <h3>Resumo do cadastro</h3>

              <div className="wm-t8-summary-list">
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

            <section className="wm-t8-side-card orange">
              <span>
                <Info size={22} />
              </span>

              <h3>Próximo passo</h3>

              <p>
                Após esta pesquisa, você será direcionado para a tela final de
                acompanhamento da auditoria administrativa.
              </p>
            </section>

            <section className="wm-t8-side-card green">
              <span>
                <ShieldCheck size={22} />
              </span>

              <h3>Privacidade</h3>

              <p>
                Seu feedback será usado para melhoria do Sistema Chegou
                <span className="wm-orange">!</span> e poderá ser analisado junto
                ao protocolo do cadastro.
              </p>
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}

function StarIcon() {
  return <HeartHandshake size={15} />;
}