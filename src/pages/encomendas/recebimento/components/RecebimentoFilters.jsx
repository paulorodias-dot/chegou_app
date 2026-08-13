import {
  CalendarDays,
  Filter,
  Printer,
  Search,
  Truck,
  X,
} from "lucide-react";


// ============================================================
// SISTEMA CHEGOU!
// RECEBIMENTO — FILTROS
//
// Regras:
// - sem pesquisa a cada tecla;
// - Enter no PC;
// - Ir/Search no teclado mobile;
// - sem histórico/autocomplete;
// - transportadoras somente da fila/período;
// - nomes digitados em "Outras" preservados;
// - Todos como período padrão;
// - máximo operacional de 7 dias quando restringido.
// ============================================================


export default function RecebimentoFilters({
  busca = "",
  situacao = "",

  transportadoraFiltroKey = "",

  periodo = "TODOS",

  transportadoras = [],

  onChangeBusca,
  onChangeSituacao,
  onChangeTransportadora,
  onChangePeriodo,

  onPesquisar,
  onLimpar,

  onImprimir,

  imprimirDisabled = false,

  loading = false,
}) {
  const possuiFiltros =
    Boolean(
      busca ||
      situacao ||
      transportadoraFiltroKey ||
      (
        periodo &&
        periodo !== "TODOS"
      )
    );


  function handleSubmit(
    event
  ) {
    event.preventDefault();

    onPesquisar?.();
  }


  return (
    <form
      className="recebimento-filters"
      onSubmit={
        handleSubmit
      }
      autoComplete="off"
    >
      <div className="recebimento-filters__search-row">
        <label className="recebimento-filter-search">
          <Search
            size={17}
            strokeWidth={2}
            aria-hidden="true"
          />

          <input
            type="search"
            name="recebimento-search"
            value={
              busca
            }
            onChange={(event) =>
              onChangeBusca?.(
                event.target.value
              )
            }
            placeholder="Pesquisar lote, entregador ou rastreio"
            aria-label="Pesquisar recebimentos"

            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}

            enterKeyHint="search"

            disabled={
              loading
            }
          />
        </label>


        {/*
         * Não exibimos botão visual de Search.
         *
         * Desktop:
         * Enter.
         *
         * Mobile:
         * tecla Search / Ir.
         */}


        <button
          type="button"
          className="
            recebimento-print-button
            recebimento-print-button--mobile
          "
          onClick={
            onImprimir
          }
          disabled={
            imprimirDisabled
          }
          aria-label="Imprimir recebimentos"
          title="Imprimir recebimentos"
        >
          <Printer
            size={18}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>
      </div>


      <div className="recebimento-filters__controls">
        <label className="recebimento-filter-select">
          <Filter
            size={16}
            strokeWidth={2}
            aria-hidden="true"
          />

          <select
            aria-label="Filtrar por situação"
            value={
              situacao
            }
            onChange={(event) =>
              onChangeSituacao?.(
                event.target.value
              )
            }
            disabled={
              loading
            }
          >
            <option value="">
              Todas as situações
            </option>

            <option value="AGUARDANDO_ENTRADA">
              Aguardando Entrada
            </option>

            <option value="ENTRADA_PARCIAL">
              Entrada parcial
            </option>

            <option value="COM_DIVERGENCIA">
              Com divergência
            </option>

            <option value="COM_AVARIA">
              Com avaria
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
            value={
              transportadoraFiltroKey
            }
            onChange={(event) =>
              onChangeTransportadora?.(
                event.target.value
              )
            }
            disabled={
              loading
            }
          >
            <option value="">
              Todas as transportadoras
            </option>


            {transportadoras.map(
              (transportadora) => (
                <option
                  key={
                    transportadora.filtroKey
                  }
                  value={
                    transportadora.filtroKey
                  }
                >
                  {transportadora.nome}
                </option>
              )
            )}
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
            value={
              periodo
            }
            onChange={(event) =>
              onChangePeriodo?.(
                event.target.value
              )
            }
            disabled={
              loading
            }
          >
            <option value="TODOS">
              Todos
            </option>

            <option value="HOJE">
              Hoje
            </option>

            <option value="ONTEM">
              Ontem
            </option>

            <option value="ULTIMOS_3_DIAS">
              Últimos 3 dias
            </option>

            <option value="ULTIMOS_7_DIAS">
              Últimos 7 dias
            </option>
          </select>
        </label>


        {possuiFiltros && (
          <button
            type="button"
            className="recebimento-filters__clear"
            onClick={
              onLimpar
            }
            disabled={
              loading
            }
          >
            <X
              size={14}
              strokeWidth={2}
              aria-hidden="true"
            />

            Limpar
          </button>
        )}
      </div>
    </form>
  );
}