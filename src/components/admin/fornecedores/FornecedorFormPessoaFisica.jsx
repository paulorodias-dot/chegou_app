// src/components/admin/fornecedores/FornecedorFormPessoaFisica.jsx

import { FileText, Mail, MapPin, Phone, User } from "lucide-react";

export default function FornecedorFormPessoaFisica({
  form,
  onChange,
  fieldErrors = {},
}) {
  return (
    <section className="form-section">
      <div className="form-section-title">
        <User size={18} />
        <h3>Dados da Pessoa Física</h3>
      </div>

      <div className="form-grid two">
        <label>
          Nome completo
          <input
            className={`input-premium ${
              fieldErrors.nome_completo ? "input-error" : ""
            }`}
            value={form.nome_completo}
            onChange={(event) => onChange("nome_completo", event.target.value)}
            placeholder="Nome completo do prestador"
          />

          {fieldErrors.nome_completo && (
            <small className="field-error-message">
              {fieldErrors.nome_completo}
            </small>
          )}
        </label>

        <label>
          Situação cadastral
          <input
            className="input-premium"
            value={form.situacao_receita}
            onChange={(event) =>
              onChange("situacao_receita", event.target.value)
            }
            placeholder="Quando disponível"
          />
        </label>
      </div>

      <div className="form-subtitle">
        <MapPin size={16} />
        <span>Endereço do prestador</span>
      </div>

      <div className="form-grid two">
        <label>
          CEP
          <input
            className="input-premium"
            value={form.cep}
            onChange={(event) => onChange("cep", event.target.value)}
            placeholder="00000-000"
          />
        </label>

        <label>
          Logradouro
          <input
            className="input-premium"
            value={form.logradouro}
            onChange={(event) => onChange("logradouro", event.target.value)}
            placeholder="Rua, avenida, praça..."
          />
        </label>

        <label>
          Número
          <input
            className="input-premium"
            value={form.numero}
            onChange={(event) => onChange("numero", event.target.value)}
            placeholder="Número"
          />
        </label>

        <label>
          Complemento
          <input
            className="input-premium"
            value={form.complemento}
            onChange={(event) => onChange("complemento", event.target.value)}
            placeholder="Bloco, casa, apto..."
          />
        </label>

        <label>
          Bairro
          <input
            className="input-premium"
            value={form.bairro}
            onChange={(event) => onChange("bairro", event.target.value)}
            placeholder="Bairro"
          />
        </label>

        <label>
          Cidade
          <input
            className="input-premium"
            value={form.cidade}
            onChange={(event) => onChange("cidade", event.target.value)}
            placeholder="Cidade"
          />
        </label>

        <label>
          Estado / UF
          <input
            className="input-premium"
            value={form.estado}
            onChange={(event) =>
              onChange("estado", event.target.value.toUpperCase())
            }
            placeholder="SP"
            maxLength={2}
          />
        </label>
      </div>

      <div className="form-subtitle">
        <Phone size={16} />
        <span>Contato do prestador</span>
      </div>

      <div className="form-grid two">
        <label>
          <span className="label-with-icon">
            <Phone size={15} />
            Telefone
          </span>

          <input
            className="input-premium"
            value={form.telefone_local}
            onChange={(event) => onChange("telefone_local", event.target.value)}
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
            value={form.whatsapp_local}
            onChange={(event) => onChange("whatsapp_local", event.target.value)}
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
            value={form.email_local}
            onChange={(event) => onChange("email_local", event.target.value)}
            placeholder="email@exemplo.com"
          />
        </label>
      </div>

      <div className="form-subtitle">
        <FileText size={16} />
        <span>Observações cadastrais</span>
      </div>

      <label>
        Observações
        <textarea
          className="input-premium"
          value={form.observacoes}
          onChange={(event) => onChange("observacoes", event.target.value)}
          placeholder="Observações sobre o prestador pessoa física"
          rows={3}
        />
      </label>
    </section>
  );
}