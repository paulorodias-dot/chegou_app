import { useMemo, useState } from "react";

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Inbox,
} from "lucide-react";

import RecebimentoStatusDot from "./RecebimentoStatusDot";

const PAGE_SIZE_OPTIONS = [7, 15, 20];

function getStatusTone(status) {
  switch (status) {
    case "divergencia":
      return "danger";

    case "avaria":
      return "warning";

    case "sincronizando":
      return "info";

    case "processado":
      return "success";

    default:
      return "neutral";
  }
}

export default function RecebimentoTable({
  recebimentos = [],
  onVisualizar,
}) {
  const [pageSize, setPageSize] = useState(7);
  const [currentPage, setCurrentPage] = useState(1);

  const totalRegistros = recebimentos.length;

  const totalPages = Math.max(
    1,
    Math.ceil(totalRegistros / pageSize)
  );

  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  );

  const registrosPagina = useMemo(() => {
    const inicio =
      (safeCurrentPage - 1) * pageSize;

    return recebimentos.slice(
      inicio,
      inicio + pageSize
    );
  }, [
    recebimentos,
    pageSize,
    safeCurrentPage,
  ]);

  function handlePageSizeChange(event) {
    setPageSize(Number(event.target.value));
    setCurrentPage(1);
  }

  function handlePreviousPage() {
    setCurrentPage((page) =>
      Math.max(1, page - 1)
    );
  }

  function handleNextPage() {
    setCurrentPage((page) =>
      Math.min(totalPages, page + 1)
    );
  }

  if (totalRegistros === 0) {
    return (
      <div className="recebimento-table-card">
        <div className="recebimento-table-empty">
          <div className="recebimento-table-empty__icon">
            <Inbox
              size={24}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </div>

          <p className="recebimento-table-empty__title">
            Nenhum pré-recebimento disponível.
          </p>

          <p className="recebimento-table-empty__description">
            Os lotes finalizados pelo fluxo de recebimento
            aparecerão aqui quando a integração oficial
            estiver disponível.
          </p>
        </div>

        <TableFooter
          pageSize={pageSize}
          currentPage={1}
          totalPages={1}
          totalRegistros={0}
          onPageSizeChange={handlePageSizeChange}
          onPrevious={handlePreviousPage}
          onNext={handleNextPage}
        />
      </div>
    );
  }

  return (
    <div className="recebimento-table-card">
      <div className="recebimento-table-scroll">
        <table className="recebimento-table">
          <thead>
            <tr>
              <th>Nº Lote</th>
              <th>Entrega</th>
              <th>Volumes</th>
              <th>Ocorrências</th>
              <th>Situação</th>
              <th className="recebimento-table__actions-heading">
                Ações
              </th>
            </tr>
          </thead>

          <tbody>
            {registrosPagina.map(
              (recebimento) => {
                const tone = getStatusTone(
                  recebimento.status
                );

                return (
                  <tr key={recebimento.id}>
                    <td>
                      <div className="recebimento-lote">
                        <RecebimentoStatusDot
                          tone={tone}
                          label={
                            recebimento.statusLabel ||
                            "Situação"
                          }
                        />

                        <strong>
                          {recebimento.numeroLote ||
                            "—"}
                        </strong>
                      </div>
                    </td>

                    <td>
                      <div className="recebimento-entrega-cell">
                        <strong>
                          {recebimento.transportadora ||
                            "—"}
                        </strong>

                        <span>
                          {recebimento.entregador ||
                            "—"}
                        </span>

                        <small>
                          {recebimento.dataHora ||
                            "—"}
                        </small>
                      </div>
                    </td>

                    <td>
                      <div className="recebimento-volume-cell">
                        <strong>
                          {recebimento.quantidadeInformada ??
                            "—"}{" "}
                          /{" "}
                          {recebimento.quantidadeCapturada ??
                            "—"}
                        </strong>

                        {recebimento.diferenca ? (
                          <span className="recebimento-volume-cell__difference">
                            {recebimento.diferenca > 0
                              ? "+"
                              : ""}
                            {recebimento.diferenca}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td>
                      {recebimento.ocorrenciaLabel ||
                        "—"}
                    </td>

                    <td>
                      <span
                        className={`recebimento-status-badge recebimento-status-badge--${tone}`}
                      >
                        {recebimento.statusLabel ||
                          "—"}
                      </span>
                    </td>

                    <td className="recebimento-table__actions">
                      <button
                        type="button"
                        className="recebimento-table__view-button"
                        onClick={() =>
                          onVisualizar?.(
                            recebimento
                          )
                        }
                      >
                        <Eye
                          size={16}
                          strokeWidth={2}
                          aria-hidden="true"
                        />

                        Visualizar
                      </button>
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>

      <TableFooter
        pageSize={pageSize}
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        totalRegistros={totalRegistros}
        onPageSizeChange={handlePageSizeChange}
        onPrevious={handlePreviousPage}
        onNext={handleNextPage}
      />
    </div>
  );
}

function TableFooter({
  pageSize,
  currentPage,
  totalPages,
  totalRegistros,
  onPageSizeChange,
  onPrevious,
  onNext,
}) {
  return (
    <footer className="recebimento-table-footer">
      <div className="recebimento-table-footer__size">
        <span>Linhas por página</span>

        <select
          value={pageSize}
          onChange={onPageSizeChange}
          aria-label="Quantidade de linhas por página"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option
              key={size}
              value={size}
            >
              {size}
            </option>
          ))}
        </select>
      </div>

      <div className="recebimento-table-footer__summary">
        {totalRegistros === 0
          ? "Nenhum registro"
          : `${totalRegistros} recebimento${
              totalRegistros === 1
                ? ""
                : "s"
            }`}
      </div>

      <div className="recebimento-table-footer__navigation">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentPage <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft
            size={17}
            aria-hidden="true"
          />
        </button>

        <span>
          Página {currentPage} de {totalPages}
        </span>

        <button
          type="button"
          onClick={onNext}
          disabled={
            currentPage >= totalPages
          }
          aria-label="Próxima página"
        >
          <ChevronRight
            size={17}
            aria-hidden="true"
          />
        </button>
      </div>
    </footer>
  );
}