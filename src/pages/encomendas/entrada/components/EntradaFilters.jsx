import {
  CalendarDays,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Truck,
} from "lucide-react";

import "./EntradaFilters.css";

const SITUACOES = [
  {
    value: "TODOS",
    label: "Todos",
  },
  {
    value: "AGUARDANDO_ENTRADA",
    label: "Aguardando entrada",
  },
  {
    value: "COM_DIVERGENCIA",
    label: "Com divergência",
  },
  {
    value: "COM_AVARIA",
    label: "Com avaria",
  },
  {
    value: "ENTRADA_PARCIAL",
    label: "Entrada parcial",
  },
];

const PERIODOS = [
  {
    value: "TODOS",
    label: "Todos",
  },
  {
    value: "HOJE",
    label: "Hoje",
  },
  {
    value: "ONTEM",
    label: "Ontem",
  },
  {
    value: "3_DIAS",
    label: "Últimos 3 dias",
  },
  {
    value: "7_DIAS",
    label: "Últimos 7 dias",
  },
];

export default function EntradaFilters({
  filters,
  transportadoras = [],
  onChange,
  onReset,
  disabled = false,
}) {
  return (
    <section
      className="entrada-filters"
      aria-labelledby="entrada-filters-title"
    >
      <div className="entrada-filters__heading">
        <div>
          <span>Consulta operacional</span>

          <h2 id="entrada-filters-title">
            Localizar na fila
          </h2>
        </div>

        <SlidersHorizontal
          size={18}
          aria-hidden="true"
        />
      </div>

      <div className="entrada-filters__grid">
        <label className="entrada-filters__field entrada-filters__field--search">
          <span>Buscar</span>

          <div className="entrada-filters__control">
            <Search
              size={17}
              aria-hidden="true"
            />

            <input
              type="search"
              value={filters.search}
              onChange={(event) =>
                onChange(
                  "search",
                  event.target.value
                )
              }
              placeholder="Lote, volume ou código"
              disabled={disabled}
              autoComplete="off"
            />
          </div>
        </label>

        <label className="entrada-filters__field">
          <span>Situação</span>

          <div className="entrada-filters__control">
            <SlidersHorizontal
              size={16}
              aria-hidden="true"
            />

            <select
              value={filters.situation}
              onChange={(event) =>
                onChange(
                  "situation",
                  event.target.value
                )
              }
              disabled={disabled}
            >
              {SITUACOES.map(
                (situacao) => (
                  <option
                    key={situacao.value}
                    value={situacao.value}
                  >
                    {situacao.label}
                  </option>
                )
              )}
            </select>
          </div>
        </label>

        <label className="entrada-filters__field">
          <span>Transportadora</span>

          <div className="entrada-filters__control">
            <Truck
              size={16}
              aria-hidden="true"
            />

            <select
              value={filters.carrier}
              onChange={(event) =>
                onChange(
                  "carrier",
                  event.target.value
                )
              }
              disabled={disabled}
            >
              <option value="TODAS">
                Todas
              </option>

              {transportadoras.map(
                (transportadora) => (
                  <option
                    key={
                      transportadora.key
                    }
                    value={
                      transportadora.key
                    }
                  >
                    {
                      transportadora.nome
                    }
                  </option>
                )
              )}
            </select>
          </div>
        </label>

        <label className="entrada-filters__field">
          <span>Período</span>

          <div className="entrada-filters__control">
            <CalendarDays
              size={16}
              aria-hidden="true"
            />

            <select
              value={filters.period}
              onChange={(event) =>
                onChange(
                  "period",
                  event.target.value
                )
              }
              disabled={disabled}
            >
              {PERIODOS.map(
                (periodo) => (
                  <option
                    key={periodo.value}
                    value={periodo.value}
                  >
                    {periodo.label}
                  </option>
                )
              )}
            </select>
          </div>
        </label>

        <button
          type="button"
          className="entrada-filters__reset"
          onClick={onReset}
          disabled={disabled}
        >
          <RotateCcw size={16} />

          <span>Limpar</span>
        </button>
      </div>
    </section>
  );
}