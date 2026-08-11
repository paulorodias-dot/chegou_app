import {
  ChevronRight,
  Clock3,
  MapPin,
  MoreVertical,
  PackageSearch,
  Truck,
} from "lucide-react";

export default function RastreioCard({
  rastreio,
  onAcompanhar,
  onEditar,
  onExcluir,
}) {
  const {
    codigo,
    descricao,
    transportadora,
    situacao,
    ultimaAtualizacao,
    localAtual,
  } = rastreio ?? {};

  return (
    <article className="rastreio-card">
      <div className="rastreio-card__top">
        <div className="rastreio-card__identity">
          <div className="rastreio-card__icon">
            <PackageSearch size={20} aria-hidden="true" />
          </div>

          <div>
            {descricao && (
              <p className="rastreio-card__description">
                {descricao}
              </p>
            )}

            <strong className="rastreio-card__code">
              {codigo}
            </strong>
          </div>
        </div>

        <div className="rastreio-card__menu-wrapper">
          <details className="rastreio-card__menu">
            <summary
              aria-label={`Mais opções para ${codigo}`}
            >
              <MoreVertical size={20} aria-hidden="true" />
            </summary>

            <div className="rastreio-card__menu-popover">
              <button
                type="button"
                onClick={() => onEditar?.(rastreio)}
              >
                Editar
              </button>

              <button
                type="button"
                className="rastreio-card__menu-danger"
                onClick={() => onExcluir?.(rastreio)}
              >
                Excluir
              </button>
            </div>
          </details>
        </div>
      </div>

      <div className="rastreio-card__meta">
        {transportadora && (
          <div className="rastreio-card__meta-item">
            <Truck size={16} aria-hidden="true" />

            <div>
              <span>Transportadora</span>
              <strong>{transportadora}</strong>
            </div>
          </div>
        )}

        {localAtual && (
          <div className="rastreio-card__meta-item">
            <MapPin size={16} aria-hidden="true" />

            <div>
              <span>Último movimento</span>
              <strong>{localAtual}</strong>
            </div>
          </div>
        )}

        {ultimaAtualizacao && (
          <div className="rastreio-card__meta-item">
            <Clock3 size={16} aria-hidden="true" />

            <div>
              <span>Atualização</span>
              <strong>{ultimaAtualizacao}</strong>
            </div>
          </div>
        )}
      </div>

      <div className="rastreio-card__footer">
        {situacao && (
          <span className="rastreio-card__status">
            {situacao}
          </span>
        )}

        <button
          type="button"
          className="rastreio-card__follow"
          onClick={() => onAcompanhar?.(rastreio)}
        >
          <span>Acompanhar</span>
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}