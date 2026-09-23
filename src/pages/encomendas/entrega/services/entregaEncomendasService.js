// ============================================================
// SISTEMA CHEGOU!
// CENTRAL DE ENCOMENDAS — ENTREGA
// SERVICE OPERACIONAL DA PORTARIA
//
// Responsabilidade:
// - única camada desta tela autorizada a chamar Supabase/RPC;
// - consumir contratos oficiais do backend;
// - normalizar falhas técnicas;
// - preservar respostas autoritativas.
//
// NÃO:
// - acessa tabelas diretamente;
// - decide autorização;
// - decide elegibilidade;
// - altera status da Encomenda por conta própria;
// - interpreta Token/QR como válido ou inválido;
// - persiste credenciais diretamente;
// - mantém estado React.
// ============================================================

import { supabase } from "../../../../services/supabase";


// ============================================================
// RPCs OFICIAIS
// ============================================================

const RPC = Object.freeze({
  BUSCAR:
    "rpc_encomenda_portaria_buscar_v1",

  DETALHE:
    "rpc_encomenda_portaria_detalhe_v1",

  CONSULTAR_TOKEN:
    "rpc_encomenda_token_retirada_consultar_v1",

  PREPARAR_TOKEN:
    "rpc_encomenda_retirada_preparar_token_v2",

  PREPARAR_QR:
    "rpc_encomenda_retirada_preparar_qr_v1",

  RESOLVER_QR:
    "rpc_encomenda_retirada_qr_resolver_v1",

  VALIDAR_CREDENCIAL:
    "rpc_encomenda_retirada_validar_credencial_v2",

  INICIAR_ADMINISTRATIVA:
    "rpc_encomenda_retirada_administrativa_iniciar_v1",

  CONCLUIR_RETIRADA:
    "rpc_encomenda_retirada_concluir_v1",

  CANCELAR_RETIRADA:
    "rpc_encomenda_retirada_cancelar_v1",
});


// ============================================================
// MODOS OFICIAIS DE BUSCA
// ============================================================

export const ENTREGA_MODOS_BUSCA =
  Object.freeze({
    ID_CHEGOU: "ID_CHEGOU",
    RASTREIO: "RASTREIO",
    UNIDADE: "UNIDADE",
    NOME: "NOME",
  });


// ============================================================
// ERRO NORMALIZADO
// ============================================================

function criarErroEntrega({
  message,
  code = null,
  details = null,
  hint = null,
  originalError = null,
} = {}) {
  const error = new Error(
    message ||
      "Não foi possível concluir esta operação."
  );

  error.name =
    "EntregaEncomendasServiceError";

  error.code =
    code;

  error.details =
    details;

  error.hint =
    hint;

  error.originalError =
    originalError;

  return error;
}


// ============================================================
// ERRO DO SUPABASE
// ============================================================

function normalizarErroSupabase(
  error,
  mensagemPadrao
) {
  if (!error) {
    return criarErroEntrega({
      message:
        mensagemPadrao,
    });
  }

  return criarErroEntrega({
    message:
      error.message ||
      mensagemPadrao,

    code:
      error.code ||
      null,

    details:
      error.details ||
      null,

    hint:
      error.hint ||
      null,

    originalError:
      error,
  });
}


// ============================================================
// VALIDADORES BÁSICOS
// ============================================================

function validarTextoObrigatorio(
  valor,
  {
    message,
    code,
  }
) {
  const texto =
    String(
      valor ??
      ""
    ).trim();

  if (!texto) {
    throw criarErroEntrega({
      message,
      code,
    });
  }

  return texto;
}


function normalizarTextoOpcional(
  valor
) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return null;
  }

  const texto =
    String(
      valor
    ).trim();

  return texto || null;
}


function validarCondominioId(
  condominioId
) {
  return validarTextoObrigatorio(
    condominioId,
    {
      message:
        "Não foi possível identificar o condomínio.",
      code:
        "CONDOMINIO_NAO_INFORMADO",
    }
  );
}


function validarEncomendaId(
  encomendaId
) {
  return validarTextoObrigatorio(
    encomendaId,
    {
      message:
        "Não foi possível identificar a encomenda.",
      code:
        "ENCOMENDA_NAO_INFORMADA",
    }
  );
}


function validarRetiradaId(
  retiradaId
) {
  return validarTextoObrigatorio(
    retiradaId,
    {
      message:
        "Não foi possível identificar a retirada.",
      code:
        "RETIRADA_NAO_INFORMADA",
    }
  );
}


function validarAutorizacaoId(
  autorizacaoId
) {
  return validarTextoObrigatorio(
    autorizacaoId,
    {
      message:
        "Não foi possível identificar a autorização de retirada.",
      code:
        "AUTORIZACAO_NAO_INFORMADA",
    }
  );
}


function validarTipoRetirante(
  tipoRetirante
) {
  return validarTextoObrigatorio(
    tipoRetirante,
    {
      message:
        "Não foi possível identificar quem está retirando.",
      code:
        "TIPO_RETIRANTE_NAO_INFORMADO",
    }
  );
}


function validarNomeRetirante(
  retiranteNome
) {
  return validarTextoObrigatorio(
    retiranteNome,
    {
      message:
        "Informe quem está retirando a encomenda.",
      code:
        "NOME_RETIRANTE_NAO_INFORMADO",
    }
  );
}


// ============================================================
// CONTEXTO DO DISPOSITIVO
//
// Os campos continuam opcionais.
// A tela poderá preenchê-los conforme disponibilidade.
// ============================================================

function normalizarContextoDispositivo({
  ip = null,
  userAgent = null,
  navegador = null,
  sistemaOperacional = null,
  tipoDispositivo = null,
  identificadorDispositivo = null,
} = {}) {
  return {
    p_ip:
      normalizarTextoOpcional(
        ip
      ),

    p_user_agent:
      normalizarTextoOpcional(
        userAgent
      ),

    p_navegador:
      normalizarTextoOpcional(
        navegador
      ),

    p_sistema_operacional:
      normalizarTextoOpcional(
        sistemaOperacional
      ),

    p_tipo_dispositivo:
      normalizarTextoOpcional(
        tipoDispositivo
      ),

    p_identificador_dispositivo:
      normalizarTextoOpcional(
        identificadorDispositivo
      ),
  };
}


// ============================================================
// NORMALIZAR MODO
// ============================================================

function normalizarModoBusca(
  modo
) {
  const valor =
    String(
      modo ||
      ""
    )
      .trim()
      .toUpperCase();

  const permitidos =
    Object.values(
      ENTREGA_MODOS_BUSCA
    );

  if (
    !permitidos.includes(
      valor
    )
  ) {
    throw criarErroEntrega({
      message:
        "Selecione uma forma válida de pesquisa.",
      code:
        "MODO_BUSCA_INVALIDO_FRONTEND",
    });
  }

  return valor;
}


// ============================================================
// NORMALIZAR TERMO
// ============================================================

function normalizarTermoBusca(
  busca
) {
  const valor =
    String(
      busca ??
      ""
    ).trim();

  if (!valor) {
    throw criarErroEntrega({
      message:
        "Informe o que deseja localizar.",
      code:
        "BUSCA_VAZIA_FRONTEND",
    });
  }

  return valor;
}


// ============================================================
// NORMALIZAR LIMITE
// ============================================================

function normalizarLimite(
  limite
) {
  const numero =
    Number(
      limite
    );

  if (
    !Number.isFinite(
      numero
    )
  ) {
    return 20;
  }

  return Math.min(
    50,
    Math.max(
      1,
      Math.trunc(
        numero
      )
    )
  );
}


// ============================================================
// VALIDAR RESPOSTA JSONB DO BACKEND
//
// IMPORTANTE:
// ok=false continua sendo resposta autoritativa do backend.
// O service não transforma isso em sucesso.
// ============================================================

function validarRespostaBackend(
  data,
  mensagemPadrao
) {
  if (
    !data ||
    typeof data !== "object"
  ) {
    throw criarErroEntrega({
      message:
        mensagemPadrao,
      code:
        "RESPOSTA_BACKEND_INVALIDA",
    });
  }

  return data;
}


// ============================================================
// EXECUTAR RPC
// ============================================================

async function executarRpcOperacional({
  rpc,
  parametros,
  mensagemErro,
} = {}) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      rpc,
      parametros
    );

  if (error) {
    throw normalizarErroSupabase(
      error,
      mensagemErro
    );
  }

  return validarRespostaBackend(
    data,
    mensagemErro
  );
}


// ============================================================
// BUSCAR ENCOMENDAS
// ============================================================

export async function buscarEncomendasPortaria({
  condominioId,
  modo,
  busca,
  limite = 20,
} = {}) {
  const condominio =
    validarCondominioId(
      condominioId
    );

  const modoNormalizado =
    normalizarModoBusca(
      modo
    );

  const buscaNormalizada =
    normalizarTermoBusca(
      busca
    );

  const limiteNormalizado =
    normalizarLimite(
      limite
    );

  return executarRpcOperacional({
    rpc:
      RPC.BUSCAR,

    parametros: {
      p_condominio_id:
        condominio,

      p_modo:
        modoNormalizado,

      p_busca:
        buscaNormalizada,

      p_limite:
        limiteNormalizado,
    },

    mensagemErro:
      "Não foi possível localizar as encomendas.",
  });
}


// ============================================================
// OBTER DETALHE
// ============================================================

export async function obterDetalheEncomendaPortaria({
  condominioId,
  encomendaId,
} = {}) {
  const condominio =
    validarCondominioId(
      condominioId
    );

  const encomenda =
    validarEncomendaId(
      encomendaId
    );

  return executarRpcOperacional({
    rpc:
      RPC.DETALHE,

    parametros: {
      p_condominio_id:
        condominio,

      p_encomenda_id:
        encomenda,
    },

    mensagemErro:
      "Não foi possível abrir os dados da encomenda.",
  });
}


// ============================================================
// CONSULTAR CÓDIGO DE RETIRADA
//
// O Código apresentado identifica a autorização oficial,
// a encomenda e as pessoas que podem realizar a retirada.
//
// Esta consulta NÃO inicia a retirada.
// ============================================================

export async function consultarTokenRetirada({
  condominioId,
  token,
  contextoDispositivo = null,
} = {}) {
  const condominio =
    validarCondominioId(
      condominioId
    );

  const tokenNormalizado =
    validarTextoObrigatorio(
      token,
      {
        message:
          "Informe o código apresentado para retirada.",
        code:
          "TOKEN_NAO_INFORMADO",
      }
    );

  const contexto =
    normalizarContextoDispositivo(
      contextoDispositivo ||
      {}
    );

  return executarRpcOperacional({
    rpc:
      RPC.CONSULTAR_TOKEN,

    parametros: {
      p_condominio_id:
        condominio,

      p_token:
        tokenNormalizado,

      p_ip:
        contexto.p_ip,

      p_user_agent:
        contexto.p_user_agent,

      p_navegador:
        contexto.p_navegador,

      p_sistema_operacional:
        contexto.p_sistema_operacional,

      p_tipo_dispositivo:
        contexto.p_tipo_dispositivo,
    },

    mensagemErro:
      "Não foi possível conferir o código apresentado.",
  });
}


// ============================================================
// PREPARAR RETIRADA — CÓDIGO
//
// A autorização e a elegibilidade permanecem sob decisão
// exclusiva do backend.
// ============================================================

export async function prepararRetiradaToken({
  encomendaId,
  autorizacaoRetiradaId,
  tipoRetirante,
  retiranteNome,
  retiranteUsuarioId = null,
  retirantePessoaId = null,
  dependenteUnidadeId = null,
  documentoMascarado = null,
  justificativa = null,
  contextoDispositivo = null,
} = {}) {
  const encomenda =
    validarEncomendaId(
      encomendaId
    );

  const autorizacao =
    validarAutorizacaoId(
      autorizacaoRetiradaId
    );

  const tipo =
    validarTipoRetirante(
      tipoRetirante
    );

  const nome =
    validarNomeRetirante(
      retiranteNome
    );

  return executarRpcOperacional({
    rpc:
      RPC.PREPARAR_TOKEN,

    parametros: {
      p_autorizacao_retirada_id:
        autorizacao,

      p_encomenda_id:
        encomenda,

      p_tipo_retirante:
        tipo,

      p_retirante_nome:
        nome,

      p_retirante_usuario_id:
        normalizarTextoOpcional(
          retiranteUsuarioId
        ),

      p_retirante_pessoa_id:
        normalizarTextoOpcional(
          retirantePessoaId
        ),

      p_dependente_unidade_id:
        normalizarTextoOpcional(
          dependenteUnidadeId
        ),

      p_documento_mascarado:
        normalizarTextoOpcional(
          documentoMascarado
        ),

      p_justificativa:
        normalizarTextoOpcional(
          justificativa
        ),

      ...normalizarContextoDispositivo(
        contextoDispositivo ||
        {}
      ),
    },

    mensagemErro:
      "Não foi possível iniciar a retirada.",
  });
}


// ============================================================
// PREPARAR RETIRADA — QR CODE
// ============================================================

export async function prepararRetiradaQr({
  encomendaId,
  autorizacaoRetiradaId,
  tipoRetirante,
  retiranteNome,
  retiranteUsuarioId = null,
  retirantePessoaId = null,
  dependenteUnidadeId = null,
  documentoMascarado = null,
  justificativa = null,
  contextoDispositivo = null,
} = {}) {
  const encomenda =
    validarEncomendaId(
      encomendaId
    );

  const autorizacao =
    validarAutorizacaoId(
      autorizacaoRetiradaId
    );

  const tipo =
    validarTipoRetirante(
      tipoRetirante
    );

  const nome =
    validarNomeRetirante(
      retiranteNome
    );

  return executarRpcOperacional({
    rpc:
      RPC.PREPARAR_QR,

    parametros: {
      p_autorizacao_retirada_id:
        autorizacao,

      p_encomenda_id:
        encomenda,

      p_tipo_retirante:
        tipo,

      p_retirante_nome:
        nome,

      p_retirante_usuario_id:
        normalizarTextoOpcional(
          retiranteUsuarioId
        ),

      p_retirante_pessoa_id:
        normalizarTextoOpcional(
          retirantePessoaId
        ),

      p_dependente_unidade_id:
        normalizarTextoOpcional(
          dependenteUnidadeId
        ),

      p_documento_mascarado:
        normalizarTextoOpcional(
          documentoMascarado
        ),

      p_justificativa:
        normalizarTextoOpcional(
          justificativa
        ),

      ...normalizarContextoDispositivo(
        contextoDispositivo ||
        {}
      ),
    },

    mensagemErro:
      "Não foi possível iniciar a retirada por QR Code.",
  });
}


// ============================================================
// LOCALIZAR AUTORIZAÇÃO PELO QR
//
// Esta consulta NÃO inicia a retirada.
// O backend devolve a autoridade correspondente ao QR.
// ============================================================

export async function resolverQrRetirada({
  qrPayload,
} = {}) {
  const qr =
    validarTextoObrigatorio(
      qrPayload,
      {
        message:
          "Leia o QR Code para continuar.",
        code:
          "QR_NAO_INFORMADO",
      }
    );

  return executarRpcOperacional({
    rpc:
      RPC.RESOLVER_QR,

    parametros: {
      p_qr_payload:
        qr,
    },

    mensagemErro:
      "Não foi possível conferir o QR Code.",
  });
}


// ============================================================
// CONFERIR CÓDIGO OU QR
//
// O backend exige exatamente uma credencial:
// - Código; OU
// - QR Code.
//
// O service não valida a credencial localmente.
// ============================================================

export async function validarCredencialRetirada({
  retiradaId,
  token = null,
  qrPayload = null,
  documentoValidado = false,
  identidadeConfirmada = false,
  justificativa = null,
  contextoDispositivo = null,
} = {}) {
  const retirada =
    validarRetiradaId(
      retiradaId
    );

  const tokenNormalizado =
    normalizarTextoOpcional(
      token
    );

  const qrNormalizado =
    normalizarTextoOpcional(
      qrPayload
    );

  if (
    Boolean(tokenNormalizado) ===
    Boolean(qrNormalizado)
  ) {
    throw criarErroEntrega({
      message:
        "Informe o código ou leia o QR Code.",
      code:
        "CREDENCIAL_INVALIDA_FRONTEND",
    });
  }

  return executarRpcOperacional({
    rpc:
      RPC.VALIDAR_CREDENCIAL,

    parametros: {
      p_retirada_id:
        retirada,

      p_token:
        tokenNormalizado,

      p_qr_payload:
        qrNormalizado,

      p_documento_validado:
        Boolean(
          documentoValidado
        ),

      p_identidade_confirmada:
        Boolean(
          identidadeConfirmada
        ),

      p_justificativa:
        normalizarTextoOpcional(
          justificativa
        ),

      ...normalizarContextoDispositivo(
        contextoDispositivo ||
        {}
      ),
    },

    mensagemErro:
      "Não foi possível confirmar a credencial.",
  });
}


// ============================================================
// INICIAR AUTORIZAÇÃO DA PORTARIA
//
// Procedimento excepcional.
//
// O backend decide:
// - permissão;
// - habilitação no condomínio;
// - motivo aceito;
// - exigência de justificativa;
// - exigência de identidade/documento.
// ============================================================

export async function iniciarRetiradaAdministrativa({
  encomendaId,
  tipoRetirante,
  retiranteNome,
  retiranteUsuarioId = null,
  retirantePessoaId = null,
  documentoMascarado = null,
  motivoCodigo,
  justificativa = null,
  documentoValidado = false,
  identidadeConfirmada = false,
  contextoDispositivo = null,
} = {}) {
  const encomenda =
    validarEncomendaId(
      encomendaId
    );

  const tipo =
    validarTipoRetirante(
      tipoRetirante
    );

  const nome =
    validarNomeRetirante(
      retiranteNome
    );

  const motivo =
    validarTextoObrigatorio(
      motivoCodigo,
      {
        message:
          "Selecione o motivo para usar a autorização da Portaria.",
        code:
          "MOTIVO_ADMINISTRATIVO_NAO_INFORMADO",
      }
    );

  return executarRpcOperacional({
    rpc:
      RPC.INICIAR_ADMINISTRATIVA,

    parametros: {
      p_encomenda_id:
        encomenda,

      p_tipo_retirante:
        tipo,

      p_retirante_nome:
        nome,

      p_retirante_usuario_id:
        normalizarTextoOpcional(
          retiranteUsuarioId
        ),

      p_retirante_pessoa_id:
        normalizarTextoOpcional(
          retirantePessoaId
        ),

      p_documento_mascarado:
        normalizarTextoOpcional(
          documentoMascarado
        ),

      p_motivo_codigo:
        motivo,

      p_justificativa:
        normalizarTextoOpcional(
          justificativa
        ),

      p_documento_validado:
        Boolean(
          documentoValidado
        ),

      p_identidade_confirmada:
        Boolean(
          identidadeConfirmada
        ),

      ...normalizarContextoDispositivo(
        contextoDispositivo ||
        {}
      ),
    },

    mensagemErro:
      "Não foi possível gerar a autorização da Portaria.",
  });
}


// ============================================================
// CONCLUIR ENTREGA
//
// Este é o momento da confirmação física da entrega.
// O backend permanece responsável por aceitar ou recusar.
// ============================================================

export async function concluirRetirada({
  retiradaId,
  totalVolumesEntregues,
  observacoesEntrega = null,
  assinaturaColetada = false,
  contextoDispositivo = null,
} = {}) {
  const retirada =
    validarRetiradaId(
      retiradaId
    );

  const total =
    Number(
      totalVolumesEntregues
    );

  if (
    !Number.isInteger(
      total
    ) ||
    total < 1
  ) {
    throw criarErroEntrega({
      message:
        "Não foi possível identificar a quantidade de volumes entregues.",
      code:
        "TOTAL_VOLUMES_INVALIDO_FRONTEND",
    });
  }

  return executarRpcOperacional({
    rpc:
      RPC.CONCLUIR_RETIRADA,

    parametros: {
      p_retirada_id:
        retirada,

      p_total_volumes_entregues:
        total,

      p_observacoes_entrega:
        normalizarTextoOpcional(
          observacoesEntrega
        ),

      p_assinatura_coletada:
        Boolean(
          assinaturaColetada
        ),

      ...normalizarContextoDispositivo(
        contextoDispositivo ||
        {}
      ),
    },

    mensagemErro:
      "Não foi possível confirmar a entrega.",
  });
}


// ============================================================
// CANCELAR RETIRADA EM ANDAMENTO
//
// Cancelar o atendimento não é o mesmo que concluir entrega.
// O backend decide se o cancelamento ainda é permitido.
// ============================================================

export async function cancelarRetirada({
  retiradaId,
  motivo,
  contextoDispositivo = null,
} = {}) {
  const retirada =
    validarRetiradaId(
      retiradaId
    );

  const motivoNormalizado =
    validarTextoObrigatorio(
      motivo,
      {
        message:
          "Informe o motivo do cancelamento.",
        code:
          "MOTIVO_CANCELAMENTO_NAO_INFORMADO",
      }
    );

  return executarRpcOperacional({
    rpc:
      RPC.CANCELAR_RETIRADA,

    parametros: {
      p_retirada_id:
        retirada,

      p_motivo:
        motivoNormalizado,

      ...normalizarContextoDispositivo(
        contextoDispositivo ||
        {}
      ),
    },

    mensagemErro:
      "Não foi possível cancelar esta retirada.",
  });
}


// ============================================================
// EXPORT DEFAULT OPCIONAL
// ============================================================

export default {
  buscarEncomendasPortaria,
  obterDetalheEncomendaPortaria,

  consultarTokenRetirada,

  prepararRetiradaToken,
  prepararRetiradaQr,
  resolverQrRetirada,
  validarCredencialRetirada,

  iniciarRetiradaAdministrativa,

  concluirRetirada,
  cancelarRetirada,
};