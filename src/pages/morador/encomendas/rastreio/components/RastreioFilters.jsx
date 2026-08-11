import { Search, SlidersHorizontal } from "lucide-react";

export default function RastreioFilters({
  searchTerm,
  onSearchChange,
}) {
  return (
    <div className="rastreio-filters">
      <label className="rastreio-search">
        <Search
          className="rastreio-search__icon"
          size={18}
          aria-hidden="true"
        />

        <span className="sr-only">
          Pesquisar rastreios
        </span>

        <input
          type="search"
          value={searchTerm}
          onChange={(event) =>
            onSearchChange(event.target.value)
          }
          placeholder="Pesquisar rastreio ou compra"
          autoComplete="off"
        />
      </label>

      <button
        type="button"
        className="rastreio-filter-button"
        aria-label="Abrir filtros de rastreio"
        disabled
      >
        <SlidersHorizontal size={18} aria-hidden="true" />
        <span>Filtros</span>
      </button>
    </div>
  );
}