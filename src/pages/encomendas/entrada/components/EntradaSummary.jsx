import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  PackageSearch,
} from "lucide-react";

import "./EntradaSummary.css";

function obterTotal(
  item
) {
  const total =
    Number(item?.total);

  return Number.isFinite(total)
    ? total
    : 0;
}

export default function EntradaSummary({
  available = false,
  loading = false,
  resumo = null,
  totalLotes = 0,
  condominioNome = "Condomínio",
}) {
  const aguardando =
    obterTotal(
      resumo?.aguardandoEntrada
    );

  const entradasHoje =
    obterTotal(
      resumo?.entradasHoje
    );

  const divergencias =
    obterTotal(
      resumo?.comDivergencia
    );

  const avarias =
    obterTotal(
      resumo?.comAvaria
    );

  const mostrarValor =
    available &&
    !loading;

  return (
    <section
      className="entrada-summary"
      aria-labelledby="entrada-summary-title"
      aria-busy={loading}
    >
      <div className="entrada-summary__heading">
        <div>
          <span>
            Visão operacional
          </span>

          <h2 id="entrada-summary-title">
            Resumo da Entrada
          </h2>

          <p>
            {condominioNome}
          </p>
        </div>

        <PackageSearch
          size={19}
          aria-hidden="true"
        />
      </div>

      <div className="entrada-summary__grid">
        <article className="entrada-summary__card entrada-summary__card--accent">
          <div className="entrada-summary__card-icon">
            <Boxes size={19} />
          </div>

          <div>
            <span className="entrada-summary__label">
              Aguardando entrada
            </span>

            <strong className="entrada-summary__value">
              {mostrarValor
                ? aguardando
                : "—"}
            </strong>

            <p>
              Volumes que ainda precisam ser processados.
            </p>
          </div>
        </article>

        <article className="entrada-summary__card">
          <div className="entrada-summary__card-icon entrada-summary__card-icon--success">
            <CheckCircle2
              size={19}
            />
          </div>

          <div>
            <span className="entrada-summary__label">
              Entradas hoje
            </span>

            <strong className="entrada-summary__value">
              {mostrarValor
                ? entradasHoje
                : "—"}
            </strong>

            <p>
              Volumes que concluíram a Entrada hoje.
            </p>
          </div>
        </article>

        <article className="entrada-summary__card">
          <div className="entrada-summary__card-icon entrada-summary__card-icon--warning">
            <AlertTriangle
              size={19}
            />
          </div>

          <div>
            <span className="entrada-summary__label">
              Divergências
            </span>

            <strong className="entrada-summary__value">
              {mostrarValor
                ? divergencias
                : "—"}
            </strong>

            <p>
              Lotes da fila com diferença identificada.
            </p>
          </div>
        </article>

        <article className="entrada-summary__card">
          <div className="entrada-summary__card-icon entrada-summary__card-icon--warning">
            <AlertTriangle
              size={19}
            />
          </div>

          <div>
            <span className="entrada-summary__label">
              Com avaria
            </span>

            <strong className="entrada-summary__value">
              {mostrarValor
                ? avarias
                : "—"}
            </strong>

            <p>
              Volumes da fila com avaria registrada.
            </p>
          </div>
        </article>
      </div>

      {mostrarValor ? (
        <div className="entrada-summary__footer">
          <span>
            {Number(totalLotes) || 0}{" "}
            {Number(totalLotes) === 1
              ? "lote na fila"
              : "lotes na fila"}
          </span>

          {resumo?.dataLocal ? (
            <span>
              Atualizado em{" "}
              {resumo.dataLocal}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}