import { useEffect, useMemo, useState } from "react";
import { X, Save, UserPlus } from "lucide-react";
import { supabase } from "../../../services/supabase";

export default function FuncionarioFormModal({
  aberto,
  modo = "novo",
  funcionario = null,
  condominioId,
  opcoes,
  fornecedores = [],
  onClose,
  onSaved,
  mostrarToast,
}) {
  const editando = modo === "editar";

  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState({});

  const [form, setForm] = useState({
    nome_completo: "",
    cpf: "",
    email: "",
    telefone: "",
    ddi_whatsapp: "+55",
    whatsapp: "",
    tipo_funcionario: "PROPRIO",
    fornecedor_condominio_id: "",
    categoria_id: "",
    cargo_id: "",
    funcao_id: "",
    situacao: "ATIVO",
    data_admissao: "",
    observacoes: "",
    foto_url: "",
  });

  useEffect(() => {
    if (!aberto) return;

    if (editando && funcionario) {
      setForm({
        nome_completo: funcionario.nome_completo || "",
        cpf: mascaraCpf(funcionario.cpf || ""),
        email: funcionario.email || "",
        telefone: mascaraTelefone(funcionario.telefone || ""),
        ddi_whatsapp: funcionario.ddi_whatsapp || "+55",
        whatsapp: mascaraTelefone(funcionario.whatsapp || ""),
        tipo_funcionario: funcionario.tipo_funcionario || "PROPRIO",
        fornecedor_condominio_id: funcionario.fornecedor_condominio_id || "",
        categoria_id: funcionario.categoria_id || "",
        cargo_id: funcionario.cargo_id || "",
        funcao_id: funcionario.funcao_id || "",
        situacao: funcionario.situacao || "ATIVO",
        data_admissao: funcionario.data_admissao || "",
        observacoes: funcionario.observacoes || "",
        foto_url: funcionario.foto_url || "",
      });
    } else {
      setForm({
        nome_completo: "",
        cpf: "",
        email: "",
        telefone: "",
        ddi_whatsapp: "+55",
        whatsapp: "",
        tipo_funcionario: "PROPRIO",
        fornecedor_condominio_id: "",
        categoria_id: "",
        cargo_id: "",
        funcao_id: "",
        situacao: "ATIVO",
        data_admissao: "",
        observacoes: "",
        foto_url: "",
      });
    }

    setErros({});
  }, [aberto, editando, funcionario]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Enter" && e.ctrlKey) salvar();
    }

    if (aberto) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [aberto, form]);

  const cargosFiltrados = useMemo(() => {
    const cargos = opcoes?.cargosFuncoes?.cargos || [];
    if (!form.categoria_id) return cargos;
    return cargos.filter((c) => c.categoria_id === form.categoria_id);
  }, [opcoes, form.categoria_id]);

  const funcoesFiltradas = useMemo(() => {
    const funcoes = opcoes?.cargosFuncoes?.funcoes || [];
    if (!form.categoria_id) return funcoes;
    return funcoes.filter((f) => f.categoria_id === form.categoria_id);
  }, [opcoes, form.categoria_id]);

  if (!aberto) return null;

  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: null }));
  }

  function limparNumeros(valor) {
    return String(valor || "").replace(/\D/g, "");
  }

  function mascaraCpf(valor) {
    const numeros = limparNumeros(valor).slice(0, 11);

    return numeros
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  function mascaraTelefone(valor) {
    const numeros = limparNumeros(valor).slice(0, 11);

    if (numeros.length <= 10) {
      return numeros
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }

    return numeros
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  }

  function mascaraDdi(valor) {
    const numeros = limparNumeros(valor).slice(0, 3);
    return numeros ? `+${numeros}` : "+";
  }

  function validar() {
    const novosErros = {};

    if (!form.nome_completo.trim()) {
      novosErros.nome_completo = "Informe o nome completo.";
    }

    if (limparNumeros(form.cpf).length !== 11) {
      novosErros.cpf = "Informe um CPF válido.";
    }

    if (form.email && !form.email.includes("@")) {
      novosErros.email = "Informe um e-mail válido.";
    }

    if (!form.categoria_id) {
      novosErros.categoria_id = "Selecione a categoria.";
    }

    if (!form.cargo_id && !form.funcao_id) {
      novosErros.cargo_id = "Selecione o cargo ou a função.";
    }

    if (form.tipo_funcionario === "TERCEIRIZADO" && !form.fornecedor_condominio_id) {
      novosErros.fornecedor_condominio_id = "Selecione o fornecedor.";
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function salvar() {
    if (salvando) return;
    if (!validar()) return;

    setSalvando(true);

    try {
      const payload = editando
        ? {
            p_funcionario_condominio_id: funcionario.id,
            p_nome_completo: form.nome_completo.trim(),
            p_email: form.email || null,
            p_telefone: limparNumeros(form.telefone) || null,
            p_ddi_whatsapp: form.ddi_whatsapp || "+55",
            p_whatsapp: limparNumeros(form.whatsapp) || null,
            p_tipo_funcionario: form.tipo_funcionario,
            p_fornecedor_condominio_id:
              form.tipo_funcionario === "TERCEIRIZADO"
                ? form.fornecedor_condominio_id
                : null,
            p_categoria_id: form.categoria_id || null,
            p_cargo_id: form.cargo_id || null,
            p_funcao_id: form.funcao_id ? Number(form.funcao_id) : null,
            p_situacao: form.situacao,
            p_data_admissao: form.data_admissao || null,
            p_data_fim_vinculo: null,
            p_observacoes: form.observacoes || null,
            p_foto_url: form.foto_url || null,
            p_motivo: "Cadastro do funcionário atualizado",
          }
        : {
            p_condominio_id: condominioId,
            p_nome_completo: form.nome_completo.trim(),
            p_cpf: limparNumeros(form.cpf),
            p_email: form.email || null,
            p_telefone: limparNumeros(form.telefone) || null,
            p_ddi_whatsapp: form.ddi_whatsapp || "+55",
            p_whatsapp: limparNumeros(form.whatsapp) || null,
            p_tipo_funcionario: form.tipo_funcionario,
            p_fornecedor_condominio_id:
              form.tipo_funcionario === "TERCEIRIZADO"
                ? form.fornecedor_condominio_id
                : null,
            p_categoria_id: form.categoria_id || null,
            p_cargo_id: form.cargo_id || null,
            p_funcao_id: form.funcao_id ? Number(form.funcao_id) : null,
            p_situacao: form.situacao,
            p_data_admissao: form.data_admissao || null,
            p_observacoes: form.observacoes || null,
            p_foto_url: form.foto_url || null,
            p_motivo: "Cadastro inicial do funcionário",
          };

      const rpc = editando
        ? "rpc_admin_funcionario_editar_v1"
        : "rpc_admin_funcionario_criar_v1";

      const { error } = await supabase.rpc(rpc, payload);

      if (error) throw error;

      mostrarToast?.(
        editando
          ? "Cadastro atualizado com sucesso."
          : "Funcionário cadastrado com sucesso.",
        "sucesso"
      );

      onSaved?.();
      onClose?.();
    } catch (error) {
      console.error("Erro ao salvar funcionário:", error);
      mostrarToast?.(
        "Não foi possível salvar o funcionário. Verifique os dados e tente novamente.",
        "erro"
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="funcionarios-modal-overlay" role="presentation">
      <div className="funcionarios-modal" role="dialog" aria-modal="true">
        <div className="funcionarios-modal-header">
          <div>
            <span className="funcionarios-eyebrow">CADASTRO</span>
            <h2>{editando ? "Editar Funcionário" : "Novo Funcionário"}</h2>
          </div>

          <button type="button" className="func-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="funcionarios-modal-body">
          <div className="func-form-grid">
            <Field label="Nome completo" erro={erros.nome_completo} span>
              <input
                className={erros.nome_completo ? "func-field-invalid" : ""}
                value={form.nome_completo}
                onChange={(e) => atualizar("nome_completo", e.target.value)}
                placeholder="Informe o nome completo"
              />
            </Field>

            <Field label="CPF" erro={erros.cpf}>
              <input
                className={erros.cpf ? "func-field-invalid" : ""}
                value={form.cpf}
                onChange={(e) => atualizar("cpf", mascaraCpf(e.target.value))}
                placeholder="000.000.000-00"
                inputMode="numeric"
                disabled={editando}
                maxLength={14}
              />
            </Field>

            <Field label="E-mail" erro={erros.email}>
              <input
                className={erros.email ? "func-field-invalid" : ""}
                value={form.email}
                onChange={(e) => atualizar("email", e.target.value)}
                placeholder="email@exemplo.com"
                type="email"
              />
            </Field>

            <Field label="Telefone">
              <input
                value={form.telefone}
                onChange={(e) => atualizar("telefone", mascaraTelefone(e.target.value))}
                placeholder="(00) 00000-0000"
                inputMode="numeric"
                maxLength={15}
              />
            </Field>

            <Field label="WhatsApp">
              <div className="func-whatsapp-row">
                <input
                  value={form.ddi_whatsapp}
                  onChange={(e) => atualizar("ddi_whatsapp", mascaraDdi(e.target.value))}
                  placeholder="+55"
                  inputMode="numeric"
                  maxLength={4}
                />
                <input
                  value={form.whatsapp}
                  onChange={(e) => atualizar("whatsapp", mascaraTelefone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  inputMode="numeric"
                  maxLength={15}
                />
              </div>
            </Field>

            <div className="func-form-section-title">
              Vínculo operacional
            </div>

            <Field label="Tipo de funcionário">
              <select
                value={form.tipo_funcionario}
                onChange={(e) => atualizar("tipo_funcionario", e.target.value)}
              >
                <option value="PROPRIO">Funcionário do condomínio</option>
                <option value="TERCEIRIZADO">Funcionário terceirizado</option>
              </select>
            </Field>

            {form.tipo_funcionario === "TERCEIRIZADO" && (
              <Field label="Fornecedor" erro={erros.fornecedor_condominio_id} span>
                <select
                  className={erros.fornecedor_condominio_id ? "func-field-invalid" : ""}
                  value={form.fornecedor_condominio_id}
                  onChange={(e) => atualizar("fornecedor_condominio_id", e.target.value)}
                >
                  <option value="">Selecione o fornecedor</option>
                  {fornecedores.map((f) => (
                    <option key={f.fornecedor_condominio_id} value={f.fornecedor_condominio_id}>
                      {f.nome_exibicao}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Categoria" erro={erros.categoria_id}>
              <select
                className={erros.categoria_id ? "func-field-invalid" : ""}
                value={form.categoria_id}
                onChange={(e) => {
                  atualizar("categoria_id", e.target.value);
                  atualizar("cargo_id", "");
                  atualizar("funcao_id", "");
                }}
              >
                <option value="">Selecione</option>
                {opcoes?.cargosFuncoes?.categorias?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Cargo" erro={erros.cargo_id}>
              <select
                className={erros.cargo_id ? "func-field-invalid" : ""}
                value={form.cargo_id}
                onChange={(e) => atualizar("cargo_id", e.target.value)}
              >
                <option value="">Selecione</option>
                {cargosFiltrados.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Função">
              <select
                value={form.funcao_id}
                onChange={(e) => atualizar("funcao_id", e.target.value)}
              >
                <option value="">Selecione</option>
                {funcoesFiltradas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Situação">
              <select
                value={form.situacao}
                onChange={(e) => atualizar("situacao", e.target.value)}
              >
                {opcoes?.status?.situacoes?.map((s) => (
                  <option key={s.codigo} value={s.codigo}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Data de admissão">
              <input
                type="date"
                value={form.data_admissao}
                onChange={(e) => atualizar("data_admissao", e.target.value)}
              />
            </Field>

            <Field label="Foto URL" span>
              <input
                value={form.foto_url}
                onChange={(e) => atualizar("foto_url", e.target.value)}
                placeholder="URL da foto, quando houver"
              />
            </Field>

            <Field label="Observações" span>
              <textarea
                value={form.observacoes}
                onChange={(e) => atualizar("observacoes", e.target.value)}
                placeholder="Observações internas"
                rows={4}
              />
            </Field>
          </div>
        </div>

        <div className="funcionarios-modal-footer">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={salvando}>
            Cancelar
          </button>

          <button type="button" className="btn-primary" onClick={salvar} disabled={salvando}>
            {salvando ? (
              "Salvando..."
            ) : (
              <>
                {editando ? <Save size={17} /> : <UserPlus size={17} />}
                {editando ? "Salvar alterações" : "Cadastrar funcionário"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, erro, children, span = false }) {
  return (
    <label className={span ? "func-form-field span-2" : "func-form-field"}>
      <span>{label}</span>
      {children}
      {erro ? <small className="func-field-message">{erro}</small> : null}
    </label>
  );
}