import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  PackageCheck,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  confirmarDisponibilizacaoRetirada,
  listarPendenciasDisponibilizacao,
} from "../services/disponibilizacaoService";

import DisponibilizacaoConfirmModal
  from "./DisponibilizacaoConfirmModal";

import "./EntradaDisponibilizacaoPendentes.css";

function formatarDataHoraLocal(
  valor
) {
  if (!valor) {
    return "—";
  }

  const match =
    String(valor).match(
      /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/
    );

  if (!match) {
    return String(valor);
  }

  const [
    ,
    ano,
    mes,
    dia,
    hora,
    minuto,
  ] = match;

  return `${dia}/${mes}/${ano} • ${hora}:${minuto}h`;
}

function formatarNumero(
  numero
) {
  if (
    numero === null ||
    numero === undefined
  ) {
    return "—";
  }

  const n =
    Number(numero);

  if (!Number.isFinite(n)) {
    return String(numero);
  }

  return `#${String(n).padStart(3, "0")}`;
}

function montarUnidade(
  item
) {
  const nome =
    item?.torreNome ||
    "Torre/Bloco";

  const identificador =
    item?.torreIdentificador;

  const unidade =
    item?.unidadeNumero;

  if (
    identificador &&
    unidade
  ) {
    return `${nome} • ${identificador} - ${unidade}`;
  }

  if (unidade) {
    return `${nome} - ${unidade}`;
  }

  return nome;
}

function montarLocalizacao(
  item
) {
  const nomes = [
    item?.localizacaoPaiNome,
    item?.localizacaoNome,
  ].filter(Boolean);

  const nome =
    nomes.join(" — ") ||
    "Localização registrada";

  return item?.localizacaoCodigo
    ? `${nome} • ${item.localizacaoCodigo}`
    : nome;
}

function primeiraMensagemBloqueio(
  item
) {
  const bloqueio =
    Array.isArray(item?.bloqueios)
      ? item.bloqueios[0]
      : null;

  return (
    bloqueio?.mensagem ||
    "A disponibilização está bloqueada pelo backend."
  );
}

export default function EntradaDisponibilizacaoPendentes({
  condominioId,
  refreshKey = 0,
}) {
  const mountedRef =
    useRef(true);

  const requestRef =
    useRef(0);

  const [
    itens,
    setItens,
  ] =
    useState([]);

  const [
    total,
    setTotal,
  ] =
    useState(0);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState(null);

  const [
    itemConfirmacao,
    setItemConfirmacao,
  ] =
    useState(null);

  const [
    processandoId,
    setProcessandoId,
  ] =
    useState(null);

  const [
    erroConfirmacao,
    setErroConfirmacao,
  ] =
    useState(null);

  const [
    feedback,
    setFeedback,
  ] =
    useState(null);

  useEffect(() => {
    mountedRef.current =
      true;

    return () => {
      mountedRef.current =
        false;

      ++requestRef.current;
    };
  }, []);

  const carregar =
    useCallback(async () => {
      if (!condominioId) {
        setItens([]);
        setTotal(0);
        setError(null);
        return;
      }

      const requestId =
        ++requestRef.current;

      setLoading(true);
      setError(null);

      try {
        const resultado =
          await listarPendenciasDisponibilizacao({
            condominioId,
            apenasElegiveis:
              false,
            limite:
              50,
            offset:
              0,
          });

        if (
          !mountedRef.current ||
          requestId !==
            requestRef.current
        ) {
          return;
        }

        setItens(
          Array.isArray(
            resultado.itens
          )
            ? resultado.itens
            : []
        );

        setTotal(
          Number(
            resultado.total ||
            0
          )
        );
      } catch (err) {
        if (
          !mountedRef.current ||
          requestId !==
            requestRef.current
        ) {
          return;
        }

        setItens([]);
        setTotal(0);

        setError(
          err?.message ||
            "Não foi possível carregar as pendências de disponibilização."
        );
      } finally {
        if (
          mountedRef.current &&
          requestId ===
            requestRef.current
        ) {
          setLoading(false);
        }
      }
    }, [
      condominioId,
    ]);

  useEffect(() => {
    carregar();
  }, [
    carregar,
    refreshKey,
  ]);

  const abrirConfirmacao =
    useCallback(
      (item) => {
        if (
          !item ||
          item.elegivelDisponibilizacao !==
            true ||
          processandoId
        ) {
          return;
        }

        setFeedback(null);
        setErroConfirmacao(null);
        setItemConfirmacao(item);
      },
      [
        processandoId,
      ]
    );

  const fecharConfirmacao =
    useCallback(() => {
      if (processandoId) {
        return;
      }

      setErroConfirmacao(null);
      setItemConfirmacao(null);
    }, [
      processandoId,
    ]);

  const confirmar =
    useCallback(async () => {
      if (
        !itemConfirmacao?.encomendaId ||
        processandoId
      ) {
        return;
      }

      const encomendaId =
        itemConfirmacao.encomendaId;

      setProcessandoId(
        encomendaId
      );

      setErroConfirmacao(null);
      setFeedback(null);

      try {
        const resultado =
          await confirmarDisponibilizacaoRetirada({
            encomendaId,
          });

        if (!mountedRef.current) {
          return;
        }

        setItemConfirmacao(null);

        setFeedback({
          tipo:
            "success",

          mensagem:
            `${formatarNumero(
              resultado.numeroEncomenda ??
                itemConfirmacao.numeroEncomenda
            )} disponibilizada para retirada com sucesso.`,

          eventId:
            resultado.eventId ||
            null,

          idempotente:
            resultado.idempotente ===
            true,
        });

        await carregar();
      } catch (err) {
        if (!mountedRef.current) {
          return;
        }

        setErroConfirmacao(
          err?.message ||
            "Não foi possível disponibilizar a encomenda para retirada."
        );
      } finally {
        if (mountedRef.current) {
          setProcessandoId(null);
        }
      }
    }, [
      itemConfirmacao,
      processandoId,
      carregar,
    ]);

  return (
    <>
      <section
        className="entrada-availability-pending"
        aria-labelledby="entrada-availability-pending-title"
      >
        <div className="entrada-availability-pending__heading">
          <div className="entrada-availability-pending__heading-copy">
            <span className="entrada-availability-pending__eyebrow">
              Continuidade operacional
            </span>

            <div className="entrada-availability-pending__title-row">
              <h2 id="entrada-availability-pending-title">
                Pendentes de disponibilização
              </h2>

              {!loading && !error ? (
                <span
                  className="entrada-availability-pending__count"
                  aria-label={`${total} pendências de disponibilização`}
                >
                  {total}
                </span>
              ) : null}
            </div>

            <p>
              Encomendas já armazenadas que ainda precisam ser liberadas para retirada.
            </p>
          </div>

          <button
            type="button"
            className="entrada-availability-pending__refresh"
            onClick={carregar}
            disabled={
              loading ||
              !condominioId ||
              Boolean(processandoId)
            }
            aria-label="Atualizar pendências de disponibilização"
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "entrada-availability-pending__spin"
                  : ""
              }
            />

            <span>
              Atualizar
            </span>
          </button>
        </div>

        {feedback ? (
          <div
            className="entrada-availability-pending__feedback"
            role="status"
          >
            <CheckCircle2
              size={19}
              aria-hidden="true"
            />

            <div>
              <strong>
                Disponibilização concluída
              </strong>

              <p>
                {feedback.mensagem}
              </p>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div
            className="entrada-availability-pending__state"
            role="status"
          >
            <LoaderCircle
              size={22}
              className="entrada-availability-pending__spin"
            />

            <div>
              <strong>
                Carregando pendências
              </strong>

              <p>
                Consultando o estado oficial da disponibilização.
              </p>
            </div>
          </div>
        ) : error ? (
          <div
            className="entrada-availability-pending__state entrada-availability-pending__state--error"
            role="alert"
          >
            <AlertCircle
              size={22}
            />

            <div>
              <strong>
                Não foi possível carregar
              </strong>

              <p>
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={carregar}
            >
              Tentar novamente
            </button>
          </div>
        ) : itens.length === 0 ? (
          <div className="entrada-availability-pending__empty">
            <PackageCheck
              size={24}
            />

            <div>
              <strong>
                Nenhuma encomenda aguardando disponibilização
              </strong>

              <p>
                Não há continuidade operacional pendente neste momento.
              </p>
            </div>
          </div>
        ) : (
          <div className="entrada-availability-pending__list">
            {itens.map(
              (
                item,
                index
              ) => {
                const elegivel =
                  item.elegivelDisponibilizacao ===
                  true;

                const processando =
                  processandoId ===
                  item.encomendaId;

                return (
                  <article
                    className={`entrada-availability-pending__item ${
                      elegivel
                        ? ""
                        : "entrada-availability-pending__item--blocked"
                    }`}
                    key={
                      item.encomendaId
                    }
                  >
                    <span className="entrada-availability-pending__order">
                      {index + 1}
                    </span>

                    <div className="entrada-availability-pending__item-main">
                      <div className="entrada-availability-pending__item-title">
                        <strong>
                          {formatarNumero(
                            item.numeroEncomenda
                          )}
                        </strong>

                        <span>
                          {item.destinatarioNome ||
                            "Destinatário identificado"}
                        </span>
                      </div>

                      <div className="entrada-availability-pending__meta">
                        <span>
                          <Clock3
                            size={14}
                          />

                          {formatarDataHoraLocal(
                            item.armazenadoEmLocal
                          )}
                        </span>

                        <span>
                          <MapPin
                            size={14}
                          />

                          {montarLocalizacao(
                            item
                          )}
                        </span>

                        <span>
                          <PackageCheck
                            size={14}
                          />

                          {montarUnidade(
                            item
                          )}
                        </span>
                      </div>

                      {!elegivel ? (
                        <div
                          className="entrada-availability-pending__blocked"
                          role="status"
                        >
                          <ShieldAlert
                            size={15}
                          />

                          <span>
                            {primeiraMensagemBloqueio(
                              item
                            )}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="entrada-availability-pending__actions">
                      <span
                        className={`entrada-availability-pending__status ${
                          elegivel
                            ? "entrada-availability-pending__status--ready"
                            : "entrada-availability-pending__status--blocked"
                        }`}
                      >
                        {elegivel
                          ? "Elegível"
                          : "Bloqueada"}
                      </span>

                      {elegivel ? (
                        <button
                          type="button"
                          className="entrada-availability-pending__action"
                          onClick={() =>
                            abrirConfirmacao(
                              item
                            )
                          }
                          disabled={
                            Boolean(processandoId)
                          }
                        >
                          {processando ? (
                            <LoaderCircle
                              size={16}
                              className="entrada-availability-pending__spin"
                            />
                          ) : (
                            <PackageCheck
                              size={16}
                            />
                          )}

                          <span>
                            {processando
                              ? "Disponibilizando..."
                              : "Disponibilizar para retirada"}
                          </span>
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

      <DisponibilizacaoConfirmModal
        open={
          Boolean(itemConfirmacao)
        }
        processando={
          Boolean(processandoId)
        }
        erro={
          erroConfirmacao
        }
        numeroEncomenda={
          formatarNumero(
            itemConfirmacao?.numeroEncomenda
          )
        }
        destinatarioNome={
          itemConfirmacao?.destinatarioNome ||
          "Destinatário identificado"
        }
        unidadeLabel={
          itemConfirmacao
            ? montarUnidade(
                itemConfirmacao
              )
            : "—"
        }
        localizacaoLabel={
          itemConfirmacao
            ? montarLocalizacao(
                itemConfirmacao
              )
            : "—"
        }
        onClose={
          fecharConfirmacao
        }
        onConfirm={
          confirmar
        }
      />
    </>
  );
}