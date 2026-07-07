// src/components/admin/fornecedores/FornecedorFiltros.jsx

import { Filter, Search } from "lucide-react";

export default function FornecedorFiltros({
  pesquisa,
  onPesquisaChange,
  categoriaFiltro,
  onCategoriaChange,
  situacaoFiltro,
  onSituacaoChange,
  categorias = [],
  situacoes = [],
}) {
  return (
    <>
      <section className="cad-fornecedores-toolbar">
        <div className="input-icon-wrapper">
          <Search size={16} />
          <input
            className="input-premium cad-fornecedores-search"
            placeholder="Pesquisar fornecedor, CPF/CNPJ, responsável..."
            value={pesquisa}
            onChange={(event) => onPesquisaChange?.(event.target.value)}
          />
        </div>

        <div className="input-icon-wrapper select-wrapper">
          <Filter size={16} />
          <select
            className="input-premium"
            value={categoriaFiltro}
            onChange={(event) => onCategoriaChange?.(event.target.value)}
            aria-label="Filtrar por categoria"
          >
            <option value="TODAS">Todas as categorias</option>

            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.codigo}>
                {categoria.nome}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="cad-fornecedores-filtros" aria-label="Filtros rápidos">
        <button
          type="button"
          className={situacaoFiltro === "TODOS" ? "chip-premium active" : "chip-premium"}
          onClick={() => onSituacaoChange?.("TODOS")}
        >
          Todos
        </button>

        {situacoes.map((situacao) => (
          <button
            key={situacao.id}
            type="button"
            className={
              situacaoFiltro === situacao.codigo ? "chip-premium active" : "chip-premium"
            }
            onClick={() => onSituacaoChange?.(situacao.codigo)}
          >
            {situacao.nome}
          </button>
        ))}
      </section>
    </>
  );
}