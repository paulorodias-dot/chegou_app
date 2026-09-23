import {
  CalendarDays,
  ChevronDown,
  Clock3,
  Package,
  PackageCheck,
  QrCode,
  Truck,
  UserRound,
  UsersRound,
} from "lucide-react";

import {
  useState,
} from "react";

import "./MoradorRetiradaCard.css";

function formatarData(valor) {
  if (!valor) {
    return "Data não informada";
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return String(valor).replace("T", " ").slice(0, 16);
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

function statusDoItem(item) {
  if (item.retirada?.resultado === "CONCLUIDA") {
    return { label: "Retirada", tone: "success" };
  }

  if (item.agendamento) {
    return { label: "Agendada", tone: "scheduled" };
  }

  if (item.status === "EM_RETIRADA") {
    return { label: "Em retirada", tone: "progress" };
  }

  if (item.atrasada) {
    return { label: "Aguardando retirada", tone: "warning" };
  }

  return { label: "Disponível", tone: "available" };
}

export default function MoradorRetiradaCard({
  item,
  modoLista = false,
  onSolicitarRetirada,
}) {
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);

  const status = statusDoItem(item);

  const DependenteIcon =
    item.escopoDestino === "DEPENDENTE_VINCULADO"
      ? UsersRound
      : UserRound;

  const podeGerarCredencial =
    !item.retirada &&
    (
      item.status === "DISPONIVEL_RETIRADA" ||
      item.status === "RETIRADA_AGENDADA"
    );

  return (
    <article
      className={[
        "morador-retirada-card",
        modoLista ? "is-list" : "",
        detalhesAbertos ? "is-open" : "",
      ].filter(Boolean).join(" ")}
    >
      <header className="morador-retirada-card__header">
        <span
          className="morador-retirada-card__package"
          aria-hidden="true"
        >
          {item.retirada ? (
            <PackageCheck size={19} />
          ) : (
            <Package size={19} />
          )}
        </span>

        <div className="morador-retirada-card__identity">
          <span>Encomenda</span>
          <strong>#{item.numero || "—"}</strong>
        </div>

        <span
          className={`morador-retirada-card__status is-${status.tone}`}
        >
          {status.label}
        </span>
      </header>

      <div className="morador-retirada-card__content">
        <h2>{item.transportadora}</h2>

        <div className="morador-retirada-card__recipient">
          <DependenteIcon size={15} />

          <div>
            <span>
              {item.escopoDestino === "DEPENDENTE_VINCULADO"
                ? "Dependente vinculado"
                : "Para você"}
            </span>

            <strong>{item.destinatarioNome}</strong>
          </div>
        </div>

        <div className="morador-retirada-card__meta">
          <span>
            <Clock3 size={14} />

            {item.retirada
              ? `Retirada em ${formatarData(
                  item.retirada.concluidaEm
                )}`
              : `Disponível desde ${formatarData(
                  item.disponibilizadoEm
                )}`}
          </span>

          <span>
            <Package size={14} />

            {item.totalVolumes}{" "}
            {item.totalVolumes === 1
              ? "volume"
              : "volumes"}
          </span>
        </div>

        {item.agendamento ? (
          <div className="morador-retirada-card__schedule">
            <CalendarDays size={15} />

            <span>
              Agendada para {formatarData(item.agendamento.data)}

              {item.agendamento.periodo
                ? ` · ${item.agendamento.periodo}`
                : ""}
            </span>
          </div>
        ) : null}

        {detalhesAbertos ? (
          <div className="morador-retirada-card__details">
            <span>
              <Truck size={14} />

              Código de rastreio

              <strong>
                {item.codigoRastreio || "Não informado"}
              </strong>
            </span>

            {item.retirada ? (
              <span>
                <PackageCheck size={14} />

                Retirada por

                <strong>
                  {item.retirada.retiranteNome ||
                    "Não informado"}
                </strong>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <footer className="morador-retirada-card__footer">
        {podeGerarCredencial ? (
          <button
            type="button"
            className="morador-retirada-card__credential"
            onClick={() => onSolicitarRetirada?.(item)}
          >
            <QrCode size={16} />
            <span>Retirar encomenda</span>
          </button>
        ) : null}

        <button
          type="button"
          aria-expanded={detalhesAbertos}
          onClick={() =>
            setDetalhesAbertos((aberto) => !aberto)
          }
        >
          <span>
            {detalhesAbertos
              ? "Ocultar detalhes"
              : "Ver detalhes"}
          </span>

          <ChevronDown size={16} />
        </button>
      </footer>
    </article>
  );
}