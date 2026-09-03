import { supabase } from "../supabase";

const RPC = Object.freeze({
  CONTAR_NAO_LIDAS: "rpc_central_notificacoes_contar_nao_lidas_v1",
  LISTAR_SININHO: "rpc_central_notificacoes_listar_sininho_v1",
  MARCAR_VISUALIZADA: "rpc_central_notificacoes_marcar_visualizada_v1",
  MARCAR_LIDA: "rpc_central_notificacoes_marcar_lida_v1",
  MARCAR_TODAS_LIDAS: "rpc_central_notificacoes_marcar_todas_lidas_v1",
});

function criarErroCentralNotificacoes(operacao, error) {
  const erro = new Error(
    error?.message ||
      `Não foi possível executar a operação "${operacao}" na Central de Notificações.`
  );

  erro.name = "CentralNotificationsServiceError";
  erro.code = error?.code || null;
  erro.details = error?.details || null;
  erro.hint = error?.hint || null;
  erro.operation = operacao;

  return erro;
}

async function executarRpc(nome, parametros, operacao) {
  const { data, error } = await supabase.rpc(nome, parametros);

  if (error) {
    throw criarErroCentralNotificacoes(operacao, error);
  }

  return data;
}

export async function contarNotificacoesNaoLidas() {
  const data = await executarRpc(
    RPC.CONTAR_NAO_LIDAS,
    undefined,
    "contar notificações não lidas"
  );

  const total = Number(data);

  return Number.isFinite(total) && total >= 0 ? total : 0;
}

export async function listarNotificacoesSininho(limite = 20) {
  const limiteNormalizado = Math.min(
    50,
    Math.max(1, Number.isFinite(Number(limite)) ? Math.trunc(Number(limite)) : 20)
  );

  const data = await executarRpc(
    RPC.LISTAR_SININHO,
    {
      p_limite: limiteNormalizado,
    },
    "listar notificações do sininho"
  );

  return Array.isArray(data) ? data : [];
}

export async function marcarNotificacaoComoVisualizada(inboxId) {
  if (!inboxId) {
    throw new TypeError("inboxId é obrigatório.");
  }

  return executarRpc(
    RPC.MARCAR_VISUALIZADA,
    {
      p_inbox_id: inboxId,
    },
    "marcar notificação como visualizada"
  );
}

export async function marcarNotificacaoComoLida(inboxId) {
  if (!inboxId) {
    throw new TypeError("inboxId é obrigatório.");
  }

  return executarRpc(
    RPC.MARCAR_LIDA,
    {
      p_inbox_id: inboxId,
    },
    "marcar notificação como lida"
  );
}

export async function marcarTodasNotificacoesComoLidas() {
  return executarRpc(
    RPC.MARCAR_TODAS_LIDAS,
    undefined,
    "marcar todas as notificações como lidas"
  );
}