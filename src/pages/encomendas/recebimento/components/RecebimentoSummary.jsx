import {
  AlertTriangle,
  Box,
  PackageCheck,
  ShieldAlert,
} from "lucide-react";


// ============================================================
// SISTEMA CHEGOU!
// RECEBIMENTO — RESUMO OPERACIONAL
//
// Responsabilidades:
// - exibir KPIs autoritativos do backend;
// - exibir tendência compacta dos últimos 7 dias;
// - indicar loading/atualização sem apagar dados existentes.
//
// NÃO:
// - calcula KPI a partir da tabela;
// - acessa Supabase;
// - aplica regra de negócio;
// - faz polling.
// ============================================================


const SUMMARY_CONFIG = [
  {
    id: "entradas-hoje",

    key:
      "entradasOficiaisHoje",

    label:
      "Entradas hoje",

    helper:
      "Volumes com entrada realizada hoje",

    chartLabel:
      "Entradas realizadas nos últimos 7 dias",

    icon:
      PackageCheck,

    tone:
      "blue",
  },

  {
    id: "aguardando-entrada",

    key:
      "aguardandoEntradaOficial",

    label:
      "Aguardando Entrada",

    helper:
      "Volumes pendentes na fila",

    chartLabel:
      "Volumes aguardando Entrada nos últimos 7 dias",

    icon:
      Box,

    tone:
      "green",
  },

  {
    id: "com-divergencia",

    key:
      "comDivergencia",

    label:
      "Com divergência",

    helper:
      "Lotes da fila com divergência",

    chartLabel:
      "Divergências na fila nos últimos 7 dias",

    icon:
      AlertTriangle,

    tone:
      "orange",
  },

  {
    id: "com-avaria",

    key:
      "comAvaria",

    label:
      "Com avaria",

    helper:
      "Volumes da fila com avaria",

    chartLabel:
      "Volumes com avaria na fila nos últimos 7 dias",

    icon:
      ShieldAlert,

    tone:
      "red",
  },
];


// ============================================================
// HELPERS
// ============================================================

function normalizarTotal(
  valor
) {
  const numero =
    Number(valor);

  return Number.isFinite(
    numero
  )
    ? numero
    : 0;
}


function obterSerie(
  item
) {
  if (
    !Array.isArray(
      item?.serie7Dias
    )
  ) {
    return [];
  }


  return item.serie7Dias
    .slice(-7)
    .map((ponto) => ({
      data:
        ponto?.data ||
        null,

      total:
        normalizarTotal(
          ponto?.total
        ),
    }));
}


function formatarDataCurta(
  data
) {
  if (!data) {
    return "";
  }


  const partes =
    String(data)
      .split("-");


  if (partes.length !== 3) {
    return String(data);
  }


  return `${partes[2]}/${partes[1]}`;
}


// ============================================================
// MICROGRÁFICO
//
// Combina:
// - colunas discretas;
// - linha de tendência;
//
// sem dependência de biblioteca externa.
// ============================================================

function MiniTrend({
  serie,
  label,
}) {
  const pontos =
    obterSerie({
      serie7Dias:
        serie,
    });


  const largura =
    126;

  const altura =
    46;

  const paddingX =
    5;

  const paddingTop =
    5;

  const paddingBottom =
    5;


  if (pontos.length === 0) {
    return (
      <div
        className="recebimento-mini-chart recebimento-mini-chart--empty"
        aria-label={`${label}. Sem histórico disponível.`}
      >
        <span>
          Sem histórico
        </span>
      </div>
    );
  }


  const maximo =
    Math.max(
      1,
      ...pontos.map(
        (ponto) =>
          ponto.total
      )
    );


  const larguraUtil =
    largura -
    paddingX * 2;


  const alturaUtil =
    altura -
    paddingTop -
    paddingBottom;


  const slot =
    larguraUtil /
    pontos.length;


  const larguraBarra =
    Math.min(
      10,
      Math.max(
        5,
        slot * 0.46
      )
    );


  const dados =
    pontos.map(
      (
        ponto,
        index
      ) => {
        const proporcao =
          ponto.total /
          maximo;


        const alturaBarra =
          ponto.total === 0
            ? 2
            : Math.max(
                4,
                proporcao *
                  alturaUtil
              );


        const centroX =
          paddingX +
          slot * index +
          slot / 2;


        const x =
          centroX -
          larguraBarra / 2;


        const y =
          altura -
          paddingBottom -
          alturaBarra;


        return {
          ...ponto,
          x,
          y,
          centroX,
          alturaBarra,

          linhaY:
            altura -
            paddingBottom -
            Math.max(
              2,
              proporcao *
                alturaUtil
            ),
        };
      }
    );


  const pontosLinha =
    dados
      .map(
        (ponto) =>
          `${ponto.centroX},${ponto.linhaY}`
      )
      .join(" ");


  const descricao =
    dados
      .map(
        (ponto) =>
          `${
            formatarDataCurta(
              ponto.data
            ) || "Dia"
          }: ${ponto.total}`
      )
      .join(", ");


  return (
    <div
      className="recebimento-mini-chart"
      aria-label={`${label}. ${descricao}`}
      role="img"
    >
      <svg
        viewBox={`0 0 ${largura} ${altura}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line
          className="recebimento-mini-chart__baseline"
          x1={paddingX}
          y1={
            altura -
            paddingBottom
          }
          x2={
            largura -
            paddingX
          }
          y2={
            altura -
            paddingBottom
          }
        />


        {dados.map(
          (
            ponto,
            index
          ) => (
            <rect
              key={
                ponto.data ||
                index
              }
              className="recebimento-mini-chart__bar"
              x={ponto.x}
              y={ponto.y}
              width={
                larguraBarra
              }
              height={
                ponto.alturaBarra
              }
              rx="2"
            >
              <title>
                {`${
                  formatarDataCurta(
                    ponto.data
                  ) ||
                  "Dia"
                }: ${
                  ponto.total
                }`}
              </title>
            </rect>
          )
        )}


        {dados.length > 1 && (
          <polyline
            className="recebimento-mini-chart__line"
            points={
              pontosLinha
            }
          />
        )}


        {dados.map(
          (
            ponto,
            index
          ) => (
            <circle
              key={`point-${
                ponto.data ||
                index
              }`}
              className="recebimento-mini-chart__point"
              cx={
                ponto.centroX
              }
              cy={
                ponto.linhaY
              }
              r="1.8"
            />
          )
        )}
      </svg>


      <span className="recebimento-mini-chart__caption">
        Últimos 7 dias
      </span>
    </div>
  );
}


// ============================================================
// COMPONENT
// ============================================================

export default function RecebimentoSummary({
  resumo = null,
  loading = false,
  updating = false,
}) {
  return (
    <section
      className={`recebimento-summary ${
        updating
          ? "recebimento-summary--updating"
          : ""
      }`}
      aria-label="Resumo operacional"
      aria-busy={
        loading ||
        updating
      }
    >
      {SUMMARY_CONFIG.map(
        (config) => {
          const Icon =
            config.icon;


          const item =
            resumo?.[
              config.key
            ] ||
            null;


          const total =
            item
              ? normalizarTotal(
                  item.total
                )
              : null;


          const serie =
            obterSerie(
              item
            );


          return (
            <article
              key={
                config.id
              }
              className={`recebimento-summary-card recebimento-summary-card--${config.tone}`}
            >
              <div className="recebimento-summary-card__icon">
                <Icon
                  size={18}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </div>


              <div className="recebimento-summary-card__content">
                <span className="recebimento-summary-card__value">
                  {loading &&
                  !resumo
                    ? "—"
                    : total ??
                      "—"}
                </span>


                <span className="recebimento-summary-card__label">
                  {config.label}
                </span>


                <span className="recebimento-summary-card__helper">
                  {config.helper}
                </span>
              </div>


              <MiniTrend
                serie={
                  serie
                }
                label={
                  config.chartLabel
                }
              />
            </article>
          );
        }
      )}
    </section>
  );
}