import {
  supabase,
} from "../../../../services/supabase";

// ============================================================
// SISTEMA CHEGOU!
// CENTRAL DE ENCOMENDAS — ENTRADA
//
// E3.2-D.5.3
// MATCHING ASSISTIDO POR OCR
//
// React envia somente:
// - volume;
// - pistas produzidas pelo OCR.
//
// Backend:
// - resolve tenant;
// - autoriza operador;
// - limita candidatos;
// - calcula correspondência.
// ============================================================

const RPC =
  "rpc_encomenda_entrada_destinatarios_ocr_buscar_v1";

// ============================================================
// HELPERS
// ============================================================

function textoOuNull(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const texto =
    String(value).trim();

  return texto || null;
}

function mapearCorrespondencia(
  value
) {
  switch (
    String(
      value || ""
    ).toUpperCase()
  ) {
    case "MUITO_ALTA":
      return {
        codigo:
          "MUITO_ALTA",

        label:
          "Correspondência muito alta",
      };

    case "ALTA":
      return {
        codigo:
          "ALTA",

        label:
          "Boa correspondência",
      };

    case "POSSIVEL":
      return {
        codigo:
          "POSSIVEL",

        label:
          "Possível correspondência",
      };

    default:
      return {
        codigo:
          "BAIXA",

        label:
          "Correspondência limitada",
      };
  }
}

function normalizarCandidato(
  item,
  index
) {
  const correspondencia =
    mapearCorrespondencia(
      item?.correspondencia
    );

  return {

    key:
      item
        ?.dependente_id ||
      item
        ?.morador_unidade_vinculo_id ||
      item
        ?.pessoa_id ||
      `ocr-${index}`,


    destinatarioTipo:
      item
        ?.destinatario_tipo ||
      null,


    moradorUnidadeVinculoId:
      item
        ?.morador_unidade_vinculo_id ||
      null,


    dependenteId:
      item
        ?.dependente_id ||
      null,


    responsavelMoradorVinculoId:
      item
        ?.responsavel_morador_vinculo_id ||
      null,


    pessoaId:
      item
        ?.pessoa_id ||
      null,


    usuarioId:
      item
        ?.usuario_id ||
      null,


    unidadeId:
      item
        ?.unidade_id ||
      null,


    unidadeOficialId:
      item
        ?.unidade_oficial_id ||
      null,


    torre:
      textoOuNull(
        item?.torre
      ),


    torreIdentificador:
      textoOuNull(
        item
          ?.torre_identificador
      ),


    bloco:
      textoOuNull(
        item?.bloco
      ),


    unidade:
      textoOuNull(
        item?.unidade
      ),


    nome:
      textoOuNull(
        item?.nome
      ) ||
      "Destinatário",


    /*
     * Score não deve ser mostrado.
     * Mantido apenas como metadata
     * retornada pelo contrato.
     */
    scoreInterno:
      Number.isFinite(
        Number(
          item?.score_total
        )
      )
        ? Number(
            item.score_total
          )
        : null,


    correspondencia:
      correspondencia.codigo,


    correspondenciaLabel:
      correspondencia.label,


    criteriosOCR: {
      nome:
        item
          ?.criterios
          ?.nome === true,

      torreBloco:
        item
          ?.criterios
          ?.torre_bloco === true,

      unidade:
        item
          ?.criterios
          ?.unidade === true,
    },


    origemIdentificacao:
      "OCR_ETIQUETA",
  };
}

// ============================================================
// BUSCAR
// ============================================================

export async function buscarDestinatariosEntradaOCR({
  volumeId,
  nome = null,
  torreBloco = null,
  unidade = null,
  limite = 8,
} = {}) {
  if (!volumeId) {
    throw new Error(
      "Volume não informado."
    );
  }

  const pistasDisponiveis =
    Boolean(
      textoOuNull(nome) ||
      textoOuNull(
        torreBloco
      ) ||
      textoOuNull(
        unidade
      )
    );

  if (!pistasDisponiveis) {
    return {
      consultaExecutada:
        false,

      motivo:
        "SEM_PISTAS_OCR",

      resultados:
        [],
    };
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      RPC,
      {
        p_volume_id:
          volumeId,

        p_nome:
          textoOuNull(
            nome
          ),

        p_torre_bloco:
          textoOuNull(
            torreBloco
          ),

        p_unidade:
          textoOuNull(
            unidade
          ),

        p_limite:
          Math.max(
            1,
            Math.min(
              Number(
                limite
              ) || 8,
              12
            )
          ),
      }
    );

  if (error) {
    throw new Error(
      error.message ||
        "Não foi possível analisar os possíveis destinatários."
    );
  }

  if (
    data?.ok !== true
  ) {
    throw new Error(
      "Não foi possível analisar os possíveis destinatários."
    );
  }

  const resultados =
    Array.isArray(
      data?.resultados
    )
      ? data.resultados.map(
          normalizarCandidato
        )
      : [];

  return {

    consultaExecutada:
      data
        ?.consulta_executada ===
      true,


    motivo:
      data?.motivo ||
      null,


    volumeId:
      data?.volume_id ||
      volumeId,


    resultados,


    pistas: {
      nome:
        data
          ?.pistas
          ?.nome ||
        null,

      torreBloco:
        data
          ?.pistas
          ?.torre_bloco ||
        null,

      unidade:
        data
          ?.pistas
          ?.unidade ||
        null,
    },
  };
}

export default {
  buscarDestinatariosEntradaOCR,
};