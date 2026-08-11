import {
  CalendarDays,
  Filter,
  Search,
  Truck,
} from "lucide-react";

export default function RecebimentoFilters() {
  return (
    <div className="recebimento-filters">
      <label className="recebimento-filter-search">
        <Search
          size={17}
          strokeWidth={2}
          aria-hidden="true"
        />

        <input
          type="search"
          placeholder="Pesquisar lote, entregador ou rastreio"
          aria-label="Pesquisar recebimentos"
          disabled
        />
      </label>

      <div className="recebimento-filters__controls">
        <label className="recebimento-filter-select">
          <Filter
            size={16}
            strokeWidth={2}
            aria-hidden="true"
          />

          <select
            aria-label="Filtrar por situação"
            disabled
            defaultValue=""
          >
            <option value="">
              Situação
            </option>
          </select>
        </label>

        <label className="recebimento-filter-select">
          <Truck
            size={16}
            strokeWidth={2}
            aria-hidden="true"
          />

          <select
            aria-label="Filtrar por transportadora"
            disabled
            defaultValue=""
          >
            <option value="">
              Transportadora
            </option>
          </select>
        </label>

        <label className="recebimento-filter-select">
          <CalendarDays
            size={16}
            strokeWidth={2}
            aria-hidden="true"
          />

          <select
            aria-label="Filtrar por período"
            disabled
            defaultValue=""
          >
            <option value="">
              Período
            </option>
          </select>
        </label>
      </div>
    </div>
  );
}