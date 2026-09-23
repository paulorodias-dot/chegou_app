import {
  Grid2X2,
  List,
} from "lucide-react";

import {
  MORADOR_RETIRADAS_ORDER,
  MORADOR_RETIRADAS_SCOPE,
  MORADOR_RETIRADAS_VIEW,
} from "../config/moradorRetiradas.constants";

import "./MoradorRetiradasToolbar.css";

const ABAS = [
  { id: MORADOR_RETIRADAS_SCOPE.ACTIVE, label: "Para retirar" },
  { id: MORADOR_RETIRADAS_SCOPE.HISTORY, label: "Retiradas" },
  { id: MORADOR_RETIRADAS_SCOPE.ALL, label: "Todas" },
];

export default function MoradorRetiradasToolbar({
  escopo,
  ordem,
  visualizacao,
  total,
  onChangeScope,
  onChangeOrder,
  onChangeView,
}) {
  return (
    <section
      className="morador-retiradas-toolbar"
      aria-label="Filtros da lista de encomendas"
    >
      <div className="morador-retiradas-toolbar__tabs" role="tablist">
        {ABAS.map((aba) => (
          <button
            key={aba.id}
            type="button"
            role="tab"
            aria-selected={escopo === aba.id}
            className={escopo === aba.id ? "is-active" : undefined}
            onClick={() => onChangeScope(aba.id)}
          >
            {aba.label}
          </button>
        ))}
      </div>

      <div className="morador-retiradas-toolbar__controls">
        <span className="morador-retiradas-toolbar__total">
          {total} {total === 1 ? "encomenda" : "encomendas"}
        </span>

        <label className="morador-retiradas-toolbar__order">
          <span className="sr-only">Ordenar encomendas</span>
          <select
            value={ordem}
            onChange={(event) => onChangeOrder(event.target.value)}
          >
            <option value={MORADOR_RETIRADAS_ORDER.OLDEST}>
              Mais antigas primeiro
            </option>
            <option value={MORADOR_RETIRADAS_ORDER.NEWEST}>
              Mais recentes primeiro
            </option>
          </select>
        </label>

        <div
          className="morador-retiradas-toolbar__view"
          aria-label="Modo de visualização"
        >
          <button
            type="button"
            aria-label="Visualizar em mini cards"
            aria-pressed={visualizacao === MORADOR_RETIRADAS_VIEW.CARDS}
            className={
              visualizacao === MORADOR_RETIRADAS_VIEW.CARDS
                ? "is-active"
                : undefined
            }
            onClick={() => onChangeView(MORADOR_RETIRADAS_VIEW.CARDS)}
          >
            <Grid2X2 size={17} />
          </button>

          <button
            type="button"
            aria-label="Visualizar em lista"
            aria-pressed={visualizacao === MORADOR_RETIRADAS_VIEW.LIST}
            className={
              visualizacao === MORADOR_RETIRADAS_VIEW.LIST
                ? "is-active"
                : undefined
            }
            onClick={() => onChangeView(MORADOR_RETIRADAS_VIEW.LIST)}
          >
            <List size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}