// src/components/admin/fornecedores/FornecedorDrawer.jsx

import { useEffect } from "react";
import {
  Building2,
  CalendarClock,
  FileText,
  History,
  Mail,
  MapPin,
  Phone,
  Tag,
  User,
  X,
} from "lucide-react";

import {
  formatDocumentForTable,
  formatSituacao,
  getDisplayName,
} from "./fornecedor-utils";

export default function FornecedorDrawer({
  open = false,
  fornecedor = null,
  situacoes = [],
  onClose,
}) {
  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !fornecedor) return null;

  const enderecoCompleto =
    [
      fornecedor.logradouro,
      fornecedor.numero,
      fornecedor.complemento,
      fornecedor.bairro,
      fornecedor.cidade,
      fornecedor.estado,
      fornecedor.cep,
    ]
      .filter(Boolean)
      .join(", ") || "-";

  const totalUso = Number(fornecedor.total_condominios_utilizando || 0);

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <section
        className="drawer-premium"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes do fornecedor"
      >
        <header className="drawer-header">
          <div>
            <span>Fornecedor</span>
            <h2>{getDisplayName(fornecedor)}</h2>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar drawer">
            <X size={18} />
          </button>
        </header>

        <div className="drawer-content">
          <section className="drawer-section">
            <div className="drawer-section-title">
              <Building2 size={17} />
              <h3>Resumo</h3>
            </div>

            <div className="drawer-grid">
              <div>
                <span>Situação</span>
                <strong>{formatSituacao(fornecedor.situacao, situacoes)}</strong>
              </div>

              <div>
                <span>Categoria principal</span>
                <strong>{fornecedor.categoria_principal || "-"}</strong>
              </div>

              <div>
                <span>Uso no sistema</span>
                <strong>
                  {totalUso > 1
                    ? `${totalUso} condomínios`
                    : "Somente este condomínio"}
                </strong>
              </div>
            </div>
          </section>

          <section className="drawer-section">
            <div className="drawer-section-title">
              <FileText size={17} />
              <h3>Dados da Entidade</h3>
            </div>

            <p>
              <strong>Documento:</strong>{" "}
              {formatDocumentForTable(
                fornecedor.tipo_documento,
                fornecedor.documento
              )}
            </p>

            <p>
              <strong>Razão Social:</strong> {fornecedor.razao_social || "-"}
            </p>

            <p>
              <strong>Nome Fantasia:</strong> {fornecedor.nome_fantasia || "-"}
            </p>

            <p>
              <strong>Nome completo:</strong> {fornecedor.nome_completo || "-"}
            </p>

            <p>
              <strong>Situação Receita:</strong>{" "}
              {fornecedor.situacao_receita || "-"}
            </p>

            <p className="drawer-icon-line">
              <MapPin size={15} />
              <span>{enderecoCompleto}</span>
            </p>
          </section>

          <section className="drawer-section">
            <div className="drawer-section-title">
              <User size={17} />
              <h3>Dados Locais do Condomínio</h3>
            </div>

            <p>
              <strong>Responsável:</strong>{" "}
              {fornecedor.responsavel_nome || "-"}
            </p>

            <p className="drawer-icon-line">
              <Phone size={15} />
              <span>
                {fornecedor.responsavel_telefone ||
                  fornecedor.telefone_local ||
                  "-"}
              </span>
            </p>

            <p className="drawer-icon-line">
              <Phone size={15} />
              <span>
                {fornecedor.responsavel_whatsapp ||
                  fornecedor.whatsapp_local ||
                  "-"}
              </span>
            </p>

            <p className="drawer-icon-line">
              <Mail size={15} />
              <span>
                {fornecedor.responsavel_email || fornecedor.email_local || "-"}
              </span>
            </p>
          </section>

          <section className="drawer-section">
            <div className="drawer-section-title">
              <Tag size={17} />
              <h3>Categorias</h3>
            </div>

            <p>
              <strong>Principal:</strong> {fornecedor.categoria_principal || "-"}
            </p>

            <p>
              <strong>Total:</strong> {fornecedor.total_categorias || 0}
            </p>
          </section>

          <section className="drawer-section">
            <div className="drawer-section-title">
              <CalendarClock size={17} />
              <h3>Últimos atendimentos / serviços</h3>
            </div>

            <p className="drawer-muted">
              Nenhum atendimento vinculado nesta versão. Esta seção será
              alimentada pelas futuras telas de serviços realizados e ordens de
              serviço.
            </p>
          </section>

          <section className="drawer-section">
            <div className="drawer-section-title">
              <History size={17} />
              <h3>Histórico e logs</h3>
            </div>

            <p className="drawer-muted">
              Histórico resumido será integrado com auditorias_fornecedores na
              próxima etapa.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}