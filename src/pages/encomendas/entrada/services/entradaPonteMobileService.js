import {
  supabase,
} from "../../../../services/supabase";

// ============================================================
// SISTEMA CHEGOU!
// CENTRAL DE ENCOMENDAS — ENTRADA OFICIAL
//
// E3.2-E.2
// CLIENTE DESKTOP DA PONTE MOBILE
//
// O desktop:
// - cria Ponte;
// - consulta estado;
// - encerra Ponte.
//
// O desktop NÃO:
// - recebe token da sessão Mobile;
// - executa ações em nome do Mobile;
// - confirma Entrada pela Ponte.
// ============================================================

const RPC_CRIAR =
  "rpc_encomenda_entrada_ponte_mobile_criar_v1";

const RPC_STATUS =
  "rpc_encomenda_entrada_ponte_mobile_status_v1";

const RPC_ENCERRAR =
  "rpc_encomenda_entrada_ponte_mobile_encerrar_v1";

// ============================================================
// HELPERS
// ============================================================

function textoOuNull(
  value
) {
  const texto =
    String(
      value ?? ""
    ).trim();

  return texto || null;
}

function obterUserAgent() {
  if (
    typeof navigator ===
    "undefined"
  ) {
    return null;
  }

  return (
    navigator.userAgent ||
    null
  );
}

// ============================================================
// CRIAR
// ============================================================

export async function criarPonteMobileEntrada({
  preRecebimentoId,
  ip = null,
} = {}) {
  if (!preRecebimentoId) {
    throw new Error(
      "Lote não informado para a Ponte Mobile."
    );
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      RPC_CRIAR,
      {
        p_pre_recebimento_id:
          preRecebimentoId,

        /*
         * O navegador não conhece de forma
         * autoritativa o IP público.
         *
         * Mantemos null até existir uma
         * camada backend própria para isso.
         */
        p_ip:
          textoOuNull(
            ip
          ),

        p_user_agent:
          obterUserAgent(),
      }
    );

  if (error) {
    throw new Error(
      error.message ||
        "Não foi possível iniciar a Ponte Mobile."
    );
  }

  if (
    data?.ok !== true
  ) {
    throw new Error(
      "Não foi possível iniciar a Ponte Mobile."
    );
  }

  return {
    ponteId:
      data.ponte_id,

    tokenPareamento:
      data.token_pareamento,

    status:
      data.status,

    pareamentoExpiraEm:
      data.pareamento_expira_em,

    inatividadeSegundos:
      Number(
        data.inatividade_segundos
      ) || 60,

    ttlConectadoSegundos:
      Number(
        data.ttl_conectado_segundos
      ) || 600,
  };
}

// ============================================================
// STATUS
// ============================================================

export async function obterStatusPonteMobileEntrada({
  ponteId,
} = {}) {
  if (!ponteId) {
    throw new Error(
      "Ponte não informada."
    );
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      RPC_STATUS,
      {
        p_ponte_id:
          ponteId,
      }
    );

  if (error) {
    throw new Error(
      error.message ||
        "Não foi possível atualizar a Ponte Mobile."
    );
  }

  if (
    data?.ok !== true
  ) {
    throw new Error(
      "Não foi possível atualizar a Ponte Mobile."
    );
  }

  return {
    ponteId:
      data.ponte_id,

    status:
      data.status,

    preRecebimentoId:
      data.pre_recebimento_id,

    condominioId:
      data.condominio_id,

    serverNow:
      data.server_now,

    conectadoEm:
      data.conectado_em,

    ultimaAtividadeEm:
      data.ultima_atividade_em,

    ultimoHeartbeatEm:
      data.ultimo_heartbeat_em,

    expiraInatividadeEm:
      data.expira_inatividade_em,

    expiraEm:
      data.expira_em,

    redeCoincidente:
      data.rede_coincidente,

    mobileTipoDispositivo:
      data.mobile_tipo_dispositivo,

    eventos:
      Array.isArray(
        data.eventos
      )
        ? data.eventos
        : [],
  };
}

// ============================================================
// ENCERRAR
// ============================================================

export async function encerrarPonteMobileEntrada({
  ponteId,
} = {}) {
  if (!ponteId) {
    return {
      ok: true,
      status:
        "SEM_PONTE",
    };
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      RPC_ENCERRAR,
      {
        p_ponte_id:
          ponteId,
      }
    );

  if (error) {
    throw new Error(
      error.message ||
        "Não foi possível desconectar o celular."
    );
  }

  return {
    ok:
      data?.ok === true,

    ponteId:
      data?.ponte_id ||
      ponteId,

    status:
      data?.status ||
      "ENCERRADA",
  };
}

export default {
  criarPonteMobileEntrada,
  obterStatusPonteMobileEntrada,
  encerrarPonteMobileEntrada,
};