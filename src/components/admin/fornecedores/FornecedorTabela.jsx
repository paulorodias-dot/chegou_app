// src/components/admin/fornecedores/FornecedorTabela.jsx

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  MoreHorizontal,
  Tag,
  User,
} from "lucide-react";

import {
  formatDocumentForTable,
  formatSituacao,
  getDisplayName,
  PAGE_SIZE_OPTIONS,
} from "./fornecedor-utils";

export default function FornecedorTabela({
  loading = false,
  fornecedores = [],
  situacoes = [],

  page = 1,
  pageSize = 5,
  totalPages = 1,

  onPageChange,
  onPageSizeChange,
  onOpenDrawer,
}) {
  function getUsoSistema(item) {
    const total = Number(item?.total_condominios_utilizando || 0);
    return total > 1 ? `Utilizado por ${total} condomínios` : "Somente este condomínio";
  }

  return (
    <section className="table-premium-card">
      {loading ? (
        <div className="cad-fornecedores-empty">Carregando fornecedores...</div>
      ) : fornecedores.length === 0 ? (
        <div className="cad-fornecedores-empty">Nenhum fornecedor encontrado.</div>
      ) : (
        <div className="table-premium-wrap">
          <table className="table-premium">
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Documento</th>
                <th>Categoria</th>
                <th>Situação</th>
                <th>Contato</th>
                <th>Uso no Sistema</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {fornecedores.map((item) => (
                <tr
                  key={item.fornecedor_condominio_id}
                  onDoubleClick={() => onOpenDrawer?.(item)}
                >
                  <td>
                    <button
                      type="button"
                      className="table-link-button"
                      onClick={() => onOpenDrawer?.(item)}
                    >
                      <strong>{getDisplayName(item)}</strong>
                      <span>{item.razao_social || item.nome_completo || "-"}</span>
                    </button>
                  </td>

                  <td>
                    <div className="doc-cell">
                      <span className="doc-badge">
                        <FileText size={12} />
                        {item.tipo_documento}
                      </span>
                      <span>{formatDocumentForTable(item.tipo_documento, item.documento)}</span>
                    </div>
                  </td>

                  <td>
                    <div className="table-icon-line">
                      <Tag size={14} />
                      <strong>{item.categoria_principal || "-"}</strong>
                    </div>

                    {Number(item.total_categorias) > 1 && (
                      <span className="table-muted">
                        +{Number(item.total_categorias) - 1}
                      </span>
                    )}
                  </td>

                  <td>
                    <span className={`status-pill status-${item.situacao}`}>
                      {formatSituacao(item.situacao, situacoes)}
                    </span>
                  </td>

                  <td>
                    <div className="table-icon-line">
                      <User size={14} />
                      <strong>{item.responsavel_nome || "-"}</strong>
                    </div>
                    <span className="table-muted">
                      {item.responsavel_whatsapp ||
                        item.whatsapp_local ||
                        item.telefone_local ||
                        "-"}
                    </span>
                  </td>

                  <td>{getUsoSistema(item)}</td>

                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="btn-icon-premium"
                        aria-label="Visualizar fornecedor"
                        onClick={() => onOpenDrawer?.(item)}
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        type="button"
                        className="btn-icon-premium"
                        aria-label="Mais ações"
                        onClick={() => onOpenDrawer?.(item)}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className="pagination-premium">
        <div>
          <span>Linhas por página</span>

          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange?.(Number(event.target.value))}
            aria-label="Linhas por página"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="pagination-actions">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange?.(Math.max(1, page - 1))}
          >
            <ChevronLeft size={15} />
            Anterior
          </button>

          <span>
            Página {Math.min(page, totalPages)} de {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
          >
            Próxima
            <ChevronRight size={15} />
          </button>
        </div>
      </footer>
    </section>
  );
}