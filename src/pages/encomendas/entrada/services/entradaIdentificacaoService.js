import { supabase } from "../../../../services/supabase";

// ============================================================
// SISTEMA CHEGOU!
// CENTRAL DE ENCOMENDAS — ENTRADA
//
// E3.2-B.2
// Busca autorizada e enxuta de destinatários.
//
// REGRAS:
// - números: mínimo 2 caracteres;
// - demais termos: mínimo 3 caracteres;
// - máximo 12 resultados;
// - tenant resolvido pelo Volume no backend;
// - nenhuma consulta direta a tabelas;
// - nenhuma gravação.
// ============================================================

const RPC_BUSCAR_DESTINATARIOS =
  "rpc_encomenda_entrada_destinatarios_buscar_v1";

function textoOuNull(value) {
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

function capitalizarNome(value) {
  const texto =
    textoOuNull(value);

  if (!texto) {
    return null;
  }

  return texto
    .toLocaleLowerCase("pt-BR")
    .replace(
      /(^|[\s'-])([\p{L}])/gu,
      (_, separador, letra) =>
        `${separador}${letra.toLocaleUpperCase(
          "pt-BR"
        )}`
    );
}

export function buscaDestinatarioSuficiente(
  value
) {
  const termo =
    textoOuNull(value);

  if (!termo) {
    return false;
  }

  if (/^[0-9]+$/.test(termo)) {
    return termo.length >= 2;
  }

  return termo.length >= 3;
}

export function obterMinimoBuscaDestinatario(
  value
) {
  const termo =
    textoOuNull(value);

  if (
    termo &&
    /^[0-9]+$/.test(termo)
  ) {
    return 2;
  }

  return 3;
}

function criarErro(error) {
  const mensagem =
    String(
      error?.message || ""
    ).trim();

  if (
    error?.code === "42501" ||
    /acesso negado/i.test(mensagem)
  ) {
    return new Error(
      "Você não possui permissão para pesquisar destinatários deste volume."
    );
  }

  if (
    /volume não encontrado/i.test(
      mensagem
    )
  ) {
    return new Error(
      "Este volume não está mais disponível."
    );
  }

  if (
    /já possui Entrada concluída/i.test(
      mensagem
    )
  ) {
    return new Error(
      "Este volume já teve a Entrada concluída."
    );
  }

  return new Error(
    "Não foi possível pesquisar os destinatários."
  );
}

function normalizarCandidato(
  item,
  index
) {
  if (!item) {
    return null;
  }

  const nome =
    capitalizarNome(
      item.nome
    );

  const unidadeId =
    item.unidade_id ||
    null;

  if (!nome || !unidadeId) {
    return null;
  }

  return {
    key:
      [
        item.destinatario_tipo,
        item.morador_unidade_vinculo_id,
        item.dependente_id,
        unidadeId,
        index,
      ]
        .filter(Boolean)
        .join(":"),

    destinatarioTipo:
      item.destinatario_tipo ||
      null,

    moradorUnidadeVinculoId:
      item
        .morador_unidade_vinculo_id ||
      null,

    dependenteId:
      item.dependente_id ||
      null,

    responsavelMoradorVinculoId:
      item
        .responsavel_morador_vinculo_id ||
      null,

    pessoaId:
      item.pessoa_id ||
      null,

    usuarioId:
      item.usuario_id ||
      null,

    unidadeId,

    unidadeOficialId:
      item.unidade_oficial_id ||
      null,

    torre:
      capitalizarNome(
        item.torre
      ),

    torreIdentificador:
      textoOuNull(
        item.torre_identificador
      ),

    bloco:
      capitalizarNome(
        item.bloco
      ),

    unidade:
      textoOuNull(
        item.unidade
      ),

    nome,
  };
}

export async function buscarDestinatariosEntrada({
  volumeId,
  busca,
  unidadeId = null,
  limite = 12,
} = {}) {
  if (!volumeId) {
    throw new Error(
      "Não foi possível identificar o volume."
    );
  }

  const termo =
    textoOuNull(busca);

  if (
    !unidadeId &&
    !buscaDestinatarioSuficiente(
      termo
    )
  ) {
    return {
      ok: true,
      consultaExecutada: false,
      resultados: [],
    };
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      RPC_BUSCAR_DESTINATARIOS,
      {
        p_volume_id:
          volumeId,

        p_busca:
          termo,

        p_unidade_id:
          unidadeId,

        p_limite:
          Math.max(
            1,
            Math.min(
              Number(limite) ||
                12,
              12
            )
          ),
      }
    );

  if (error) {
    throw criarErro(error);
  }

  if (
    !data ||
    data.ok === false
  ) {
    throw new Error(
      data?.mensagem ||
        "Não foi possível pesquisar os destinatários."
    );
  }

  const resultados =
    Array.isArray(
      data.resultados
    )
      ? data.resultados
          .map(
            normalizarCandidato
          )
          .filter(Boolean)
      : [];

  return {
    ok: true,

    consultaExecutada:
      data.consulta_executada ===
      true,

    motivo:
      data.motivo ||
      null,

    resultados,
  };
}

export default {
  buscarDestinatariosEntrada,
  buscaDestinatarioSuficiente,
  obterMinimoBuscaDestinatario,
};