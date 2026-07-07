// src/components/admin/fornecedores/FornecedorCategoriaSelector.jsx

import { Tags, X } from "lucide-react";

export default function FornecedorCategoriaSelector({
  categorias = [],
  categoriaIds = [],
  categoriaPrincipalId = "",

  errorCategoria = "",
  errorCategoriaPrincipal = "",

  onChangeCategoriaIds,
  onChangeCategoriaPrincipal,
}) {
  function adicionarCategoria(categoriaId) {
    if (!categoriaId) return;

    const novaLista = categoriaIds.includes(categoriaId)
      ? categoriaIds
      : [...categoriaIds, categoriaId];

    onChangeCategoriaIds?.(novaLista);

    if (!categoriaPrincipalId) {
      onChangeCategoriaPrincipal?.(categoriaId);
    }
  }

  function removerCategoria(categoriaId) {
    const novaLista = categoriaIds.filter((id) => id !== categoriaId);

    onChangeCategoriaIds?.(novaLista);

    if (categoriaPrincipalId === categoriaId) {
      onChangeCategoriaPrincipal?.(novaLista[0] || "");
    }
  }

  return (
    <div className="fornecedor-categoria-selector">
      <label>
        <span className="label-with-icon">
          <Tags size={15} />
          Categorias
        </span>

        <select
          className={`input-premium ${errorCategoria ? "input-error" : ""}`}
          value=""
          onChange={(event) => adicionarCategoria(event.target.value)}
          aria-label="Adicionar categoria do fornecedor"
          aria-invalid={Boolean(errorCategoria)}
        >
          <option value="">Adicionar categoria</option>

          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nome}
            </option>
          ))}
        </select>

        {errorCategoria && (
          <small className="field-error-message">{errorCategoria}</small>
        )}
      </label>

      {categoriaIds.length > 0 && (
        <div className="selected-tags" aria-label="Categorias selecionadas">
          {categoriaIds.map((categoriaId) => {
            const categoria = categorias.find((item) => item.id === categoriaId);

            return (
              <button
                type="button"
                key={categoriaId}
                onClick={() => removerCategoria(categoriaId)}
                aria-label={`Remover categoria ${categoria?.nome || ""}`}
              >
                {categoria?.nome || "Categoria"}
                <X size={12} />
              </button>
            );
          })}
        </div>
      )}

      <label>
        Categoria principal

        <select
          className={`input-premium ${
            errorCategoriaPrincipal ? "input-error" : ""
          }`}
          value={categoriaPrincipalId}
          onChange={(event) => onChangeCategoriaPrincipal?.(event.target.value)}
          disabled={categoriaIds.length === 0}
          aria-label="Selecionar categoria principal"
          aria-invalid={Boolean(errorCategoriaPrincipal)}
        >
          <option value="">Selecione</option>

          {categoriaIds.map((categoriaId) => {
            const categoria = categorias.find((item) => item.id === categoriaId);

            return (
              <option key={categoriaId} value={categoriaId}>
                {categoria?.nome || "Categoria"}
              </option>
            );
          })}
        </select>

        {errorCategoriaPrincipal && (
          <small className="field-error-message">
            {errorCategoriaPrincipal}
          </small>
        )}
      </label>
    </div>
  );
}