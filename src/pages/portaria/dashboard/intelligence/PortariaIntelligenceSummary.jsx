import {
  BrainCircuit,
  Sparkles,
} from "lucide-react";

import "./PortariaIntelligenceSummary.css";

function PortariaIntelligenceSummary({
  itens = [],
  carregando = false,
}) {
  return (
    <section className="portaria-intelligence-card">
      <div className="portaria-intelligence-header">
        <div>
          <span>INTELIGÊNCIA OPERACIONAL</span>
          <h2>Orientações para a operação</h2>
        </div>

        <BrainCircuit size={20} />
      </div>

      {carregando ? (
        <div className="portaria-intelligence-loading">
          <span />
          <span />
        </div>
      ) : itens.length === 0 ? (
        <div className="portaria-intelligence-empty">
          <Sparkles size={22} />

          <div>
            <strong>Aguardando dados operacionais</strong>

            <p>
              Recomendações automáticas serão exibidas somente
              quando houver base real suficiente para uma
              orientação confiável.
            </p>
          </div>
        </div>
      ) : (
        <div className="portaria-intelligence-list">
          {itens.map((item) => (
            <article key={item.id}>
              <strong>{item.titulo}</strong>
              <p>{item.descricao}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default PortariaIntelligenceSummary;