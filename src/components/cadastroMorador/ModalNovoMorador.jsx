import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Save,
  UserPlus,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { criarPreCadastroMoradorIndividual } from "../../services/cadastroMoradorService";

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
  return String(valor).replace(/\D/g, "");
}

function normalizarTexto(valor = "") {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizarEmail(valor = "") {
  return String(valor || "").trim().toLowerCase();
}

function formatarDDI(valor = "") {
  let limpo = String(valor).replace(/[^\d+]/g, "");

  if (!limpo) return "+55";

  if (!limpo.startsWith("+")) {
    limpo = `+${limpo}`;
  }

  return limpo.slice(0, 5);
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

export default function ModalNovoMorador({
  aberto,
  onClose,
  onSuccess,
  perfil,
  condominio,
  torres = [],
  preCadastros = [],
}) {
  const [form, setForm] = useState(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [statusUnidade, setStatusUnidade] = useState(null);

  const condominioId = perfil?.condominio_id;
  const usuarioLogadoId = perfil?.id;

  const torreSelecionada = useMemo(() => {
    return torres.find((torre) => torre.id === form.torre_id) || null;
  }, [torres, form.torre_id]);

  useEffect(() => {
    if (aberto) return;

    setForm({ ...FORM_INICIAL });
    setStatusUnidade(null);
  }, [aberto]);

  useEffect(() => {
    if (!form.torre_id || !form.unidade.trim()) {
      setStatusUnidade(null);
      return;
    }

    const timeout = setTimeout(() => {
      verificarUnidade();
    }, 500);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.torre_id, form.unidade]);

  if (!aberto) return null;

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
        novo.ddi = formatarDDI(valor);
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

  async function verificarUnidade() {
    if (!condominioId || !form.torre_id || !form.unidade.trim()) return;

    try {
      setVerificando(true);

      const unidadeNormalizada = normalizarTexto(form.unidade);
      const torreNomeNormalizada = normalizarTexto(torreSelecionada?.nome);
      const torreIdentNormalizado = normalizarTexto(torreSelecionada?.identificador);

      const local = preCadastros.find((item) => {
        const mesmaUnidade = normalizarTexto(item.unidade) === unidadeNormalizada;

        const mesmaTorre =
          normalizarTexto(item.torre) === torreNomeNormalizada ||
          normalizarTexto(item.bloco) === torreNomeNormalizada ||
          normalizarTexto(item.torre) === torreIdentNormalizado ||
          normalizarTexto(item.bloco) === torreIdentNormalizado;

        const ativoOuAberto = !["CANCELADO", "cancelado", "RECUSADO", "rejeitado"].includes(
          item.status_cadastro
        );

        return mesmaUnidade && mesmaTorre && ativoOuAberto;
      });

      if (local) {
        setStatusUnidade({
          tipo: "ocupada",
          titulo: "Existe cadastro para esta unidade",
          mensagem:
            "Esta Torre/Unidade já possui pré-cadastro ou cadastro em andamento. Trocas de responsável devem ser feitas em Gestão > Unidades e Vínculos.",
          registro: local,
        });
        return;
      }

      setStatusUnidade({
        tipo: "disponivel",
        titulo: "Unidade disponível",
        mensagem:
          "Nenhum pré-cadastro ativo foi localizado para esta Torre/Unidade.",
      });
    } catch (error) {
      console.error(error);
      setStatusUnidade({
        tipo: "erro",
        titulo: "Não foi possível validar a unidade",
        mensagem: "Você poderá salvar, mas revise os dados antes de preparar o convite.",
      });
    } finally {
      setVerificando(false);
    }
  }

  function validarFormulario() {
    if (!form.torre_id) return "Selecione a Torre/Bloco.";
    if (!form.unidade.trim()) return "Informe a unidade.";
    if (!form.nome.trim()) return "Informe o nome completo do responsável.";
    if (!form.ddi.trim()) return "Informe o DDI.";
    if (!validarTelefone(form.ddi, form.telefone)) return "Informe um WhatsApp válido.";
    if (!form.email.trim()) return "Informe o e-mail.";
    if (!validarEmail(form.email)) return "Informe um e-mail válido.";

    if (statusUnidade?.tipo === "ocupada") {
      return "Esta unidade já possui cadastro. Use Gestão > Unidades e Vínculos para troca de responsável.";
    }

    return null;
  }

  async function salvar() {
    const erro = validarFormulario();

    if (erro) {
      toast.error(erro);
      return;
    }

    try {
      setSalvando(true);

      const telefoneCompleto = montarTelefoneE164(form.ddi, form.telefone);

        await criarPreCadastroMoradorIndividual({
          perfil,
          condominio,
          dados: {
            business_id: condominio?.business_id || null,
            unidade_id: null,

            nome: form.nome.trim(),
            email: normalizarEmail(form.email),
            telefone: telefoneCompleto,

            torre: torreSelecionada?.nome || form.torre_nome,
            bloco: torreSelecionada?.identificador || form.torre_identificador || null,
            unidade: form.unidade.trim(),

            tipo_morador: "morador",
            origem_cadastro: "manual",
            status_cadastro: "RASCUNHO",
            status_convite: "AGUARDANDO_ENVIO",
            status_auditoria: "NAO_ENVIADO",
            percentual_preenchimento: 10,
            status_conta: "PENDENTE_APROVACAO",
            auth_ativo: false,
            possui_divergencia: false,

            observacoes: form.observacoes?.trim() || null,

            dados_importados: {
              origem: "cadastro_administrativo_individual",
              torre_id: form.torre_id,
              torre_nome: torreSelecionada?.nome || null,
              torre_identificador: torreSelecionada?.identificador || null,
              criado_por: usuarioLogadoId || null,
              criado_em: new Date().toISOString(),
            },
          },
        });

      toast.success("Pré-cadastro criado com sucesso.");

      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error("Erro ao salvar novo morador completo:", JSON.stringify(error, null, 2));
      console.error("Erro bruto:", error);

      toast.error(error.message || error.details || "Erro ao salvar pré-cadastro.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="cadmor-modal-overlay" role="dialog" aria-modal="true">
      <div className="cadmor-modal cadmor-modal-novo">
        <header className="cadmor-modal-head">
          <div>
            <span>
              <UserPlus size={18} />
              Novo Morador
            </span>
            <h2>Pré-cadastro individual</h2>
            <p>
              Cadastre os dados mínimos do responsável da unidade. O perfil será definido
              posteriormente no Wizard Morador.
            </p>
          </div>

          <button type="button" className="cadmor-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div className="cadmor-modal-grid-main">
          <section className="cadmor-modal-form">
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
                  onBlur={verificarUnidade}
                  placeholder="Ex.: 101, 101A, Cobertura 1"
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
              <span>Nome completo do responsável *</span>
              <input
                value={form.nome}
                onChange={(event) => atualizar("nome", event.target.value)}
                placeholder="Nome completo"
              />
            </label>

            <div className="cadmor-form-grid phone">
              <label className="cadmor-field">
                <span>DDI *</span>
                <input
                  value={form.ddi}
                  onChange={(event) => atualizar("ddi", event.target.value)}
                  inputMode="tel"
                  placeholder="+55"
                />
              </label>

              <label className="cadmor-field">
                <span>DDD + Número *</span>
                <input
                  value={form.telefone}
                  onChange={(event) => atualizar("telefone", event.target.value)}
                  inputMode="tel"
                  placeholder="(11) 99999-9999"
                />
              </label>
            </div>

            <label className="cadmor-field">
              <span>E-mail *</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => atualizar("email", event.target.value)}
                placeholder="email@exemplo.com"
              />
            </label>

            <label className="cadmor-field">
              <span>Observação administrativa</span>
              <textarea
                value={form.observacoes}
                onChange={(event) => atualizar("observacoes", event.target.value)}
                placeholder="Observação interna opcional..."
                maxLength={800}
              />
            </label>
          </section>

          <aside className="cadmor-modal-info">
            <section>
              <h3>Verificação da Unidade</h3>
              <p>
                Selecione uma Torre/Bloco da estrutura oficial e informe a unidade.
                O sistema verificará pré-cadastros em andamento.
              </p>
            </section>

            <section>
              <h3>Importante</h3>
              <ul>
                <li>Perfil não é definido aqui.</li>
                <li>Trocas de responsável ficam em Gestão de Vínculos.</li>
                <li>Convites serão tratados em Convites de Moradores.</li>
                <li>Não exclua registros com histórico.</li>
              </ul>
            </section>
          </aside>
        </div>

        <footer className="cadmor-modal-actions">
          <button type="button" className="cadmor-btn-modal secondary" onClick={onClose}>
            Cancelar
          </button>

          <button
            type="button"
            className="cadmor-btn-modal primary"
            onClick={salvar}
            disabled={salvando || verificando}
          >
            {salvando ? <Loader2 size={17} className="spin" /> : <Save size={17} />}
            Salvar pré-cadastro
          </button>
        </footer>
      </div>
    </div>
  );
}