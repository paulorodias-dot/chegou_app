import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Focus,
  LoaderCircle,
  ScanBarcode,
  SwitchCamera,
  Zap,
  ZapOff,
} from "lucide-react";

import {
  MOBILE_SCANNER_ENQUADRAMENTO,
} from "../hooks/useMobileScanner";

import {
  useMobileScanner,
} from "../hooks";


// ============================================================
// SISTEMA CHEGOU!
// CENTRAL DE ENCOMENDAS — RECEBIMENTO
//
// MOBILE SCANNER
//
// Padrão visual/funcional alinhado à Entrada.
//
// IMPORTANTE:
// - não altera regra do Wizard;
// - não cria Volume diretamente;
// - não acessa Supabase;
// - não decide destinatário;
// - somente entrega uma captura candidata.
// ============================================================


// ============================================================
// FORMATO PARA UX
// ============================================================

function nomeFormatoCaptura(
  formato
) {
  switch (formato) {
    case "CODIGO_BARRAS":
      return "Código de barras";

    case "QR_CODE":
      return "QR Code";

    case "DATA_MATRIX":
      return "Data Matrix";

    case "PDF417":
      return "PDF417";

    case "TEXTO":
      return "Texto";

    default:
      return "Código";
  }
}


function nomeCamera(
  camera,
  index
) {
  const label =
    String(
      camera?.label || ""
    ).trim();


  if (label) {
    return label;
  }


  return `Câmera ${
    index + 1
  }`;
}


// ============================================================
// COMPONENT
// ============================================================

export default function MobileScanner({
  open,

  quantidadeInformada =
    null,

  quantidadeBipada =
    0,

  onBack,

  onDetected,
}) {
  const videoRef =
    useRef(null);


  const mensagemTimerRef =
    useRef(null);


  const [
    flashAtivo,
    setFlashAtivo,
  ] =
    useState(false);


  const [
    flashDisponivel,
    setFlashDisponivel,
  ] =
    useState(false);


  const [
    mensagem,
    setMensagem,
  ] =
    useState(null);


  // ==========================================================
  // FEEDBACK
  // ==========================================================

  const mostrarMensagem =
    useCallback(
      (
        proximaMensagem,
        duracao = 1200
      ) => {
        if (
          mensagemTimerRef.current
        ) {
          window.clearTimeout(
            mensagemTimerRef.current
          );

          mensagemTimerRef.current =
            null;
        }


        setMensagem(
          proximaMensagem
        );


        if (
          duracao > 0
        ) {
          mensagemTimerRef.current =
            window.setTimeout(
              () => {
                setMensagem(
                  null
                );

                mensagemTimerRef.current =
                  null;
              },
              duracao
            );
        }
      },
      []
    );


  // ==========================================================
  // CAPTURA → CONTRATO LEGADO DO WIZARD
  //
  // A fundação compartilhada retorna:
  //
  // {
  //   valor,
  //   valorNormalizado,
  //   origem,
  //   motor,
  //   formato,
  //   formatoOriginal,
  //   ...
  // }
  //
  // O Wizard atual continua recebendo:
  //
  // {
  //   codigo,
  //   formato,
  //   origemCaptura
  // }
  //
  // Não alteramos a regra de negócio do Wizard neste Gate.
  // ==========================================================

  const handleDetected =
    useCallback(
      async (
        resultado
      ) => {
        if (
          typeof onDetected !==
          "function"
        ) {
          return {
            ok:
              false,

            motivo:
              "HANDLER_INDISPONIVEL",
          };
        }


        const codigo =
          resultado?.valor ||
          resultado
            ?.valorNormalizado ||
          null;


        if (!codigo) {
          return {
            ok:
              false,

            motivo:
              "CODIGO_INVALIDO",
          };
        }


        const resposta =
          await onDetected({
            codigo,

            formato:
              resultado
                ?.formato ||
              "DESCONHECIDO",

            origemCaptura:
              "CAMERA_DISPOSITIVO",

            /*
             * Já deixamos o resultado canônico
             * disponível sem obrigar o Wizard
             * a consumi-lo neste momento.
             */
            captura:
              resultado,
          });


        if (
          resposta?.ok ===
          false
        ) {
          if (
            resposta?.motivo ===
            "CODIGO_DUPLICADO_LOCAL"
          ) {
            mostrarMensagem(
              {
                tipo:
                  "warning",

                titulo:
                  "Volume já capturado",

                texto:
                  "Este código já consta neste recebimento.",
              },
              2200
            );


            return resposta;
          }


          mostrarMensagem(
            {
              tipo:
                "danger",

              titulo:
                "Leitura não registrada",

              texto:
                "Não foi possível registrar esta leitura.",
            },
            1800
          );


          return resposta;
        }


        mostrarMensagem(
          {
            tipo:
              "success",

            titulo:
              "Volume capturado",

            texto:
              `${
                nomeFormatoCaptura(
                  resultado
                    ?.formato
                )
              } registrado.`,
          },
          1200
        );


        return (
          resposta || {
            ok:
              true,
          }
        );
      },
      [
        mostrarMensagem,
        onDetected,
      ]
    );


  // ==========================================================
  // HOOK
  // ==========================================================

  const {
    cameraAtiva,

    iniciando,

    erroCamera,

    camerasDisponiveis,

    cameraSelecionadaId,

    cameraSelecionada,

    cameraLabel,

    enquadramento,

    focoStatus,

    resolucaoAtual,

    processando,

    cooldownRestanteMs,

    cooldownAtivo,

    iniciarCamera,

    pararCamera,

    trocarCamera,

    alterarEnquadramento,

    ajustarFoco,

    capturarAgora,
  } =
    useMobileScanner({
      ativo:
        open,

      videoRef,

      onDetected:
        handleDetected,
    });


  // ==========================================================
  // DERIVADOS
  // ==========================================================

  const cooldownSegundos =
    Math.max(
      0,

      Math.ceil(
        cooldownRestanteMs /
          1000
      )
    );


  const cameraNomeExibicao =
    useMemo(() => {
      if (
        cameraSelecionada
      ) {
        const index =
          camerasDisponiveis
            .indexOf(
              cameraSelecionada
            );


        return nomeCamera(
          cameraSelecionada,
          index >= 0
            ? index
            : 0
        );
      }


      return (
        cameraLabel ||
        "Câmera traseira automática"
      );
    }, [
      cameraLabel,
      cameraSelecionada,
      camerasDisponiveis,
    ]);


  // ==========================================================
  // ABRIR
  // ==========================================================

  useEffect(() => {
    if (!open) {
      return;
    }


    iniciarCamera();
  }, [
    open,
    iniciarCamera,
  ]);


  // ==========================================================
  // LIMPEZA FEEDBACK
  // ==========================================================

  useEffect(
    () => () => {
      if (
        mensagemTimerRef.current
      ) {
        window.clearTimeout(
          mensagemTimerRef.current
        );

        mensagemTimerRef.current =
          null;
      }
    },
    []
  );


  // ==========================================================
  // FLASH
  // ==========================================================

  useEffect(() => {
    if (
      !cameraAtiva ||
      !videoRef.current
        ?.srcObject
    ) {
      setFlashDisponivel(
        false
      );

      setFlashAtivo(
        false
      );

      return;
    }


    const stream =
      videoRef.current
        .srcObject;


    const track =
      stream
        ?.getVideoTracks?.()[0];


    let capabilities =
      null;


    try {
      capabilities =
        track
          ?.getCapabilities?.() ||
        null;
    } catch {
      capabilities =
        null;
    }


    setFlashDisponivel(
      Boolean(
        capabilities
          ?.torch
      )
    );
  }, [
    cameraAtiva,
  ]);


  async function alternarFlash() {
    const stream =
      videoRef.current
        ?.srcObject;


    const track =
      stream
        ?.getVideoTracks?.()[0];


    if (
      !track ||
      !flashDisponivel
    ) {
      return;
    }


    const novoValor =
      !flashAtivo;


    try {
      await track
        .applyConstraints({
          advanced: [
            {
              torch:
                novoValor,
            },
          ],
        });


      setFlashAtivo(
        novoValor
      );
    } catch (error) {
      console.warn(
        "[MobileScanner] Flash indisponível:",
        error
      );
    }
  }


  // ==========================================================
  // TROCAR CÂMERA
  // ==========================================================

  async function handleTrocarCamera(
    event
  ) {
    const id =
      event.target.value ||
      null;


    if (!id) {
      return;
    }


    setFlashAtivo(
      false
    );


    await trocarCamera(
      id
    );
  }


  // ==========================================================
  // VOLTAR
  // ==========================================================

  const handleVoltar =
    useCallback(() => {
      pararCamera();


      if (
        typeof onBack ===
        "function"
      ) {
        onBack();
      }
    }, [
      onBack,
      pararCamera,
    ]);


  // ==========================================================
  // ESC
  //
  // Scanner é a camada superior.
  // ESC fecha somente Scanner.
  // ==========================================================

  useEffect(() => {
    if (!open) {
      return undefined;
    }


    function handleKeyDown(
      event
    ) {
      if (
        event.key !==
        "Escape"
      ) {
        return;
      }


      event.preventDefault();

      event.stopPropagation();


      handleVoltar();
    }


    document.addEventListener(
      "keydown",
      handleKeyDown,
      true
    );


    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
        true
      );
    };
  }, [
    handleVoltar,
    open,
  ]);


  // ==========================================================
  // RENDER
  // ==========================================================

  if (!open) {
    return null;
  }


  return (
    <div
      className="mobile-scanner"
      data-modal-open="true"
      role="dialog"
      aria-modal="true"
      aria-label="Leitor pela câmera"
    >
      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="mobile-scanner__header">
        <button
          type="button"
          className="mobile-scanner__back"
          onClick={
            handleVoltar
          }
        >
          <ArrowLeft
            size={19}
            aria-hidden="true"
          />

          <span>
            Voltar
          </span>
        </button>


        <div className="mobile-scanner__heading">
          <span className="mobile-scanner__eyebrow">
            Recebimento
          </span>

          <h3>
            Ler código
          </h3>
        </div>


        <div className="mobile-scanner__header-action">
          <div
            className="mobile-scanner__counter"
            aria-label={`${quantidadeBipada} volumes capturados`}
          >
            <strong>
              {quantidadeBipada}
            </strong>


            {quantidadeInformada !==
              null &&
              quantidadeInformada !==
                "" && (
                <>
                  <span>
                    /
                  </span>

                  <small>
                    {
                      quantidadeInformada
                    }
                  </small>
                </>
              )}
          </div>


          {flashDisponivel ? (
            <button
              type="button"
              className="mobile-scanner__icon-button"
              onClick={
                alternarFlash
              }
              aria-label={
                flashAtivo
                  ? "Desligar flash"
                  : "Ligar flash"
              }
              title={
                flashAtivo
                  ? "Desligar flash"
                  : "Ligar flash"
              }
            >
              {flashAtivo ? (
                <ZapOff
                  size={18}
                  aria-hidden="true"
                />
              ) : (
                <Zap
                  size={18}
                  aria-hidden="true"
                />
              )}
            </button>
          ) : (
            <span
              className="mobile-scanner__icon-placeholder"
              aria-hidden="true"
            />
          )}
        </div>
      </header>


      {/* =====================================================
          CONTROLES
          ===================================================== */}

      <div className="mobile-scanner__capture-toolbar">
        <div className="mobile-scanner__orientation">
          <span className="mobile-scanner__control-label">
            Enquadramento
          </span>


          <div className="mobile-scanner__orientation-buttons">
            <button
              type="button"
              className={
                enquadramento ===
                MOBILE_SCANNER_ENQUADRAMENTO
                  .HORIZONTAL
                  ? "is-active"
                  : ""
              }
              onClick={() =>
                alterarEnquadramento(
                  MOBILE_SCANNER_ENQUADRAMENTO
                    .HORIZONTAL
                )
              }
              disabled={
                iniciando
              }
            >
              Horizontal
            </button>


            <button
              type="button"
              className={
                enquadramento ===
                MOBILE_SCANNER_ENQUADRAMENTO
                  .VERTICAL
                  ? "is-active"
                  : ""
              }
              onClick={() =>
                alterarEnquadramento(
                  MOBILE_SCANNER_ENQUADRAMENTO
                    .VERTICAL
                )
              }
              disabled={
                iniciando
              }
            >
              Vertical
            </button>
          </div>
        </div>


        {camerasDisponiveis.length >
        1 ? (
          <label className="mobile-scanner__camera-select">
            <span className="mobile-scanner__control-label">
              Câmera
            </span>


            <div className="mobile-scanner__camera-select-control">
              <SwitchCamera
                size={16}
                aria-hidden="true"
              />


              <select
                value={
                  cameraSelecionadaId ||
                  ""
                }
                onChange={
                  handleTrocarCamera
                }
                disabled={
                  iniciando ||
                  processando
                }
              >
                {camerasDisponiveis.map(
                  (
                    camera,
                    index
                  ) => (
                    <option
                      key={
                        camera.deviceId ||
                        `${camera.label}-${index}`
                      }
                      value={
                        camera.deviceId
                      }
                    >
                      {nomeCamera(
                        camera,
                        index
                      )}
                    </option>
                  )
                )}
              </select>
            </div>
          </label>
        ) : null}
      </div>


      {/* =====================================================
          CÂMERA
          ===================================================== */}

      <div
        className={[
          "mobile-scanner__camera",

          enquadramento ===
          MOBILE_SCANNER_ENQUADRAMENTO
            .VERTICAL
            ? "mobile-scanner__camera--vertical"
            : "mobile-scanner__camera--horizontal",
        ].join(" ")}
      >
        <video
          ref={
            videoRef
          }
          className="mobile-scanner__video"
          autoPlay
          muted
          playsInline
        />


        <div
          className={[
            "mobile-scanner__target",

            enquadramento ===
            MOBILE_SCANNER_ENQUADRAMENTO
              .VERTICAL
              ? "mobile-scanner__target--vertical"
              : "mobile-scanner__target--horizontal",

            processando
              ? "mobile-scanner__target--reading"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        >
          <span className="mobile-scanner__corner mobile-scanner__corner--tl" />

          <span className="mobile-scanner__corner mobile-scanner__corner--tr" />

          <span className="mobile-scanner__corner mobile-scanner__corner--bl" />

          <span className="mobile-scanner__corner mobile-scanner__corner--br" />


          {processando ? (
            <div className="mobile-scanner__focus-indicator">
              <LoaderCircle
                size={18}
                className="mobile-scanner__spinner"
              />

              <span>
                Lendo...
              </span>
            </div>
          ) : null}
        </div>


        {iniciando ? (
          <div className="mobile-scanner__loading">
            <LoaderCircle
              size={28}
              className="mobile-scanner__spinner"
              aria-hidden="true"
            />

            <strong>
              Preparando câmera
            </strong>
          </div>
        ) : null}


        {erroCamera ? (
          <div
            className="mobile-scanner__error"
            role="alert"
          >
            <Camera
              size={28}
              aria-hidden="true"
            />

            <strong>
              Câmera indisponível
            </strong>

            <span>
              {erroCamera}
            </span>
          </div>
        ) : null}
      </div>


      {/* =====================================================
          CONTEÚDO / STATUS
          ===================================================== */}

      <footer className="mobile-scanner__footer">
        {!erroCamera ? (
          <div className="mobile-scanner__instruction">
            <ScanBarcode
              size={20}
              aria-hidden="true"
            />

            <div>
              <strong>
                Posicione somente o código dentro da área
              </strong>

              <span>
                Evite inclinação e reflexos.
                Para códigos longos, prefira
                Horizontal. Para etiquetas
                altas, experimente Vertical.
              </span>
            </div>
          </div>
        ) : null}


        {!erroCamera &&
        cameraAtiva ? (
          <div className="mobile-scanner__camera-status">
            <div>
              <CheckCircle2
                size={15}
                aria-hidden="true"
              />

              <span>
                {
                  cameraNomeExibicao
                }
              </span>
            </div>


            <div>
              <Focus
                size={15}
                aria-hidden="true"
              />

              <span>
                {focoStatus ===
                "CONTINUO"
                  ? "Foco contínuo"
                  : focoStatus ===
                      "UNICO"
                    ? "Foco automático"
                    : "Foco controlado pela câmera"}
              </span>
            </div>


            {resolucaoAtual
              ?.width &&
            resolucaoAtual
              ?.height ? (
              <div>
                <Camera
                  size={15}
                  aria-hidden="true"
                />

                <span>
                  {
                    resolucaoAtual
                      .width
                  }
                  ×
                  {
                    resolucaoAtual
                      .height
                  }

                  {resolucaoAtual
                    ?.frameRate
                    ? ` • ${Math.round(
                        resolucaoAtual
                          .frameRate
                      )} fps`
                    : ""}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}


        {cooldownAtivo ? (
          <div className="mobile-scanner__status">
            <ScanBarcode
              size={14}
              aria-hidden="true"
            />

            <span>
              Próxima leitura em{" "}
              {cooldownSegundos}s
            </span>
          </div>
        ) : null}


        {mensagem ? (
          <div
            className={`mobile-scanner__feedback mobile-scanner__feedback--${mensagem.tipo}`}
            role={
              mensagem.tipo ===
              "danger"
                ? "alert"
                : "status"
            }
            aria-live="polite"
          >
            {mensagem.titulo ? (
              <strong className="mobile-scanner__feedback-title">
                {
                  mensagem.titulo
                }
              </strong>
            ) : null}


            <span className="mobile-scanner__feedback-text">
              {
                mensagem.texto
              }
            </span>
          </div>
        ) : null}


        {/* ===================================================
            AÇÕES
            =================================================== */}

        <div className="mobile-scanner__capture-actions">
          <button
            type="button"
            className="mobile-scanner__capture-button mobile-scanner__capture-button--secondary"
            onClick={
              ajustarFoco
            }
            disabled={
              iniciando ||
              Boolean(
                erroCamera
              ) ||
              processando ||
              cooldownAtivo
            }
          >
            <Focus
              size={17}
              aria-hidden="true"
            />

            Ajustar foco
          </button>


          <button
            type="button"
            className="mobile-scanner__capture-button mobile-scanner__capture-button--primary"
            onClick={
              capturarAgora
            }
            disabled={
              iniciando ||
              Boolean(
                erroCamera
              ) ||
              processando ||
              cooldownAtivo
            }
          >
            {processando ? (
              <>
                <LoaderCircle
                  size={17}
                  className="mobile-scanner__spinner"
                  aria-hidden="true"
                />

                Lendo...
              </>
            ) : (
              <>
                <Camera
                  size={17}
                  aria-hidden="true"
                />

                Capturar agora
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}