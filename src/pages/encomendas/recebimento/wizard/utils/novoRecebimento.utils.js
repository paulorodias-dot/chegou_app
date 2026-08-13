import {
  NOVO_RECEBIMENTO_FORMATO_CODIGO,
  NOVO_RECEBIMENTO_INITIAL_STATE,
  NOVO_RECEBIMENTO_LOCAL_STATUS,
  NOVO_RECEBIMENTO_ORIGEM_CAPTURA,
  NOVO_RECEBIMENTO_SYNC_STATUS,
} from "../constants";


// ============================================================
// SISTEMA CHEGOU!
// NOVO RECEBIMENTO — UTILS
//
// Responsabilidades:
// - estado local;
// - normalizações exclusivamente de UX;
// - volumes locais;
// - quantidade;
// - validações visuais;
// - serialização do payload;
// - estados de sincronização.
//
// IMPORTANTE:
// Nenhuma normalização deste arquivo substitui as validações,
// normalizações, autorização ou regras autoritativas do backend.
// ============================================================


// ============================================================
// CLONE SEGURO DO ESTADO INICIAL
// Evita reaproveitar referências internas do objeto congelado.
// ============================================================

export function criarEstadoInicialNovoRecebimento() {
  return {
    ...NOVO_RECEBIMENTO_INITIAL_STATE,

    identificacao: {
      ...NOVO_RECEBIMENTO_INITIAL_STATE.identificacao,
    },

    captura: {
      ...NOVO_RECEBIMENTO_INITIAL_STATE.captura,
      volumes: [],
    },

    assinatura: null,
  };
}


// ============================================================
// UUID LOCAL
//
// Utilizado para:
// - clientReceiptId;
// - clientVolumeId;
// - chave de idempotência.
//
// Não representa ID oficial do banco.
// ============================================================

export function gerarUuidLocal() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return [
    Date.now().toString(16),
    Math.random().toString(16).slice(2),
    Math.random().toString(16).slice(2),
  ].join("-");
}


// ============================================================
// IDENTIFICADOR LOCAL DO RECEBIMENTO
// ============================================================

export function gerarClientReceiptId() {
  return `receipt-${gerarUuidLocal()}`;
}


// ============================================================
// CHAVE DE IDEMPOTÊNCIA
//
// A RPC oficial exige chave com pelo menos 16 caracteres.
//
// Esta chave deve permanecer a mesma durante retries
// do MESMO payload final.
// ============================================================

export function gerarChaveIdempotenciaRecebimento() {
  return `recebimento-${gerarUuidLocal()}`;
}


// ============================================================
// TEXTO OPCIONAL
// ============================================================

function textoOpcional(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return null;
  }

  const texto =
    String(valor).trim();

  return texto || null;
}


// ============================================================
// NORMALIZAÇÃO VISUAL DO CÓDIGO
//
// Regra de UX oficial:
// - letras sempre em CAIXA ALTA;
// - números permanecem intactos;
// - preserva caracteres do valor apresentado;
// - remove apenas espaços nas extremidades.
//
// Ex.:
// ab123cd   -> AB123CD
// 1z999aa   -> 1Z999AA
//
// Esta função é adequada para o valor exibido/armazenado
// localmente em codigoLido.
// ============================================================

export function normalizarCodigoExibicaoLocal(
  valor
) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return "";
  }

  return String(valor)
    .trim()
    .toUpperCase();
}


// ============================================================
// NORMALIZAÇÃO LOCAL PARA COMPARAÇÃO
//
// IMPORTANTE:
// Isto NÃO substitui fn_encomendas_normalizar_rastreio_v1.
//
// Serve apenas para:
// - comparação local;
// - feedback visual;
// - prevenção simples de duplicidade no Wizard.
//
// Remove caracteres que não sejam A-Z ou 0-9.
//
// O backend continua sendo a autoridade.
// ============================================================

export function normalizarCodigoLocal(valor) {
  return normalizarCodigoExibicaoLocal(
    valor
  ).replace(
    /[^A-Z0-9]/g,
    ""
  );
}


// ============================================================
// NORMALIZAÇÃO LOCAL DE NOME DE PESSOA
//
// Regra visual:
//
// joão da silva
// -> João da Silva
//
// maria de souza
// -> Maria de Souza
//
// Mantém conectivos usuais em minúsculas quando não forem
// a primeira palavra.
//
// É somente uma normalização de UX.
// ============================================================

const CONECTIVOS_NOME =
  new Set([
    "da",
    "das",
    "de",
    "do",
    "dos",
    "e",
  ]);


function normalizarParteNome(
  palavra,
  indice
) {
  if (!palavra) {
    return "";
  }

  const minuscula =
    palavra.toLocaleLowerCase(
      "pt-BR"
    );


  if (
    indice > 0 &&
    CONECTIVOS_NOME.has(
      minuscula
    )
  ) {
    return minuscula;
  }


  /*
   * Trata nomes compostos com hífen:
   *
   * ana-maria
   * -> Ana-Maria
   */
  if (
    minuscula.includes("-")
  ) {
    return minuscula
      .split("-")
      .map((parte) => {
        if (!parte) {
          return "";
        }

        return (
          parte
            .charAt(0)
            .toLocaleUpperCase(
              "pt-BR"
            ) +
          parte.slice(1)
        );
      })
      .join("-");
  }


  /*
   * Trata nomes com apóstrofo:
   *
   * d'ávila
   * -> D'Ávila
   */
  if (
    minuscula.includes("'")
  ) {
    return minuscula
      .split("'")
      .map((parte) => {
        if (!parte) {
          return "";
        }

        return (
          parte
            .charAt(0)
            .toLocaleUpperCase(
              "pt-BR"
            ) +
          parte.slice(1)
        );
      })
      .join("'");
  }


  return (
    minuscula
      .charAt(0)
      .toLocaleUpperCase(
        "pt-BR"
      ) +
    minuscula.slice(1)
  );
}


export function normalizarNomePessoaLocal(
  valor
) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return "";
  }


  const texto =
    String(valor)
      .trim()
      .replace(/\s+/g, " ");


  if (!texto) {
    return "";
  }


  return texto
    .split(" ")
    .map(
      normalizarParteNome
    )
    .join(" ");
}


// ============================================================
// QUANTIDADE
// ============================================================

export function normalizarQuantidadeLocal(valor) {
  if (
    valor === "" ||
    valor === null ||
    valor === undefined
  ) {
    return "";
  }

  const numero =
    Number(valor);

  if (
    !Number.isFinite(numero)
  ) {
    return "";
  }

  const inteiro =
    Math.trunc(numero);

  if (inteiro < 0) {
    return 0;
  }

  return inteiro;
}


export function calcularQuantidadeBipada(
  volumes = []
) {
  if (!Array.isArray(volumes)) {
    return 0;
  }

  return volumes.filter(
    (volume) =>
      volume?.removido !== true
  ).length;
}


export function calcularDiferencaQuantidade(
  quantidadeInformada,
  quantidadeBipada
) {
  if (
    quantidadeInformada === "" ||
    quantidadeInformada === null ||
    quantidadeInformada === undefined
  ) {
    return null;
  }

  const informada =
    Number(
      quantidadeInformada
    );

  const bipada =
    Number(
      quantidadeBipada || 0
    );

  if (
    !Number.isFinite(informada) ||
    !Number.isFinite(bipada)
  ) {
    return null;
  }

  return (
    bipada -
    informada
  );
}


export function possuiDivergenciaQuantidadeLocal(
  quantidadeInformada,
  quantidadeBipada
) {
  const diferenca =
    calcularDiferencaQuantidade(
      quantidadeInformada,
      quantidadeBipada
    );

  return (
    diferenca !== null &&
    diferenca !== 0
  );
}


// ============================================================
// VOLUME LOCAL
// ============================================================

export function criarVolumeLocal({
  codigoLido,
  formatoCodigo =
    NOVO_RECEBIMENTO_FORMATO_CODIGO
      .DESCONHECIDO,

  origemCaptura =
    NOVO_RECEBIMENTO_ORIGEM_CAPTURA
      .DIGITACAO_MANUAL,

  confianca = null,
} = {}) {
  const agora =
    new Date().toISOString();

  const codigoExibicao =
    normalizarCodigoExibicaoLocal(
      codigoLido
    );

  return {
    clientVolumeId:
      `volume-${gerarUuidLocal()}`,

    /*
     * Regra UX:
     * letras ficam em caixa alta já no estado.
     */
    codigoLido:
      codigoExibicao,

    codigoNormalizadoLocal:
      normalizarCodigoLocal(
        codigoExibicao
      ),

    formatoCodigo,
    origemCaptura,

    confianca,

    capturadoEm:
      agora,

    numeroVolume:
      null,

    removido:
      false,

    removidoEm:
      null,

    /*
     * Estrutura esperada:
     *
     * avaria: {
     *   tipoOcorrencia,
     *   gravidade,
     *   descricao,
     *   justificativa,
     *   fotoMomento: "AGORA" | "DEPOIS",
     *   requerFoto,
     *   requerRevisao,
     *   metadata
     * }
     */
    avaria:
      null,

    /*
     * Somente metadados de evidências já enviadas
     * ao Storage devem permanecer aqui.
     *
     * Não armazenar File/Blob bruto nesta coleção.
     */
    evidencias:
      [],

    serverVolumeId:
      null,

    moradorAguardandoRecebimento:
      null,

    syncStatus:
      NOVO_RECEBIMENTO_SYNC_STATUS
        .LOCAL,

    ultimoErro:
      null,
  };
}


// ============================================================
// DUPLICIDADE LOCAL
//
// Proteção de UX.
// O banco permanece com a proteção oficial.
// ============================================================

export function codigoJaExisteLocalmente(
  volumes,
  codigoLido
) {
  const codigoNormalizado =
    normalizarCodigoLocal(
      codigoLido
    );

  if (!codigoNormalizado) {
    return false;
  }

  return (
    volumes || []
  ).some((volume) => {
    if (
      volume?.removido === true
    ) {
      return false;
    }

    return (
      normalizarCodigoLocal(
        volume?.codigoLido
      ) ===
      codigoNormalizado
    );
  });
}


// ============================================================
// REENUMERAÇÃO LOCAL
//
// Mantém a sequência visual dos volumes ativos.
// Não representa código oficial.
// ============================================================

export function reenumerarVolumesLocais(
  volumes = []
) {
  let contador = 0;

  return volumes.map(
    (volume) => {
      if (
        volume?.removido === true
      ) {
        return volume;
      }

      contador += 1;

      return {
        ...volume,

        numeroVolume:
          contador,
      };
    }
  );
}


// ============================================================
// ATUALIZAÇÃO DERIVADA DO ESTADO
// ============================================================

export function recalcularEstadoCaptura(
  state
) {
  const volumes =
    reenumerarVolumesLocais(
      state?.captura?.volumes ||
      []
    );

  const quantidadeBipada =
    calcularQuantidadeBipada(
      volumes
    );

  const possuiDivergencia =
    possuiDivergenciaQuantidadeLocal(
      state?.captura
        ?.quantidadeInformada,

      quantidadeBipada
    );

  return {
    ...state,

    captura: {
      ...state.captura,

      volumes,

      quantidadeBipada,
    },

    possuiDivergenciaQuantidade:
      possuiDivergencia,

    atualizadoEm:
      new Date().toISOString(),
  };
}


// ============================================================
// ESTADO DE NOVO RECEBIMENTO ABERTO
// ============================================================

export function iniciarNovoRecebimentoLocal() {
  const agora =
    new Date().toISOString();

  return {
    ...criarEstadoInicialNovoRecebimento(),

    clientReceiptId:
      gerarClientReceiptId(),

    chaveIdempotencia:
      gerarChaveIdempotenciaRecebimento(),

    abertoEm:
      agora,

    atualizadoEm:
      agora,

    statusLocal:
      NOVO_RECEBIMENTO_LOCAL_STATUS
        .EM_ANDAMENTO,

    syncStatus:
      NOVO_RECEBIMENTO_SYNC_STATUS
        .LOCAL,
  };
}


// ============================================================
// VALIDAÇÃO VISUAL DAS ETAPAS
//
// Estas validações são apenas de UX.
// Não substituem validações das RPCs.
// ============================================================

export function podeAvancarIdentificacao(
  state
) {
  const entregadorNome =
    normalizarNomePessoaLocal(
      state?.identificacao
        ?.entregadorNome
    );

  const transportadoraId =
    state?.identificacao
      ?.transportadoraId;

  return Boolean(
    entregadorNome &&
    transportadoraId
  );
}


export function podeIniciarCaptura(
  state
) {
  const quantidade =
    state?.captura
      ?.quantidadeInformada;

  if (
    quantidade === "" ||
    quantidade === null ||
    quantidade === undefined
  ) {
    return false;
  }

  const numero =
    Number(quantidade);

  return (
    Number.isInteger(numero) &&
    numero > 0
  );
}


export function podeConcluirRecebimento(
  state
) {
  if (
    !podeAvancarIdentificacao(
      state
    )
  ) {
    return false;
  }

  if (
    !podeIniciarCaptura(
      state
    )
  ) {
    return false;
  }

  const quantidadeBipada =
    Number(
      state?.captura
        ?.quantidadeBipada ||
      0
    );

  /*
   * AVARIA SEM FOTO:
   * não bloqueia conclusão.
   *
   * ASSINATURA OBRIGATÓRIA AUSENTE:
   * não bloqueia conclusão.
   *
   * Essas regras são tratadas pelo backend
   * conforme contratos homologados.
   */
  return (
    quantidadeBipada > 0
  );
}


// ============================================================
// EVIDÊNCIA PRONTA PARA BACKEND
//
// rpc_encomenda_evidencia_registrar_v1 exige:
// - bucket;
// - storage_path.
//
// Portanto uma escolha "Anexar agora" que ainda não terminou
// seu upload NÃO pode ser serializada como evidência válida.
//
// Isso impede enviar:
//
// bucket: null
// storage_path: null
//
// e quebrar o processamento inteiro.
// ============================================================

function evidenciaProntaParaBackend(
  evidencia
) {
  if (!evidencia) {
    return false;
  }

  return Boolean(
    textoOpcional(
      evidencia.bucket
    ) &&
    textoOpcional(
      evidencia.storagePath
    )
  );
}


// ============================================================
// ASSINATURA PRONTA PARA BACKEND
//
// A RPC de assinatura também exige bucket + storage_path.
//
// Assim:
// - assinatura desenhada localmente mas ainda não enviada
//   não gera registrar=true;
// - assinatura já persistida no Storage gera registrar=true.
//
// A ausência nunca deve impedir Concluir Recebimento.
// ============================================================

function assinaturaProntaParaBackend(
  assinatura
) {
  if (!assinatura) {
    return false;
  }

  return Boolean(
    textoOpcional(
      assinatura.bucket
    ) &&
    textoOpcional(
      assinatura.storagePath
    )
  );
}


// ============================================================
// SERIALIZAÇÃO DO PAYLOAD
//
// IMPORTANTE:
// Este método apenas monta o contrato frontend.
//
// O service será responsável por enviar à:
//
// rpc_encomenda_pre_recebimento_processar_v2
//
// Não inclui confirmar=true.
// Portanto NÃO promove para Encomenda Oficial.
// ============================================================

export function montarPayloadProcessarRecebimento({
  state,
  condominioId,
} = {}) {
  if (!state) {
    throw new Error(
      "Estado do recebimento não informado."
    );
  }

  if (!condominioId) {
    throw new Error(
      "Condomínio não informado."
    );
  }


  const volumesAtivos =
    (
      state.captura?.volumes ||
      []
    ).filter(
      (volume) =>
        volume?.removido !== true
    );


  const ocorrencias = [];
  const evidencias = [];


  // ==========================================================
  // OCORRÊNCIAS + EVIDÊNCIAS
  // ==========================================================

  volumesAtivos.forEach(
    (
      volume,
      volumeIndice
    ) => {
      if (!volume?.avaria) {
        return;
      }


      const fotoMomento =
        volume.avaria
          .fotoMomento ||
        volume.avaria
          .metadata
          ?.foto_momento ||
        null;


      const metadataAvaria = {
        ...(
          volume.avaria
            .metadata ||
          {}
        ),
      };


      if (fotoMomento) {
        metadataAvaria
          .foto_momento =
          fotoMomento;
      }


      ocorrencias.push({
        volume_indice:
          volumeIndice,

        tipo_ocorrencia:
          volume.avaria
            .tipoOcorrencia ||
          "OUTRA_OCORRENCIA",

        gravidade:
          volume.avaria
            .gravidade ||
          "BAIXA",

        decisao_operacional:
          textoOpcional(
            volume.avaria
              .decisaoOperacional
          ),

        descricao:
          textoOpcional(
            volume.avaria
              .descricao
          ),

        justificativa:
          textoOpcional(
            volume.avaria
              .justificativa
          ),

        /*
         * Auxiliar do contrato.
         *
         * NÃO é autoridade sobre obrigatoriedade.
         * Backend/configuração do condomínio continua soberano.
         */
        requer_foto:
          Boolean(
            volume.avaria
              .requerFoto
          ),

        requer_revisao:
          Boolean(
            volume.avaria
              .requerRevisao
          ),

        metadata:
          metadataAvaria,
      });


      const ocorrenciaIndice =
        ocorrencias.length - 1;


      (
        volume.evidencias ||
        []
      )
        .filter(
          evidenciaProntaParaBackend
        )
        .forEach(
          (evidencia) => {
            evidencias.push({
              volume_indice:
                volumeIndice,

              ocorrencia_indice:
                ocorrenciaIndice,

              tipo_evidencia:
                evidencia
                  .tipoEvidencia ||
                "FOTO_AVARIA",

              bucket:
                textoOpcional(
                  evidencia.bucket
                ),

              storage_path:
                textoOpcional(
                  evidencia
                    .storagePath
                ),

              mime_type:
                textoOpcional(
                  evidencia.mimeType
                ),

              tamanho_bytes:
                evidencia
                  .tamanhoBytes ??
                null,

              largura_px:
                evidencia
                  .larguraPx ??
                null,

              altura_px:
                evidencia
                  .alturaPx ??
                null,

              hash_sha256:
                textoOpcional(
                  evidencia
                    .hashSha256
                ),

              arquivo_original:
                Boolean(
                  evidencia
                    .arquivoOriginal
                ),

              exif_removido:
                evidencia
                  .exifRemovido !==
                false,

              classificacao_acesso:
                evidencia
                  .classificacaoAcesso ||
                "INCIDENTE",

              /*
               * null permite que o backend use
               * retencao_incidente_dias.
               *
               * FOTO_AVARIA homologada:
               * 365 dias no condomínio de teste.
               */
              retencao_dias:
                evidencia
                  .retencaoDias ??
                null,

              metadata: {
                ...(
                  evidencia
                    .metadata ||
                  {}
                ),

                origem_wizard:
                  "NOVO_RECEBIMENTO",
              },
            });
          }
        );
    }
  );


  // ==========================================================
  // IDENTIFICAÇÃO NORMALIZADA
  // ==========================================================

  const entregadorNome =
    normalizarNomePessoaLocal(
      state.identificacao
        ?.entregadorNome
    );


  /*
   * Para transportadora:
   *
   * - se houver nome livre informado em "Outras",
   *   ele tem precedência;
   *
   * - caso contrário usa o nome apresentado
   *   da transportadora selecionada.
   *
   * O backend V2 preserva este campo.
   */
  const transportadoraNomeInformado =
    textoOpcional(
      state.identificacao
        ?.transportadoraNomeInformado
    ) ||
    textoOpcional(
      state.identificacao
        ?.transportadoraNome
    );


  /*
   * Somente documento JÁ mascarado deve sair deste util.
   *
   * Não usamos um eventual documento bruto como fallback,
   * para evitar exposição acidental de dado pessoal.
   *
   * Quando ajustarmos a tela de identificação, o estado
   * oficial deve utilizar:
   *
   * identificacao.entregadorDocumentoMascarado
   */
  const entregadorDocumentoMascarado =
    textoOpcional(
      state.identificacao
        ?.entregadorDocumentoMascarado
    );


  // ==========================================================
  // ASSINATURA
  // ==========================================================

  const assinaturaPronta =
    assinaturaProntaParaBackend(
      state.assinatura
    );


  const assinaturaPayload =
    assinaturaPronta
      ? {
          registrar:
            true,

          tipo_assinatura:
            state.assinatura
              .tipoAssinatura ||
            "RECEBIMENTO_ENTREGADOR",

          nome_signatario:
            normalizarNomePessoaLocal(
              state.assinatura
                .nomeSignatario ||
              entregadorNome
            ) ||
            null,

          documento_mascarado_signatario:
            textoOpcional(
              state.assinatura
                .documentoMascarado
            ),

          bucket:
            textoOpcional(
              state.assinatura
                .bucket
            ),

          storage_path:
            textoOpcional(
              state.assinatura
                .storagePath
            ),

          hash_sha256:
            textoOpcional(
              state.assinatura
                .hashSha256
            ),

          mime_type:
            textoOpcional(
              state.assinatura
                .mimeType
            ),

          tamanho_bytes:
            state.assinatura
              .tamanhoBytes ??
            null,

          metadata: {
            ...(
              state.assinatura
                .metadata ||
              {}
            ),

            origem_wizard:
              "NOVO_RECEBIMENTO",
          },
        }
      : {
          /*
           * Inclusive quando o condomínio considera
           * assinatura obrigatória.
           *
           * A ausência é uma pendência administrativa
           * não bloqueante, conforme contrato V3.
           */
          registrar:
            false,
        };


  // ==========================================================
  // PAYLOAD FINAL
  // ==========================================================

  return {
    condominio_id:
      condominioId,

    transportadora_id:
      state.identificacao
        ?.transportadoraId ||
      null,

    /*
     * NOVO CONTRATO V2.
     *
     * Fundamental para TRP-00022 / Outras Transportadoras.
     */
    transportadora_nome_informado:
      transportadoraNomeInformado,

    tipo_entrega:
      "ENCOMENDA_PADRAO",

    fluxo_operacional:
      "NORMAL",

    quantidade_informada:
      Number(
        state.captura
          .quantidadeInformada
      ),

    quantidade_conferida:
      Number(
        state.captura
          .quantidadeBipada
      ),

    entregador_nome:
      entregadorNome ||
      null,

    entregador_empresa:
      transportadoraNomeInformado,

    /*
     * NOVO CONTRATO V2.
     *
     * Não envia documento bruto.
     */
    entregador_documento_mascarado:
      entregadorDocumentoMascarado,

    observacoes:
      textoOpcional(
        state.observacoes
      ),

    justificativa_divergencia:
      textoOpcional(
        state
          .justificativaDivergencia
      ),

    /*
     * O Wizard atual cria/consolida o Pré.
     *
     * Entrada Oficial é fluxo separado.
     */
    confirmar:
      false,

    volumes:
      volumesAtivos.map(
        (
          volume,
          index
        ) => ({
          codigo_lido:
            normalizarCodigoExibicaoLocal(
              volume.codigoLido
            ) ||
            null,

          formato_codigo:
            volume.formatoCodigo ||
            NOVO_RECEBIMENTO_FORMATO_CODIGO
              .DESCONHECIDO,

          numero_volume:
            index + 1,

          origem_captura:
            volume.origemCaptura ||
            NOVO_RECEBIMENTO_ORIGEM_CAPTURA
              .DIGITACAO_MANUAL,

          confianca:
            volume.confianca ??
            null,
        })
      ),

    /*
     * Capturas estruturadas/OCR permanecem desacopladas.
     */
    capturas:
      [],

    ocorrencias,

    evidencias,

    assinatura:
      assinaturaPayload,
  };
}


// ============================================================
// MARCAÇÕES DE SINCRONIZAÇÃO
// ============================================================

export function marcarRecebimentoConcluindo(
  state
) {
  return {
    ...state,

    statusLocal:
      NOVO_RECEBIMENTO_LOCAL_STATUS
        .CONCLUINDO,

    syncStatus:
      NOVO_RECEBIMENTO_SYNC_STATUS
        .SINCRONIZANDO,

    ultimoErro:
      null,

    atualizadoEm:
      new Date().toISOString(),
  };
}


export function marcarRecebimentoConcluido(
  state,
  resultado
) {
  return {
    ...state,

    statusLocal:
      NOVO_RECEBIMENTO_LOCAL_STATUS
        .CONCLUIDO,

    syncStatus:
      NOVO_RECEBIMENTO_SYNC_STATUS
        .SINCRONIZADO,

    preRecebimentoId:
      resultado
        ?.pre_recebimento_id ||
      state.preRecebimentoId ||
      null,

    correlationId:
      resultado
        ?.pre_recebimento
        ?.correlation_id ||
      state.correlationId ||
      null,

    ultimoErro:
      null,

    atualizadoEm:
      new Date().toISOString(),
  };
}


export function marcarRecebimentoAguardandoSincronizacao(
  state,
  erro = null
) {
  return {
    ...state,

    statusLocal:
      NOVO_RECEBIMENTO_LOCAL_STATUS
        .AGUARDANDO_SINCRONIZACAO,

    syncStatus:
      NOVO_RECEBIMENTO_SYNC_STATUS
        .PENDENTE,

    ultimoErro:
      erro
        ? {
            message:
              erro?.message ||
              "Falha de sincronização.",

            registradoEm:
              new Date()
                .toISOString(),
          }
        : null,

    atualizadoEm:
      new Date().toISOString(),
  };
}