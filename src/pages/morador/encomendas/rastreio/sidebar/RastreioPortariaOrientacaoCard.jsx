import {
  Building2,
  Info,
} from "lucide-react";

export default function RastreioPortariaOrientacaoCard() {
  return (
    <section
      className="rastreio-sidebar-card rastreio-sidebar-card--portaria"
      aria-labelledby="rastreio-portaria-title"
    >
      <div className="rastreio-sidebar-card__header">
        <div>
          <span className="rastreio-sidebar-card__eyebrow">
            Importante
          </span>

          <h2 id="rastreio-portaria-title">
            Antes de ir à Portaria
          </h2>
        </div>

        <div
          className="rastreio-sidebar-card__icon"
          aria-hidden="true"
        >
          <Building2 size={20} />
        </div>
      </div>

      <div className="rastreio-sidebar-portaria-copy">
        <Info
          size={17}
          aria-hidden="true"
        />

        <p>
          A chegada informada pela transportadora não
          significa que a encomenda já esteja disponível
          para retirada.
        </p>
      </div>

      <p className="rastreio-sidebar-portaria-message">
        Aguarde a entrada oficial pela Portaria. Quando o
        processo estiver concluído, o Sistema Chegou!
        apresentará a situação correta da sua encomenda.
      </p>
    </section>
  );
}