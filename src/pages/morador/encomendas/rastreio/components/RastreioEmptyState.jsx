import {
  PackageSearch,
  Plus,
  SearchX,
} from "lucide-react";

export default function RastreioEmptyState({
  hasSearch,
  onNovoRastreio,
}) {
  if (hasSearch) {
    return (
      <section
        className="rastreio-empty"
        aria-labelledby="rastreio-empty-title"
      >
        <div className="rastreio-empty__icon">
          <SearchX
            size={30}
            aria-hidden="true"
          />
        </div>

        <div className="rastreio-empty__content">
          <h2 id="rastreio-empty-title">
            Nenhum rastreio encontrado
          </h2>

          <p>
            Não encontramos rastreios
            correspondentes à sua pesquisa.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="rastreio-empty"
      aria-labelledby="rastreio-empty-title"
    >
      <div className="rastreio-empty__icon">
        <PackageSearch
          size={30}
          aria-hidden="true"
        />
      </div>

      <div className="rastreio-empty__content">
        <h2 id="rastreio-empty-title">
          Nenhum rastreio adicionado ainda
        </h2>

        <p>
          Adicione uma compra que você está
          aguardando para começar a acompanhar
          sua entrega pelo Sistema Chegou!.
        </p>
      </div>

      <button
        type="button"
        className="rastreio-primary-button"
        onClick={onNovoRastreio}
      >
        <Plus
          size={17}
          aria-hidden="true"
        />

        <span>Novo Rastreio</span>
      </button>
    </section>
  );
}