import {
  Boxes,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Radio,
} from "lucide-react";

export default function RastreioEncomendasResumoCard({
  perfil,
  onNavigate,
}) {
  /*
   * O perfil permanece explicitamente conectado à superfície.
   *
   * Nesta fase visual ele não é utilizado para buscar ou
   * determinar dados. Futuramente o backend será responsável
   * por entregar somente o contexto autorizado do Morador.
   */
  const contextoAutenticado = Boolean(perfil);

  function handleVerEncomendas() {
    if (typeof onNavigate !== "function") {
      return;
    }

    onNavigate("morador-encomendas-recebidas");
  }

  return (
    <section
      className="rastreio-sidebar-card rastreio-sidebar-card--summary"
      aria-labelledby="rastreio-resumo-encomendas-title"
      data-contexto-autenticado={
        contextoAutenticado ? "true" : "false"
      }
    >
      <div className="rastreio-sidebar-card__header">
        <div>
          <span className="rastreio-sidebar-card__eyebrow">
            Resumo
          </span>

          <h2 id="rastreio-resumo-encomendas-title">
            Suas Encomendas
          </h2>
        </div>

        <div
          className="rastreio-sidebar-card__icon"
          aria-hidden="true"
        >
          <Boxes size={20} />
        </div>
      </div>

      <div className="rastreio-sidebar-metrics">
        <div className="rastreio-sidebar-metric">
          <div className="rastreio-sidebar-metric__icon">
            <CheckCircle2
              size={17}
              aria-hidden="true"
            />
          </div>

          <div className="rastreio-sidebar-metric__copy">
            <span>Disponíveis para retirada</span>
            <small>
              Liberação oficial pelo condomínio
            </small>
          </div>

          <strong>—</strong>
        </div>

        <div className="rastreio-sidebar-metric">
          <div className="rastreio-sidebar-metric__icon">
            <Clock3
              size={17}
              aria-hidden="true"
            />
          </div>

          <div className="rastreio-sidebar-metric__copy">
            <span>Em processamento</span>
            <small>
              Após a entrada oficial pela Portaria
            </small>
          </div>

          <strong>—</strong>
        </div>

        <div className="rastreio-sidebar-metric">
          <div className="rastreio-sidebar-metric__icon">
            <Boxes
              size={17}
              aria-hidden="true"
            />
          </div>

          <div className="rastreio-sidebar-metric__copy">
            <span>Recebidas recentemente</span>
            <small>
              Somente entradas oficiais
            </small>
          </div>

          <strong>—</strong>
        </div>
      </div>

      <div className="rastreio-sidebar-realtime">
        <Radio
          size={14}
          aria-hidden="true"
        />

        <span>
          Atualização automática quando os dados oficiais
          estiverem disponíveis.
        </span>
      </div>

      <button
        type="button"
        className="rastreio-sidebar-link"
        onClick={handleVerEncomendas}
      >
        <span>Ver minhas encomendas</span>

        <ChevronRight
          size={16}
          aria-hidden="true"
        />
      </button>
    </section>
  );
}