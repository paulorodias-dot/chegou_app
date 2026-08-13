import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  NOVO_RECEBIMENTO_FORMATO_CODIGO,
  NOVO_RECEBIMENTO_ORIGEM_CAPTURA,
} from "../constants";

import {
  MobileScanner,
} from "../components";

import AvariaVolumeModal
  from "../components/AvariaVolumeModal";


// ============================================================
// SISTEMA CHEGOU!
// STEP — CAPTURA DE VOLUMES
//
// Responsabilidades:
// - quantidade informada;
// - entrada manual / leitor que se comporte como teclado;
// - captura por câmera mobile;
// - feedback sonoro local;
// - lista local de volumes;
// - indicação visual de quantidade;
// - duplicidade local;
// - acesso ao fluxo de avaria.
//
// NÃO:
// - acessa Supabase;
// - faz matching com Morador;
// - normaliza código de forma autoritativa;
// - cria Pré-Recebimento.
// ============================================================


function tocarSom({
  frequencia = 880,
  duracao = 0.08,
  tipo = "sine",
  volume = 0.12,
} = {}) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  try {
    const context =
      new AudioContextClass();

    const oscillator =
      context.createOscillator();

    const gain =
      context.createGain();

    oscillator.type = tipo;
    oscillator.frequency.value =
      frequencia;

    gain.gain.value = volume;

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();

    oscillator.stop(
      context.currentTime +
        duracao
    );

    oscillator.onended = () => {
      context.close().catch(() => {});
    };
  } catch {
    /*
     * Som é apenas feedback de UX.
     * Falha de áudio não bloqueia o recebimento.
     */
  }
}


function tocarSomCaptura() {
  tocarSom({
    frequencia: 940,
    duracao: 0.07,
    tipo: "sine",
    volume: 0.13,
  });
}


function tocarSomDuplicado() {
  tocarSom({
    frequencia: 420,
    duracao: 0.13,
    tipo: "square",
    volume: 0.1,
  });
}


function tocarSomExcesso() {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  tocarSom({
    frequencia: 360,
    duracao: 0.1,
    tipo: "square",
    volume: 0.12,
  });

  window.setTimeout(() => {
    tocarSom({
      frequencia: 280,
      duracao: 0.12,
      tipo: "square",
      volume: 0.12,
    });
  }, 110);
}


function textoFormato(formato) {
  const mapa = {
    CODIGO_BARRAS:
      "Código de barras",

    QR_CODE:
      "QR Code",

    DATA_MATRIX:
      "Data Matrix",

    PDF417:
      "PDF417",

    OCR_ETIQUETA:
      "OCR",

    DESCONHECIDO:
      "Captura",
  };

  return (
    mapa[formato] ||
    "Captura"
  );
}


export default function StepCapturaVolumes({
  quantidadeInformada = "",
  quantidadeBipada = 0,
  diferencaQuantidade = null,

  volumes = [],

  capturaHabilitada = false,

  condominioId = null,
  clientReceiptId = null,

  onChangeQuantidadeInformada,
  onAdicionarVolume,
  onRemoverVolume,
  onAtualizarAvaria,
  onAdicionarEvidencia,
}) {
  const [
    codigoCaptura,
    setCodigoCaptura,
  ] = useState("");

  const [
    mensagemCaptura,
    setMensagemCaptura,
  ] = useState(null);

  const [
    formatoCaptura,
    setFormatoCaptura,
  ] = useState(
    NOVO_RECEBIMENTO_FORMATO_CODIGO
      .CODIGO_BARRAS
  );

  const [
    scannerAberto,
    setScannerAberto,
  ] = useState(false);

  const [
    volumeAvariaAberto,
    setVolumeAvariaAberto,
  ] = useState(null);


  const inputCapturaRef =
    useRef(null);

  const quantidadeAnteriorRef =
    useRef(quantidadeBipada);


  // ==========================================================
  // DERIVADOS
  // ==========================================================

  const quantidadeInformadaNumero =
    useMemo(() => {
      if (
        quantidadeInformada === "" ||
        quantidadeInformada === null ||
        quantidadeInformada === undefined
      ) {
        return null;
      }

      const valor =
        Number(
          quantidadeInformada
        );

      return Number.isFinite(valor)
        ? valor
        : null;
    }, [
      quantidadeInformada,
    ]);


  const quantidadesIguais =
    Boolean(
      quantidadeInformadaNumero !== null &&
      quantidadeInformadaNumero > 0 &&
      Number(quantidadeBipada) ===
        quantidadeInformadaNumero
    );


  const quantidadeExcedida =
    Boolean(
      quantidadeInformadaNumero !== null &&
      Number(quantidadeBipada) >
        quantidadeInformadaNumero
    );


  const quantidadeAbaixo =
    Boolean(
      quantidadeInformadaNumero !== null &&
      Number(quantidadeBipada) <
        quantidadeInformadaNumero
    );


  // ==========================================================
  // FEEDBACK SONORO DE EXCESSO
  //
  // Só toca quando a quantidade acabou de aumentar e passou
  // acima da quantidade informada.
  // ==========================================================

  useEffect(() => {
    const anterior =
      quantidadeAnteriorRef.current;

    if (
      quantidadeBipada > anterior &&
      quantidadeExcedida
    ) {
      tocarSomExcesso();
    }

    quantidadeAnteriorRef.current =
      quantidadeBipada;
  }, [
    quantidadeBipada,
    quantidadeExcedida,
  ]);


  // ==========================================================
  // FOCO CONTÍNUO DA CAPTURA
  // ==========================================================

  useEffect(() => {
    if (
      !capturaHabilitada ||
      scannerAberto
    ) {
      return undefined;
    }

    const timer =
      window.setTimeout(() => {
        inputCapturaRef.current?.focus();
      }, 80);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    capturaHabilitada,
    scannerAberto,
  ]);


  // ==========================================================
  // QUANTIDADE INFORMADA
  // ==========================================================

  function handleQuantidadeChange(
    event
  ) {
    if (
      typeof onChangeQuantidadeInformada !==
      "function"
    ) {
      return;
    }

    onChangeQuantidadeInformada(
      event.target.value
    );
  }


  // ==========================================================
  // MENSAGEM TEMPORÁRIA
  // ==========================================================

  function limparMensagemDepois(
    tempo = 2200
  ) {
    window.setTimeout(() => {
      setMensagemCaptura(null);
    }, tempo);
  }


  // ==========================================================
  // CAPTURA MANUAL / LEITOR TIPO TECLADO
  // ==========================================================

  function executarCaptura() {
    const codigo =
      codigoCaptura.trim();

    if (!capturaHabilitada) {
      setMensagemCaptura({
        tipo: "warning",
        texto:
          "Informe primeiro a quantidade declarada pelo entregador.",
      });

      limparMensagemDepois();

      return;
    }


    if (!codigo) {
      return;
    }


    if (
      typeof onAdicionarVolume !==
      "function"
    ) {
      return;
    }


    const resultado =
      onAdicionarVolume({
        codigoLido:
          codigo,

        formatoCodigo:
          formatoCaptura,

        /*
         * Nesta etapa, leitor USB e teclado físico chegam
         * como entrada de teclado.
         *
         * Um adaptador específico poderá diferenciar a origem
         * futuramente sem alterar este Step.
         */
        origemCaptura:
          NOVO_RECEBIMENTO_ORIGEM_CAPTURA
            .DIGITACAO_MANUAL,

        confianca:
          null,
      });


    if (!resultado?.ok) {
      if (
        resultado?.motivo ===
        "CODIGO_DUPLICADO_LOCAL"
      ) {
        tocarSomDuplicado();

        setMensagemCaptura({
          tipo: "danger",
          texto:
            "Este código já foi capturado neste recebimento.",
        });

        setCodigoCaptura("");

        inputCapturaRef.current?.focus();

        limparMensagemDepois();

        return;
      }


      if (
        resultado?.motivo ===
        "QUANTIDADE_NAO_INFORMADA"
      ) {
        setMensagemCaptura({
          tipo: "warning",
          texto:
            "Informe a quantidade antes de iniciar a captura.",
        });

        limparMensagemDepois();

        return;
      }


      setMensagemCaptura({
        tipo: "danger",
        texto:
          "Não foi possível registrar este volume.",
      });

      limparMensagemDepois();

      return;
    }


    tocarSomCaptura();

    setMensagemCaptura({
      tipo: "success",
      texto:
        "Volume capturado.",
    });


    setCodigoCaptura("");


    /*
     * Mantém o campo pronto para o próximo bip.
     */
    window.requestAnimationFrame(() => {
      inputCapturaRef.current?.focus();
    });


    limparMensagemDepois();
  }


  function handleCodigoKeyDown(
    event
  ) {
    if (
      event.key !== "Enter"
    ) {
      return;
    }

    event.preventDefault();

    executarCaptura();
  }


  // ==========================================================
  // CAPTURA PELA CÂMERA
  // ==========================================================

  function handleCameraDetected({
    codigo,
    formato,
    origemCaptura,
  }) {
    if (
      typeof onAdicionarVolume !==
      "function"
    ) {
      return {
        ok: false,
        motivo:
          "HANDLER_INDISPONIVEL",
      };
    }


    const resultado =
      onAdicionarVolume({
        codigoLido:
          codigo,

        formatoCodigo:
          formato ||
          NOVO_RECEBIMENTO_FORMATO_CODIGO
            .DESCONHECIDO,

        origemCaptura:
          origemCaptura ||
          NOVO_RECEBIMENTO_ORIGEM_CAPTURA
            .CAMERA_DISPOSITIVO,

        confianca:
          null,
      });


    if (resultado?.ok) {
      tocarSomCaptura();

      setMensagemCaptura({
        tipo: "success",
        texto:
          "Volume capturado pela câmera.",
      });


      limparMensagemDepois(
        1000
      );


      return resultado;
    }


    if (
      resultado?.motivo ===
      "CODIGO_DUPLICADO_LOCAL"
    ) {
      tocarSomDuplicado();

      setMensagemCaptura({
        tipo: "danger",
        texto:
          "Este código já foi capturado neste recebimento.",
      });


      limparMensagemDepois();


      return resultado;
    }


    if (
      resultado?.motivo ===
      "QUANTIDADE_NAO_INFORMADA"
    ) {
      setMensagemCaptura({
        tipo: "warning",
        texto:
          "Informe a quantidade antes de iniciar a captura.",
      });


      limparMensagemDepois();


      return resultado;
    }


    setMensagemCaptura({
      tipo: "danger",
      texto:
        "Não foi possível registrar esta leitura.",
    });


    limparMensagemDepois();


    return resultado;
  }


  // ==========================================================
  // ABRIR / FECHAR CÂMERA
  // ==========================================================

  function handleAbrirCamera() {
    if (!capturaHabilitada) {
      setMensagemCaptura({
        tipo: "warning",
        texto:
          "Informe a quantidade antes de abrir a câmera.",
      });

      limparMensagemDepois();

      return;
    }


    setScannerAberto(true);
  }


  function handleFecharCamera() {
    setScannerAberto(false);


    window.requestAnimationFrame(() => {
      inputCapturaRef.current?.focus();
    });
  }


  // ==========================================================
  // AVARIA
  // ==========================================================

  function handleAbrirAvaria(
    volume
  ) {
    setVolumeAvariaAberto(
      volume
    );
  }


  function handleFecharAvaria() {
    setVolumeAvariaAberto(
      null
    );

    window.requestAnimationFrame(
      () => {
        inputCapturaRef.current?.focus();
      }
    );
  }


  function handleSalvarAvaria(
    clientVolumeId,
    avaria
  ) {
    if (
      typeof onAtualizarAvaria !==
      "function"
    ) {
      return;
    }


    onAtualizarAvaria(
      clientVolumeId,
      avaria
    );


    setVolumeAvariaAberto(
      null
    );


    setMensagemCaptura({
      tipo: "success",
      texto:
        avaria?.fotoMomento === "DEPOIS"
          ? "Avaria registrada. A foto poderá ser anexada posteriormente."
          : "Avaria registrada. A foto será anexada neste recebimento.",
    });


    limparMensagemDepois(
      2600
    );


    window.requestAnimationFrame(
      () => {
        inputCapturaRef.current?.focus();
      }
    );
  }


  function handleRemoverAvaria(
    clientVolumeId
  ) {
    if (
      typeof onAtualizarAvaria !==
      "function"
    ) {
      return;
    }


    onAtualizarAvaria(
      clientVolumeId,
      null
    );


    setVolumeAvariaAberto(
      null
    );


    setMensagemCaptura({
      tipo: "success",
      texto:
        "Registro de avaria removido.",
    });


    limparMensagemDepois();


    window.requestAnimationFrame(
      () => {
        inputCapturaRef.current?.focus();
      }
    );
  }


  // ==========================================================
  // REMOÇÃO LOCAL
  // ==========================================================

  function handleRemover(
    clientVolumeId
  ) {
    if (
      typeof onRemoverVolume !==
      "function"
    ) {
      return;
    }

    onRemoverVolume(
      clientVolumeId
    );


    window.requestAnimationFrame(() => {
      inputCapturaRef.current?.focus();
    });
  }


  // ==========================================================
  // CLASSES VISUAIS DOS CONTADORES
  // ==========================================================

  function classeQuantidadeInformada() {
    if (quantidadesIguais) {
      return " novo-recebimento-input--success";
    }

    if (quantidadeExcedida) {
      return " novo-recebimento-input--danger";
    }

    return "";
  }


  function classeQuantidadeCapturada() {
    if (quantidadesIguais) {
      return " novo-recebimento-input--success";
    }

    if (quantidadeExcedida) {
      return " novo-recebimento-input--danger";
    }

    return "";
  }


  return (
    <section className="novo-recebimento-section">
      <header className="novo-recebimento-section__header">
        <h3 className="novo-recebimento-section__title">
          Captura dos volumes
        </h3>

        <p className="novo-recebimento-section__description">
          Informe a quantidade declarada pelo entregador e
          capture cada volume recebido.
        </p>
      </header>


      {/* ====================================================
          CONTADORES
      ==================================================== */}

      <div className="novo-recebimento-grid">
        <label className="novo-recebimento-field">
          <span className="novo-recebimento-field__label">
            Quantidade informada
          </span>

          <input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            className={
              `novo-recebimento-input${classeQuantidadeInformada()}`
            }
            value={
              quantidadeInformada
            }
            onChange={
              handleQuantidadeChange
            }
            placeholder="0"
          />

          <small className="novo-recebimento-field__helper">
            Quantidade declarada pelo entregador antes do
            início da captura.
          </small>
        </label>


        <label className="novo-recebimento-field">
          <span className="novo-recebimento-field__label">
            Quantidade capturada
          </span>

          <input
            type="number"
            inputMode="numeric"
            className={
              `novo-recebimento-input${classeQuantidadeCapturada()}`
            }
            value={
              quantidadeBipada
            }
            disabled
            readOnly
          />

          <small className="novo-recebimento-field__helper">
            Atualizada automaticamente a cada volume.
          </small>
        </label>
      </div>


      {/* ====================================================
          STATUS DA QUANTIDADE
      ==================================================== */}

      {quantidadesIguais && (
        <div
          className="
            novo-recebimento-feedback
            novo-recebimento-feedback--success
          "
          role="status"
        >
          Quantidade conferida: o total capturado é igual ao
          total informado.
        </div>
      )}


      {quantidadeExcedida && (
        <div
          className="
            novo-recebimento-feedback
            novo-recebimento-feedback--danger
          "
          role="alert"
        >
          Foram capturados volumes além da quantidade
          informada. A diferença atual é de{" "}
          <strong>
            {Math.abs(
              diferencaQuantidade ||
                0
            )}
          </strong>
          .
        </div>
      )}


      {quantidadeAbaixo &&
        quantidadeBipada > 0 && (
          <div
            className="
              novo-recebimento-feedback
              novo-recebimento-feedback--info
            "
            role="status"
          >
            Faltam{" "}
            <strong>
              {Math.abs(
                diferencaQuantidade ||
                  0
              )}
            </strong>{" "}
            volume(s) para atingir a quantidade informada.
          </div>
        )}


      {/* ====================================================
          CAPTURA
      ==================================================== */}

      <div className="novo-recebimento-capture">
        <div className="novo-recebimento-capture__header">
          <div>
            <h4 className="novo-recebimento-capture__title">
              Capturar volume
            </h4>

            <p className="novo-recebimento-capture__description">
              Utilize leitor compatível, câmera do dispositivo
              ou digite o código e pressione Enter.
            </p>
          </div>
        </div>


        <div className="novo-recebimento-capture__controls">
          <select
            className="novo-recebimento-select"
            value={
              formatoCaptura
            }
            onChange={(event) =>
              setFormatoCaptura(
                event.target.value
              )
            }
            disabled={
              !capturaHabilitada
            }
            aria-label="Formato da captura"
          >
            <option value="CODIGO_BARRAS">
              Código de barras
            </option>

            <option value="QR_CODE">
              QR Code
            </option>

            <option value="DATA_MATRIX">
              Data Matrix
            </option>

            <option value="PDF417">
              PDF417
            </option>

            <option value="OCR_ETIQUETA">
              OCR da etiqueta
            </option>

            <option value="DESCONHECIDO">
              Não identificado
            </option>
          </select>


          <input
            ref={
              inputCapturaRef
            }
            type="text"
            className="novo-recebimento-input"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck="false"
            value={
              codigoCaptura
            }
            onChange={(event) =>
              setCodigoCaptura(
                event.target.value
              )
            }
            onKeyDown={
              handleCodigoKeyDown
            }
            placeholder={
              capturaHabilitada
                ? "Leia ou digite o código"
                : "Informe primeiro a quantidade"
            }
            disabled={
              !capturaHabilitada
            }
          />


          <button
            type="button"
            className="
              novo-recebimento-button
              novo-recebimento-button--primary
            "
            onClick={
              executarCaptura
            }
            disabled={
              !capturaHabilitada ||
              !codigoCaptura.trim()
            }
          >
            Inserir
          </button>


          <button
            type="button"
            className="
              novo-recebimento-button
              novo-recebimento-button--camera
            "
            onClick={
              handleAbrirCamera
            }
            disabled={
              !capturaHabilitada
            }
          >
            Abrir câmera
          </button>
        </div>


        {!capturaHabilitada && (
          <div
            className="
              novo-recebimento-feedback
              novo-recebimento-feedback--warning
            "
            role="status"
          >
            Informe a quantidade declarada para liberar a
            captura dos volumes.
          </div>
        )}


        {mensagemCaptura && (
          <div
            className={
              `novo-recebimento-feedback novo-recebimento-feedback--${mensagemCaptura.tipo}`
            }
            role={
              mensagemCaptura.tipo ===
              "danger"
                ? "alert"
                : "status"
            }
          >
            {mensagemCaptura.texto}
          </div>
        )}
      </div>


      {/* ====================================================
          TABELA LOCAL
      ==================================================== */}

      <div className="novo-recebimento-volumes">
        <div className="novo-recebimento-volumes__header">
          <div>
            <h4 className="novo-recebimento-volumes__title">
              Volumes capturados
            </h4>

            <p className="novo-recebimento-volumes__description">
              Os dados permanecem salvos neste dispositivo
              até a conclusão do recebimento.
            </p>
          </div>

          <span className="novo-recebimento-volumes__count">
            {quantidadeBipada}
          </span>
        </div>


        {volumes.length === 0 ? (
          <div className="novo-recebimento-placeholder">
            Nenhum volume foi capturado neste recebimento.
          </div>
        ) : (
          <div className="novo-recebimento-table-scroll">
            <table className="novo-recebimento-table">
              <thead>
                <tr>
                  <th scope="col">
                    Nº
                  </th>

                  <th scope="col">
                    Código
                  </th>

                  <th scope="col">
                    Captura
                  </th>

                  <th scope="col">
                    Avaria
                  </th>

                  <th scope="col">
                    Ações
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
                        volume.clientVolumeId
                      }
                      className={
                        volume.avaria
                          ? "novo-recebimento-table__row--warning"
                          : ""
                      }
                    >
                      <td>
                        {volume.numeroVolume ||
                          index + 1}
                      </td>


                      <td>
                        <span className="novo-recebimento-code">
                          {volume.codigoLido}
                        </span>
                      </td>


                      <td>
                        {textoFormato(
                          volume.formatoCodigo
                        )}
                      </td>


                      <td>
                        <button
                          type="button"
                          className={
                            `
                              novo-recebimento-button
                              novo-recebimento-button--compact
                              ${
                                volume.avaria
                                  ? "novo-recebimento-button--warning"
                                  : "novo-recebimento-button--secondary"
                              }
                            `
                          }
                          onClick={() =>
                            handleAbrirAvaria(
                              volume
                            )
                          }
                        >
                          {volume.avaria
                            ? "Ver avaria"
                            : "Registrar avaria"}
                        </button>
                      </td>


                      <td>
                        <button
                          type="button"
                          className="
                            novo-recebimento-button
                            novo-recebimento-button--secondary
                            novo-recebimento-button--compact
                          "
                          onClick={() =>
                            handleRemover(
                              volume.clientVolumeId
                            )
                          }
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* ====================================================
          INFORMAÇÃO OPERACIONAL
      ==================================================== */}

      <div className="novo-recebimento-placeholder">
        No desktop, leitores compatíveis podem operar como
        entrada de teclado. No mobile, utilize a câmera para
        leitura contínua de códigos. OCR e fotografias de
        avaria serão conectados às suas camadas específicas.
      </div>

      <AvariaVolumeModal
        open={
          Boolean(
            volumeAvariaAberto
          )
        }

        volume={
          volumeAvariaAberto
        }

        condominioId={
          condominioId
        }

        clientReceiptId={
          clientReceiptId
        }

        onClose={
          handleFecharAvaria
        }

        onSave={
          handleSalvarAvaria
        }

        onRemove={
          handleRemoverAvaria
        }

        onAddEvidence={
          onAdicionarEvidencia
        }
      />


      {/* ====================================================
          MOBILE SCANNER
      ==================================================== */}

      <MobileScanner
        open={
          scannerAberto
        }

        quantidadeInformada={
          quantidadeInformada
        }

        quantidadeBipada={
          quantidadeBipada
        }

        onBack={
          handleFecharCamera
        }

        onDetected={
          handleCameraDetected
        }
      />
    </section>
  );
}