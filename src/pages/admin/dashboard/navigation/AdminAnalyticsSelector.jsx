import {
  useMemo,
  useState,
} from "react";

import {
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import {
  ADMIN_ANALYTICS_CATALOG,
  getAdminAnalyticsItem,
} from "./adminAnalyticsCatalog";

import {
  splitAdminAnalyticsCatalog,
} from "./adminAnalyticsPriority";

import "./AdminAnalyticsSelector.css";


function AnalyticsButton({
  item,
  selectedAnalysis,
  onSelectAnalysis,
}) {
  const Icon = item.icon;

  const isSelected =
    item.id === selectedAnalysis;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      aria-controls={
        `admin-analysis-panel-${item.id}`
      }
      className={[
        "admin-analytics-selector__item",
        isSelected
          ? "admin-analytics-selector__item--selected"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() =>
        onSelectAnalysis?.(
          item.id
        )
      }
    >
      <span className="admin-analytics-selector__item-icon">
        <Icon
          size={18}
          strokeWidth={2}
          aria-hidden="true"
        />
      </span>

      <span className="admin-analytics-selector__item-content">
        <strong>
          {item.shortLabel}
        </strong>

        {!item.available && (
          <small>
            Em preparação
          </small>
        )}
      </span>
    </button>
  );
}


function AdminAnalyticsSelector({
  selectedAnalysis = "inteligencia",
  onSelectAnalysis,

  /*
   * =======================================================
   * FUTURA PERSONALIZAÇÃO
   * =======================================================
   *
   * Exemplo futuro recebido do backend:
   *
   * [
   *   "encomendas",
   *   "funcionarios",
   *   "tendencias",
   *   "unidades",
   * ]
   *
   * Se não houver nada:
   * fallback oficial é utilizado automaticamente.
   */
  preferredAnalysisIds = [],
}) {
  const [
    expanded,
    setExpanded,
  ] = useState(false);

  const selectedItem =
    getAdminAnalyticsItem(
      selectedAnalysis
    );

  const {
    featured,
    secondary,
  } = useMemo(
    () =>
      splitAdminAnalyticsCatalog({
        preferredIds:
          preferredAnalysisIds,

        limit: 4,
      }),
    [
      preferredAnalysisIds,
    ]
  );


  function handleMobileChange(
    event
  ) {
    onSelectAnalysis?.(
      event.target.value
    );
  }


  function handleToggleExpanded() {
    setExpanded(
      (current) => !current
    );
  }


  return (
    <section
      className={[
        "admin-analytics-selector",
        expanded
          ? "admin-analytics-selector--expanded"
          : "admin-analytics-selector--collapsed",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="admin-analytics-selector-title"
    >
      <div className="admin-analytics-selector__header">

        <div className="admin-analytics-selector__heading">

          <span className="admin-analytics-selector__eyebrow">
            CENTRAL DE ANÁLISES
          </span>

          <h2
            id="admin-analytics-selector-title"
            className="admin-analytics-selector__title"
          >
            Selecione uma visão
          </h2>

        </div>


        <div className="admin-analytics-selector__header-actions">

          <span className="admin-analytics-selector__current">
            {selectedItem.label}
          </span>

          <button
            type="button"
            className="admin-analytics-selector__toggle"
            onClick={
              handleToggleExpanded
            }
            aria-expanded={
              expanded
            }
            aria-controls="admin-analytics-secondary-grid"
          >
            <span>
              {expanded
                ? "Recolher"
                : "Ver todas"}
            </span>

            {expanded ? (
              <ChevronUp
                size={17}
                aria-hidden="true"
              />
            ) : (
              <ChevronDown
                size={17}
                aria-hidden="true"
              />
            )}
          </button>

        </div>

      </div>


      {/* ===================================================
          DESKTOP
          =================================================== */}

      <div className="admin-analytics-selector__desktop">

        <div
          className="
            admin-analytics-selector__grid
            admin-analytics-selector__grid--featured
          "
          role="tablist"
          aria-label="Análises prioritárias"
        >
          {featured.map(
            (item) => (
              <AnalyticsButton
                key={item.id}
                item={item}
                selectedAnalysis={
                  selectedAnalysis
                }
                onSelectAnalysis={
                  onSelectAnalysis
                }
              />
            )
          )}
        </div>


        <div
          id="admin-analytics-secondary-grid"
          className={[
            "admin-analytics-selector__secondary",
            expanded
              ? "admin-analytics-selector__secondary--open"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden={
            !expanded
          }
        >
          <div
            className="
              admin-analytics-selector__grid
              admin-analytics-selector__grid--secondary
            "
            role="tablist"
            aria-label="Demais análises"
          >
            {secondary.map(
              (item) => (
                <AnalyticsButton
                  key={item.id}
                  item={item}
                  selectedAnalysis={
                    selectedAnalysis
                  }
                  onSelectAnalysis={
                    onSelectAnalysis
                  }
                />
              )
            )}
          </div>
        </div>

      </div>


      {/* ===================================================
          MOBILE
          =================================================== */}

      <div className="admin-analytics-selector__mobile">

        <div className="admin-analytics-selector__select-wrapper">

          <select
            value={
              selectedAnalysis
            }
            onChange={
              handleMobileChange
            }
            aria-label="Selecionar análise"
          >
            {ADMIN_ANALYTICS_CATALOG.map(
              (item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.label}

                  {!item.available
                    ? " — Em preparação"
                    : ""}
                </option>
              )
            )}
          </select>

          <ChevronDown
            size={18}
            aria-hidden="true"
          />

        </div>

      </div>

    </section>
  );
}


export default AdminAnalyticsSelector;