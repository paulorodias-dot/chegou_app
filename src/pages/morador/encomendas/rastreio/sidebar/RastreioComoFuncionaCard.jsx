import {
  Building2,
  CheckCircle2,
  PackagePlus,
  Route,
} from "lucide-react";

const PASSOS = [
  {
    id: "adicionar",
    numero: "1",
    titulo: "Adicione seu rastreio",
    descricao:
      "Informe o código da compra que você está aguardando.",
    icon: PackagePlus,
  },
  {
    id: "acompanhar",
    numero: "2",
    titulo: "Acompanhe a entrega",
    descricao:
      "Veja as informações disponíveis durante o trajeto.",
    icon: Route,
  },
  {
    id: "portaria",
    numero: "3",
    titulo: "Aguarde a Portaria",
    descricao:
      "A chegada da transportadora ainda não libera a retirada.",
    icon: Building2,
  },
  {
    id: "retirar",
    numero: "4",
    titulo: "Retire quando estiver disponível",
    descricao:
      "A situação oficial será apresentada pelo Sistema Chegou!.",
    icon: CheckCircle2,
  },
];

export default function RastreioComoFuncionaCard() {
  return (
    <section
      className="rastreio-sidebar-card rastreio-sidebar-card--how"
      aria-labelledby="rastreio-como-funciona-title"
    >
      <div className="rastreio-sidebar-card__header">
        <div>
          <span className="rastreio-sidebar-card__eyebrow">
            Rastreio
          </span>

          <h2 id="rastreio-como-funciona-title">
            Como funciona
          </h2>
        </div>
      </div>

      <ol className="rastreio-sidebar-steps">
        {PASSOS.map((passo) => {
          const Icon = passo.icon;

          return (
            <li
              key={passo.id}
              className="rastreio-sidebar-step"
            >
              <div
                className="rastreio-sidebar-step__marker"
                aria-hidden="true"
              >
                <Icon size={15} />
              </div>

              <div className="rastreio-sidebar-step__content">
                <strong>
                  {passo.numero}. {passo.titulo}
                </strong>

                <span>
                  {passo.descricao}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}