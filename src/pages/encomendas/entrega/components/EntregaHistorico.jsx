import {
  Ban,
  CheckCircle2,
  ChevronDown,
  Clock3,
  History,
  PackageCheck,
  XCircle,
} from "lucide-react";

import "./EntregaHistorico.css";


// ============================================================
// SISTEMA CHEGOU!
// CENTRAL DE ENCOMENDAS — ENTREGA
// HISTÓRICO OPERACIONAL DE RETIRADAS
//
// Responsabilidade:
// - apresentar histórico seguro já retornado pelo backend;
// - mostrar resultado, pessoa e volume entregue;
// - formatar data/hora SOMENTE quando houver timezone oficial.
//
// NÃO:
// - mostra UUID;
// - mostra Token/QR;
// - mostra IP/device/user-agent;
// - decide estado da retirada;
// - usa timezone do dispositivo como autoridade.
// ============================================================


// ============================================================
// RESULTADO
// ============================================================

function obterResultadoVisual(
  resultado
) {
  switch (resultado) {
    case "CONCLUIDA":
      return {
        label:
          "Concluída",

        classe:
          "entrega-historico-status--success",

        Icon:
          CheckCircle2,
      };

    case "CANCELADA":
      return {
        label:
          "Cancelada",

        classe:
          "entrega-historico-status--cancelled",

        Icon:
          XCircle,
      };

    case "NEGADA":
      return {
        label:
          "Negada",

        classe:
          "entrega-historico-status--denied",

        Icon:
          Ban,
      };

    case "VALIDADA":
      return {
        label:
          "Validada",

        classe:
          "entrega-historico-status--progress",

        Icon:
          CheckCircle2,
      };

    case "INICIADA":
      return {
        label:
          "Iniciada",

        classe:
          "entrega-historico-status--progress",

        Icon:
          Clock3,
      };

    default:
      return {
        label:
          "Registrada",

        classe:
          "",

        Icon:
          History,
      };
  }
}


// ============================================================
// DATA DE ENCERRAMENTO MAIS REPRESENTATIVA
// ============================================================

function obterDataPrincipal(
  item
) {
  return (
    item?.concluida_em ||
    item?.cancelada_em ||
    item?.negada_em ||
    item?.validada_em ||
    item?.iniciada_em ||
    null
  );
}


// ============================================================
// FORMATAÇÃO SEGURA
//
// Se não houver timezone oficial do condomínio,
// NÃO usamos timezone local do dispositivo.
// ============================================================

function formatarDataHora(
  valor,
  timezoneIana
) {
  if (
    !valor ||
    !timezoneIana
  ) {
    return null;
  }

  const data =
    new Date(
      valor
    );

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(
      "pt-BR",
      {
        timeZone:
          timezoneIana,

        day:
          "2-digit",

        month:
          "2-digit",

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",

        hour12:
          false,
      }
    ).format(
      data
    );
  }
  catch {
    return null;
  }
}


// ============================================================
// VOLUMES
// ============================================================

function textoVolumes(
  total
) {
  const numero =
    Number(
      total
    );

  if (
    !Number.isFinite(
      numero
    ) ||
    numero <= 0
  ) {
    return null;
  }

  if (
    numero === 1
  ) {
    return "1 volume entregue";
  }

  return `${numero} volumes entregues`;
}


// ============================================================
// COMPONENTE
// ============================================================

export default function EntregaHistorico({
  historico = [],
  timezoneIana = null,
}) {
  if (
    !Array.isArray(
      historico
    ) ||
    historico.length === 0
  ) {
    return null;
  }


  return (
    <section className="entrega-historico">

      <details className="entrega-historico__details">

        <summary className="entrega-historico__summary">

          <div className="entrega-historico__summary-main">

            <span
              className="entrega-historico__summary-icon"
              aria-hidden="true"
            >
              <History size={17} />
            </span>


            <div>
              <strong>
                Histórico de retiradas
              </strong>

              <span>
                {historico.length === 1
                  ? "1 registro anterior"
                  : `${historico.length} registros anteriores`}
              </span>
            </div>

          </div>


          <ChevronDown
            size={17}
            className="entrega-historico__chevron"
            aria-hidden="true"
          />

        </summary>


        <div className="entrega-historico__content">

          {!timezoneIana ? (
            <div className="entrega-historico__timezone-note">
              <Clock3
                size={14}
                aria-hidden="true"
              />

              <span>
                Os horários serão exibidos no horário
                oficial do condomínio.
              </span>
            </div>
          ) : null}


          <div className="entrega-historico__list">

            {historico.map(
              (
                item,
                index
              ) => {
                const visual =
                  obterResultadoVisual(
                    item?.resultado
                  );

                const Icon =
                  visual.Icon;

                const data =
                  formatarDataHora(
                    obterDataPrincipal(
                      item
                    ),
                    timezoneIana
                  );

                const volumes =
                  textoVolumes(
                    item
                      ?.total_volumes_entregues
                  );


                return (
                  <article
                    key={
                      item
                        ?.retirada_id ||
                      `${item?.iniciada_em || "retirada"}-${index}`
                    }
                    className="entrega-historico-item"
                  >

                    <div
                      className={[
                        "entrega-historico-item__icon",
                        visual.classe,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-hidden="true"
                    >
                      <Icon size={15} />
                    </div>


                    <div className="entrega-historico-item__body">

                      <div className="entrega-historico-item__heading">

                        <strong>
                          {item?.retirante_nome_exibicao ||
                            "Pessoa não informada"}
                        </strong>


                        <span
                          className={[
                            "entrega-historico-status",
                            visual.classe,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {visual.label}
                        </span>

                      </div>


                      <div className="entrega-historico-item__meta">

                        {data ? (
                          <span>
                            <Clock3
                              size={13}
                              aria-hidden="true"
                            />

                            {data}
                          </span>
                        ) : null}


                        {volumes ? (
                          <span>
                            <PackageCheck
                              size={13}
                              aria-hidden="true"
                            />

                            {volumes}
                          </span>
                        ) : null}

                      </div>

                    </div>

                  </article>
                );
              }
            )}

          </div>

        </div>

      </details>

    </section>
  );
}