import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Loader2,
  Save,
  User,
  X,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import toast from "react-hot-toast";

const FORM_INICIAL = {
  torre_id: "",
  torre_nome: "",
  torre_identificador: "",
  unidade: "",
  nome: "",
  ddi: "+55",
  telefone: "",
  email: "",
  observacoes: "",
};

function somenteNumeros(valor = "") {
  return String(valor || "").replace(/\D/g, "");
}

function normalizarEmail(valor = "") {
  return String(valor || "").trim().toLowerCase();
}

function normalizarTexto(valor = "") {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function extrairDDI(telefone = "") {
  const numero = somenteNumeros(telefone);

  if (numero.startsWith("55")) return "+55";

  return "+55";
}

function extrairTelefoneSemDDI(telefone = "") {
  const numero = somenteNumeros(telefone);

  if (numero.startsWith("55")) return numero.slice(2);

  return numero;
}

function formatarTelefonePorDDI(ddi = "+55", valor = "") {
  const ddiNumerico = somenteNumeros(ddi);
  const numeros = somenteNumeros(valor);

  if (ddiNumerico === "55") {
    const v = numeros.slice(0, 11);

    if (v.length <= 2) return v ? `(${v}` : "";
    if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
    if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;

    return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  }

  return numeros.slice(0, 16).replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

function montarTelefoneE164(ddi = "+55", telefone = "") {
  const ddiLimpo = somenteNumeros(ddi) || "55";
  const telLimpo = somenteNumeros(telefone);

  if (!telLimpo) return "";

  return `+${ddiLimpo}${telLimpo}`;
}

function formatarNomeProprio(valor = "") {
  const minusculas = new Set(["da", "de", "do", "das", "dos", "e"]);

  return String(valor)
    .replace(/\s+/g, " ")
    .trimStart()
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((parte) => {
      if (minusculas.has(parte)) return parte;
      return parte.charAt(0).toLocaleUpperCase("pt-BR") + parte.slice(1);
    })
    .join(" ");
}

function validarEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function validarTelefone(ddi = "+55", telefone = "") {
  const ddiLimpo = somenteNumeros(ddi);
  const telLimpo = somenteNumeros(telefone);

  if (!ddiLimpo) return false;

  if (ddiLimpo === "55") {
    return telLimpo.length >= 10 && telLimpo.length <= 11;
  }

  return telLimpo.length >= 6;
}

function MailHintIcon() {
  return (
    <span className="cadmor-contact-hint-icon" aria-hidden="true">
      i
    </span>
  );
}

export default function ModalEditarMorador({
  aberto,
  morador,
  torres = [],
  preCadastros = [],
  onClose,
  onSalvar,
}) {
  const [form, setForm] = useState(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [statusUnidade, setStatusUnidade] = useState(null);

  const [confirmacaoUnidade, setConfirmacaoUnidade] = useState(false);
  const [payloadPendente, setPayloadPendente] = useState(null);

  const raw = morador?.raw || morador || {};

  const torreSelecionada = useMemo(() => {
    return torres.find((torre) => torre.id === form.torre_id) || null;
  }, [torres, form.torre_id]);

  const torreOriginal = raw.torre || raw.bloco || morador?.torre_nome || "";
  const unidadeOriginal = raw.unidade || morador?.unidade_nome || "";

  const alterouTorreUnidade = useMemo(() => {
    const torreAtual =
      torreSelecionada?.nome ||
      form.torre_nome ||
      form.torre_identificador ||
      "";

    return (
      normalizarTexto(torreAtual) !== normalizarTexto(torreOriginal) ||
      normalizarTexto(form.unidade) !== normalizarTexto(unidadeOriginal)
    );
  }, [torreSelecionada, form.torre_nome, form.torre_identificador, form.unidade, torreOriginal, unidadeOriginal]);

  useEffect(() => {
    if (!aberto || !morador) return;

    const torreAtual = torres.find((torre) => {
      const nome = normalizarTexto(torre.nome);
      const identificador = normalizarTexto(torre.identificador);

      return (
        nome === normalizarTexto(raw.torre) ||
        nome === normalizarTexto(morador?.torre_nome) ||
        identificador === normalizarTexto(raw.bloco) ||
        identificador === normalizarTexto(raw.torre)
      );
    });

    const ddi = extrairDDI(raw.telefone || morador?.telefone);
    const telefoneSemDDI = extrairTelefoneSemDDI(raw.telefone || morador?.telefone);

    setForm({
      torre_id: torreAtual?.id || "",
      torre_nome: torreAtual?.nome || raw.torre || "",
      torre_identificador: torreAtual?.identificador || raw.bloco || "",
      unidade: raw.unidade || morador?.unidade_nome || "",
      nome: raw.nome || morador?.nome || "",
      ddi,
      telefone: formatarTelefonePorDDI(ddi, telefoneSemDDI),
      email: raw.email || morador?.email || "",
      observacoes: raw.observacoes || "",
    });

    setStatusUnidade(null);
  }, [aberto, morador, torres]);

  useEffect(() => {
    if (!aberto || !form.torre_id || !form.unidade.trim()) {
      setStatusUnidade(null);
      return;
    }

    const timeout = setTimeout(() => {
      verificarConflitoUnidade();
    }, 500);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, form.torre_id, form.unidade]);

  if (!aberto || !morador) return null;

  function atualizar(campo, valor) {
    setForm((old) => {
      const novo = { ...old, [campo]: valor };

      if (campo === "torre_id") {
        const torre = torres.find((item) => item.id === valor);

        novo.torre_nome = torre?.nome || "";
        novo.torre_identificador = torre?.identificador || "";
      }

      if (campo === "nome") {
        novo.nome = formatarNomeProprio(valor);
      }

      if (campo === "ddi") {
        const limpo = String(valor).replace(/[^\d+]/g, "");
        novo.ddi = limpo.startsWith("+") ? limpo.slice(0, 5) : `+${limpo}`.slice(0, 5);
        novo.telefone = formatarTelefonePorDDI(novo.ddi, novo.telefone);
      }

      if (campo === "telefone") {
        novo.telefone = formatarTelefonePorDDI(novo.ddi, valor);
      }

      if (campo === "email") {
        novo.email = normalizarEmail(valor);
      }

      return novo;
    });
  }

  async function verificarConflitoUnidade() {
    try {
      setVerificando(true);

      const unidadeNormalizada = normalizarTexto(form.unidade);
      const torreNomeNormalizada = normalizarTexto(torreSelecionada?.nome || form.torre_nome);
      const torreIdentNormalizado = normalizarTexto(
        torreSelecionada?.identificador || form.torre_identificador
      );

      const conflito = preCadastros.find((item) => {
        if (item.id === raw.id) return false;

        const mesmaUnidade = normalizarTexto(item.unidade) === unidadeNormalizada;

        const mesmaTorre =
          normalizarTexto(item.torre) === torreNomeNormalizada ||
          normalizarTexto(item.bloco) === torreNomeNormalizada ||
          normalizarTexto(item.torre) === torreIdentNormalizado ||
          normalizarTexto(item.bloco) === torreIdentNormalizado;

        const ativoOuAberto = ![
          "CANCELADO",
          "cancelado",
          "RECUSADO",
          "rejeitado",
          "REPROVADO",
        ].includes(item.status_cadastro);

        return mesmaUnidade && mesmaTorre && ativoOuAberto;
      });

      if (conflito) {
        setStatusUnidade({
          tipo: "ocupada",
          titulo: "Conflito de unidade",
          mensagem:
            "Já existe outro pré-cadastro ativo para esta Torre/Unidade. A alteração não poderá ser salva.",
          registro: conflito,
        });
        return conflito;
      }

      setStatusUnidade({
        tipo: "disponivel",
        titulo: alterouTorreUnidade ? "Nova unidade disponível" : "Unidade atual validada",
        mensagem: alterouTorreUnidade
          ? "Nenhum conflito encontrado. A alteração exigirá confirmação antes de salvar."
          : "Nenhum conflito encontrado para a unidade atual.",
      });

      return null;
    } catch (error) {
      console.error("Erro ao verificar conflito de unidade:", error);

      setStatusUnidade({
        tipo: "erro",
        titulo: "Não foi possível validar a unidade",
        mensagem: "Revise os dados antes de salvar.",
      });

      return null;
    } finally {
      setVerificando(false);
    }
  }

  function validarFormulario() {
    if (!form.torre_id) return "Selecione a Torre/Bloco.";
    if (!form.unidade.trim()) return "Informe a unidade.";
    if (!form.nome.trim()) return "Informe o nome completo.";
    if (!form.ddi.trim()) return "Informe o DDI.";
    if (!validarTelefone(form.ddi, form.telefone)) return "Informe um WhatsApp válido.";
    if (!form.email.trim()) return "Informe o e-mail.";
    if (!validarEmail(form.email)) return "Informe um e-mail válido.";

    if (statusUnidade?.tipo === "ocupada") {
      return "Existe conflito para esta Torre/Unidade.";
    }

    return null;
  }

  async function executarSalvar(payload) {
    try {
        setSalvando(true);

        await onSalvar?.(payload);

        toast.success("Dados do morador atualizados com sucesso.");
        setConfirmacaoUnidade(false);
        setPayloadPendente(null);
        onClose?.();
    } catch (error) {
        console.error("Erro ao editar morador:", error);
        toast.error(error.message || "Erro ao editar morador.");
    } finally {
        setSalvando(false);
    }
    }

  async function salvar() {
    const erro = validarFormulario();

    if (erro) {
        toast.error(erro);
        return;
    }

    const conflito = await verificarConflitoUnidade();

    if (conflito) {
        toast.error("Não é possível salvar com conflito de unidade.");
        return;
    }

    const payload = {
        id: raw.id,
        dados_antes: raw,
        dados_depois: {
        nome: form.nome.trim(),
        email: normalizarEmail(form.email),
        telefone: montarTelefoneE164(form.ddi, form.telefone),
        torre: torreSelecionada?.nome || form.torre_nome,
        bloco: torreSelecionada?.identificador || form.torre_identificador || null,
        unidade: form.unidade.trim(),
        observacoes: form.observacoes?.trim() || null,
        },
        metadados_edicao: {
        alterou_torre_unidade: alterouTorreUnidade,
        torre_anterior: torreOriginal || null,
        torre_nova: torreSelecionada?.nome || form.torre_nome || null,
        unidade_anterior: unidadeOriginal || null,
        unidade_nova: form.unidade.trim() || null,
        confirmado_pelo_usuario: alterouTorreUnidade,
        },
    };

    if (alterouTorreUnidade) {
        setPayloadPendente(payload);
        setConfirmacaoUnidade(true);
        return;
    }

    await executarSalvar(payload);
    }

  return (
    <div className="cadmor-modal-overlay" role="dialog" aria-modal="true">
      <div className="cadmor-modal cadmor-modal-view">
        <header className="cadmor-modal-head cadmor-view-head">
          <div>
            <span>
              <Edit3 size={17} />
              Editar Morador
            </span>
            <h2>{raw.nome || morador?.nome || "Pré-cadastro"}</h2>
            <p>
              Atualize dados cadastrais com registro automático de log e auditoria.
            </p>
          </div>

          <button type="button" className="cadmor-modal-close" onClick={onClose}>
            <X size={19} />
          </button>
        </header>

        <div className="cadmor-view-body">
          <section className="cadmor-view-main">
            <div className="cadmor-view-section">
              <div className="cadmor-view-section-head">
                <h3>Dados principais</h3>
                <p>Dados editáveis do responsável da unidade.</p>
              </div>

              <div className="cadmor-form-grid two">
                <label className="cadmor-field">
                  <span>Torre/Bloco *</span>
                  <select
                    value={form.torre_id}
                    onChange={(event) => atualizar("torre_id", event.target.value)}
                  >
                    <option value="">Selecione a estrutura oficial</option>

                    {torres.map((torre) => (
                      <option key={torre.id} value={torre.id}>
                        {[torre.identificador, torre.nome].filter(Boolean).join(" - ")}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="cadmor-field">
                  <span>Unidade *</span>
                  <input
                    value={form.unidade}
                    onChange={(event) => atualizar("unidade", event.target.value)}
                    onBlur={verificarConflitoUnidade}
                    placeholder="Ex.: 101, 101A"
                  />
                </label>
              </div>

              {statusUnidade ? (
                <div className={`cadmor-unit-status ${statusUnidade.tipo}`}>
                  {verificando ? (
                    <Loader2 size={18} className="spin" />
                  ) : statusUnidade.tipo === "disponivel" ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <AlertTriangle size={18} />
                  )}

                  <div>
                    <strong>{statusUnidade.titulo}</strong>
                    <p>{statusUnidade.mensagem}</p>
                  </div>
                </div>
              ) : null}

              <label className="cadmor-field">
                <span>Nome completo *</span>
                <input
                  value={form.nome}
                  onChange={(event) => atualizar("nome", event.target.value)}
                />
              </label>
            </div>

            <div className="cadmor-view-section">
              <div className="cadmor-view-section-head">
                <h3>Contato</h3>
                <p>
                  Atualize os dados utilizados para comunicação, envio de convite e
                  acompanhamento do pré-cadastro.
                </p>
              </div>

              <div className="cadmor-contact-box">
                <div className="cadmor-contact-phone-row">
                  <label className="cadmor-field cadmor-field-ddi">
                    <span>DDI *</span>
                    <input
                      value={form.ddi}
                      onChange={(event) => atualizar("ddi", event.target.value)}
                      placeholder="+55"
                      inputMode="tel"
                    />
                  </label>

                  <label className="cadmor-field cadmor-field-phone">
                    <span>
                      <FaWhatsapp className="cadmor-whatsapp-icon" />
                      WhatsApp / Celular *
                    </span>
                    <input
                      value={form.telefone}
                      onChange={(event) => atualizar("telefone", event.target.value)}
                      placeholder="(11) 99999-9999"
                      inputMode="tel"
                    />
                  </label>
                </div>

                <label className="cadmor-field cadmor-field-email">
                  <span>E-mail *</span>
                  <input
                    value={form.email}
                    onChange={(event) => atualizar("email", event.target.value)}
                    placeholder="morador@email.com.br"
                    inputMode="email"
                  />
                </label>

                <div className="cadmor-contact-hint">
                  <MailHintIcon />
                  <span>
                    O e-mail será usado para envio do convite. O WhatsApp será utilizado
                    para comunicação operacional quando o canal estiver habilitado.
                  </span>
                </div>
              </div>
            </div>

            <div className="cadmor-view-section">
              <div className="cadmor-view-section-head">
                <h3>Observações</h3>
                <p>Campo administrativo para registro complementar.</p>
              </div>

              <label className="cadmor-field cadmor-field-observacoes">
                <span>Observações Administrativas</span>

                <small className="cadmor-field-helper">
                  Informações internas para auditoria e acompanhamento.
                </small>

                <textarea
                  maxLength={500}
                  value={form.observacoes || ""}
                  onChange={(e) =>
                    setForm((old) => ({
                      ...old,
                      observacoes: e.target.value,
                    }))
                  }
                />

                <small className="cadmor-counter">
                  {(form.observacoes || "").length} / 500 caracteres
                </small>
              </label>
            </div>
          </section>

          <aside className="cadmor-view-aside">
            <div className="cadmor-view-card">
              <span className="cadmor-view-card-kicker">Edição auditável</span>
              <strong>Alterações serão registradas</strong>
              <p>
                Ao salvar, o sistema registrará dados anteriores, dados novos,
                usuário executor, data, IP, navegador e origem da alteração.
              </p>
            </div>

            <div className="cadmor-view-card">
              <span className="cadmor-view-card-kicker">Torre/Unidade</span>
              <strong>
                {alterouTorreUnidade ? "Alteração detectada" : "Sem alteração"}
              </strong>
              <p>
                {alterouTorreUnidade
                  ? "Será solicitada confirmação antes de salvar a nova vinculação."
                  : "A unidade permanece igual ao cadastro atual."}
              </p>
            </div>

            <div className="cadmor-view-card">
              <span className="cadmor-view-card-kicker">Status atual</span>
              <strong>{raw.status_cadastro || "RASCUNHO"}</strong>
              <p>Status não será alterado por este modal.</p>
            </div>
          </aside>
        </div>

        <footer className="cadmor-modal-footer cadmor-view-footer">
          <button type="button" className="cadmor-btn secondary" onClick={onClose}>
            Cancelar
          </button>

          <button
            type="button"
            className="cadmor-btn primary"
            onClick={salvar}
            disabled={salvando || verificando}
          >
            {salvando ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            Salvar Alterações
          </button>
        </footer>
      </div>

        {confirmacaoUnidade ? (
            <div className="cadmor-confirm-overlay" role="dialog" aria-modal="true">
                <div className="cadmor-confirm-box">
                <div className="cadmor-confirm-icon">
                    <AlertTriangle size={22} />
                </div>

                <div className="cadmor-confirm-content">
                    <span>Confirmação necessária</span>
                    <h3>Alterar Torre/Unidade?</h3>

                    <p>
                    Você está alterando a Torre/Unidade vinculada a este pré-cadastro.
                    Essa ação ficará registrada nos logs e na auditoria do sistema.
                    </p>

                    <div className="cadmor-confirm-change">
                    <div>
                        <small>Antes</small>
                        <strong>
                        {torreOriginal || "—"} • Unidade {unidadeOriginal || "—"}
                        </strong>
                    </div>

                    <div>
                        <small>Depois</small>
                        <strong>
                        {torreSelecionada?.nome || form.torre_nome || "—"} • Unidade{" "}
                        {form.unidade || "—"}
                        </strong>
                    </div>
                    </div>
                </div>

                <div className="cadmor-confirm-actions">
                    <button
                    type="button"
                    className="cadmor-btn secondary"
                    onClick={() => {
                        setConfirmacaoUnidade(false);
                        setPayloadPendente(null);
                    }}
                    disabled={salvando}
                    >
                    Cancelar
                    </button>

                    <button
                    type="button"
                    className="cadmor-btn primary"
                    onClick={() => executarSalvar(payloadPendente)}
                    disabled={salvando || !payloadPendente}
                    >
                    {salvando ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                    Confirmar Alteração
                    </button>
                </div>
              </div>
            </div>
            ) : null}

    </div>
  );
}