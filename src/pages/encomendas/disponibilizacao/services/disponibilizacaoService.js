import {
  supabase,
} from "../../../../services/supabase";

// ============================================================
// SISTEMA CHEGOU!
// CENTRAL DE ENCOMENDAS
//
// DISPONIBILIZAÇÃO
//
// Responsabilidades:
// - listar Encomendas armazenadas aguardando Disponibilização;
// - consumir elegibilidade e bloqueios definidos pelo backend;
// - confirmar Disponibilização via RPC V2;
// - não consultar tabelas diretamente;
// - não decidir autorização no frontend;
// - não enviar notificações diretamente.
// ============================================================

const RPC_DISPONIBILIZACAO_PENDENTES_LISTAR =
  "rpc_encomenda_disponibilizacao_pendentes_listar_v1";

const RPC_DISPONIBILIZAR =
  "rpc_encomenda_disponibilizar_retirada_v2";

const RPC_DISPONIBILIZACAO_CONTEXTO_INDIVIDUAL =
  "rpc_encomenda_disponibilizacao_contexto_v1";

const RPC_WHATSAPP_ASSISTIDO_CONTEXTO =
  "rpc_encomenda_whatsapp_assistido_contexto_v1";

const RPC_WHATSAPP_ASSISTIDO_REGISTRAR =
  "rpc_encomenda_whatsapp_assistido_registrar_v1";

const LIMITE_PADRAO =
  50;



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

function normalizarBloqueio(
  item
) {
  if (
    !item ||
    typeof item !== "object"
  ) {
    return null;
  }

  const codigo =
    textoOuNull(
      item.codigo
    );

  if (!codigo) {
    return null;
  }

  return {
    codigo,

    mensagem:
      textoOuNull(
        item.mensagem
      ),

    raw:
      item,
  };
}

function normalizarPendenciaDisponibilizacao(
  item
) {
  if (
    !item ||
    typeof item !== "object"
  ) {
    return null;
  }

  const bloqueios =
    (
      Array.isArray(
        item.bloqueios
      )
        ? item.bloqueios
        : []
    )
      .map(
        normalizarBloqueio
      )
      .filter(Boolean);

  return {
    // ========================================================
    // ENCOMENDA
    // ========================================================

    encomendaId:
      textoOuNull(
        item.encomenda_id
      ),

    numeroEncomenda:
      item.numero_encomenda ??
      null,

    status:
      textoOuNull(
        item.status
      ),

    tipoEntrega:
      textoOuNull(
        item.tipo_entrega
      ),

    prioridade:
      textoOuNull(
        item.prioridade
      ),

    // ========================================================
    // TENANT / CONTEXTO
    // ========================================================

    businessId:
      textoOuNull(
        item.business_id
      ),

    condominioId:
      textoOuNull(
        item.condominio_id
      ),

    correlationId:
      textoOuNull(
        item.correlation_id
      ),

    preRecebimentoId:
      textoOuNull(
        item.pre_recebimento_id
      ),

    // ========================================================
    // ENTRADA OFICIAL / VOLUME
    // ========================================================

    entradaId:
      textoOuNull(
        item.entrada_id
      ),

    volumeId:
      textoOuNull(
        item.volume_id
      ),

    entradaConfirmadaEm:
      textoOuNull(
        item.entrada_confirmada_em
      ),

    // ========================================================
    // ESTRUTURA RESIDENCIAL OFICIAL
    // ========================================================

    torreId:
      textoOuNull(
        item.torre_id
      ),

    torreNome:
      textoOuNull(
        item.torre_nome
      ),

    torreIdentificador:
      textoOuNull(
        item.torre_identificador
      ),

    unidadeId:
      textoOuNull(
        item.unidade_id
      ),

    unidadeOficialId:
      textoOuNull(
        item.unidade_oficial_id
      ),

    unidadeNumero:
      textoOuNull(
        item.unidade_numero
      ),

    /*
     * Snapshots auxiliares retornados pelo backend.
     * Não são usados como fonte autoritativa do identificador
     * da Torre/Bloco.
     */
    unidadeTorreSnapshot:
      textoOuNull(
        item.unidade_torre_snapshot
      ),

    unidadeBlocoSnapshot:
      textoOuNull(
        item.unidade_bloco_snapshot
      ),

    unidadeTorreIdOficial:
      textoOuNull(
        item.unidade_torre_id_oficial
      ),

    // ========================================================
    // DESTINATÁRIO NOMINAL
    // ========================================================

    destinatarioTipo:
      textoOuNull(
        item.destinatario_tipo
      ),

    destinatarioNome:
      textoOuNull(
        item.destinatario_nome
      ),

    destinatarioUsuarioId:
      textoOuNull(
        item.destinatario_usuario_id
      ),

    destinatarioPessoaId:
      textoOuNull(
        item.destinatario_pessoa_id
      ),

    destinatarioMoradorVinculoId:
      textoOuNull(
        item.destinatario_morador_vinculo_id
      ),

    destinatarioDependenteId:
      textoOuNull(
        item.destinatario_dependente_id
      ),

    destinatarioResponsavelVinculoId:
      textoOuNull(
        item.destinatario_responsavel_vinculo_id
      ),

    // ========================================================
    // TRANSPORTADORA
    // ========================================================

    transportadoraId:
      textoOuNull(
        item.transportadora_id
      ),

    transportadoraNome:
      textoOuNull(
        item.transportadora_nome
      ),

    // ========================================================
    // LOCALIZAÇÃO
    // ========================================================

    localizacaoId:
      textoOuNull(
        item.localizacao_id
      ),

    localizacaoCodigo:
      textoOuNull(
        item.localizacao_codigo
      ),

    localizacaoNome:
      textoOuNull(
        item.localizacao_nome
      ),

    localizacaoPaiId:
      textoOuNull(
        item.localizacao_pai_id
      ),

    localizacaoPaiNome:
      textoOuNull(
        item.localizacao_pai_nome
      ),

    localizacaoAtiva:
      booleanoSeguro(
        item.localizacao_ativa
      ),

    localizacaoBloqueada:
      booleanoSeguro(
        item.localizacao_bloqueada
      ),

    // ========================================================
    // TEMPO / ELEGIBILIDADE
    // ========================================================

    armazenadoEm:
      textoOuNull(
        item.armazenado_em
      ),

    armazenadoEmLocal:
      textoOuNull(
        item.armazenado_em_local
      ),

    pendenteHaSegundos:
      numeroOuNull(
        item.pendente_ha_segundos
      ),

    possuiOcorrenciaCritica:
      booleanoSeguro(
        item.possui_ocorrencia_critica
      ),

    ocorrenciasCriticasAbertas:
      numeroOuNull(
        item.ocorrencias_criticas_abertas
      ) ??
      0,

    elegivelDisponibilizacao:
      booleanoSeguro(
        item.elegivel_disponibilizacao
      ),

    bloqueios,

    raw:
      item,
  };
}

function normalizarContextoDisponibilizacaoIndividual(
  item
) {
  if (
    !item ||
    typeof item !== "object"
  ) {
    return null;
  }

  const bloqueios =
    (
      Array.isArray(
        item.bloqueios
      )
        ? item.bloqueios
        : []
    )
      .map(
        normalizarBloqueio
      )
      .filter(Boolean);

  return {
    // ========================================================
    // ENCOMENDA
    // ========================================================

    encomendaId:
      textoOuNull(
        item.encomenda_id
      ),

    numeroEncomenda:
      item.numero_encomenda ??
      null,

    status:
      textoOuNull(
        item.status
      ),

    tipoEntrega:
      textoOuNull(
        item.tipo_entrega
      ),

    prioridade:
      textoOuNull(
        item.prioridade
      ),

    // ========================================================
    // TENANT / CADEIA OFICIAL
    // ========================================================

    businessId:
      textoOuNull(
        item.business_id
      ),

    condominioId:
      textoOuNull(
        item.condominio_id
      ),

    correlationId:
      textoOuNull(
        item.correlation_id
      ),

    preRecebimentoId:
      textoOuNull(
        item.pre_recebimento_id
      ),

    entradaId:
      textoOuNull(
        item.entrada_id
      ),

    volumeId:
      textoOuNull(
        item.volume_id
      ),

    // ========================================================
    // ENTRADA / ARMAZENAMENTO / DISPONIBILIZAÇÃO
    // ========================================================

    entradaConfirmadaEm:
      textoOuNull(
        item.entrada_confirmada_em
      ),

    entradaConfirmadaEmLocal:
      textoOuNull(
        item.entrada_confirmada_em_local
      ),

    armazenadoEm:
      textoOuNull(
        item.armazenado_em
      ),

    armazenadoEmLocal:
      textoOuNull(
        item.armazenado_em_local
      ),

    disponibilizadoEm:
      textoOuNull(
        item.disponibilizado_em
      ),

    disponibilizadoEmLocal:
      textoOuNull(
        item.disponibilizado_em_local
      ),

    timezoneIana:
      textoOuNull(
        item.timezone_iana
      ),

    // ========================================================
    // ESTRUTURA RESIDENCIAL OFICIAL
    // ========================================================

    torreId:
      textoOuNull(
        item.torre_id
      ),

    torreNome:
      textoOuNull(
        item.torre_nome
      ),

    torreIdentificador:
      textoOuNull(
        item.torre_identificador
      ),

    unidadeId:
      textoOuNull(
        item.unidade_id
      ),

    unidadeOficialId:
      textoOuNull(
        item.unidade_oficial_id
      ),

    unidadeNumero:
      textoOuNull(
        item.unidade_numero
      ),

    unidadeTorreIdOficial:
      textoOuNull(
        item.unidade_torre_id_oficial
      ),

    // ========================================================
    // DESTINATÁRIO
    // ========================================================

    destinatarioTipo:
      textoOuNull(
        item.destinatario_tipo
      ),

    destinatarioNome:
      textoOuNull(
        item.destinatario_nome
      ),

    destinatarioUsuarioId:
      textoOuNull(
        item.destinatario_usuario_id
      ),

    destinatarioPessoaId:
      textoOuNull(
        item.destinatario_pessoa_id
      ),

    destinatarioMoradorVinculoId:
      textoOuNull(
        item.destinatario_morador_vinculo_id
      ),

    destinatarioDependenteId:
      textoOuNull(
        item.destinatario_dependente_id
      ),

    destinatarioResponsavelVinculoId:
      textoOuNull(
        item.destinatario_responsavel_vinculo_id
      ),

    // ========================================================
    // LOCALIZAÇÃO
    // ========================================================

    localizacaoId:
      textoOuNull(
        item.localizacao_id
      ),

    localizacaoCodigo:
      textoOuNull(
        item.localizacao_codigo
      ),

    localizacaoNome:
      textoOuNull(
        item.localizacao_nome
      ),

    localizacaoPaiId:
      textoOuNull(
        item.localizacao_pai_id
      ),

    localizacaoPaiNome:
      textoOuNull(
        item.localizacao_pai_nome
      ),

    localizacaoNomeCompleto:
      textoOuNull(
        item.localizacao_nome_completo
      ),

    localizacaoAtiva:
      booleanoSeguro(
        item.localizacao_ativa
      ),

    localizacaoBloqueada:
      booleanoSeguro(
        item.localizacao_bloqueada
      ),

    // ========================================================
    // ELEGIBILIDADE
    // ========================================================

    elegivelDisponibilizacao:
      booleanoSeguro(
        item.elegivel_disponibilizacao
      ),

    bloqueios,

    raw:
      item,
  };
}

// ============================================================
// LISTAR PENDÊNCIAS DE DISPONIBILIZAÇÃO
// ============================================================

export async function listarPendenciasDisponibilizacao({
  condominioId,
  busca = null,
  localizacaoId = null,
  apenasElegiveis = false,
  limite = LIMITE_PADRAO,
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

  const limiteSeguro =
    Math.max(
      1,
      Math.min(
        Number(
          limite
        ) ||
          LIMITE_PADRAO,
        200
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
      RPC_DISPONIBILIZACAO_PENDENTES_LISTAR,
      {
        p_condominio_id:
          condominioIdNormalizado,

        p_busca:
          textoOuNull(
            busca
          ),

        p_localizacao_id:
          textoOuNull(
            localizacaoId
          ),

        p_apenas_elegiveis:
          apenasElegiveis ===
          true,

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
        "Não foi possível carregar as pendências de disponibilização."
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
        "Não foi possível carregar as pendências de disponibilização."
    );
  }

  const itens =
    (
      Array.isArray(
        data?.itens
      )
        ? data.itens
        : []
    )
      .map(
        normalizarPendenciaDisponibilizacao
      )
      .filter(Boolean);

  /*
   * Defesa de contrato:
   * a UI não deve operar se a cadeia oficial não vier do backend.
   */
  for (const item of itens) {
    if (
      !item.encomendaId ||
      !item.entradaId ||
      !item.volumeId
    ) {
      throw new Error(
        "O backend retornou uma pendência sem a cadeia oficial Entrada/Volume/Encomenda."
      );
    }

    if (
      item.status !==
      "ARMAZENADA"
    ) {
      throw new Error(
        "O backend retornou uma pendência fora do estado ARMAZENADA."
      );
    }

    if (
      !item.armazenadoEm ||
      !item.localizacaoId
    ) {
      throw new Error(
        "O backend retornou uma pendência sem armazenamento oficial válido."
      );
    }
  }

  return {
    ok:
      true,

    contrato:
      textoOuNull(
        data?.contrato
      ),

    businessId:
      textoOuNull(
        data?.business_id
      ),

    condominioId:
      textoOuNull(
        data?.condominio_id
      ),

    fluxoEncomendasAtivo:
      data
        ?.fluxo_encomendas_ativo !==
      false,

    armazenamentoHabilitado:
      data
        ?.armazenamento_habilitado !==
      false,

    ordenacao:
      textoOuNull(
        data?.ordenacao
      ),

    timezoneIana:
      textoOuNull(
        data?.timezone_iana
      ),

    itens,

    total:
      Number(
        data?.total ||
        0
      ),

    limite:
      Number(
        data?.limite ||
        limiteSeguro
      ),

    offset:
      Number(
        data?.offset ||
        offsetSeguro
      ),

    mensagem:
      textoOuNull(
        data?.mensagem
      ),

    raw:
      data,
  };
}

function normalizarContextoWhatsappAssistido(
  data
) {
  if (
    !data ||
    typeof data !== "object"
  ) {
    return null;
  }

  return {
    ok:
      data.ok === true,

    contrato:
      textoOuNull(
        data.contrato
      ),

    // ========================================================
    // TENANT / CADEIA OFICIAL
    // ========================================================

    businessId:
      textoOuNull(
        data.business_id
      ),

    condominioId:
      textoOuNull(
        data.condominio_id
      ),

    entradaId:
      textoOuNull(
        data.entrada_id
      ),

    volumeId:
      textoOuNull(
        data.volume_id
      ),

    encomendaId:
      textoOuNull(
        data.encomenda_id
      ),

    numeroEncomenda:
      data.numero_encomenda ??
      null,

    correlationId:
      textoOuNull(
        data.correlation_id
      ),

    status:
      textoOuNull(
        data.status
      ),

    // ========================================================
    // DESTINATÁRIO
    // ========================================================

    destinatarioNome:
      textoOuNull(
        data.destinatario_nome
      ),

    destinatarioPrimeiroNome:
      textoOuNull(
        data.destinatario_primeiro_nome
      ),

    // ========================================================
    // ESTRUTURA RESIDENCIAL
    // ========================================================

    torreNome:
      textoOuNull(
        data.torre_nome
      ),

    torreIdentificador:
      textoOuNull(
        data.torre_identificador
      ),

    unidadeNumero:
      textoOuNull(
        data.unidade_numero
      ),

    // ========================================================
    // CONDOMÍNIO / TEMPO
    // ========================================================

    condominioNome:
      textoOuNull(
        data.condominio_nome
      ),

    timezoneIana:
      textoOuNull(
        data.timezone_iana
      ),

    entradaConfirmadaEm:
      textoOuNull(
        data.entrada_confirmada_em
      ),

    entradaConfirmadaEmLocal:
      textoOuNull(
        data.entrada_confirmada_em_local
      ),

    disponibilizadoEm:
      textoOuNull(
        data.disponibilizado_em
      ),

    disponibilizadoEmLocal:
      textoOuNull(
        data.disponibilizado_em_local
      ),

    // ========================================================
    // WHATSAPP
    // ========================================================

    whatsappDisponivel:
      data.whatsapp_disponivel ===
      true,

    telefoneE164:
      textoOuNull(
        data.telefone_e164
      ),

    telefoneMascarado:
      textoOuNull(
        data.telefone_mascarado
      ),

    telefoneOrigem:
      textoOuNull(
        data.telefone_origem
      ),

    whatsappAberto:
      data.whatsapp_aberto ===
      true,

    whatsappAbertoEm:
      textoOuNull(
        data.whatsapp_aberto_em
      ),

    whatsappAbertoEmLocal:
      textoOuNull(
        data.whatsapp_aberto_em_local
      ),

    whatsappEnvioConfirmadoOperador:
      data
        .whatsapp_envio_confirmado_operador ===
      true,

    whatsappEnvioConfirmadoEm:
      textoOuNull(
        data.whatsapp_envio_confirmado_em
      ),

    whatsappEnvioConfirmadoEmLocal:
      textoOuNull(
        data
          .whatsapp_envio_confirmado_em_local
      ),

    raw:
      data,
  };
}

export async function obterContextoDisponibilizacaoIndividual({
  encomendaId,
} = {}) {
  const encomendaIdNormalizado =
    textoOuNull(
      encomendaId
    );

  if (
    !encomendaIdNormalizado
  ) {
    throw new Error(
      "A encomenda não foi identificada."
    );
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      RPC_DISPONIBILIZACAO_CONTEXTO_INDIVIDUAL,
      {
        p_encomenda_id:
          encomendaIdNormalizado,
      }
    );

  if (error) {
    throw new Error(
      extrairMensagemErro(
        error,
        "Não foi possível carregar os dados da disponibilização."
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
        "Não foi possível carregar os dados da disponibilização."
    );
  }

  const contexto =
    normalizarContextoDisponibilizacaoIndividual(
      data
    );

  if (
    !contexto?.encomendaId ||
    !contexto?.entradaId ||
    !contexto?.volumeId
  ) {
    throw new Error(
      "O backend retornou uma disponibilização sem a cadeia oficial Entrada/Volume/Encomenda."
    );
  }

  if (
    contexto.status !==
      "ARMAZENADA" &&
    contexto.status !==
      "DISPONIVEL_RETIRADA"
  ) {
    throw new Error(
      "A encomenda está fora do fluxo individual de disponibilização."
    );
  }

  if (
    contexto.status ===
      "ARMAZENADA" &&
    (
      !contexto.armazenadoEm ||
      !contexto.localizacaoId
    )
  ) {
    throw new Error(
      "O backend retornou a encomenda sem armazenamento oficial válido."
    );
  }

  return contexto;
}

// ============================================================
// CONFIRMAR DISPONIBILIZAÇÃO PARA RETIRADA
// ============================================================

export async function confirmarDisponibilizacaoRetirada({
  encomendaId,
  observacoes = null,
} = {}) {
  const encomendaIdNormalizado =
    textoOuNull(
      encomendaId
    );

  if (
    !encomendaIdNormalizado
  ) {
    throw new Error(
      "A encomenda não foi identificada."
    );
  }

  const dispositivo =
    obterDadosDispositivo();

  const {
    data,
    error,
  } =
    await supabase.rpc(
      RPC_DISPONIBILIZAR,
      {
        p_encomenda_id:
          encomendaIdNormalizado,

        p_observacoes:
          textoOuNull(
            observacoes
          ),

        /*
         * IP não deve ser inventado pelo navegador.
         * Quando houver coleta autoritativa, ela deve ocorrer
         * em camada backend apropriada.
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
        "Não foi possível disponibilizar a encomenda para retirada."
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
        "A disponibilização não foi concluída."
    );
  }

  return {
    ok:
      true,

    contrato:
      textoOuNull(
        data?.contrato
      ),

    idempotente:
      data?.idempotente ===
      true,

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

    disponibilizadoEm:
      textoOuNull(
        data?.disponibilizado_em
      ),

    disponibilizadoEmLocal:
      textoOuNull(
        data
          ?.disponibilizado_em_local
      ),

    notificacaoEnviadaDiretamente:
      data
        ?.notificacao_enviada_diretamente ===
      true,

    raw:
      data,
  };
}

// ============================================================
// WHATSAPP ASSISTIDO — CONTEXTO
// ============================================================

export async function obterContextoWhatsappAssistido({
  encomendaId,
} = {}) {
  const encomendaIdNormalizado =
    textoOuNull(
      encomendaId
    );

  if (
    !encomendaIdNormalizado
  ) {
    throw new Error(
      "A encomenda não foi identificada."
    );
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      RPC_WHATSAPP_ASSISTIDO_CONTEXTO,
      {
        p_encomenda_id:
          encomendaIdNormalizado,
      }
    );

  if (error) {
    throw new Error(
      extrairMensagemErro(
        error,
        "Não foi possível carregar os dados do WhatsApp."
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
        "Não foi possível carregar os dados do WhatsApp."
    );
  }

  const contexto =
    normalizarContextoWhatsappAssistido(
      data
    );

  if (
    !contexto?.encomendaId ||
    !contexto?.entradaId ||
    !contexto?.volumeId
  ) {
    throw new Error(
      "O backend retornou o WhatsApp sem a cadeia oficial Entrada/Volume/Encomenda."
    );
  }

  if (
    contexto.status !==
    "DISPONIVEL_RETIRADA"
  ) {
    throw new Error(
      "A encomenda está fora do fluxo de WhatsApp assistido."
    );
  }

  return contexto;
}

// ============================================================
// WHATSAPP ASSISTIDO — AUDITORIA
// ============================================================

export async function registrarWhatsappAssistido({
  encomendaId,
  operacao,
} = {}) {
  const encomendaIdNormalizado =
    textoOuNull(
      encomendaId
    );

  const operacaoNormalizada =
    textoOuNull(
      operacao
    )?.toLocaleUpperCase(
      "pt-BR"
    );

  if (
    !encomendaIdNormalizado
  ) {
    throw new Error(
      "A encomenda não foi identificada."
    );
  }

  if (
    operacaoNormalizada !==
      "ABERTO" &&
    operacaoNormalizada !==
      "ENVIO_CONFIRMADO_OPERADOR"
  ) {
    throw new Error(
      "A operação do WhatsApp assistido é inválida."
    );
  }

  const dispositivo =
    obterDadosDispositivo();

  const {
    data,
    error,
  } =
    await supabase.rpc(
      RPC_WHATSAPP_ASSISTIDO_REGISTRAR,
      {
        p_encomenda_id:
          encomendaIdNormalizado,

        p_operacao:
          operacaoNormalizada,

        /*
         * O navegador não inventa IP.
         */
        p_ip:
          null,

        p_user_agent:
          dispositivo.userAgent,

        p_navegador:
          dispositivo.navegador,

        p_sistema_operacional:
          dispositivo.sistemaOperacional,

        p_tipo_dispositivo:
          dispositivo.tipoDispositivo,

        p_identificador_dispositivo:
          null,
      }
    );

  if (error) {
    throw new Error(
      extrairMensagemErro(
        error,
        "Não foi possível registrar a operação do WhatsApp."
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
        "A operação do WhatsApp não foi registrada."
    );
  }

  return {
    ok:
      true,

    contrato:
      textoOuNull(
        data.contrato
      ),

    encomendaId:
      textoOuNull(
        data.encomenda_id
      ),

    numeroEncomenda:
      data.numero_encomenda ??
      null,

    operacao:
      textoOuNull(
        data.operacao
      ),

    acao:
      textoOuNull(
        data.acao
      ),

    resultado:
      textoOuNull(
        data.resultado
      ),

    status:
      textoOuNull(
        data.status
      ),

    idempotente:
      data.idempotente ===
      true,

    logId:
      textoOuNull(
        data.log_id
      ),

    registradoEm:
      textoOuNull(
        data.registrado_em
      ),

    registradoEmLocal:
      textoOuNull(
        data.registrado_em_local
      ),

    raw:
      data,
  };
}

// ============================================================
// EXPORT DEFAULT
// ============================================================

export default {
  listarPendenciasDisponibilizacao,
  obterContextoDisponibilizacaoIndividual,
  confirmarDisponibilizacaoRetirada,
  obterContextoWhatsappAssistido,
  registrarWhatsappAssistido,
};