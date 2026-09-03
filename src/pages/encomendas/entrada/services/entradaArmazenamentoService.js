import {
  supabase,
} from "../../../../services/supabase";

// ============================================================
// SISTEMA CHEGOU!
// CENTRAL DE ENCOMENDAS — ENTRADA OFICIAL
//
// ARMAZENAMENTO
//
// Responsabilidades:
// - listar localizações oficiais via backend;
// - confirmar armazenamento via RPC V2;
// - não consultar tabelas diretamente;
// - não disponibilizar;
// - não notificar.
// ============================================================

const RPC_LOCALIZACOES_LISTAR =
  "rpc_encomendas_localizacoes_listar_v2";

const RPC_ARMAZENAR =
  "rpc_encomenda_armazenar_v2";

const RPC_ARMAZENAMENTO_PENDENTES_LISTAR =
  "rpc_encomenda_armazenamento_pendentes_listar_v1";

const LIMITE_LOCALIZACOES_PADRAO =
  100;

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
    String(
      value
    ).trim();

  return texto || null;
}

function numeroOuNull(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numero =
    Number(
      value
    );

  return Number.isFinite(
    numero
  )
    ? numero
    : null;
}

function booleanoSeguro(
  value
) {
  return value === true;
}

function normalizarLocalizacao(
  item
) {
  if (
    !item ||
    typeof item !== "object"
  ) {
    return null;
  }

  const capacidadeMaxima =
    numeroOuNull(
      item.capacidade_maxima
    );

  const ocupacaoAtual =
    numeroOuNull(
      item.ocupacao_atual
    );

  const capacidadeDisponivel =
    numeroOuNull(
      item.capacidade_disponivel
    );

  const ocupacaoPercentual =
    numeroOuNull(
      item.ocupacao_percentual
    );

  const capacidadeEsgotada =
    item.capacidade_esgotada ===
    true;

  return {
    id:
      textoOuNull(
        item.id
      ),

    businessId:
      textoOuNull(
        item.business_id
      ),

    condominioId:
      textoOuNull(
        item.condominio_id
      ),

    codigo:
      textoOuNull(
        item.codigo
      ),

    nome:
      textoOuNull(
        item.nome
      ) ||
      "Local de armazenamento",

    nomeCompleto:
      textoOuNull(
        item.nome_completo
      ) ||
      textoOuNull(
        item.nome
      ) ||
      "Local de armazenamento",

    descricao:
      textoOuNull(
        item.descricao
      ),

    // ========================================================
    // TIPO
    // ========================================================

    tipoLegado:
      textoOuNull(
        item.tipo
      ),

    tipoLocalizacaoId:
      textoOuNull(
        item.tipo_localizacao_id
      ),

    tipoCatalogo: {
      id:
        textoOuNull(
          item
            ?.tipo_catalogo
            ?.id
        ),

      codigo:
        textoOuNull(
          item
            ?.tipo_catalogo
            ?.codigo
        ),

      nome:
        textoOuNull(
          item
            ?.tipo_catalogo
            ?.nome
        ),

      descricao:
        textoOuNull(
          item
            ?.tipo_catalogo
            ?.descricao
        ),

      icone:
        textoOuNull(
          item
            ?.tipo_catalogo
            ?.icone
        ),

      ativo:
        item
          ?.tipo_catalogo
          ?.ativo === true,

      permiteHierarquia:
        item
          ?.tipo_catalogo
          ?.permite_hierarquia ===
        true,

      permiteCapacidade:
        item
          ?.tipo_catalogo
          ?.permite_capacidade ===
        true,

      permiteControleTemperatura:
        item
          ?.tipo_catalogo
          ?.permite_controle_temperatura ===
        true,
    },

    // ========================================================
    // HIERARQUIA
    // ========================================================

    localizacaoPaiId:
      textoOuNull(
        item.localizacao_pai_id
      ),

    localizacaoPaiNome:
      textoOuNull(
        item.localizacao_pai_nome
      ),

    // ========================================================
    // CAPACIDADE
    // ========================================================

    capacidadeMaxima,

    ocupacaoAtual,

    capacidadeDisponivel,

    ocupacaoPercentual,

    capacidadeEsgotada,

    // ========================================================
    // OPERAÇÃO
    // ========================================================

    prioridadeOperacional:
      numeroOuNull(
        item.prioridade_operacional
      ),

    finalidadeOperacional:
      textoOuNull(
        item.finalidade_operacional
      ),

    localizacaoGenerica:
      booleanoSeguro(
        item.localizacao_generica
      ),

    usoRestrito:
      booleanoSeguro(
        item.uso_restrito
      ),

    // ========================================================
    // TEMPERATURA
    // ========================================================

    possuiControleTemperatura:
      booleanoSeguro(
        item.possui_controle_temperatura
      ),

    temperaturaMinimaC:
      numeroOuNull(
        item.temperatura_minima_c
      ),

    temperaturaMaximaC:
      numeroOuNull(
        item.temperatura_maxima_c
      ),

    // ========================================================
    // COMPATIBILIDADES
    // ========================================================

    permiteEncomendaPadrao:
      booleanoSeguro(
        item.permite_encomenda_padrao
      ),

    permiteDocumento:
      booleanoSeguro(
        item.permite_documento
      ),

    permiteMedicamento:
      booleanoSeguro(
        item.permite_medicamento
      ),

    permiteGrandePorte:
      booleanoSeguro(
        item.permite_grande_porte
      ),

    permiteMaterialConstrucao:
      booleanoSeguro(
        item.permite_material_construcao
      ),

    // ========================================================
    // STATUS
    // ========================================================

    ativo:
      item.ativo === true,

    bloqueada:
      item.bloqueada === true,

    motivoBloqueio:
      textoOuNull(
        item.motivo_bloqueio
      ),

    // ========================================================
    // OBJETO ORIGINAL
    // ========================================================

    raw:
      item,
  };
}

function normalizarResultadoListagem(
  data
) {
  const itensOriginais =
    Array.isArray(
      data?.itens
    )
      ? data.itens
      : [];

  const itens =
    itensOriginais
      .map(
        normalizarLocalizacao
      )
      .filter(Boolean);

  return {
    ok:
      data?.ok === true,

    businessId:
      textoOuNull(
        data?.business_id
      ),

    condominioId:
      textoOuNull(
        data?.condominio_id
      ),

    armazenamentoHabilitado:
      data
        ?.armazenamento_habilitado ===
      true,

    fluxoEncomendasAtivo:
      data
        ?.fluxo_encomendas_ativo ===
      true,

    itens,

    total:
      Number(
        data?.total ||
        0
      ),

    limite:
      Number(
        data?.limite ||
        0
      ),

    offset:
      Number(
        data?.offset ||
        0
      ),

    mensagem:
      textoOuNull(
        data?.mensagem
      ),

    raw:
      data,
  };
}

function obterDadosDispositivo() {
  if (
    typeof navigator ===
    "undefined"
  ) {
    return {
      userAgent: null,
      navegador: null,
      sistemaOperacional: null,
      tipoDispositivo:
        "DESCONHECIDO",
    };
  }

  const userAgent =
    navigator.userAgent ||
    null;

  const sistemaOperacional =
    navigator.userAgentData
      ?.platform ||
    navigator.platform ||
    null;

  let tipoDispositivo =
    "DESKTOP";

  if (
    /ipad|tablet/i.test(
      userAgent || ""
    )
  ) {
    tipoDispositivo =
      "TABLET";
  } else if (
    /android|iphone|mobile/i.test(
      userAgent || ""
    )
  ) {
    tipoDispositivo =
      "MOBILE";
  }

  return {
    userAgent,

    /*
     * Nesta fase não tentamos inferir marca/versão do navegador
     * por parsing complexo do user-agent.
     */
    navegador:
      userAgent,

    sistemaOperacional,

    tipoDispositivo,
  };
}

function extrairMensagemErro(
  error,
  fallback
) {
  const mensagem =
    textoOuNull(
      error?.message
    );

  return (
    mensagem ||
    fallback
  );
}

// ============================================================
// LISTAR LOCALIZAÇÕES PARA ARMAZENAMENTO
// ============================================================

export async function listarLocalizacoesArmazenamento({
  condominioId,
  tipoEntrega,
  busca = null,
  tipoLocalizacaoId = null,
  apenasDisponiveis = true,
  incluirOcupacao = true,
  limite = LIMITE_LOCALIZACOES_PADRAO,
  offset = 0,
} = {}) {
  const condominioIdNormalizado =
    textoOuNull(
      condominioId
    );

  if (
    !condominioIdNormalizado
  ) {
    throw new Error(
      "Não foi possível identificar o condomínio ativo."
    );
  }

  const tipoEntregaNormalizado =
    textoOuNull(
      tipoEntrega
    );

  if (
    !tipoEntregaNormalizado
  ) {
    throw new Error(
      "O tipo oficial da encomenda não foi informado pelo backend."
    );
  }

  const limiteSeguro =
    Math.max(
      1,
      Math.min(
        Number(
          limite
        ) ||
          LIMITE_LOCALIZACOES_PADRAO,
        100
      )
    );

  const offsetSeguro =
    Math.max(
      0,
      Number(
        offset
      ) ||
        0
    );

  const {
    data,
    error,
  } =
    await supabase.rpc(
      RPC_LOCALIZACOES_LISTAR,
      {
        p_condominio_id:
          condominioIdNormalizado,

        p_busca:
          textoOuNull(
            busca
          ),

        p_tipo_localizacao_id:
          textoOuNull(
            tipoLocalizacaoId
          ),

        p_apenas_disponiveis:
          apenasDisponiveis !==
          false,

        p_tipo_entrega:
          tipoEntregaNormalizado,

        p_incluir_ocupacao:
          incluirOcupacao !==
          false,

        p_limite:
          limiteSeguro,

        p_offset:
          offsetSeguro,
      }
    );

  if (error) {
    throw new Error(
      extrairMensagemErro(
        error,
        "Não foi possível carregar os locais de armazenamento."
      )
    );
  }

  const resultado =
    normalizarResultadoListagem(
      data
    );

  /*
   * Defesa adicional:
   * a RPC já é autoritativa, mas o frontend não deve prosseguir
   * silenciosamente se o backend informar fluxo desabilitado.
   */
  if (
    resultado.ok !== true
  ) {
    throw new Error(
      resultado.mensagem ||
        "Não foi possível carregar os locais de armazenamento."
    );
  }

  return resultado;
}

// ============================================================
// CONFIRMAR ARMAZENAMENTO
// ============================================================

export async function confirmarArmazenamentoEntrada({
  encomendaId,
  localizacaoId,
  observacoes = null,
} = {}) {
  const encomendaIdNormalizado =
    textoOuNull(
      encomendaId
    );

  const localizacaoIdNormalizado =
    textoOuNull(
      localizacaoId
    );

  if (
    !encomendaIdNormalizado
  ) {
    throw new Error(
      "A encomenda não foi identificada."
    );
  }

  if (
    !localizacaoIdNormalizado
  ) {
    throw new Error(
      "Selecione o local de armazenamento."
    );
  }

  const dispositivo =
    obterDadosDispositivo();

  const {
    data,
    error,
  } =
    await supabase.rpc(
      RPC_ARMAZENAR,
      {
        p_encomenda_id:
          encomendaIdNormalizado,

        p_localizacao_id:
          localizacaoIdNormalizado,

        p_observacoes:
          textoOuNull(
            observacoes
          ),

        /*
         * IP não deve ser inventado pelo navegador.
         * Se futuramente quisermos IP autoritativo,
         * deve vir de camada backend apropriada.
         */
        p_ip:
          null,

        p_user_agent:
          dispositivo
            .userAgent,

        p_navegador:
          dispositivo
            .navegador,

        p_sistema_operacional:
          dispositivo
            .sistemaOperacional,

        p_tipo_dispositivo:
          dispositivo
            .tipoDispositivo,

        p_identificador_dispositivo:
          null,
      }
    );

  if (error) {
    throw new Error(
      extrairMensagemErro(
        error,
        "Não foi possível registrar o armazenamento."
      )
    );
  }

  if (
    data?.ok !== true
  ) {
    throw new Error(
      textoOuNull(
        data?.mensagem
      ) ||
        "O armazenamento não foi concluído."
    );
  }

  return {
    ok:
      true,

    contrato:
      textoOuNull(
        data?.contrato
      ),

    entradaId:
      textoOuNull(
        data?.entrada_id
      ),

    volumeId:
      textoOuNull(
        data?.volume_id
      ),

    encomendaId:
      textoOuNull(
        data?.encomenda_id
      ),

    numeroEncomenda:
      data
        ?.numero_encomenda ??
      null,

    movimentacaoId:
      textoOuNull(
        data?.movimentacao_id
      ),

    eventId:
      textoOuNull(
        data?.event_id
      ),

    logId:
      textoOuNull(
        data?.log_id
      ),

    statusAnterior:
      textoOuNull(
        data?.status_anterior
      ),

    status:
      textoOuNull(
        data?.status
      ),

    localizacaoId:
      textoOuNull(
        data?.localizacao_id
      ),

    localizacaoCodigo:
      textoOuNull(
        data?.localizacao_codigo
      ),

    localizacaoNome:
      textoOuNull(
        data?.localizacao_nome
      ),

    localizacaoPaiNome:
      textoOuNull(
        data?.localizacao_pai_nome
      ),

    localizacaoNomeCompleto:
      textoOuNull(
        data
          ?.localizacao_nome_completo
      ),

    armazenadoEm:
      textoOuNull(
        data?.armazenado_em
      ),

    armazenadoEmLocal:
      textoOuNull(
        data
          ?.armazenado_em_local
      ),

    disponibilizacaoAutomaticaConfigurada:
      data
        ?.disponibilizacao_automatica_configurada ===
      true,

    disponibilizacaoExecutada:
      data
        ?.disponibilizacao_executada ===
      true,

    notificacaoEnviadaDiretamente:
      data
        ?.notificacao_enviada_diretamente ===
      true,

    raw:
      data,
  };
}

// ============================================================
// PENDÊNCIAS DE ARMAZENAMENTO — RECUPERAÇÃO OPERACIONAL
// ============================================================

function normalizarPendenciaArmazenamento(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  return {
    encomendaId: textoOuNull(item.encomenda_id),
    numeroEncomenda: item.numero_encomenda ?? null,
    status: textoOuNull(item.status),
    tipoEntrega: textoOuNull(item.tipo_entrega),
    prioridade: textoOuNull(item.prioridade),
    businessId: textoOuNull(item.business_id),
    condominioId: textoOuNull(item.condominio_id),
    unidadeId: textoOuNull(item.unidade_id),
    unidadeOficialId: textoOuNull(item.unidade_oficial_id),
    destinatarioTipo: textoOuNull(item.destinatario_tipo),
    destinatarioUsuarioId: textoOuNull(item.destinatario_usuario_id),
    destinatarioPessoaId: textoOuNull(item.destinatario_pessoa_id),
    destinatarioMoradorVinculoId: textoOuNull(item.destinatario_morador_vinculo_id),
    destinatarioDependenteId: textoOuNull(item.destinatario_dependente_id),
    destinatarioResponsavelVinculoId: textoOuNull(item.destinatario_responsavel_vinculo_id),
    destinatarioNome: textoOuNull(item.destinatario_nome_snapshot),
    entradaId: textoOuNull(item.entrada_id),
    volumeId: textoOuNull(item.volume_id),
    preRecebimentoId: textoOuNull(item.pre_recebimento_id),
    entradaConfirmadaEm: textoOuNull(item.entrada_confirmada_em),
    entradaConfirmadaEmLocal: textoOuNull(item.entrada_confirmada_em_local),
    pendenteSegundos: numeroOuNull(item.pendente_segundos),
    localizacaoAtualId: textoOuNull(item.localizacao_atual_id),
    armazenadoEm: textoOuNull(item.armazenado_em),
    disponibilizadoEm: textoOuNull(item.disponibilizado_em),
    raw: item,
  };
}

export async function listarPendenciasArmazenamento({
  condominioId,
  limite = 50,
  offset = 0,
} = {}) {
  const condominioIdNormalizado = textoOuNull(condominioId);

  if (!condominioIdNormalizado) {
    throw new Error(
      "Não foi possível identificar o condomínio ativo."
    );
  }

  const limiteSeguro = Math.max(
    1,
    Math.min(Number(limite) || 50, 200)
  );

  const offsetSeguro = Math.max(
    0,
    Number(offset) || 0
  );

  const { data, error } = await supabase.rpc(
    RPC_ARMAZENAMENTO_PENDENTES_LISTAR,
    {
      p_condominio_id: condominioIdNormalizado,
      p_limite: limiteSeguro,
      p_offset: offsetSeguro,
    }
  );

  if (error) {
    throw new Error(
      extrairMensagemErro(
        error,
        "Não foi possível carregar as pendências de armazenamento."
      )
    );
  }

  if (data?.ok !== true) {
    throw new Error(
      textoOuNull(data?.mensagem) ||
        "Não foi possível carregar as pendências de armazenamento."
    );
  }

  const itens = (Array.isArray(data?.itens) ? data.itens : [])
    .map(normalizarPendenciaArmazenamento)
    .filter(Boolean);

  for (const item of itens) {
    if (!item.encomendaId || !item.entradaId || !item.volumeId) {
      throw new Error(
        "O backend retornou uma pendência sem a cadeia oficial Entrada/Volume/Encomenda."
      );
    }

    if (!item.tipoEntrega) {
      throw new Error(
        "O backend retornou uma pendência sem tipo de entrega oficial."
      );
    }
  }

  return {
    ok: true,
    contrato: textoOuNull(data?.contrato),
    businessId: textoOuNull(data?.business_id),
    condominioId: textoOuNull(data?.condominio_id),
    armazenamentoHabilitado:
      data?.armazenamento_habilitado !== false,
    fluxoEncomendasAtivo:
      data?.fluxo_encomendas_ativo !== false,
    ordenacao: textoOuNull(data?.ordenacao),
    itens,
    total: Number(data?.total || 0),
    limite: Number(data?.limite || limiteSeguro),
    offset: Number(data?.offset || offsetSeguro),
    raw: data,
  };
}

// ============================================================
// EXPORT DEFAULT
// ============================================================

export default {
  listarLocalizacoesArmazenamento,
  confirmarArmazenamentoEntrada,
  listarPendenciasArmazenamento,
};