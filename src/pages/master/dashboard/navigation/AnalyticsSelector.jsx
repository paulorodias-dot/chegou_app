import { ANALYTICS_GROUPS } from './analyticsCatalog'

import './AnalyticsSelector.css'

function AnalyticsSelector({ value, onChange }) {
  function handleChange(event) {
    onChange(event.target.value)
  }

  return (
    <section
      className="analytics-selector"
      aria-label="Central de análises"
    >
      <div className="analytics-selector-copy">
        <span className="analytics-selector-eyebrow">
          Central de Análises
        </span>

        <div className="analytics-selector-title">
          <strong>Visão analítica</strong>

          <span>
            Escolha a categoria que deseja acompanhar.
          </span>
        </div>
      </div>

      <div className="analytics-selector-control">
        <label htmlFor="dashboard-analysis">
          Análise atual
        </label>

        <div className="analytics-selector-field">
          <select
            id="dashboard-analysis"
            value={value}
            onChange={handleChange}
          >
            {ANALYTICS_GROUPS.map((group) => (
              <optgroup
                key={group.id}
                label={group.label}
              >
                {group.options.map((option) => (
                  <option
                    key={option.id}
                    value={option.id}
                  >
                    {option.label}
                    {option.status === 'planned'
                      ? ' — Em preparação'
                      : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <span
            className="analytics-selector-arrow"
            aria-hidden="true"
          >
            ▾
          </span>
        </div>
      </div>
    </section>
  )
}

export default AnalyticsSelector