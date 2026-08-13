import { supabase } from "../../../../../services/supabase";


// ============================================================
// SISTEMA CHEGOU!
// CENTRAL DE ENCOMENDAS
//
// EVIDÊNCIAS STORAGE SERVICE
//
// Responsabilidades:
// - obter configuração operacional autorizada;
// - validar arquivo local;
// - processar imagens ANTES do upload;
// - limitar dimensões;
// - remover EXIF por re-renderização;
// - converter/comprimir imagem;
// - gerar SHA-256 do arquivo FINAL;
// - montar path multi-tenant;
// - fazer upload privado no Supabase Storage;
// - devolver apenas metadados serializáveis ao Wizard.
//
// NÃO:
// - persiste diretamente em tabelas;
// - cria encomenda;
// - registra ocorrência;
// - decide se foto é obrigatória;
// - decide permissão do usuário;
// - armazena File/Blob no IndexedDB;
// - usa service_role no navegador.
//
// AUTORIDADE:
// - autenticação: Supabase Auth;
// - autorização Storage: RLS/policies;
// - configuração operacional: backend;
// - persistência oficial da evidência:
//   rpc_encomenda_evidencia_registrar_v1.
// ============================================================


// ============================================================
// BUCKETS OFICIAIS
// ============================================================

export const ENCOMENDAS_STORAGE_BUCKETS =
  Object.freeze({
    EVIDENCIAS:
      "encomendas-evidencias",

    ASSINATURAS:
      "encomendas-assinaturas",
  });


// ============================================================
// TIPOS
// ============================================================

const MIME_IMAGEM_PERMITIDOS =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);


const MIME_EVIDENCIA_PERMITIDOS =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ]);


// ============================================================
// LIMITES FÍSICOS DOS BUCKETS
//
// Estes limites refletem a infraestrutura atualmente
// materializada no Supabase.
//
// A configuração operacional pode produzir arquivos muito
// menores.
//
// Evidências ........ 10 MB
// Assinaturas .......  5 MB
// ============================================================

const LIMITE_BUCKET_EVIDENCIA_BYTES =
  10 * 1024 * 1024;


const LIMITE_BUCKET_ASSINATURA_BYTES =
  5 * 1024 * 1024;


/*
 * Limite preventivo para o arquivo ORIGINAL recebido
 * pelo navegador.
 *
 * O arquivo será processado ANTES de chegar ao Storage.
 *
 * Não confundir com o limite final do bucket.
 */
const LIMITE_ENTRADA_IMAGEM_BYTES =
  25 * 1024 * 1024;


// ============================================================
// CONFIGURAÇÃO DEFAULT DEFENSIVA
//
// O backend continua soberano.
// Estes valores existem apenas como fallback técnico caso
// alguma versão anterior da RPC não forneça determinado campo.
// ============================================================

const CONFIG_IMAGEM_DEFAULT =
  Object.freeze({
    maxImagemLadoPx: 1920,
    qualidadeImagemPercentual: 85,
    formatoImagemPreferencial: "WEBP",
  });


// ============================================================
// ERRO DO SERVICE
// ============================================================

function criarErroStorage({
  message,
  code = null,
  details = null,
  originalError = null,
} = {}) {
  const error =
    new Error(
      message ||
        "Não foi possível processar o arquivo."
    );

  error.name =
    "EvidenciasStorageServiceError";

  error.code =
    code;

  error.details =
    details;

  error.originalError =
    originalError;

  return error;
}


// ============================================================
// TEXTO
// ============================================================

function textoObrigatorio(
  valor,
  nomeCampo
) {
  const texto =
    String(
      valor ?? ""
    ).trim();


  if (!texto) {
    throw criarErroStorage({
      message:
        `${nomeCampo} não informado.`,
      code:
        "CAMPO_OBRIGATORIO",
    });
  }


  return texto;
}


// ============================================================
// SEGMENTOS DO PATH
//
// A policy atual aceita:
//
// {business_id}/
// {condominio_id}/
// {contexto_id}/
// ...
//
// Não permitimos "/" dentro de um segmento.
// ============================================================

function validarSegmentoPath(
  valor,
  nomeCampo
) {
  const texto =
    textoObrigatorio(
      valor,
      nomeCampo
    );


  if (
    texto.length > 160 ||
    !/^[A-Za-z0-9._:@-]+$/.test(
      texto
    )
  ) {
    throw criarErroStorage({
      message:
        `${nomeCampo} possui formato inválido para o Storage.`,
      code:
        "SEGMENTO_PATH_INVALIDO",
    });
  }


  return texto;
}


// ============================================================
// UUID LOCAL PARA ARQUIVO
// ============================================================

function gerarUuidArquivo() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }


  return [
    Date.now().toString(16),
    Math.random()
      .toString(16)
      .slice(2),
    Math.random()
      .toString(16)
      .slice(2),
  ].join("-");
}


// ============================================================
// CONFIGURAÇÃO OPERACIONAL
//
// Não acessamos configuracoes_encomendas_condominio
// diretamente.
//
// Consumimos a RPC oficial.
// ============================================================

export async function obterConfiguracaoStorageRecebimento({
  condominioId,
} = {}) {
  const id =
    textoObrigatorio(
      condominioId,
      "Condomínio"
    );


  const {
    data,
    error,
  } =
    await supabase.rpc(
      "rpc_encomenda_configuracao_operacional_v1",
      {
        p_condominio_id:
          id,
      }
    );


  if (error) {
    throw criarErroStorage({
      message:
        error.message ||
        "Não foi possível carregar a configuração de imagens do condomínio.",

      code:
        error.code ||
        "ERRO_CONFIGURACAO",

      details:
        error.details ||
        null,

      originalError:
        error,
    });
  }


  if (
    !data ||
    data.ok === false
  ) {
    throw criarErroStorage({
      message:
        "Configuração operacional de encomendas indisponível.",

      code:
        "CONFIGURACAO_INDISPONIVEL",

      details:
        data ||
        null,
    });
  }


  const businessId =
    textoObrigatorio(
      data.business_id,
      "Business ID"
    );


  const maxImagemLadoPx =
    Number(
      data.max_imagem_lado_px ??
      CONFIG_IMAGEM_DEFAULT
        .maxImagemLadoPx
    );


  const qualidadeImagemPercentual =
    Number(
      data.qualidade_imagem_percentual ??
      CONFIG_IMAGEM_DEFAULT
        .qualidadeImagemPercentual
    );


  const formatoImagemPreferencial =
    String(
      data.formato_imagem_preferencial ??
      CONFIG_IMAGEM_DEFAULT
        .formatoImagemPreferencial
    )
      .trim()
      .toUpperCase();


  return {
    businessId,

    condominioId:
      id,

    maxImagemLadoPx:
      Number.isFinite(
        maxImagemLadoPx
      ) &&
      maxImagemLadoPx >= 320 &&
      maxImagemLadoPx <= 10000
        ? Math.trunc(
            maxImagemLadoPx
          )
        : CONFIG_IMAGEM_DEFAULT
            .maxImagemLadoPx,

    qualidadeImagemPercentual:
      Number.isFinite(
        qualidadeImagemPercentual
      )
        ? Math.min(
            100,
            Math.max(
              40,
              Math.trunc(
                qualidadeImagemPercentual
              )
            )
          )
        : CONFIG_IMAGEM_DEFAULT
            .qualidadeImagemPercentual,

    formatoImagemPreferencial:
      formatoImagemPreferencial ||
      "WEBP",

    raw:
      data,
  };
}


// ============================================================
// VALIDAÇÃO DE ARQUIVO
// ============================================================

function validarArquivoBase(
  arquivo
) {
  if (
    !(arquivo instanceof Blob)
  ) {
    throw criarErroStorage({
      message:
        "Arquivo inválido ou não selecionado.",
      code:
        "ARQUIVO_INVALIDO",
    });
  }


  if (
    arquivo.size <= 0
  ) {
    throw criarErroStorage({
      message:
        "O arquivo selecionado está vazio.",
      code:
        "ARQUIVO_VAZIO",
    });
  }
}


function validarImagemEntrada(
  arquivo
) {
  validarArquivoBase(
    arquivo
  );


  if (
    !MIME_IMAGEM_PERMITIDOS.has(
      arquivo.type
    )
  ) {
    throw criarErroStorage({
      message:
        "Formato de imagem não permitido. Utilize JPG, PNG ou WebP.",

      code:
        "MIME_IMAGEM_NAO_PERMITIDO",

      details: {
        mimeType:
          arquivo.type ||
          null,
      },
    });
  }


  if (
    arquivo.size >
    LIMITE_ENTRADA_IMAGEM_BYTES
  ) {
    throw criarErroStorage({
      message:
        "A imagem selecionada é muito grande para processamento.",

      code:
        "IMAGEM_ORIGINAL_MUITO_GRANDE",

      details: {
        tamanhoBytes:
          arquivo.size,

        limiteBytes:
          LIMITE_ENTRADA_IMAGEM_BYTES,
      },
    });
  }
}


// ============================================================
// CARREGAMENTO DA IMAGEM
//
// Preferimos createImageBitmap quando disponível.
//
// Fallback:
// HTMLImageElement + ObjectURL.
//
// Ambos serão desenhados novamente no canvas.
// A imagem original NÃO será enviada ao Storage.
// ============================================================

async function carregarImagem(
  arquivo
) {
  if (
    typeof createImageBitmap ===
    "function"
  ) {
    try {
      const bitmap =
        await createImageBitmap(
          arquivo,
          {
            imageOrientation:
              "from-image",
          }
        );


      return {
        fonte:
          bitmap,

        largura:
          bitmap.width,

        altura:
          bitmap.height,

        liberar() {
          try {
            bitmap.close();
          } catch {
            // noop
          }
        },
      };
    } catch {
      /*
       * Alguns navegadores não aceitam as opções acima.
       * Tentamos novamente sem opções.
       */
      try {
        const bitmap =
          await createImageBitmap(
            arquivo
          );


        return {
          fonte:
            bitmap,

          largura:
            bitmap.width,

          altura:
            bitmap.height,

          liberar() {
            try {
              bitmap.close();
            } catch {
              // noop
            }
          },
        };
      } catch {
        // segue para fallback
      }
    }
  }


  if (
    typeof document ===
      "undefined" ||
    typeof URL ===
      "undefined"
  ) {
    throw criarErroStorage({
      message:
        "Este dispositivo não oferece suporte ao processamento da imagem.",

      code:
        "PROCESSAMENTO_IMAGEM_INDISPONIVEL",
    });
  }


  const objectUrl =
    URL.createObjectURL(
      arquivo
    );


  try {
    const imagem =
      await new Promise(
        (
          resolve,
          reject
        ) => {
          const elemento =
            new Image();

          elemento.onload =
            () =>
              resolve(
                elemento
              );

          elemento.onerror =
            () =>
              reject(
                criarErroStorage({
                  message:
                    "Não foi possível abrir a imagem selecionada.",

                  code:
                    "DECODIFICACAO_IMAGEM_FALHOU",
                })
              );

          elemento.src =
            objectUrl;
        }
      );


    return {
      fonte:
        imagem,

      largura:
        imagem.naturalWidth ||
        imagem.width,

      altura:
        imagem.naturalHeight ||
        imagem.height,

      liberar() {
        URL.revokeObjectURL(
          objectUrl
        );
      },
    };
  } catch (error) {
    URL.revokeObjectURL(
      objectUrl
    );

    throw error;
  }
}


// ============================================================
// DIMENSÕES FINAIS
// ============================================================

function calcularDimensoesFinais({
  largura,
  altura,
  maxLadoPx,
}) {
  if (
    !largura ||
    !altura
  ) {
    throw criarErroStorage({
      message:
        "A imagem não possui dimensões válidas.",

      code:
        "DIMENSOES_INVALIDAS",
    });
  }


  const maiorLado =
    Math.max(
      largura,
      altura
    );


  if (
    maiorLado <=
    maxLadoPx
  ) {
    return {
      largura:
        Math.round(
          largura
        ),

      altura:
        Math.round(
          altura
        ),
    };
  }


  const escala =
    maxLadoPx /
    maiorLado;


  return {
    largura:
      Math.max(
        1,
        Math.round(
          largura *
          escala
        )
      ),

    altura:
      Math.max(
        1,
        Math.round(
          altura *
          escala
        )
      ),
  };
}


// ============================================================
// CANVAS → BLOB
// ============================================================

function canvasParaBlob(
  canvas,
  mimeType,
  qualidade
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              criarErroStorage({
                message:
                  "Não foi possível gerar a imagem processada.",

                code:
                  "CODIFICACAO_IMAGEM_FALHOU",
              })
            );

            return;
          }


          resolve(
            blob
          );
        },

        mimeType,
        qualidade
      );
    }
  );
}


// ============================================================
// TESTAR SUPORTE REAL DO CANVAS A WEBP
// ============================================================

let suporteWebpCache =
  null;


async function suportaWebpCanvas() {
  if (
    suporteWebpCache !==
    null
  ) {
    return suporteWebpCache;
  }


  if (
    typeof document ===
    "undefined"
  ) {
    suporteWebpCache =
      false;

    return false;
  }


  try {
    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width = 2;
    canvas.height = 2;


    const blob =
      await canvasParaBlob(
        canvas,
        "image/webp",
        0.8
      );


    suporteWebpCache =
      blob.type ===
      "image/webp";


    return suporteWebpCache;
  } catch {
    suporteWebpCache =
      false;

    return false;
  }
}


// ============================================================
// FORMATO FINAL
// ============================================================

async function escolherFormatoFinal(
  formatoPreferencial
) {
  const preferencia =
    String(
      formatoPreferencial ||
      "WEBP"
    )
      .trim()
      .toUpperCase();


  if (
    preferencia ===
      "WEBP" &&
    await suportaWebpCanvas()
  ) {
    return {
      mimeType:
        "image/webp",

      extensao:
        "webp",
    };
  }


  /*
   * JPEG é o fallback deliberado.
   *
   * Evitamos PNG como fallback universal,
   * pois fotos de avaria podem resultar em arquivos
   * significativamente maiores.
   */
  return {
    mimeType:
      "image/jpeg",

    extensao:
      "jpg",
  };
}


// ============================================================
// PROCESSAMENTO DE IMAGEM
//
// Re-renderizar o bitmap/pixels em um novo canvas significa
// que metadata EXIF da imagem original não é copiada para
// o arquivo resultante.
//
// Portanto:
// exifRemovido = true
//
// O arquivo ORIGINAL nunca é enviado por esta função.
// ============================================================

export async function processarImagemRecebimento(
  arquivo,
  {
    maxImagemLadoPx =
      CONFIG_IMAGEM_DEFAULT
        .maxImagemLadoPx,

    qualidadeImagemPercentual =
      CONFIG_IMAGEM_DEFAULT
        .qualidadeImagemPercentual,

    formatoImagemPreferencial =
      CONFIG_IMAGEM_DEFAULT
        .formatoImagemPreferencial,
  } = {}
) {
  validarImagemEntrada(
    arquivo
  );


  const imagem =
    await carregarImagem(
      arquivo
    );


  try {
    const dimensoes =
      calcularDimensoesFinais({
        largura:
          imagem.largura,

        altura:
          imagem.altura,

        maxLadoPx:
          maxImagemLadoPx,
      });


    if (
      typeof document ===
      "undefined"
    ) {
      throw criarErroStorage({
        message:
          "Canvas não disponível neste dispositivo.",

        code:
          "CANVAS_INDISPONIVEL",
      });
    }


    const canvas =
      document.createElement(
        "canvas"
      );


    canvas.width =
      dimensoes.largura;

    canvas.height =
      dimensoes.altura;


    const contexto =
      canvas.getContext(
        "2d",
        {
          alpha: false,
        }
      );


    if (!contexto) {
      throw criarErroStorage({
        message:
          "Não foi possível preparar a imagem para envio.",

        code:
          "CANVAS_CONTEXT_INDISPONIVEL",
      });
    }


    /*
     * Fundo branco explícito.
     *
     * Evita que transparência de PNG vire fundo preto
     * quando houver fallback JPEG.
     */
    contexto.fillStyle =
      "#ffffff";

    contexto.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );


    contexto.drawImage(
      imagem.fonte,
      0,
      0,
      dimensoes.largura,
      dimensoes.altura
    );


    const formato =
      await escolherFormatoFinal(
        formatoImagemPreferencial
      );


    const qualidade =
      Math.min(
        1,
        Math.max(
          0.4,
          Number(
            qualidadeImagemPercentual
          ) / 100
        )
      );


    const blob =
      await canvasParaBlob(
        canvas,
        formato.mimeType,
        qualidade
      );


    return {
      blob,

      mimeType:
        formato.mimeType,

      extensao:
        formato.extensao,

      tamanhoBytes:
        blob.size,

      larguraPx:
        dimensoes.largura,

      alturaPx:
        dimensoes.altura,

      arquivoOriginal:
        false,

      /*
       * O output foi reconstruído a partir dos pixels.
       */
      exifRemovido:
        true,

      processamento: {
        larguraOriginalPx:
          imagem.largura,

        alturaOriginalPx:
          imagem.altura,

        tamanhoOriginalBytes:
          arquivo.size,

        mimeOriginal:
          arquivo.type ||
          null,

        redimensionado:
          (
            imagem.largura !==
              dimensoes.largura ||
            imagem.altura !==
              dimensoes.altura
          ),

        qualidadePercentual:
          Math.round(
            qualidade * 100
          ),

        formatoPreferencial:
          formatoImagemPreferencial,

        formatoFinal:
          formato.mimeType,
      },
    };
  } finally {
    imagem.liberar();
  }
}


// ============================================================
// SHA-256
//
// Hash calculado sobre o arquivo FINAL que será enviado.
// ============================================================

export async function calcularSha256Blob(
  blob
) {
  validarArquivoBase(
    blob
  );


  if (
    typeof crypto ===
      "undefined" ||
    !crypto.subtle
  ) {
    throw criarErroStorage({
      message:
        "Este dispositivo não oferece suporte à geração segura do hash do arquivo.",

      code:
        "SHA256_INDISPONIVEL",
    });
  }


  const buffer =
    await blob.arrayBuffer();


  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      buffer
    );


  return Array
    .from(
      new Uint8Array(
        digest
      )
    )
    .map(
      (byte) =>
        byte
          .toString(16)
          .padStart(
            2,
            "0"
          )
    )
    .join("");
}


// ============================================================
// PATH MULTI-TENANT
//
// Policy validada:
//
// {businessId}/{condominioId}/{contextoId}/...
//
// contextoId será normalmente:
//
// state.clientReceiptId
//
// Ex.:
// CONDTEST-123456/
// 38c.../
// receipt-.../
// avarias/
// <uuid>.webp
// ============================================================

function montarStoragePath({
  businessId,
  condominioId,
  contextoId,
  categoria,
  extensao,
}) {
  const business =
    validarSegmentoPath(
      businessId,
      "Business ID"
    );


  const condominio =
    validarSegmentoPath(
      condominioId,
      "Condomínio"
    );


  const contexto =
    validarSegmentoPath(
      contextoId,
      "Contexto do recebimento"
    );


  const pasta =
    validarSegmentoPath(
      categoria,
      "Categoria"
    );


  const ext =
    String(
      extensao ||
      ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]/g,
        ""
      );


  if (!ext) {
    throw criarErroStorage({
      message:
        "Extensão final do arquivo inválida.",

      code:
        "EXTENSAO_INVALIDA",
    });
  }


  const arquivoId =
    gerarUuidArquivo();


  return (
    `${business}/` +
    `${condominio}/` +
    `${contexto}/` +
    `${pasta}/` +
    `${arquivoId}.${ext}`
  );
}


// ============================================================
// UPLOAD PRIVADO
//
// upsert: false
//
// Evidências e assinaturas são imutáveis.
// Não substituímos arquivos existentes.
// ============================================================

async function fazerUploadPrivado({
  bucket,
  storagePath,
  blob,
  mimeType,
  limiteFinalBytes,
}) {
  validarArquivoBase(
    blob
  );


  if (
    blob.size >
    limiteFinalBytes
  ) {
    throw criarErroStorage({
      message:
        "O arquivo processado ainda ultrapassa o limite permitido.",

      code:
        "ARQUIVO_FINAL_MUITO_GRANDE",

      details: {
        tamanhoBytes:
          blob.size,

        limiteBytes:
          limiteFinalBytes,
      },
    });
  }


  const {
    data,
    error,
  } =
    await supabase.storage
      .from(
        bucket
      )
      .upload(
        storagePath,
        blob,
        {
          cacheControl:
            "3600",

          contentType:
            mimeType,

          upsert:
            false,
        }
      );


  if (error) {
    throw criarErroStorage({
      message:
        error.message ||
        "Não foi possível enviar o arquivo.",

      code:
        error.statusCode ||
        error.status ||
        "STORAGE_UPLOAD_FALHOU",

      details: {
        bucket,
        storagePath,
      },

      originalError:
        error,
    });
  }


  return {
    data,
    path:
      data?.path ||
      storagePath,
  };
}


// ============================================================
// UPLOAD DE FOTO DE AVARIA
//
// Resultado já possui exatamente os campos esperados pelo
// volume.evidencias do Wizard.
//
// Pode ser passado para:
//
// adicionarEvidenciaVolume(
//   clientVolumeId,
//   resultado
// )
// ============================================================

export async function enviarFotoAvaria({
  arquivo,
  condominioId,
  clientReceiptId,

  tipoEvidencia =
    "FOTO_AVARIA",

  classificacaoAcesso =
    "INCIDENTE",

  metadata = {},
} = {}) {
  validarImagemEntrada(
    arquivo
  );


  const configuracao =
    await obterConfiguracaoStorageRecebimento({
      condominioId,
    });


  const processada =
    await processarImagemRecebimento(
      arquivo,
      {
        maxImagemLadoPx:
          configuracao
            .maxImagemLadoPx,

        qualidadeImagemPercentual:
          configuracao
            .qualidadeImagemPercentual,

        formatoImagemPreferencial:
          configuracao
            .formatoImagemPreferencial,
      }
    );


  if (
    processada.tamanhoBytes >
    LIMITE_BUCKET_EVIDENCIA_BYTES
  ) {
    throw criarErroStorage({
      message:
        "A fotografia processada ultrapassa o limite de 10 MB.",

      code:
        "EVIDENCIA_ACIMA_LIMITE",

      details: {
        tamanhoBytes:
          processada
            .tamanhoBytes,
      },
    });
  }


  const hashSha256 =
    await calcularSha256Blob(
      processada.blob
    );


  const storagePath =
    montarStoragePath({
      businessId:
        configuracao.businessId,

      condominioId:
        configuracao.condominioId,

      contextoId:
        clientReceiptId,

      categoria:
        "avarias",

      extensao:
        processada.extensao,
    });


  await fazerUploadPrivado({
    bucket:
      ENCOMENDAS_STORAGE_BUCKETS
        .EVIDENCIAS,

    storagePath,

    blob:
      processada.blob,

    mimeType:
      processada.mimeType,

    limiteFinalBytes:
      LIMITE_BUCKET_EVIDENCIA_BYTES,
  });


  /*
   * NÃO retornamos blob/file.
   *
   * O objeto abaixo pode ser persistido no IndexedDB.
   */
  return {
    tipoEvidencia,

    bucket:
      ENCOMENDAS_STORAGE_BUCKETS
        .EVIDENCIAS,

    storagePath,

    mimeType:
      processada.mimeType,

    tamanhoBytes:
      processada.tamanhoBytes,

    larguraPx:
      processada.larguraPx,

    alturaPx:
      processada.alturaPx,

    hashSha256,

    arquivoOriginal:
      false,

    exifRemovido:
      true,

    classificacaoAcesso,

    retencaoDias:
      null,

    metadata: {
      ...metadata,

      origem:
        "WIZARD_PORTARIA",

      categoria:
        "AVARIA",

      processado_client_side:
        true,

      largura_original_px:
        processada
          .processamento
          .larguraOriginalPx,

      altura_original_px:
        processada
          .processamento
          .alturaOriginalPx,

      tamanho_original_bytes:
        processada
          .processamento
          .tamanhoOriginalBytes,

      mime_original:
        processada
          .processamento
          .mimeOriginal,

      redimensionado:
        processada
          .processamento
          .redimensionado,

      qualidade_percentual:
        processada
          .processamento
          .qualidadePercentual,

      formato_final:
        processada
          .processamento
          .formatoFinal,
    },
  };
}


// ============================================================
// UPLOAD DE ASSINATURA
//
// A assinatura deverá ser transformada em imagem/Blob pelo
// componente de assinatura.
//
// O service processará novamente antes do upload.
//
// Resultado compatível com state.assinatura.
// ============================================================

export async function enviarAssinaturaRecebimento({
  arquivo,
  condominioId,
  clientReceiptId,

  nomeSignatario =
    null,

  documentoMascarado =
    null,

  tipoAssinatura =
    "RECEBIMENTO_ENTREGADOR",

  metadata = {},
} = {}) {
  validarImagemEntrada(
    arquivo
  );


  const configuracao =
    await obterConfiguracaoStorageRecebimento({
      condominioId,
    });


  const processada =
    await processarImagemRecebimento(
      arquivo,
      {
        maxImagemLadoPx:
          configuracao
            .maxImagemLadoPx,

        qualidadeImagemPercentual:
          configuracao
            .qualidadeImagemPercentual,

        formatoImagemPreferencial:
          configuracao
            .formatoImagemPreferencial,
      }
    );


  if (
    processada.tamanhoBytes >
    LIMITE_BUCKET_ASSINATURA_BYTES
  ) {
    throw criarErroStorage({
      message:
        "A assinatura processada ultrapassa o limite de 5 MB.",

      code:
        "ASSINATURA_ACIMA_LIMITE",
    });
  }


  const hashSha256 =
    await calcularSha256Blob(
      processada.blob
    );


  const storagePath =
    montarStoragePath({
      businessId:
        configuracao.businessId,

      condominioId:
        configuracao.condominioId,

      contextoId:
        clientReceiptId,

      categoria:
        "assinaturas",

      extensao:
        processada.extensao,
    });


  await fazerUploadPrivado({
    bucket:
      ENCOMENDAS_STORAGE_BUCKETS
        .ASSINATURAS,

    storagePath,

    blob:
      processada.blob,

    mimeType:
      processada.mimeType,

    limiteFinalBytes:
      LIMITE_BUCKET_ASSINATURA_BYTES,
  });


  return {
    tipoAssinatura,

    nomeSignatario:
      nomeSignatario ||
      null,

    documentoMascarado:
      documentoMascarado ||
      null,

    bucket:
      ENCOMENDAS_STORAGE_BUCKETS
        .ASSINATURAS,

    storagePath,

    hashSha256,

    mimeType:
      processada.mimeType,

    tamanhoBytes:
      processada.tamanhoBytes,

    larguraPx:
      processada.larguraPx,

    alturaPx:
      processada.alturaPx,

    arquivoOriginal:
      false,

    exifRemovido:
      true,

    metadata: {
      ...metadata,

      origem:
        "WIZARD_PORTARIA",

      categoria:
        "ASSINATURA_RECEBIMENTO",

      processado_client_side:
        true,

      largura_original_px:
        processada
          .processamento
          .larguraOriginalPx,

      altura_original_px:
        processada
          .processamento
          .alturaOriginalPx,

      tamanho_original_bytes:
        processada
          .processamento
          .tamanhoOriginalBytes,

      mime_original:
        processada
          .processamento
          .mimeOriginal,

      redimensionado:
        processada
          .processamento
          .redimensionado,

      qualidade_percentual:
        processada
          .processamento
          .qualidadePercentual,

      formato_final:
        processada
          .processamento
          .formatoFinal,
    },
  };
}


// ============================================================
// EVIDÊNCIA DOCUMENTAL
//
// Preparação para uso futuro:
//
// FOTO_AVARIA usa enviarFotoAvaria().
//
// Documento/PDF não deve passar pelo canvas.
//
// Mantemos esta função separada para evitar tratar PDF como
// imagem e, sobretudo, não alterar conteúdo documental.
// ============================================================

export async function enviarDocumentoEvidencia({
  arquivo,
  condominioId,
  clientReceiptId,

  tipoEvidencia =
    "DOCUMENTO",

  classificacaoAcesso =
    "RESTRITO",

  metadata = {},
} = {}) {
  validarArquivoBase(
    arquivo
  );


  if (
    !MIME_EVIDENCIA_PERMITIDOS.has(
      arquivo.type
    )
  ) {
    throw criarErroStorage({
      message:
        "Formato de evidência não permitido.",

      code:
        "MIME_EVIDENCIA_NAO_PERMITIDO",
    });
  }


  /*
   * Imagens continuam obrigatoriamente pelo pipeline
   * que remove EXIF.
   */
  if (
    MIME_IMAGEM_PERMITIDOS.has(
      arquivo.type
    )
  ) {
    return enviarFotoAvaria({
      arquivo,
      condominioId,
      clientReceiptId,

      tipoEvidencia,
      classificacaoAcesso,

      metadata: {
        ...metadata,

        categoria_documental:
          true,
      },
    });
  }


  /*
   * Neste momento o único não-imagem admitido pelo bucket
   * é PDF.
   *
   * PDF NÃO é reprocessado nesta função.
   */
  if (
    arquivo.type !==
    "application/pdf"
  ) {
    throw criarErroStorage({
      message:
        "Tipo documental não suportado.",

      code:
        "TIPO_DOCUMENTAL_NAO_SUPORTADO",
    });
  }


  if (
    arquivo.size >
    LIMITE_BUCKET_EVIDENCIA_BYTES
  ) {
    throw criarErroStorage({
      message:
        "O documento ultrapassa o limite de 10 MB.",

      code:
        "DOCUMENTO_ACIMA_LIMITE",
    });
  }


  const configuracao =
    await obterConfiguracaoStorageRecebimento({
      condominioId,
    });


  const hashSha256 =
    await calcularSha256Blob(
      arquivo
    );


  const storagePath =
    montarStoragePath({
      businessId:
        configuracao.businessId,

      condominioId:
        configuracao.condominioId,

      contextoId:
        clientReceiptId,

      categoria:
        "documentos",

      extensao:
        "pdf",
    });


  await fazerUploadPrivado({
    bucket:
      ENCOMENDAS_STORAGE_BUCKETS
        .EVIDENCIAS,

    storagePath,

    blob:
      arquivo,

    mimeType:
      "application/pdf",

    limiteFinalBytes:
      LIMITE_BUCKET_EVIDENCIA_BYTES,
  });


  return {
    tipoEvidencia,

    bucket:
      ENCOMENDAS_STORAGE_BUCKETS
        .EVIDENCIAS,

    storagePath,

    mimeType:
      "application/pdf",

    tamanhoBytes:
      arquivo.size,

    larguraPx:
      null,

    alturaPx:
      null,

    hashSha256,

    /*
     * PDF é enviado sem transformação.
     */
    arquivoOriginal:
      true,

    /*
     * NÃO afirmamos remoção de EXIF/metadata para PDF.
     */
    exifRemovido:
      false,

    classificacaoAcesso,

    retencaoDias:
      null,

    metadata: {
      ...metadata,

      origem:
        "WIZARD_PORTARIA",

      categoria:
        "DOCUMENTO",

      processado_client_side:
        false,

      arquivo_original:
        true,
    },
  };
}