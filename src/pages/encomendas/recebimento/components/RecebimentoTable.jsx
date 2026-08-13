import {
  Fragment,
  useMemo,
  useState,
} from "react";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  Inbox,
  Info,
} from "lucide-react";

import RecebimentoStatusDot from "./RecebimentoStatusDot";

const PAGE_SIZE_OPTIONS = [7, 15, 20];


// ============================================================
// HELPERS
// ============================================================

function formatarStatusLote(
  recebimento
) {
  if (
    recebimento?.possuiDivergenciaQuantidade
  ) {
    return {
      label:
        "Com divergência",

      tone:
        "danger",
    };
  }


  if (
    Number(
      recebimento?.volumesComAvaria
    ) > 0
  ) {
    return {
      label:
        "Com avaria",

      tone:
        "warning",
    };
  }


  if (
    recebimento?.status ===
    "PARCIALMENTE_PROCESSADO"
  ) {
    return {
      label:
        "Entrada parcial",

      tone:
        "info",
    };
  }


  return {
    label:
      "Aguardando Entrada",

    tone:
      "neutral",
  };
}


function formatarStatusVolume(
  volume
) {
  if (
    volume?.entradaOficial
      ?.realizada
  ) {
    return {
      label:
        "Entrada realizada",

      tone:
        "success",
    };
  }


  if (
    volume?.status ===
    "PENDENTE_IDENTIFICACAO"
  ) {
    return {
      label:
        "Aguardando identificação",

      tone:
        "warning",
    };
  }


  if (
    volume?.status ===
    "EM_IDENTIFICACAO"
  ) {
    return {
      label:
        "Em identificação",

      tone:
        "info",
    };
  }


  return {
    label:
      "Aguardando Entrada",

    tone:
      "neutral",
  };
}


function formatarOcorrenciaVolume(
  volume
) {
  if (
    !volume?.possuiAvaria
  ) {
    return "—";
  }


  const primeiraAvaria =
    Array.isArray(
      volume?.avarias
    )
      ? volume.avarias[0]
      : null;


  if (!primeiraAvaria) {
    return "Avaria";
  }


  switch (
    primeiraAvaria.tipoOcorrencia
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


function formatarIdentificacaoResumo(
  volume
) {
  const identificacao =
    volume?.identificacao ||
    {};


  if (
    identificacao
      .rastreioAguardado
  ) {
    const partes = [];


    if (
      identificacao
        .beneficiarioNome
    ) {
      partes.push(
        identificacao
          .beneficiarioNome
      );
    }


    const local = [
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


    if (local) {
      partes.push(
        local
      );
    }


    return {
      reconhecido:
        true,

      principal:
        partes[0] ||
        "Rastreio reconhecido",

      secundario:
        partes[1] ||
        "Rastreio aguardado pelo morador",
    };
  }


  if (
    identificacao.status ===
    "AGUARDANDO_IDENTIFICACAO"
  ) {
    return {
      reconhecido:
        false,

      principal:
        "Aguardando identificação",

      secundario:
        null,
    };
  }


  if (
    identificacao.status ===
    "EM_IDENTIFICACAO"
  ) {
    return {
      reconhecido:
        false,

      principal:
        "Em identificação",

      secundario:
        null,
    };
  }


  return {
    reconhecido:
      false,

    principal:
      "Não identificado",

    secundario:
      null,
  };
}


function formatarReferenciaLote(
  recebimento
) {
  if (
    recebimento
      ?.referenciaLote
  ) {
    return recebimento
      .referenciaLote;
  }


  if (
    recebimento
      ?.numeroLote
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

function formatarDataHoraLocal(
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

// ============================================================
// COMPONENT
// ============================================================

export default function RecebimentoTable({
  recebimentos = [],
  loading = false,
  updating = false,
  onVisualizar,
}) {
  const [
    pageSize,
    setPageSize,
  ] = useState(7);


  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);


  const [
    lotesExpandidos,
    setLotesExpandidos,
  ] = useState(
    new Set()
  );


  const [
    identificacaoSelecionada,
    setIdentificacaoSelecionada,
  ] = useState(null);


  const totalRegistros =
    recebimentos.length;


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalRegistros /
        pageSize
      )
    );


  const safeCurrentPage =
    Math.min(
      currentPage,
      totalPages
    );


  const registrosPagina =
    useMemo(() => {
      const inicio =
        (
          safeCurrentPage -
          1
        ) *
        pageSize;


      return recebimentos.slice(
        inicio,
        inicio +
        pageSize
      );
    }, [
      recebimentos,
      pageSize,
      safeCurrentPage,
    ]);


  function handlePageSizeChange(
    event
  ) {
    setPageSize(
      Number(
        event.target.value
      )
    );

    setCurrentPage(1);
  }


  function handlePreviousPage() {
    setCurrentPage(
      (page) =>
        Math.max(
          1,
          page - 1
        )
    );
  }


  function handleNextPage() {
    setCurrentPage(
      (page) =>
        Math.min(
          totalPages,
          page + 1
        )
    );
  }


  function toggleLote(
    recebimentoId
  ) {
    setLotesExpandidos(
      (atual) => {
        const proximo =
          new Set(
            atual
          );


        if (
          proximo.has(
            recebimentoId
          )
        ) {
          proximo.delete(
            recebimentoId
          );
        } else {
          proximo.add(
            recebimentoId
          );
        }


        return proximo;
      }
    );
  }


  function abrirIdentificacao(
    volume
  ) {
    setIdentificacaoSelecionada(
      volume
    );
  }


  function fecharIdentificacao() {
    setIdentificacaoSelecionada(
      null
    );
  }


  if (
    loading &&
    totalRegistros === 0
  ) {
    return (
      <div className="recebimento-table-card">
        <div
          className="recebimento-table-empty"
          role="status"
          aria-live="polite"
        >
          <div className="recebimento-table-empty__icon">
            <Inbox
              size={24}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </div>

          <p className="recebimento-table-empty__title">
            Carregando recebimentos...
          </p>

          <p className="recebimento-table-empty__description">
            Aguarde enquanto a fila operacional é atualizada.
          </p>
        </div>
      </div>
    );
  }


  if (
    totalRegistros === 0
  ) {
    return (
      <div className="recebimento-table-card">
        <div className="recebimento-table-empty">
          <div className="recebimento-table-empty__icon">
            <Inbox
              size={24}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </div>

          <p className="recebimento-table-empty__title">
            Nenhum lote aguardando Entrada.
          </p>

          <p className="recebimento-table-empty__description">
            Quando um recebimento for concluído e ainda
            possuir volumes aguardando Entrada, ele aparecerá
            nesta fila.
          </p>
        </div>

        <TableFooter
          pageSize={
            pageSize
          }
          currentPage={
            1
          }
          totalPages={
            1
          }
          totalRegistros={
            0
          }
          onPageSizeChange={
            handlePageSizeChange
          }
          onPrevious={
            handlePreviousPage
          }
          onNext={
            handleNextPage
          }
        />
      </div>
    );
  }


  return (
    <>
      <div
        className={`recebimento-table-card ${
          updating
            ? "recebimento-table-card--updating"
            : ""
        }`}
        aria-busy={
          updating
        }
      >
        <div className="recebimento-table-scroll">
          <table className="recebimento-table">
            <thead>
              <tr>
                <th>
                  Nº Lote
                </th>

                <th>
                  Entrega
                </th>

                <th>
                  Volumes
                </th>

                <th>
                  Ocorrências
                </th>

                <th>
                  Situação
                </th>

                <th className="recebimento-table__actions-heading">
                  Ações
                </th>
              </tr>
            </thead>


            <tbody>
              {registrosPagina.map(
                (
                  recebimento
                ) => {
                  const statusLote =
                    formatarStatusLote(
                      recebimento
                    );


                  const expandido =
                    lotesExpandidos.has(
                      recebimento.id
                    );


                  const volumes =
                    Array.isArray(
                      recebimento
                        .volumes
                    )
                      ? recebimento
                          .volumes
                      : [];


                  return (
                    <Fragment
                      key={
                        recebimento.id
                      }
                    >
                      <tr className="recebimento-table__lote-row">
                        <td>
                          <div className="recebimento-lote">
                            <button
                              type="button"
                              className="recebimento-lote__expand"
                              onClick={() =>
                                toggleLote(
                                  recebimento.id
                                )
                              }
                              aria-expanded={
                                expandido
                              }
                              aria-label={
                                expandido
                                  ? `Recolher ${formatarReferenciaLote(
                                      recebimento
                                    )}`
                                  : `Expandir ${formatarReferenciaLote(
                                      recebimento
                                    )}`
                              }
                            >
                              {expandido ? (
                                <ChevronUp
                                  size={15}
                                  aria-hidden="true"
                                />
                              ) : (
                                <ChevronDown
                                  size={15}
                                  aria-hidden="true"
                                />
                              )}
                            </button>


                            <RecebimentoStatusDot
                              tone={
                                statusLote.tone
                              }
                              label={
                                statusLote.label
                              }
                            />


                            <strong>
                              {formatarReferenciaLote(
                                recebimento
                              )}
                            </strong>
                          </div>
                        </td>


                        <td>
                          <div className="recebimento-entrega-cell">
                            <strong>
                              {recebimento.transportadora ||
                                "—"}
                            </strong>

                            <span>
                              {recebimento.entregador ||
                                "—"}
                            </span>

                            <small>
                              {formatarDataHoraLocal(
                                recebimento.finalizadoEmLocal ||
                                  recebimento.criadoEmLocal
                              )}
                            </small>
                          </div>
                        </td>


                        <td>
                          <div className="recebimento-volume-cell">
                            <strong>
                              {recebimento.volumesTotal}
                            </strong>

                            <span className="recebimento-volume-cell__meta">
                              {recebimento.volumesAguardandoEntrada} aguardando
                            </span>
                          </div>
                        </td>


                        <td>
                          {recebimento.possuiDivergenciaQuantidade
                            ? "Divergência de quantidade"
                            : recebimento.volumesComAvaria > 0
                              ? `${recebimento.volumesComAvaria} com avaria`
                              : "—"}
                        </td>


                        <td>
                          <span
                            className={`recebimento-status-badge recebimento-status-badge--${statusLote.tone}`}
                          >
                            {statusLote.label}
                          </span>
                        </td>


                        <td className="recebimento-table__actions">
                          <button
                            type="button"
                            className="recebimento-table__view-button"
                            onClick={() =>
                              onVisualizar?.(
                                recebimento
                              )
                            }
                          >
                            <Eye
                              size={16}
                              strokeWidth={2}
                              aria-hidden="true"
                            />

                            Visualizar
                          </button>
                        </td>
                      </tr>


                      {expandido && (
                        <tr className="recebimento-table__detail-row">
                          <td colSpan={6}>
                            <div className="recebimento-volume-subtable">
                              <div className="recebimento-volume-subtable__header">
                                <div>
                                  <strong>
                                    Pacotes do lote
                                  </strong>

                                  <span>
                                    {volumes.length === 1
                                      ? "1 volume"
                                      : `${volumes.length} volumes`}
                                  </span>
                                </div>
                              </div>


                              <div className="recebimento-volume-subtable__scroll">
                                <table>
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

                                      <th>
                                        Ação
                                      </th>
                                    </tr>
                                  </thead>


                                  <tbody>
                                    {volumes.map(
                                      (
                                        volume,
                                        index
                                      ) => {
                                        const statusVolume =
                                          formatarStatusVolume(
                                            volume
                                          );


                                        const identificacao =
                                          formatarIdentificacaoResumo(
                                            volume
                                          );


                                        const linhaReconhecida =
                                          Boolean(
                                            volume
                                              ?.identificacao
                                              ?.rastreioAguardado
                                          );


                                        return (
                                          <tr
                                            key={
                                              volume.id
                                            }
                                            className={
                                              linhaReconhecida
                                                ? "recebimento-volume-subtable__row--recognized"
                                                : ""
                                            }
                                          >
                                            <td>
                                              <strong>
                                                {volume.numeroVolume ??
                                                  index + 1}
                                              </strong>
                                            </td>


                                            <td>
                                              <code className="recebimento-volume-code">
                                                {volume.codigoNormalizado ||
                                                  volume.codigoLido ||
                                                  "—"}
                                              </code>
                                            </td>


                                            <td>
                                              <div className="recebimento-volume-identification">
                                                <strong>
                                                  {identificacao.principal}
                                                </strong>

                                                {identificacao.secundario && (
                                                  <span>
                                                    {identificacao.secundario}
                                                  </span>
                                                )}

                                                {linhaReconhecida && (
                                                  <small>
                                                    Rastreio reconhecido
                                                  </small>
                                                )}
                                              </div>
                                            </td>


                                            <td>
                                              <div className="recebimento-volume-occurrence">
                                                <span>
                                                  {formatarOcorrenciaVolume(
                                                    volume
                                                  )}
                                                </span>

                                                {volume.fotoAvariaPendente && (
                                                  <small>
                                                    Foto pendente
                                                  </small>
                                                )}
                                              </div>
                                            </td>


                                            <td>
                                              <span
                                                className={`recebimento-status-badge recebimento-status-badge--${statusVolume.tone}`}
                                              >
                                                {statusVolume.label}
                                              </span>
                                            </td>


                                            <td>
                                              {linhaReconhecida ? (
                                                <button
                                                  type="button"
                                                  className="recebimento-volume-identification__button"
                                                  onClick={() =>
                                                    abrirIdentificacao(
                                                      volume
                                                    )
                                                  }
                                                >
                                                  <Info
                                                    size={14}
                                                    aria-hidden="true"
                                                  />

                                                  Ver identificação
                                                </button>
                                              ) : (
                                                "—"
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      }
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                }
              )}
            </tbody>
          </table>
        </div>


        <TableFooter
          pageSize={
            pageSize
          }
          currentPage={
            safeCurrentPage
          }
          totalPages={
            totalPages
          }
          totalRegistros={
            totalRegistros
          }
          onPageSizeChange={
            handlePageSizeChange
          }
          onPrevious={
            handlePreviousPage
          }
          onNext={
            handleNextPage
          }
        />
      </div>


      <IdentificationModal
        volume={
          identificacaoSelecionada
        }
        onClose={
          fecharIdentificacao
        }
      />
    </>
  );
}


// ============================================================
// FOOTER
// ============================================================

function TableFooter({
  pageSize,
  currentPage,
  totalPages,
  totalRegistros,
  onPageSizeChange,
  onPrevious,
  onNext,
}) {
  return (
    <footer className="recebimento-table-footer">
      <div className="recebimento-table-footer__size">
        <span>
          Linhas por página
        </span>

        <select
          value={
            pageSize
          }
          onChange={
            onPageSizeChange
          }
          aria-label="Quantidade de linhas por página"
        >
          {PAGE_SIZE_OPTIONS.map(
            (size) => (
              <option
                key={
                  size
                }
                value={
                  size
                }
              >
                {size}
              </option>
            )
          )}
        </select>
      </div>


      <div className="recebimento-table-footer__summary">
        {totalRegistros === 0
          ? "Nenhum registro"
          : `${totalRegistros} lote${
              totalRegistros === 1
                ? ""
                : "s"
            }`}
      </div>


      <div className="recebimento-table-footer__navigation">
        <button
          type="button"
          onClick={
            onPrevious
          }
          disabled={
            currentPage <= 1
          }
          aria-label="Página anterior"
        >
          <ChevronLeft
            size={17}
            aria-hidden="true"
          />
        </button>

        <span>
          Página {currentPage} de {totalPages}
        </span>

        <button
          type="button"
          onClick={
            onNext
          }
          disabled={
            currentPage >=
            totalPages
          }
          aria-label="Próxima página"
        >
          <ChevronRight
            size={17}
            aria-hidden="true"
          />
        </button>
      </div>
    </footer>
  );
}


// ============================================================
// MODAL — IDENTIFICAÇÃO RECONHECIDA
// ============================================================

function IdentificationModal({
  volume,
  onClose,
}) {
  if (!volume) {
    return null;
  }


  const identificacao =
    volume.identificacao ||
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


  return (
    <div
      className="recebimento-identification-modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose?.();
        }
      }}
    >
      <section
        className="recebimento-identification-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recebimento-identification-modal-title"
      >
        <header className="recebimento-identification-modal__header">
          <div>
            <span className="recebimento-identification-modal__eyebrow">
              Rastreio reconhecido
            </span>

            <h3
              id="recebimento-identification-modal-title"
            >
              Identificação aguardada
            </h3>
          </div>
        </header>


        <div className="recebimento-identification-modal__body">
          <div className="recebimento-identification-modal__code">
            {volume.codigoNormalizado ||
              volume.codigoLido ||
              "—"}
          </div>


          <dl className="recebimento-identification-modal__details">
            <div>
              <dt>
                Morador
              </dt>

              <dd>
                {identificacao.beneficiarioNome ||
                  "—"}
              </dd>
            </div>


            <div>
              <dt>
                Unidade
              </dt>

              <dd>
                {local ||
                  "—"}
              </dd>
            </div>


            <div>
              <dt>
                Situação
              </dt>

              <dd>
                Rastreio reconhecido
              </dd>
            </div>


            <div>
              <dt>
                Entrada
              </dt>

              <dd>
                {volume
                  ?.entradaOficial
                  ?.realizada
                  ? "Realizada"
                  : "Aguardando Entrada"}
              </dd>
            </div>
          </dl>
        </div>


        <footer className="recebimento-identification-modal__footer">
          <button
            type="button"
            className="recebimento-table__view-button"
            onClick={
              onClose
            }
          >
            Fechar
          </button>
        </footer>
      </section>
    </div>
  );
}