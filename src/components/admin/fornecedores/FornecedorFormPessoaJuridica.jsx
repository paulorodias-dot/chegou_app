// src/components/admin/fornecedores/FornecedorFormPessoaJuridica.jsx

import {
  Building2,
  FileText,
  Globe2,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

export default function FornecedorFormPessoaJuridica({
  form,
  onChange,
  fieldErrors = {},
}) {
  return (
    <section className="form-section">
      <div className="form-section-title">
        <Building2 size={18} />
        <h3>Dados da Pessoa Jurídica</h3>
      </div>

      <div className="form-grid two">
        <label>
          Razão Social
          <input
            className={`input-premium ${
              fieldErrors.razao_social ? "input-error" : ""
            }`}
            value={form.razao_social}
            onChange={(event) => onChange("razao_social", event.target.value)}
            placeholder="Razão social da empresa"
          />
          {fieldErrors.razao_social && (
            <small className="field-error-message">
              {fieldErrors.razao_social}
            </small>
          )}
        </label>

        <label>
          Nome Fantasia
          <input
            className="input-premium"
            value={form.nome_fantasia}
            onChange={(event) => onChange("nome_fantasia", event.target.value)}
            placeholder="Nome fantasia"
          />
        </label>

        <label>
          Situação Receita
          <input
            className="input-premium"
            value={form.situacao_receita}
            onChange={(event) =>
              onChange("situacao_receita", event.target.value)
            }
            placeholder="ATIVA, BAIXADA, SUSPENSA..."
          />
        </label>

        <label>
          Natureza Jurídica
          <input
            className="input-premium"
            value={form.natureza_juridica}
            onChange={(event) =>
              onChange("natureza_juridica", event.target.value)
            }
            placeholder="Natureza jurídica"
          />
        </label>

        <label>
          Porte
          <input
            className="input-premium"
            value={form.porte}
            onChange={(event) => onChange("porte", event.target.value)}
            placeholder="MEI, ME, EPP..."
          />
        </label>

        <label>
          CNAE Principal
          <input
            className="input-premium"
            value={form.cnae_principal}
            onChange={(event) =>
              onChange("cnae_principal", event.target.value)
            }
            placeholder="CNAE principal"
          />
        </label>
      </div>

      <div className="form-subtitle">
        <MapPin size={16} />
        <span>Endereço cadastral</span>
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
            placeholder="Bloco, sala, conjunto..."
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
        <FileText size={16} />
        <span>Dados fiscais complementares</span>
      </div>

      <div className="form-grid two">
        <label>
          Inscrição Estadual
          <input
            className="input-premium"
            value={form.inscricao_estadual}
            onChange={(event) =>
              onChange("inscricao_estadual", event.target.value)
            }
            placeholder="Inscrição Estadual"
          />
        </label>

        <label>
          Inscrição Municipal
          <input
            className="input-premium"
            value={form.inscricao_municipal}
            onChange={(event) =>
              onChange("inscricao_municipal", event.target.value)
            }
            placeholder="Inscrição Municipal"
          />
        </label>
      </div>

      <div className="form-subtitle">
        <Phone size={16} />
        <span>Contatos vindos da Receita</span>
      </div>

      <div className="form-grid two">
        <label>
          Telefone Receita
          <input
            className="input-premium"
            value={form.telefone_receita}
            onChange={(event) =>
              onChange("telefone_receita", event.target.value)
            }
            placeholder="Telefone cadastral"
          />
        </label>

        <label>
          <span className="label-with-icon">
            <Mail size={15} />
            E-mail Receita
          </span>

          <input
            className="input-premium"
            value={form.email_receita}
            onChange={(event) => onChange("email_receita", event.target.value)}
            placeholder="email@empresa.com.br"
          />
        </label>

        <label>
          <span className="label-with-icon">
            <Globe2 size={15} />
            Site
          </span>

          <input
            className="input-premium"
            value={form.site_local}
            onChange={(event) => onChange("site_local", event.target.value)}
            placeholder="https://"
          />
        </label>
      </div>
    </section>
  );
}