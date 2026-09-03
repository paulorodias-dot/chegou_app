import {
  CheckCircle2,
  Clock3,
  Link2,
  LoaderCircle,
  QrCode,
  RefreshCw,
  Smartphone,
  Unplug,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  QRCodeSVG,
} from "qrcode.react";

import {
  criarPonteMobileEntrada,
  encerrarPonteMobileEntrada,
  obterStatusPonteMobileEntrada,
} from "../services/entradaPonteMobileService";

import "./EntradaPonteMobile.css";

// ============================================================
// SISTEMA CHEGOU!
// CENTRAL DE ENCOMENDAS — ENTRADA
//
// E3.2-E.2
// PAINEL DESKTOP DA PONTE MOBILE
// ============================================================

const STATUS_ATIVOS =
  new Set([
    "AGUARDANDO_CONEXAO",
    "CONECTADA",
  ]);

const STATUS_ENCERRADOS =
  new Set([
    "EXPIRADA_PAREAMENTO",
    "EXPIRADA_INATIVIDADE",
    "EXPIRADA_TTL",
    "ENCERRADA",
    "REVOGADA",
    "INVALIDADA_LOTE",
  ]);

const POLLING_MS =
  2000;

// ============================================================
// HELPERS
// ============================================================

function segundosRestantes(
  destino,
  agoraMs
) {
  if (!destino) {
    return null;
  }

  const fim =
    new Date(
      destino
    ).getTime();

  if (
    !Number.isFinite(
      fim
    )
  ) {
    return null;
  }

  return Math.max(
    0,
    Math.ceil(
      (fim - agoraMs) /
        1000
    )
  );
}

function formatarContagem(
  segundos
) {
  if (
    segundos === null ||
    segundos === undefined
  ) {
    return "--:--";
  }

  const valor =
    Math.max(
      0,
      Math.floor(
        segundos
      )
    );

  const minutos =
    Math.floor(
      valor / 60
    );

  const resto =
    valor % 60;

  return `${String(
    minutos
  ).padStart(
    2,
    "0"
  )}:${String(
    resto
  ).padStart(
    2,
    "0"
  )}`;
}

function traduzirEvento(
  tipo
) {
  switch (
    String(
      tipo || ""
    ).toUpperCase()
  ) {
    case "PONTE_CRIADA":
      return "Conexão preparada";

    case "MOBILE_CONECTADO":
      return "Celular conectado";

    case "CAMERA_ABERTA":
      return "Câmera aberta";

    case "CODIGO_CAPTURADO":
      return "Código capturado";

    case "ETIQUETA_CAPTURADA":
      return "Etiqueta capturada";

    case "OCR_INICIADO":
      return "Analisando etiqueta";

    case "OCR_CONCLUIDO":
      return "Etiqueta analisada";

    case "RESULTADO_ENVIADO":
      return "Informações recebidas";

    case "PONTE_ENCERRADA":
      return "Celular desconectado";

    default:
      return "Atividade no celular";
  }
}

function traduzirStatus(
  status
) {
  switch (status) {
    case "AGUARDANDO_CONEXAO":
      return "Aguardando celular";

    case "CONECTADA":
      return "Celular conectado";

    case "EXPIRADA_PAREAMENTO":
      return "QR Code expirado";

    case "EXPIRADA_INATIVIDADE":
      return "Desconectado por inatividade";

    case "EXPIRADA_TTL":
      return "Tempo da conexão encerrado";

    case "ENCERRADA":
      return "Conexão encerrada";

    case "REVOGADA":
      return "Conexão substituída";

    case "INVALIDADA_LOTE":
      return "Conexão indisponível";

    default:
      return "Ponte Mobile";
  }
}

// ============================================================
// COMPONENT
// ============================================================

export default function EntradaPonteMobile({
  preRecebimentoId,

  referenciaLote,

  disabled = false,
}) {
  const pollingRef =
    useRef(null);

  const statusEmCursoRef =
    useRef(false);

  const [
    ponte,
    setPonte,
  ] =
    useState(null);

  /*
   * Token existe SOMENTE enquanto
   * aguardamos o primeiro pareamento.
   */
  const [
    tokenPareamento,
    setTokenPareamento,
  ] =
    useState(null);

  const [
    criando,
    setCriando,
  ] =
    useState(false);

  const [
    encerrando,
    setEncerrando,
  ] =
    useState(false);

  const [
    erro,
    setErro,
  ] =
    useState(null);

  const [
    agoraMs,
    setAgoraMs,
  ] =
    useState(
      Date.now()
    );

  // ==========================================================
  // URL DO QR
  // ==========================================================

  const urlPareamento =
    useMemo(
      () => {
        if (
          !tokenPareamento ||
          typeof window ===
            "undefined"
        ) {
          return null;
        }

        /*
         * O segredo vai no fragmento.
         *
         * Fragmento não é enviado como
         * query string para o servidor.
         */
        return (
          `${window.location.origin}` +
          `/ponte/entrada` +
          `#token=${encodeURIComponent(
            tokenPareamento
          )}`
        );
      },
      [
        tokenPareamento,
      ]
    );

  // ==========================================================
  // RELÓGIOS
  // ==========================================================

  const pareamentoRestante =
    segundosRestantes(
      ponte
        ?.pareamentoExpiraEm,
      agoraMs
    );

  const sessaoRestante =
    segundosRestantes(
      ponte
        ?.expiraEm,
      agoraMs
    );

  const inatividadeRestante =
    segundosRestantes(
      ponte
        ?.expiraInatividadeEm,
      agoraMs
    );

  // ==========================================================
  // EVENTO MAIS RECENTE
  // ==========================================================

  const ultimoEvento =
    Array.isArray(
      ponte?.eventos
    ) &&
    ponte.eventos.length
      ? ponte.eventos[0]
      : null;

  // ==========================================================
  // STATUS
  // ==========================================================

  const conectada =
    ponte?.status ===
    "CONECTADA";

  const aguardando =
    ponte?.status ===
    "AGUARDANDO_CONEXAO";

  const encerrada =
    ponte?.status &&
    STATUS_ENCERRADOS.has(
      ponte.status
    );

  // ==========================================================
  // ATUALIZAR STATUS
  // ==========================================================

  const atualizarStatus =
    useCallback(
      async () => {
        const ponteId =
          ponte?.ponteId;

        if (
          !ponteId ||
          statusEmCursoRef.current
        ) {
          return;
        }

        statusEmCursoRef.current =
          true;

        try {
          const resposta =
            await obterStatusPonteMobileEntrada({
              ponteId,
            });

          setPonte(
            (atual) => ({
              ...atual,
              ...resposta,
            })
          );

          /*
           * Assim que o Mobile conectou,
           * o token do QR é destruído
           * também da memória do React.
           */
          if (
            resposta.status ===
            "CONECTADA"
          ) {
            setTokenPareamento(
              null
            );
          }

          if (
            STATUS_ENCERRADOS.has(
              resposta.status
            )
          ) {
            setTokenPareamento(
              null
            );
          }
        } catch (error) {
          console.error(
            "[EntradaPonteMobile] Falha ao atualizar status:",
            error
          );
        } finally {
          statusEmCursoRef.current =
            false;
        }
      },
      [
        ponte?.ponteId,
      ]
    );

  // ==========================================================
  // CRIAR
  // ==========================================================

  async function criarPonte() {
    if (
      !preRecebimentoId ||
      disabled ||
      criando
    ) {
      return;
    }

    setCriando(true);
    setErro(null);

    try {
      const resposta =
        await criarPonteMobileEntrada({
          preRecebimentoId,
        });

      setTokenPareamento(
        resposta
          .tokenPareamento
      );

      setPonte({
        ...resposta,

        eventos:
          [],
      });
    } catch (error) {
      console.error(
        "[EntradaPonteMobile] Falha ao criar Ponte:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível iniciar a conexão com o celular."
      );
    } finally {
      setCriando(false);
    }
  }

  // ==========================================================
  // ENCERRAR
  // ==========================================================

  async function desconectarAgora() {
    if (
      !ponte?.ponteId ||
      encerrando
    ) {
      return;
    }

    setEncerrando(true);
    setErro(null);

    try {
      const resposta =
        await encerrarPonteMobileEntrada({
          ponteId:
            ponte.ponteId,
        });

      setTokenPareamento(
        null
      );

      setPonte(
        (atual) => ({
          ...atual,
          status:
            resposta.status,
        })
      );
    } catch (error) {
      console.error(
        "[EntradaPonteMobile] Falha ao encerrar Ponte:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível desconectar o celular."
      );
    } finally {
      setEncerrando(false);
    }
  }

  // ==========================================================
  // POLLING
  // ==========================================================

  useEffect(() => {
    if (
      !ponte?.ponteId ||
      !STATUS_ATIVOS.has(
        ponte?.status
      )
    ) {
      return undefined;
    }

    atualizarStatus();

    pollingRef.current =
      window.setInterval(
        atualizarStatus,
        POLLING_MS
      );

    return () => {
      if (
        pollingRef.current
      ) {
        window.clearInterval(
          pollingRef.current
        );

        pollingRef.current =
          null;
      }
    };
  }, [
    ponte?.ponteId,
    ponte?.status,
    atualizarStatus,
  ]);

  // ==========================================================
  // RELÓGIO LOCAL
  // ==========================================================

  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          setAgoraMs(
            Date.now()
          );
        },
        1000
      );

    return () =>
      window.clearInterval(
        interval
      );
  }, []);

  // ==========================================================
  // UNMOUNT
  //
  // Não encerramos a Ponte automaticamente aqui.
  // Fechar/reabrir UI não deve destruir sessão ativa.
  // ==========================================================

  // ==========================================================
  // ESTADO INICIAL
  // ==========================================================

  if (!ponte) {
    return (
      <section className="entrada-ponte">
        <div className="entrada-ponte__heading">
          <div className="entrada-ponte__icon">
            <Smartphone
              size={18}
            />
          </div>

          <div>
            <span>
              Apoio na conferência
            </span>

            <h3>
              Ponte Mobile
            </h3>

            <p>
              Use o celular para capturar
              códigos e informações da
              etiqueta deste lote.
            </p>
          </div>
        </div>

        {erro ? (
          <div
            className="entrada-ponte__error"
            role="alert"
          >
            {erro}
          </div>
        ) : null}

        <button
          type="button"
          className="entrada-ponte__start"
          onClick={
            criarPonte
          }
          disabled={
            disabled ||
            criando ||
            !preRecebimentoId
          }
        >
          {criando ? (
            <>
              <LoaderCircle
                size={17}
                className="entrada-ponte__spinner"
              />

              Preparando conexão...
            </>
          ) : (
            <>
              <QrCode
                size={17}
              />

              Conectar celular
            </>
          )}
        </button>
      </section>
    );
  }

  // ==========================================================
  // AGUARDANDO PAREAMENTO
  // ==========================================================

  if (
    aguardando &&
    urlPareamento
  ) {
    return (
      <section className="entrada-ponte entrada-ponte--waiting">
        <div className="entrada-ponte__topline">
          <div>
            <QrCode
              size={18}
            />

            <div>
              <span>
                Ponte Mobile
              </span>

              <strong>
                Aponte a câmera do celular
              </strong>
            </div>
          </div>

          <span className="entrada-ponte__status entrada-ponte__status--waiting">
            Aguardando
          </span>
        </div>

        <div className="entrada-ponte__qr-layout">
          <div className="entrada-ponte__qr">
            <QRCodeSVG
              value={
                urlPareamento
              }
              size={178}
              level="M"
              marginSize={2}
              title="QR Code da Ponte Mobile"
            />
          </div>

          <div className="entrada-ponte__qr-info">
            <strong>
              {referenciaLote ||
                "Lote atual"}
            </strong>

            <p>
              Escaneie o QR Code. A
              tela de captura será
              aberta automaticamente
              no celular.
            </p>

            <div className="entrada-ponte__timer-card">
              <Clock3
                size={16}
              />

              <div>
                <span>
                  QR disponível por
                </span>

                <strong>
                  {formatarContagem(
                    pareamentoRestante
                  )}
                </strong>
              </div>
            </div>

            <small>
              O QR Code funciona uma
              única vez.
            </small>
          </div>
        </div>

        {erro ? (
          <div className="entrada-ponte__error">
            {erro}
          </div>
        ) : null}

        <div className="entrada-ponte__footer">
          <button
            type="button"
            className="entrada-ponte__disconnect"
            onClick={
              desconectarAgora
            }
            disabled={
              encerrando
            }
          >
            <Unplug
              size={16}
            />

            Cancelar conexão
          </button>
        </div>
      </section>
    );
  }

  // ==========================================================
  // CONECTADA
  // ==========================================================

  if (conectada) {
    return (
      <section className="entrada-ponte entrada-ponte--connected">
        <div className="entrada-ponte__topline">
          <div>
            <CheckCircle2
              size={19}
            />

            <div>
              <span>
                Ponte Mobile
              </span>

              <strong>
                Celular conectado
              </strong>
            </div>
          </div>

          <span className="entrada-ponte__status entrada-ponte__status--connected">
            Conectado
          </span>
        </div>

        <div className="entrada-ponte__counters">
          <div>
            <Clock3
              size={17}
            />

            <span>
              Sessão
            </span>

            <strong>
              {formatarContagem(
                sessaoRestante
              )}
            </strong>
          </div>

          <div
            className={
              inatividadeRestante !==
                null &&
              inatividadeRestante <=
                15
                ? "is-warning"
                : ""
            }
          >
            <Wifi
              size={17}
            />

            <span>
              Inatividade
            </span>

            <strong>
              {formatarContagem(
                inatividadeRestante
              )}
            </strong>
          </div>
        </div>

        <div className="entrada-ponte__activity">
          <div className="entrada-ponte__activity-icon">
            <Smartphone
              size={17}
            />
          </div>

          <div>
            <span>
              Última atividade
            </span>

            <strong>
              {ultimoEvento
                ? traduzirEvento(
                    ultimoEvento.tipo
                  )
                : "Celular pronto para captura"}
            </strong>
          </div>
        </div>

        <div className="entrada-ponte__meta">
          <div>
            <span>
              Dispositivo
            </span>

            <strong>
              {ponte
                ?.mobileTipoDispositivo ||
                "Celular"}
            </strong>
          </div>

          <div>
            <span>
              Rede
            </span>

            <strong>
              {ponte
                ?.redeCoincidente ===
              true
                ? "Compatível"
                : ponte
                      ?.redeCoincidente ===
                    false
                  ? "Rede diferente"
                  : "Não identificada"}
            </strong>
          </div>
        </div>

        {erro ? (
          <div className="entrada-ponte__error">
            {erro}
          </div>
        ) : null}

        <div className="entrada-ponte__footer">
          <button
            type="button"
            className="entrada-ponte__refresh"
            onClick={
              atualizarStatus
            }
            disabled={
              statusEmCursoRef.current
            }
          >
            <RefreshCw
              size={16}
            />

            Atualizar
          </button>

          <button
            type="button"
            className="entrada-ponte__disconnect"
            onClick={
              desconectarAgora
            }
            disabled={
              encerrando
            }
          >
            {encerrando ? (
              <LoaderCircle
                size={16}
                className="entrada-ponte__spinner"
              />
            ) : (
              <Unplug
                size={16}
              />
            )}

            Desconectar agora
          </button>
        </div>
      </section>
    );
  }

  // ==========================================================
  // ENCERRADA / EXPIRADA
  // ==========================================================

  if (encerrada) {
    return (
      <section className="entrada-ponte entrada-ponte--ended">
        <div className="entrada-ponte__topline">
          <div>
            {ponte.status ===
            "EXPIRADA_INATIVIDADE" ? (
              <WifiOff
                size={19}
              />
            ) : (
              <XCircle
                size={19}
              />
            )}

            <div>
              <span>
                Ponte Mobile
              </span>

              <strong>
                {traduzirStatus(
                  ponte.status
                )}
              </strong>
            </div>
          </div>
        </div>

        <p className="entrada-ponte__ended-message">
          Para utilizar novamente o
          celular, gere uma nova conexão.
        </p>

        <button
          type="button"
          className="entrada-ponte__start"
          onClick={() => {
            setPonte(null);
            setTokenPareamento(
                null
            );
            setErro(null);
            }}
          disabled={
            disabled ||
            criando
          }
        >
          <Link2
            size={17}
          />

          Nova conexão
        </button>
      </section>
    );
  }

  return null;
}