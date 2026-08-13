// ============================================================
// SISTEMA CHEGOU!
// RECEBIMENTO — VISÃO DE IMPRESSÃO
//
// Exclusiva para impressão operacional.
//
// NÃO:
// - possui ações;
// - possui filtros interativos;
// - possui Drawer;
// - possui modal;
// - altera dados;
// - acessa backend.
// ============================================================


function formatarDataHora(
  valor
) {
  if (!valor) {
    return "—";
  }

  const texto =
    String(valor).trim();

  const match =
    texto.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/
    );

  if (!match) {
    return texto;
  }

  const [
    ,
    ano,
    mes,
    dia,
    hora,
    minuto,
  ] = match;

  return `${dia}/${mes}/${ano} • ${hora}:${minuto}`;
}


function formatarReferenciaLote(
  recebimento
) {
  if (
    recebimento?.referenciaLote
  ) {
    return recebimento.referenciaLote;
  }

  if (
    recebimento?.numeroLote
  ) {
    return `LOTE-${String(
      recebimento.numeroLote
    ).padStart(
      6,
      "0"
    )}`;
  }

  return "—";
}


function formatarIdentificacao(
  volume
) {
  const identificacao =
    volume?.identificacao ||
    {};

  const local =
    [
      identificacao.torre
        ? `Torre ${identificacao.torre}`
        : null,

      identificacao.bloco
        ? `Bloco ${identificacao.bloco}`
        : null,

      identificacao.unidade
        ? `Unidade ${identificacao.unidade}`
        : null,
    ]
      .filter(Boolean)
      .join(" • ");


  if (
    identificacao
      .beneficiarioNome
  ) {
    return [
      identificacao
        .beneficiarioNome,

      local,
    ]
      .filter(Boolean)
      .join(" • ");
  }


  if (local) {
    return local;
  }


  if (
    identificacao.status ===
    "AGUARDANDO_IDENTIFICACAO"
  ) {
    return "Aguardando identificação";
  }


  if (
    identificacao.status ===
    "EM_IDENTIFICACAO"
  ) {
    return "Em identificação";
  }


  return "Não identificado";
}


function formatarOcorrencia(
  volume
) {
  if (
    !volume?.possuiAvaria
  ) {
    return "—";
  }


  const primeira =
    Array.isArray(
      volume?.avarias
    )
      ? volume.avarias[0]
      : null;


  if (!primeira) {
    return "Avaria";
  }


  switch (
    primeira.tipoOcorrencia
  ) {
    case "AVARIA_LEVE":
      return "Avaria leve";

    case "AVARIA_MODERADA":
      return "Avaria moderada";

    case "AVARIA_GRAVE":
      return "Avaria grave";

    case "EMBALAGEM_ABERTA":
      return "Embalagem aberta";

    case "EMBALAGEM_VIOLADA":
      return "Embalagem violada";

    case "EMBALAGEM_MOLHADA":
      return "Embalagem molhada";

    case "EMBALAGEM_AMASSADA":
      return "Embalagem amassada";

    default:
      return "Avaria";
  }
}


function formatarEntrada(
  volume
) {
  return volume
    ?.entradaOficial
    ?.realizada
    ? "Realizada"
    : "Aguardando";
}


export default function RecebimentoPrintView({
  recebimentos = [],
  resumo = null,
  condominioNome = "Condomínio",
  periodoLabel = "Todos",
}) {
  const emitidoEm =
    new Intl.DateTimeFormat(
      "pt-BR",
      {
        dateStyle:
          "short",

        timeStyle:
          "short",
      }
    ).format(
      new Date()
    );


  return (
    <section
      className="recebimento-print-view"
      aria-hidden="true"
    >
      <header className="recebimento-print-view__header">
        <h1>
          {condominioNome}
        </h1>

        <h2>
          Recebimentos de Encomendas
        </h2>

        <p>
          Período: {periodoLabel}
        </p>
      </header>


      <section className="recebimento-print-summary">
        <div>
          <span>
            Entradas hoje
          </span>

          <strong>
            {resumo
              ?.entradasOficiaisHoje
              ?.total ?? 0}
          </strong>
        </div>


        <div>
          <span>
            Aguardando Entrada
          </span>

          <strong>
            {resumo
              ?.aguardandoEntradaOficial
              ?.total ?? 0}
          </strong>
        </div>


        <div>
          <span>
            Com divergência
          </span>

          <strong>
            {resumo
              ?.comDivergencia
              ?.total ?? 0}
          </strong>
        </div>


        <div>
          <span>
            Com avaria
          </span>

          <strong>
            {resumo
              ?.comAvaria
              ?.total ?? 0}
          </strong>
        </div>
      </section>


      <div className="recebimento-print-lotes">
        {recebimentos.map(
          (recebimento) => {
            const volumes =
              Array.isArray(
                recebimento
                  ?.volumes
              )
                ? recebimento
                    .volumes
                : [];


            return (
              <section
                key={
                  recebimento.id
                }
                className="recebimento-print-lote"
              >
                <header className="recebimento-print-lote__header">
                  <div>
                    <strong>
                      {formatarReferenciaLote(
                        recebimento
                      )}
                    </strong>

                    <span>
                      {recebimento
                        .transportadora ||
                        "—"}
                    </span>
                  </div>


                  <div>
                    <span>
                      {recebimento
                        .entregador ||
                        "—"}
                    </span>

                    <span>
                      {formatarDataHora(
                        recebimento
                          .finalizadoEmLocal ||
                        recebimento
                          .criadoEmLocal
                      )}
                    </span>
                  </div>
                </header>


                <table className="recebimento-print-lote__table">
                  <thead>
                    <tr>
                      <th>
                        Volume
                      </th>

                      <th>
                        Código / Rastreio
                      </th>

                      <th>
                        Identificação
                      </th>

                      <th>
                        Ocorrência
                      </th>

                      <th>
                        Entrada
                      </th>
                    </tr>
                  </thead>


                  <tbody>
                    {volumes.map(
                      (
                        volume,
                        index
                      ) => (
                        <tr
                          key={
                            volume.id
                          }
                        >
                          <td>
                            {volume
                              .numeroVolume ??
                              index + 1}
                          </td>

                          <td>
                            {volume
                              .codigoNormalizado ||
                              volume
                                .codigoLido ||
                              "—"}
                          </td>

                          <td>
                            {formatarIdentificacao(
                              volume
                            )}
                          </td>

                          <td>
                            {formatarOcorrencia(
                              volume
                            )}
                          </td>

                          <td>
                            {formatarEntrada(
                              volume
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </section>
            );
          }
        )}
      </div>


      <footer className="recebimento-print-view__footer">
        <span>
          Sistema Chegou
          <strong className="recebimento-print-view__brand-mark">
            !
          </strong>
        </span>

        <span>
          Emitido em {emitidoEm}
        </span>
      </footer>
    </section>
  );
}