import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  enviarFotoAvaria,
} from "../services/evidenciasStorageService";


// ============================================================
// SISTEMA CHEGOU!
// MODAL — AVARIA DO VOLUME
//
// Responsabilidades:
// - registrar/editar avaria;
// - definir tipo e gravidade;
// - descrição e observação;
// - escolher foto AGORA ou DEPOIS;
// - quando AGORA:
//   • câmera nativa/seleção de arquivo;
//   • processamento;
//   • upload privado;
//   • retorno dos metadados da evidência.
//
// NÃO:
// - acessa tabela diretamente;
// - decide obrigatoriedade da foto;
// - cria ocorrência oficial;
// - mantém File/Blob no estado do Wizard.
// ============================================================


const TIPOS_AVARIA = Object.freeze([
  {
    value: "AVARIA_LEVE",
    label: "Avaria leve",
  },
  {
    value: "AVARIA_MODERADA",
    label: "Avaria moderada",
  },
  {
    value: "AVARIA_GRAVE",
    label: "Avaria grave",
  },
  {
    value: "EMBALAGEM_ABERTA",
    label: "Embalagem aberta",
  },
  {
    value: "EMBALAGEM_VIOLADA",
    label: "Embalagem violada",
  },
  {
    value: "EMBALAGEM_MOLHADA",
    label: "Embalagem molhada",
  },
  {
    value: "EMBALAGEM_AMASSADA",
    label: "Embalagem amassada",
  },
]);


const GRAVIDADES = Object.freeze([
  {
    value: "BAIXA",
    label: "Baixa",
  },
  {
    value: "MEDIA",
    label: "Média",
  },
  {
    value: "ALTA",
    label: "Alta",
  },
  {
    value: "CRITICA",
    label: "Crítica",
  },
]);


function criarDraftInicial(volume) {
  const avaria =
    volume?.avaria ||
    null;

  return {
    tipoOcorrencia:
      avaria?.tipoOcorrencia ||
      "AVARIA_LEVE",

    gravidade:
      avaria?.gravidade ||
      "BAIXA",

    descricao:
      avaria?.descricao ||
      "",

    justificativa:
      avaria?.justificativa ||
      "",

    fotoMomento:
      avaria?.fotoMomento ||
      null,

    requerFoto:
      avaria?.requerFoto ??
      true,

    requerRevisao:
      avaria?.requerRevisao ??
      false,

    metadata: {
      ...(avaria?.metadata || {}),
    },
  };
}


// ============================================================
// EVIDÊNCIA DE FOTO EXISTENTE
// ============================================================

function localizarFotoAvaria(
  volume
) {
  return (
    volume?.evidencias ||
    []
  ).find(
    (evidencia) =>
      evidencia?.tipoEvidencia ===
        "FOTO_AVARIA" &&
      Boolean(
        evidencia?.bucket &&
        evidencia?.storagePath
      )
  ) || null;
}


// ============================================================
// COMPONENTE
// ============================================================

export default function AvariaVolumeModal({
  open = false,

  volume = null,

  condominioId = null,
  clientReceiptId = null,

  onClose,
  onSave,
  onRemove,
  onAddEvidence,
}) {
  const [
    draft,
    setDraft,
  ] = useState(
    criarDraftInicial(volume)
  );


  const [
    enviandoFoto,
    setEnviandoFoto,
  ] = useState(false);


  const [
    erroFoto,
    setErroFoto,
  ] = useState(null);


  const [
    fotoEnviada,
    setFotoEnviada,
  ] = useState(null);


  const inputCameraRef =
    useRef(null);


  const inputArquivoRef =
    useRef(null);


  // ==========================================================
  // ABERTURA / TROCA DE VOLUME
  // ==========================================================

  useEffect(() => {
    if (!open) {
      return;
    }


    setDraft(
      criarDraftInicial(
        volume
      )
    );


    setFotoEnviada(
      localizarFotoAvaria(
        volume
      )
    );


    setErroFoto(null);
    setEnviandoFoto(false);
  }, [
    open,
    volume,
  ]);


  // ==========================================================
  // DERIVADOS
  // ==========================================================

  const possuiAvariaAnterior =
    Boolean(
      volume?.avaria
    );


  const numeroVolume =
    volume?.numeroVolume ||
    "—";


  const codigoVolume =
    volume?.codigoLido ||
    "Código não informado";


  const possuiFoto =
    Boolean(
      fotoEnviada ||
      localizarFotoAvaria(
        volume
      )
    );


  /*
   * AGORA:
   * exige que o upload tenha sido concluído antes de salvar.
   *
   * DEPOIS:
   * não exige foto.
   */
  const fotoAtendida =
    draft.fotoMomento ===
      "DEPOIS" ||
    (
      draft.fotoMomento ===
        "AGORA" &&
      possuiFoto
    );


  const podeSalvar =
    useMemo(
      () =>
        Boolean(
          draft.tipoOcorrencia &&
          draft.gravidade &&
          (
            draft.fotoMomento ===
              "AGORA" ||
            draft.fotoMomento ===
              "DEPOIS"
          ) &&
          fotoAtendida &&
          !enviandoFoto
        ),
      [
        draft.tipoOcorrencia,
        draft.gravidade,
        draft.fotoMomento,
        fotoAtendida,
        enviandoFoto,
      ]
    );


  if (
    !open ||
    !volume
  ) {
    return null;
  }


  // ==========================================================
  // CAMPOS
  // ==========================================================

  function atualizarCampo(
    campo,
    valor
  ) {
    setDraft(
      (atual) => ({
        ...atual,
        [campo]: valor,
      })
    );


    if (
      campo ===
      "fotoMomento"
    ) {
      setErroFoto(null);
    }
  }


  // ==========================================================
  // ESCOLHER FOTO
  // ==========================================================

  function abrirCamera() {
    if (enviandoFoto) {
      return;
    }


    setErroFoto(null);

    inputCameraRef.current
      ?.click();
  }


  function abrirArquivo() {
    if (enviandoFoto) {
      return;
    }


    setErroFoto(null);

    inputArquivoRef.current
      ?.click();
  }


  // ==========================================================
  // PROCESSAR + UPLOAD
  // ==========================================================

  async function processarArquivoFoto(
    arquivo
  ) {
    if (!arquivo) {
      return;
    }


    if (!condominioId) {
      setErroFoto(
        "Não foi possível identificar o condomínio deste recebimento."
      );

      return;
    }


    if (!clientReceiptId) {
      setErroFoto(
        "Não foi possível identificar o contexto local deste recebimento."
      );

      return;
    }


    try {
      setEnviandoFoto(true);
      setErroFoto(null);


      const evidencia =
        await enviarFotoAvaria({
          arquivo,

          condominioId,

          clientReceiptId,

          tipoEvidencia:
            "FOTO_AVARIA",

          classificacaoAcesso:
            "INCIDENTE",

          metadata: {
            client_volume_id:
              volume.clientVolumeId,

            numero_volume:
              volume.numeroVolume ||
              null,

            codigo_volume:
              volume.codigoLido ||
              null,

            tipo_ocorrencia:
              draft.tipoOcorrencia,

            gravidade:
              draft.gravidade,

            origem_selecao:
              "MODAL_AVARIA",
          },
        });


      if (
        !evidencia?.bucket ||
        !evidencia?.storagePath
      ) {
        throw new Error(
          "O upload não retornou os dados da evidência."
        );
      }


      /*
       * Persistimos SOMENTE os metadados.
       */
      if (
        typeof onAddEvidence ===
        "function"
      ) {
        onAddEvidence(
          volume.clientVolumeId,
          evidencia
        );
      }


      setFotoEnviada(
        evidencia
      );


      /*
       * Se a captura foi feita após selecionar AGORA,
       * mantemos AGORA explicitamente.
       */
      setDraft(
        (atual) => ({
          ...atual,

          fotoMomento:
            "AGORA",

          metadata: {
            ...(atual.metadata || {}),

            foto_momento:
              "AGORA",

            foto_upload_concluido:
              true,
          },
        })
      );
    } catch (error) {
      console.error(
        "[Avaria] Falha no upload da fotografia:",
        error
      );


      setErroFoto(
        error?.message ||
        "Não foi possível enviar a fotografia. Tente novamente ou escolha anexar depois."
      );
    } finally {
      setEnviandoFoto(false);


      /*
       * Permite selecionar o mesmo arquivo novamente.
       */
      if (
        inputCameraRef.current
      ) {
        inputCameraRef.current.value =
          "";
      }


      if (
        inputArquivoRef.current
      ) {
        inputArquivoRef.current.value =
          "";
      }
    }
  }


  function handleCameraChange(
    event
  ) {
    const arquivo =
      event.target.files?.[0] ||
      null;


    void processarArquivoFoto(
      arquivo
    );
  }


  function handleArquivoChange(
    event
  ) {
    const arquivo =
      event.target.files?.[0] ||
      null;


    void processarArquivoFoto(
      arquivo
    );
  }


  // ==========================================================
  // SALVAR
  // ==========================================================

  function handleSalvar() {
    if (!podeSalvar) {
      return;
    }


    const avaria = {
      tipoOcorrencia:
        draft.tipoOcorrencia,

      gravidade:
        draft.gravidade,

      descricao:
        draft.descricao.trim(),

      justificativa:
        draft.justificativa.trim(),

      fotoMomento:
        draft.fotoMomento,

      /*
       * Campo auxiliar.
       * Backend continua autoridade.
       */
      requerFoto:
        true,

      requerRevisao:
        Boolean(
          draft.requerRevisao
        ),

      metadata: {
        ...(draft.metadata || {}),

        foto_momento:
          draft.fotoMomento,

        foto_anexada:
          possuiFoto,

        origem_registro:
          "WIZARD_PORTARIA",
      },
    };


    if (
      typeof onSave ===
      "function"
    ) {
      onSave(
        volume.clientVolumeId,
        avaria
      );
    }
  }


  // ==========================================================
  // REMOVER AVARIA
  //
  // Atenção:
  // não apagamos fisicamente arquivo do Storage.
  //
  // Evidência é imutável e não existe DELETE para Portaria.
  //
  // Tratamento de órfãos/retention será controlado depois.
  // ==========================================================

  function handleRemover() {
    if (enviandoFoto) {
      return;
    }


    if (
      typeof onRemove ===
      "function"
    ) {
      onRemove(
        volume.clientVolumeId
      );
    }
  }


  // ==========================================================
  // BACKDROP
  // ==========================================================

  function handleBackdrop(
    event
  ) {
    if (
      event.target ===
      event.currentTarget
    ) {
      event.preventDefault();
    }
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="novo-recebimento-avaria-modal"
      role="presentation"
      onMouseDown={
        handleBackdrop
      }
    >
      <section
        className="novo-recebimento-avaria-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avaria-volume-title"
      >
        {/* ==================================================
            HEADER
        ================================================== */}

        <header className="novo-recebimento-avaria-modal__header">
          <div>
            <span className="novo-recebimento-avaria-modal__eyebrow">
              Volume {numeroVolume}
            </span>

            <h3
              id="avaria-volume-title"
              className="novo-recebimento-avaria-modal__title"
            >
              Registrar avaria
            </h3>

            <p className="novo-recebimento-avaria-modal__subtitle">
              {codigoVolume}
            </p>
          </div>
        </header>


        {/* ==================================================
            BODY
        ================================================== */}

        <div className="novo-recebimento-avaria-modal__body">

          <div className="novo-recebimento-grid">

            <label className="novo-recebimento-field">
              <span className="novo-recebimento-field__label">
                Tipo da ocorrência
              </span>

              <select
                className="novo-recebimento-select"
                value={
                  draft.tipoOcorrencia
                }
                disabled={
                  enviandoFoto
                }
                onChange={(event) =>
                  atualizarCampo(
                    "tipoOcorrencia",
                    event.target.value
                  )
                }
              >
                {TIPOS_AVARIA.map(
                  (item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  )
                )}
              </select>
            </label>


            <label className="novo-recebimento-field">
              <span className="novo-recebimento-field__label">
                Gravidade
              </span>

              <select
                className="novo-recebimento-select"
                value={
                  draft.gravidade
                }
                disabled={
                  enviandoFoto
                }
                onChange={(event) =>
                  atualizarCampo(
                    "gravidade",
                    event.target.value
                  )
                }
              >
                {GRAVIDADES.map(
                  (item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  )
                )}
              </select>
            </label>

          </div>


          <label className="novo-recebimento-field">
            <span className="novo-recebimento-field__label">
              Descrição
            </span>

            <textarea
              className="novo-recebimento-input novo-recebimento-avaria-modal__textarea"
              value={
                draft.descricao
              }
              disabled={
                enviandoFoto
              }
              onChange={(event) =>
                atualizarCampo(
                  "descricao",
                  event.target.value
                )
              }
              placeholder="Descreva brevemente a condição observada."
              rows={3}
            />

            <small className="novo-recebimento-field__helper">
              Informe apenas a condição observada no volume ou embalagem.
            </small>
          </label>


          <label className="novo-recebimento-field">
            <span className="novo-recebimento-field__label">
              Observação operacional
            </span>

            <textarea
              className="novo-recebimento-input novo-recebimento-avaria-modal__textarea"
              value={
                draft.justificativa
              }
              disabled={
                enviandoFoto
              }
              onChange={(event) =>
                atualizarCampo(
                  "justificativa",
                  event.target.value
                )
              }
              placeholder="Opcional"
              rows={2}
            />
          </label>


          {/* =================================================
              FOTO
          ================================================= */}

          <div className="novo-recebimento-avaria-modal__photo">

            <div className="novo-recebimento-avaria-modal__photo-header">
              <h4>
                Evidência fotográfica
              </h4>

              <p>
                A fotografia pode ser anexada agora ou posteriormente.
              </p>
            </div>


            <div className="novo-recebimento-avaria-modal__options">

              <label
                className={
                  `novo-recebimento-avaria-option${
                    draft.fotoMomento ===
                    "AGORA"
                      ? " novo-recebimento-avaria-option--selected"
                      : ""
                  }`
                }
              >
                <input
                  type="radio"
                  name="fotoMomento"
                  value="AGORA"
                  disabled={
                    enviandoFoto
                  }
                  checked={
                    draft.fotoMomento ===
                    "AGORA"
                  }
                  onChange={() =>
                    atualizarCampo(
                      "fotoMomento",
                      "AGORA"
                    )
                  }
                />

                <span>
                  <strong>
                    Anexar foto agora
                  </strong>

                  <small>
                    Capture uma foto ou selecione uma imagem deste dispositivo.
                  </small>
                </span>
              </label>


              <label
                className={
                  `novo-recebimento-avaria-option${
                    draft.fotoMomento ===
                    "DEPOIS"
                      ? " novo-recebimento-avaria-option--selected"
                      : ""
                  }`
                }
              >
                <input
                  type="radio"
                  name="fotoMomento"
                  value="DEPOIS"
                  disabled={
                    enviandoFoto
                  }
                  checked={
                    draft.fotoMomento ===
                    "DEPOIS"
                  }
                  onChange={() =>
                    atualizarCampo(
                      "fotoMomento",
                      "DEPOIS"
                    )
                  }
                />

                <span>
                  <strong>
                    Anexar depois
                  </strong>

                  <small>
                    O recebimento poderá continuar. Se exigida, a foto deverá existir antes da Entrada Oficial.
                  </small>
                </span>
              </label>

            </div>


            {/* ===============================================
                CONTROLES AGORA
            =============================================== */}

            {draft.fotoMomento ===
              "AGORA" && (
              <div className="novo-recebimento-avaria-upload">

                {!possuiFoto &&
                  !enviandoFoto && (
                  <div className="novo-recebimento-avaria-upload__actions">

                    <button
                      type="button"
                      className="novo-recebimento-button novo-recebimento-button--primary"
                      onClick={
                        abrirCamera
                      }
                    >
                      Tirar foto
                    </button>


                    <button
                      type="button"
                      className="novo-recebimento-button novo-recebimento-button--secondary"
                      onClick={
                        abrirArquivo
                      }
                    >
                      Selecionar arquivo
                    </button>

                  </div>
                )}


                {enviandoFoto && (
                  <div
                    className="novo-recebimento-avaria-upload__processing"
                    role="status"
                    aria-live="polite"
                  >
                    <span className="novo-recebimento-spinner" />

                    <div>
                      <strong>
                        Preparando evidência…
                      </strong>

                      <small>
                        Processando, protegendo e enviando a imagem.
                      </small>
                    </div>
                  </div>
                )}


                {possuiFoto &&
                  !enviandoFoto && (
                  <div
                    className="novo-recebimento-feedback novo-recebimento-feedback--success"
                    role="status"
                  >
                    <strong>
                      Foto anexada
                    </strong>

                    <span>
                      A evidência foi processada e armazenada com segurança.
                    </span>
                  </div>
                )}


                {erroFoto && (
                  <div
                    className="novo-recebimento-feedback novo-recebimento-feedback--error"
                    role="alert"
                  >
                    <strong>
                      Não foi possível anexar a foto
                    </strong>

                    <span>
                      {erroFoto}
                    </span>
                  </div>
                )}


                {erroFoto &&
                  !enviandoFoto && (
                  <div className="novo-recebimento-avaria-upload__actions">

                    <button
                      type="button"
                      className="novo-recebimento-button novo-recebimento-button--primary"
                      onClick={
                        abrirCamera
                      }
                    >
                      Tentar pela câmera
                    </button>


                    <button
                      type="button"
                      className="novo-recebimento-button novo-recebimento-button--secondary"
                      onClick={
                        abrirArquivo
                      }
                    >
                      Selecionar arquivo
                    </button>

                  </div>
                )}

              </div>
            )}


            {!draft.fotoMomento && (
              <div
                className="novo-recebimento-feedback novo-recebimento-feedback--warning"
                role="status"
              >
                Informe se a foto será anexada agora ou posteriormente.
              </div>
            )}


            {draft.fotoMomento ===
              "AGORA" &&
              !possuiFoto &&
              !enviandoFoto &&
              !erroFoto && (
                <div
                  className="novo-recebimento-feedback novo-recebimento-feedback--warning"
                  role="status"
                >
                  Para manter “Anexar agora”, capture ou selecione uma fotografia.
                </div>
              )}


            {/* ===============================================
                INPUT NATIVO — CÂMERA
            =============================================== */}

            <input
              ref={
                inputCameraRef
              }
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              hidden
              onChange={
                handleCameraChange
              }
            />


            {/* ===============================================
                INPUT NATIVO — ARQUIVO
            =============================================== */}

            <input
              ref={
                inputArquivoRef
              }
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={
                handleArquivoChange
              }
            />

          </div>

        </div>


        {/* ==================================================
            FOOTER
        ================================================== */}

        <footer className="novo-recebimento-avaria-modal__footer">

          <div>
            {possuiAvariaAnterior && (
              <button
                type="button"
                className="novo-recebimento-button novo-recebimento-button--secondary"
                disabled={
                  enviandoFoto
                }
                onClick={
                  handleRemover
                }
              >
                Remover avaria
              </button>
            )}
          </div>


          <div className="novo-recebimento-avaria-modal__footer-actions">

            <button
              type="button"
              className="novo-recebimento-button novo-recebimento-button--secondary"
              disabled={
                enviandoFoto
              }
              onClick={
                onClose
              }
            >
              Cancelar
            </button>


            <button
              type="button"
              className="novo-recebimento-button novo-recebimento-button--primary"
              disabled={
                !podeSalvar
              }
              onClick={
                handleSalvar
              }
            >
              {enviandoFoto
                ? "Enviando foto…"
                : "Salvar avaria"}
            </button>

          </div>

        </footer>

      </section>
    </div>
  );
}