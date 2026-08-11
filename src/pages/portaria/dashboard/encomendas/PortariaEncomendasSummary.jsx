import {
  Archive,
  Package,
  PackageCheck,
} from "lucide-react";

import "./PortariaEncomendasSummary.css";

function PortariaEncomendasSummary({
  dados,
  carregando = false,
}) {
  return (
    <section className="portaria-encomendas-summary">
      <div className="portaria-encomendas-summary-header">
        <div>
          <span>ENCOMENDAS</span>
          <h2>Fluxo operacional</h2>
        </div>

        <Package size={20} />
      </div>

      {carregando ? (
        <div className="portaria-encomendas-loading">
          <span />
          <span />
          <span />
        </div>
      ) : !dados ? (
        <div className="portaria-encomendas-empty">
          <Package size={25} />

          <strong>Aguardando atualização</strong>

          <p>
            O fluxo operacional será apresentado quando os
            dados oficiais da Central de Encomendas forem
            conectados ao Dashboard.
          </p>
        </div>
      ) : (
        <div className="portaria-encomendas-flow">
          <article>
            <Package size={18} />
            <span>Recebimento</span>
            <strong>{dados.recebimento ?? "—"}</strong>
          </article>

          <article>
            <Archive size={18} />
            <span>Armazenamento</span>
            <strong>{dados.armazenamento ?? "—"}</strong>
          </article>

          <article>
            <PackageCheck size={18} />
            <span>Retirada</span>
            <strong>{dados.retirada ?? "—"}</strong>
          </article>
        </div>
      )}
    </section>
  );
}

export default PortariaEncomendasSummary;