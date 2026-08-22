/*
 * SISTEMA CHEGOU!
 * Módulo Morador — Encomendas > Rastreio
 *
 * Service oficial da experiência de rastreio.
 *
 * Regras:
 * - nenhum acesso direto às tabelas;
 * - somente RPCs autorizados;
 * - identidade do Morador é resolvida pelo backend via auth.uid();
 * - condomínio representa o tenant ativo;
 * - unidades são retornadas somente quando autorizadas
 *   para o usuário autenticado dentro do condomínio ativo;
 * - nenhuma regra de negócio é criada no frontend;
 * - payloads são normalizados antes de retornar à UI;
 * - Realtime não é tratado nesta camada.
 */

import { supabase } from "../../../../../services/supabase";

/* ============================================================
   HELPERS
   ============================================================ */

function normalizeNullableText(value) {
  const normalized =
    String(value ?? "").trim();

  return normalized || null;
}

function normalizeRpcResponse(data) {
  if (
    data &&
    typeof data === "object"
  ) {
    return data;
  }

  return {};
}

function normalizePositiveInteger(
  value,
  fallback,
  max = 100,
) {
  const parsed =
    Number.parseInt(
      value,
      10,
    );

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return fallback;
  }

  return Math.min(
    parsed,
    max,
  );
}

function normalizeOffset(value) {
  const parsed =
    Number.parseInt(
      value,
      10,
    );

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return 0;
  }

  return parsed;
}

function throwRpcError(
  error,
  fallbackMessage,
) {
  if (!error) {
    return;
  }

  const message =
    error?.message ||
    error?.details ||
    fallbackMessage;

  const normalizedError =
    new Error(message);

  normalizedError.name =
    "MoradorRastreioRpcError";

  normalizedError.code =
    error?.code ?? null;

  normalizedError.details =
    error?.details ?? null;

  normalizedError.hint =
    error?.hint ?? null;

  throw normalizedError;
}

/* ============================================================
   LISTAGEM DE RASTREIOS
   ============================================================ */

export async function listarMoradorRastreios({
  condominioId,
  unidadeId = null,
  status = null,
  limite = 50,
  offset = 0,
}) {
  if (!condominioId) {
    throw new Error(
      "Condomínio não identificado.",
    );
  }

  const normalizedLimite =
    normalizePositiveInteger(
      limite,
      50,
      100,
    );

  const normalizedOffset =
    normalizeOffset(
      offset,
    );

  const { data, error } =
    await supabase.rpc(
      "rpc_morador_rastreios_aguardados_listar_v2",
      {
        p_condominio_id:
          condominioId,

        /*
         * null:
         * lista todas as unidades do usuário
         * dentro do condomínio ativo.
         *
         * UUID:
         * restringe à unidade informada.
         *
         * A identidade do usuário não vem do React.
         * O RPC utiliza auth.uid().
         */
        p_unidade_id:
          unidadeId || null,

        p_status:
          normalizeNullableText(
            status,
          ),

        p_limite:
          normalizedLimite,

        p_offset:
          normalizedOffset,
      },
    );

  throwRpcError(
    error,
    "Não foi possível carregar seus rastreios.",
  );

  const payload =
    normalizeRpcResponse(
      data,
    );

  return {
    ok:
      payload?.ok === true,

    itens:
      Array.isArray(
        payload?.itens,
      )
        ? payload.itens
        : [],

    total:
      Number(
        payload?.total ?? 0,
      ),

    limite:
      Number(
        payload?.limite ??
          normalizedLimite,
      ),

    offset:
      Number(
        payload?.offset ??
          normalizedOffset,
      ),
  };
}

/* ============================================================
   UNIDADES AUTORIZADAS
   ============================================================ */

export async function listarMoradorRastreioUnidades({
  condominioId,
}) {
  if (!condominioId) {
    throw new Error(
      "Condomínio não identificado.",
    );
  }

  const { data, error } =
    await supabase.rpc(
      "rpc_morador_rastreio_unidades_listar_v1",
      {
        p_condominio_id:
          condominioId,
      },
    );

  throwRpcError(
    error,
    "Não foi possível carregar suas unidades.",
  );

  const payload =
    normalizeRpcResponse(
      data,
    );

  const itens =
    Array.isArray(
      payload?.itens,
    )
      ? payload.itens
      : [];

  return {
    ok:
      payload?.ok === true,

    condominioId:
      payload?.condominio_id ??
      condominioId,

    itens,

    total:
      Number(
        payload?.total ??
        itens.length ??
        0,
      ),
  };
}

/* ============================================================
   TRANSPORTADORAS
   ============================================================ */

export async function listarTransportadorasRastreio({
  condominioId,
  busca = null,
  limite = 100,
  offset = 0,
}) {
  if (!condominioId) {
    throw new Error(
      "Condomínio não identificado.",
    );
  }

  const normalizedLimite =
    normalizePositiveInteger(
      limite,
      100,
      100,
    );

  const normalizedOffset =
    normalizeOffset(
      offset,
    );

  const { data, error } =
    await supabase.rpc(
      "rpc_morador_transportadoras_rastreio_listar_v1",
      {
        p_condominio_id:
          condominioId,

        p_busca:
          normalizeNullableText(
            busca,
          ),

        p_limite:
          normalizedLimite,

        p_offset:
          normalizedOffset,
      },
    );

  throwRpcError(
    error,
    "Não foi possível carregar as transportadoras.",
  );

  const payload =
    normalizeRpcResponse(
      data,
    );

  return {
    ok:
      payload?.ok === true,

    itens:
      Array.isArray(
        payload?.itens,
      )
        ? payload.itens
        : [],

    total:
      Number(
        payload?.total ?? 0,
      ),

    limite:
      Number(
        payload?.limite ??
          normalizedLimite,
      ),

    offset:
      Number(
        payload?.offset ??
          normalizedOffset,
      ),
  };
}

/* ============================================================
   CRIAÇÃO V2
   ============================================================ */

export async function criarMoradorRastreio({
  condominioId,
  unidadeId,
  transportadoraId,
  codigoRastreio,
  descricaoCompra = null,
  previstoPara = null,
  metadata = {},
  auditoria = {},
}) {
  if (!condominioId) {
    throw new Error(
      "Condomínio não identificado.",
    );
  }

  if (!unidadeId) {
    throw new Error(
      "Unidade não identificada.",
    );
  }

  if (!transportadoraId) {
    throw new Error(
      "Selecione uma transportadora.",
    );
  }

  const codigo =
    String(
      codigoRastreio ?? "",
    ).trim();

  if (!codigo) {
    throw new Error(
      "Informe o código de rastreio.",
    );
  }

  const normalizedMetadata =
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata)
      ? metadata
      : {};

  const { data, error } =
    await supabase.rpc(
      "rpc_morador_rastreio_aguardado_criar_v2",
      {
        /*
         * Identidade do Morador:
         * resolvida exclusivamente pelo backend
         * através de auth.uid().
         */
        p_condominio_id:
          condominioId,

        /*
         * Unidade selecionada somente dentre
         * as unidades autorizadas retornadas pelo
         * rpc_morador_rastreio_unidades_listar_v1.
         *
         * O RPC de criação valida novamente
         * o vínculo no backend.
         */
        p_unidade_id:
          unidadeId,

        p_transportadora_id:
          transportadoraId,

        p_codigo_rastreio:
          codigo,

        p_descricao_compra:
          normalizeNullableText(
            descricaoCompra,
          ),

        p_previsto_para:
          previstoPara || null,

        p_metadata:
          normalizedMetadata,

        p_ip:
          auditoria?.ip ??
          null,

        p_user_agent:
          auditoria
            ?.userAgent ??
          null,

        p_navegador:
          auditoria
            ?.navegador ??
          null,

        p_sistema_operacional:
          auditoria
            ?.sistemaOperacional ??
          null,

        p_tipo_dispositivo:
          auditoria
            ?.tipoDispositivo ??
          null,
      },
    );

  throwRpcError(
    error,
    "Não foi possível adicionar este rastreio.",
  );

  return normalizeRpcResponse(
    data,
  );
}

/* ============================================================
   EDIÇÃO
   ============================================================ */

export async function atualizarMoradorRastreio({
  rastreioAguardadoId,

  transportadoraId = null,
  atualizarTransportadora = false,

  descricaoCompra = null,
  atualizarDescricaoCompra = false,

  previstoPara = null,
  atualizarPrevistoPara = false,

  auditoria = {},
}) {
  if (!rastreioAguardadoId) {
    throw new Error(
      "Rastreio não identificado.",
    );
  }

  const { data, error } =
    await supabase.rpc(
      "rpc_morador_rastreio_aguardado_atualizar_v1",
      {
        /*
         * Não enviamos usuario_id.
         *
         * O backend valida se este rastreio
         * pertence ao auth.uid() autenticado.
         */
        p_rastreio_aguardado_id:
          rastreioAguardadoId,

        p_transportadora_id:
          transportadoraId,

        p_atualizar_transportadora:
          Boolean(
            atualizarTransportadora,
          ),

        p_descricao_compra:
          normalizeNullableText(
            descricaoCompra,
          ),

        p_atualizar_descricao_compra:
          Boolean(
            atualizarDescricaoCompra,
          ),

        p_previsto_para:
          previstoPara ||
          null,

        p_atualizar_previsto_para:
          Boolean(
            atualizarPrevistoPara,
          ),

        p_ip:
          auditoria?.ip ??
          null,

        p_user_agent:
          auditoria
            ?.userAgent ??
          null,

        p_navegador:
          auditoria
            ?.navegador ??
          null,

        p_sistema_operacional:
          auditoria
            ?.sistemaOperacional ??
          null,

        p_tipo_dispositivo:
          auditoria
            ?.tipoDispositivo ??
          null,
      },
    );

  throwRpcError(
    error,
    "Não foi possível atualizar este rastreio.",
  );

  return normalizeRpcResponse(
    data,
  );
}

/* ============================================================
   CANCELAMENTO
   ============================================================ */

export async function cancelarMoradorRastreio({
  rastreioAguardadoId,
  motivo = null,
  auditoria = {},
}) {
  if (!rastreioAguardadoId) {
    throw new Error(
      "Rastreio não identificado.",
    );
  }

  const { data, error } =
    await supabase.rpc(
      "rpc_morador_rastreio_aguardado_cancelar_v1",
      {
        /*
         * Não enviamos usuario_id,
         * condominio_id ou unidade_id.
         *
         * O rastreio é localizado pelo ID e
         * a propriedade é validada contra auth.uid().
         */
        p_rastreio_aguardado_id:
          rastreioAguardadoId,

        p_motivo:
          normalizeNullableText(
            motivo,
          ),

        p_ip:
          auditoria?.ip ??
          null,

        p_user_agent:
          auditoria
            ?.userAgent ??
          null,

        p_navegador:
          auditoria
            ?.navegador ??
          null,

        p_sistema_operacional:
          auditoria
            ?.sistemaOperacional ??
          null,

        p_tipo_dispositivo:
          auditoria
            ?.tipoDispositivo ??
          null,
      },
    );

  throwRpcError(
    error,
    "Não foi possível cancelar este rastreio.",
  );

  return normalizeRpcResponse(
    data,
  );
}