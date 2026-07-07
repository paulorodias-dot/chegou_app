// src/components/admin/fornecedores/FornecedorHeader.jsx

import { Building2, Plus, ShieldCheck } from "lucide-react";

export default function FornecedorHeader({ onNovoFornecedor }) {
  return (
    <section className="cad-fornecedores-header">
      <div className="cad-fornecedores-header-content">
        <div className="cad-fornecedores-title-row">
          <span className="cad-fornecedores-title-icon">
            <Building2 size={19} />
          </span>

          <div>
            <p className="cad-fornecedores-eyebrow">Cadastro</p>
            <h1>Fornecedores</h1>
          </div>
        </div>

        <p>
          Gerencie fornecedores, prestadores e empresas de insumos vinculados ao
          condomínio.
        </p>

        <div className="cad-fornecedores-header-badges">
          <span>
            <ShieldCheck size={13} />
            Base Central CPF/CNPJ
          </span>

          <span>
            <ShieldCheck size={13} />
            Auditoria ativa
          </span>
        </div>
      </div>

      <button
        type="button"
        className="btn-premium-primary btn-novo-fornecedor"
        onClick={onNovoFornecedor}
      >
        <Plus size={15} />
        Novo Fornecedor
      </button>
    </section>
  );
}