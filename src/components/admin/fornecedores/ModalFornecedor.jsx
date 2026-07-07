// src/components/admin/fornecedores/ModalFornecedor.jsx

import { useEffect, useRef } from "react";
import {
  BadgeCheck,
  CircleAlert,
  ClipboardCheck,
  FileSearch,
  Mail,
  Phone,
  Save,
  Search,
  ShieldCheck,
  Tags,
  User,
  X,
} from "lucide-react";

import FornecedorCategoriaSelector from "./FornecedorCategoriaSelector";
import FornecedorFormPessoaFisica from "./FornecedorFormPessoaFisica";
import FornecedorFormPessoaJuridica from "./FornecedorFormPessoaJuridica";
import {
  isValidCNPJBasic,
  isValidCPF,
  maskDocument,
  onlyDigits,
} from "./fornecedor-utils";

export default function ModalFornecedor({
  open = false,
  mode = "novo",
  form,
  formError = "",
  consultaInfo = "",
  saving = false,
  categorias = [],
  situacoes = [],
  focusSignal = 0,
  fieldErrors = {},
  onClose,
  onChange,
  onSetForm,
  onConsultarDocumento,
  onSalvar,
}) {
  const documentoRef = useRef(null);

  const documento = onlyDigits(form?.documento || "");
  const isCpf = form?.tipo_documento === "CPF";
  const documentoValido = isCpf
    ? isValidCPF(documento)
    : isValidCNPJBasic(documento);

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      documentoRef.current?.focus();
      documentoRef.current?.select();
    }, 120);

    return () => clearTimeout(timer);
  }, [open, focusSignal]);

  if (!open) return null;

  function handleDocumentoChange(value) {
    onChange("documento", maskDocument(form.tipo_documento, value));
  }

  function handleTipoDocumentoChange(value) {
    onSetForm((prev) => ({
      ...prev,
      tipo_documento: value,
      documento: "",
      razao_social: "",
      nome_fantasia: "",
      nome_completo: "",
      situacao_receita: "",
      natureza_juridica: "",
      porte: "",
      cnae_principal: "",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      telefone_receita: "",
      email_receita: "",
      dados_receita: {},
    }));
  }

  function getDocumentoHint() {
    if (!documento) {
      return isCpf
        ? "Informe o CPF do prestador pessoa física."
        : "Informe o CNPJ da empresa fornecedora.";
    }

    if (documentoValido) {
      return isCpf
        ? "CPF válido. Você pode continuar o cadastro."
        : "CNPJ válido. Consulte para preencher os dados automaticamente.";
    }

    return isCpf
      ? "CPF incompleto ou inválido."
      : "CNPJ incompleto. Informe os 14 números.";
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      onClose?.();
      return;
    }

    if (event.ctrlKey && event.key === "Enter") {
      onSalvar?.();
      return;
    }

    if (
      event.key === "Enter" &&
      document.activeElement === documentoRef.current &&
      documentoValido
    ) {
      event.preventDefault();
      onConsultarDocumento?.();
    }
  }

  const footerMessage = formError || consultaInfo;
  const footerMessageClass = formError ? "error" : "info";

  return (
    <div className="modal-overlay">
      <section
        className="modal-premium modal-fornecedor"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-fornecedor-title"
      >
        <header className="modal-header">
          <div>
            <span>{mode === "novo" ? "Novo cadastro" : "Editar cadastro"}</span>
            <h2 id="modal-fornecedor-title">Fornecedor</h2>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar modal">
            <X size={18} />
          </button>
        </header>

        <div className="modal-content modal-content-fornecedor">
          {formError && (
            <div className="form-alert error">
              <CircleAlert size={16} />
              <span>{formError}</span>
            </div>
          )}

          {consultaInfo && (
            <div className="form-alert info">
              <ShieldCheck size={16} />
              <span>{consultaInfo}</span>
            </div>
          )}

          <section className="modal-step-card destaque">
            <div className="modal-step-header">
              <div>
                <span className="step-number">1</span>
                <div>
                  <h3>Identificação</h3>
                  <p>Informe CPF ou CNPJ para consultar a Base Central.</p>
                </div>
              </div>

              {documentoValido && (
                <span className="step-status ok">
                  <BadgeCheck size={14} />
                  Documento válido
                </span>
              )}
            </div>

            <div className="form-grid two">
              <label>
                Tipo de documento
                <select
                  className="input-premium"
                  value={form.tipo_documento}
                  onChange={(event) =>
                    handleTipoDocumentoChange(event.target.value)
                  }
                >
                  <option value="CNPJ">CNPJ</option>
                  <option value="CPF">CPF</option>
                </select>
              </label>

              <label>
                {form.tipo_documento}

                <div className="input-action-row">
                  <input
                    ref={documentoRef}
                    className={`input-premium ${
                      fieldErrors.documento ? "input-error" : ""
                    }`}
                    value={form.documento}
                    onChange={(event) => handleDocumentoChange(event.target.value)}
                    placeholder={
                      isCpf ? "000.000.000-00" : "00.000.000/0000-00"
                    }
                  />

                  <button
                    type="button"
                    className="btn-premium-secondary"
                    onClick={onConsultarDocumento}
                    disabled={!documentoValido}
                  >
                    <Search size={16} />
                    Consultar
                  </button>
                </div>

                <small
                  className={documentoValido ? "field-hint success" : "field-hint"}
                >
                  {getDocumentoHint()}
                </small>

                {fieldErrors.documento && (
                  <small className="field-error-message">
                    {fieldErrors.documento}
                  </small>
                )}
              </label>
            </div>
          </section>

          <section className="modal-step-card">
            <div className="modal-step-header">
              <div>
                <span className="step-number">2</span>
                <div>
                  <h3>{isCpf ? "Dados do Prestador" : "Dados da Empresa"}</h3>
                  <p>
                    {isCpf
                      ? "Complete as informações do prestador pessoa física."
                      : "Os dados principais podem ser preenchidos automaticamente pela consulta."}
                  </p>
                </div>
              </div>

              <FileSearch size={18} />
            </div>

            {isCpf ? (
              <FornecedorFormPessoaFisica
                form={form}
                onChange={onChange}
                fieldErrors={fieldErrors}
              />
            ) : (
              <FornecedorFormPessoaJuridica
                form={form}
                onChange={onChange}
                fieldErrors={fieldErrors}
              />
            )}
          </section>

          <section className="modal-step-card">
            <div className="modal-step-header">
              <div>
                <span className="step-number">3</span>
                <div>
                  <h3>Categorias</h3>
                  <p>
                    Defina o tipo de serviço ou fornecimento prestado ao
                    condomínio.
                  </p>
                </div>
              </div>

              <Tags size={18} />
            </div>

            <FornecedorCategoriaSelector
              categorias={categorias}
              categoriaIds={form.categoria_ids}
              categoriaPrincipalId={form.categoria_principal_id}
              errorCategoria={fieldErrors.categoria_ids}
              errorCategoriaPrincipal={fieldErrors.categoria_principal_id}
              onChangeCategoriaIds={(ids) => onChange("categoria_ids", ids)}
              onChangeCategoriaPrincipal={(id) =>
                onChange("categoria_principal_id", id)
              }
            />
          </section>

          <section className="modal-step-card">
            <div className="modal-step-header">
              <div>
                <span className="step-number">4</span>
                <div>
                  <h3>Responsável e Contato Local</h3>
                  <p>Esses dados ficam vinculados apenas ao condomínio atual.</p>
                </div>
              </div>

              <User size={18} />
            </div>

            <div className="form-grid two">
              <label>
                Responsável pelo atendimento

                <input
                  className={`input-premium ${
                    fieldErrors.responsavel_nome ? "input-error" : ""
                  }`}
                  value={form.responsavel_nome}
                  onChange={(event) =>
                    onChange("responsavel_nome", event.target.value)
                  }
                  placeholder="Nome do responsável"
                />

                {fieldErrors.responsavel_nome && (
                  <small className="field-error-message">
                    {fieldErrors.responsavel_nome}
                  </small>
                )}
              </label>

              <label>
                Cargo ou função
                <input
                  className="input-premium"
                  value={form.responsavel_cargo}
                  onChange={(event) =>
                    onChange("responsavel_cargo", event.target.value)
                  }
                  placeholder="Gerente, supervisor, proprietário..."
                />
              </label>

              <label>
                <span className="label-with-icon">
                  <Phone size={15} />
                  Telefone
                </span>

                <input
                  className="input-premium"
                  value={form.responsavel_telefone}
                  onChange={(event) =>
                    onChange("responsavel_telefone", event.target.value)
                  }
                  placeholder="(00) 0000-0000"
                />
              </label>

              <label>
                <span className="label-with-icon">
                  <Phone size={15} />
                  WhatsApp
                </span>

                <input
                  className="input-premium"
                  value={form.responsavel_whatsapp}
                  onChange={(event) =>
                    onChange("responsavel_whatsapp", event.target.value)
                  }
                  placeholder="(00) 00000-0000"
                />
              </label>

              <label>
                <span className="label-with-icon">
                  <Mail size={15} />
                  E-mail
                </span>

                <input
                  className="input-premium"
                  value={form.responsavel_email}
                  onChange={(event) =>
                    onChange("responsavel_email", event.target.value)
                  }
                  placeholder="responsavel@email.com"
                />
              </label>

              <label>
                Situação
                <select
                  className="input-premium"
                  value={form.situacao}
                  onChange={(event) => onChange("situacao", event.target.value)}
                >
                  {situacoes.map((situacao) => (
                    <option key={situacao.id} value={situacao.codigo}>
                      {situacao.nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="observacoes-field">
              Observações internas
              <textarea
                className="input-premium"
                value={form.observacoes}
                onChange={(event) => onChange("observacoes", event.target.value)}
                placeholder="Observações internas do condomínio sobre este fornecedor"
                rows={3}
              />
            </label>
          </section>

          <section className="modal-step-card csic">
            <div className="modal-step-header compact">
              <div>
                <span className="step-number">5</span>
                <div>
                  <h3>Registro seguro</h3>
                  <p>
                    O cadastro será salvo com rastreabilidade, logs e auditoria.
                  </p>
                </div>
              </div>

              <ClipboardCheck size={18} />
            </div>
          </section>
        </div>

        <footer className="modal-footer">
          <div className="modal-footer-message">
            {footerMessage ? (
              <span className={footerMessageClass}>{footerMessage}</span>
            ) : null}
          </div>

          <button
            type="button"
            className="btn-premium-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="btn-premium-primary"
            onClick={onSalvar}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? "Salvando..." : "Salvar Fornecedor"}
          </button>
        </footer>
      </section>
    </div>
  );
}