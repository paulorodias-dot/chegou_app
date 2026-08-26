import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  CloudSun,
  Lightbulb,
  PackageSearch,
  Sparkles,
} from "lucide-react";

import "./EntradaSidebar.css";

function formatarQuantidade(
  valor
) {
  const numero =
    Number(valor);

  return Number.isFinite(numero)
    ? numero
    : 0;
}

export default function EntradaSidebar({
  resumo,
  items = [],
  clima = null,
  desempenho = null,
}) {
  const primeiroLote =
    Array.isArray(items) &&
    items.length > 0
      ? items[0]
      : null;

  const aguardando =
    formatarQuantidade(
      resumo?.aguardandoEntrada
        ?.total
    );

  const divergencias =
    formatarQuantidade(
      resumo?.comDivergencia
        ?.total
    );

  const avarias =
    formatarQuantidade(
      resumo?.comAvaria
        ?.total
    );

  return (
    <aside
      className="entrada-sidebar"
      aria-label="Apoio à operação de Entrada"
    >
      {clima ? (
        <section className="entrada-sidebar__card entrada-sidebar__card--weather">
          <div className="entrada-sidebar__card-heading">
            <div className="entrada-sidebar__icon entrada-sidebar__icon--weather">
              <CloudSun
                size={20}
              />
            </div>

            <div>
              <span>
                Condições agora
              </span>

              <h2>
                {clima.titulo ||
                  "Clima"}
              </h2>
            </div>
          </div>

          <div className="entrada-sidebar__weather-value">
            {clima.temperatura}
          </div>

          {clima.descricao ? (
            <p>
              {clima.descricao}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="entrada-sidebar__card entrada-sidebar__card--essential">
        <div className="entrada-sidebar__card-heading">
          <div className="entrada-sidebar__icon">
            <PackageSearch
              size={20}
            />
          </div>

          <div>
            <span>
              Fila agora
            </span>

            <h2>
              Situação da Entrada
            </h2>
          </div>
        </div>

        <div className="entrada-sidebar__metrics">
          <div>
            <strong>
              {aguardando}
            </strong>

            <span>
              volumes aguardando
            </span>
          </div>

          <div>
            <strong>
              {divergencias +
                avarias}
            </strong>

            <span>
              pontos de atenção
            </span>
          </div>
        </div>

        {primeiroLote ? (
          <div className="entrada-sidebar__priority">
            <div>
              <Clock3
                size={17}
              />

              <span>
                Prioridade atual
              </span>
            </div>

            <strong>
              {
                primeiroLote.referenciaLote
              }
            </strong>

            <p>
              É o lote mais antigo
              disponível para Entrada.
            </p>
          </div>
        ) : (
          <div className="entrada-sidebar__success">
            <CheckCircle2
              size={18}
            />

            <p>
              Não há lote pendente
              nesta fila.
            </p>
          </div>
        )}
      </section>

      {(divergencias > 0 ||
        avarias > 0) ? (
        <section className="entrada-sidebar__card entrada-sidebar__card--attention entrada-sidebar__card--mobile-visible">
          <div className="entrada-sidebar__card-heading">
            <div className="entrada-sidebar__icon entrada-sidebar__icon--attention">
              <AlertTriangle
                size={20}
              />
            </div>

            <div>
              <span>
                Atenção
              </span>

              <h2>
                Conferências necessárias
              </h2>
            </div>
          </div>

          <div className="entrada-sidebar__attention-list">
            {divergencias > 0 ? (
              <p>
                <strong>
                  {divergencias}
                </strong>{" "}
                {divergencias === 1
                  ? "lote possui"
                  : "lotes possuem"}{" "}
                divergência registrada.
              </p>
            ) : null}

            {avarias > 0 ? (
              <p>
                <strong>
                  {avarias}
                </strong>{" "}
                {avarias === 1
                  ? "volume possui"
                  : "volumes possuem"}{" "}
                avaria registrada.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {desempenho ? (
        <section className="entrada-sidebar__card entrada-sidebar__card--secondary">
          <div className="entrada-sidebar__card-heading">
            <div className="entrada-sidebar__icon entrada-sidebar__icon--performance">
              <BarChart3
                size={20}
              />
            </div>

            <div>
              <span>
                Seu desempenho
              </span>

              <h2>
                Operação do período
              </h2>
            </div>
          </div>

          <div className="entrada-sidebar__performance">
            <strong>
              {
                desempenho.valorPrincipal
              }
            </strong>

            <p>
              {
                desempenho.descricao
              }
            </p>
          </div>

          {desempenho.comparacao ? (
            <div className="entrada-sidebar__comparison">
              <Sparkles
                size={16}
              />

              <span>
                {
                  desempenho.comparacao
                }
              </span>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="entrada-sidebar__card entrada-sidebar__card--secondary entrada-sidebar__card--practice">
        <div className="entrada-sidebar__card-heading">
          <div className="entrada-sidebar__icon entrada-sidebar__icon--practice">
            <Lightbulb
              size={20}
            />
          </div>

          <div>
            <span>
              Boa prática
            </span>

            <h2>
              Priorize a fila mais antiga
            </h2>
          </div>
        </div>

        <p>
          Processar primeiro os lotes
          mais antigos reduz o tempo
          entre o Recebimento e a
          Entrada e evita acúmulo
          operacional.
        </p>

        <div className="entrada-sidebar__practice-note">
          A fila já está organizada
          nessa ordem.
        </div>
      </section>
    </aside>
  );
}