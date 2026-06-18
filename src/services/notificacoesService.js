import { supabase } from "./supabase";

function obterContextoPerfil(perfil = {}) {
  return {
    usuarioId: perfil?.id || perfil?.usuario_id || null,
    condominioId:
      perfil?.condominio_id ||
      perfil?.condominio_atual_id ||
      perfil?.usuario_condominio?.condominio_id ||
      null,
    businessId:
      perfil?.business_id ||
      perfil?.usuario_condominio?.business_id ||
      null,
  };
}

export function resolverDestinoNotificacao(role = "admin_logistica") {
  const mapa = {
    master: "master",
    admin_logistica: "administrativo",
    morador: "morador",
    portaria: "portaria",
    funcionario: "portaria",
  };

  return mapa[role] || "administrativo";
}

export async function contarNotificacoesNaoLidas({ perfil, role } = {}) {
  const { usuarioId, condominioId } = obterContextoPerfil(perfil);
  const destinoTipo = resolverDestinoNotificacao(role);

  let query = supabase
    .from("notificacoes")
    .select("id", { count: "exact", head: true })
    .eq("lida", false)
    .eq("enviada_in_app", true);

  if (destinoTipo === "master") {
    query = query.eq("destino_tipo", "master");
  } else {
    if (!condominioId) return 0;

    query = query
      .eq("condominio_id", condominioId)
      .or(
        usuarioId
          ? `and(destino_tipo.eq.${destinoTipo},usuario_id.is.null),usuario_id.eq.${usuarioId}`
          : `and(destino_tipo.eq.${destinoTipo},usuario_id.is.null)`
      );
  }

  const { count, error } = await query;

  if (error) throw error;

  return count || 0;
}

export async function listarNotificacoes({ perfil, role, limite = 20 } = {}) {
  const { usuarioId, condominioId } = obterContextoPerfil(perfil);
  const destinoTipo = resolverDestinoNotificacao(role);

  let query = supabase
    .from("notificacoes")
    .select(
      `
      id,
      titulo,
      mensagem,
      tipo,
      destino_tipo,
      usuario_id,
      condominio_id,
      business_id,
      modulo,
      prioridade,
      lida,
      enviada_in_app,
      metadata,
      created_at
    `
    )
    .eq("enviada_in_app", true)
    .order("created_at", { ascending: false })
    .limit(limite);

  if (destinoTipo === "master") {
    query = query.eq("destino_tipo", "master");
  } else {
    if (!condominioId) return [];

    query = query
      .eq("condominio_id", condominioId)
      .or(
        usuarioId
          ? `and(destino_tipo.eq.${destinoTipo},usuario_id.is.null),usuario_id.eq.${usuarioId}`
          : `and(destino_tipo.eq.${destinoTipo},usuario_id.is.null)`
      );
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

export async function marcarNotificacaoComoLida({ notificacaoId } = {}) {
  if (!notificacaoId) {
    throw new Error("Notificação não identificada.");
  }

  const { data, error } = await supabase
    .from("notificacoes")
    .update({
      lida: true,
      lida_em: new Date().toISOString(),
    })
    .eq("id", notificacaoId)
    .select("id")
    .single();

  if (error) throw error;

  return data;
}

export async function marcarTodasNotificacoesComoLidas({ perfil, role } = {}) {
  const { usuarioId, condominioId } = obterContextoPerfil(perfil);
  const destinoTipo = resolverDestinoNotificacao(role);

  let query = supabase
    .from("notificacoes")
    .update({
      lida: true,
      lida_em: new Date().toISOString(),
    })
    .eq("lida", false)
    .eq("enviada_in_app", true);

  if (destinoTipo === "master") {
    query = query.eq("destino_tipo", "master");
  } else {
    if (!condominioId) return [];

    query = query
      .eq("condominio_id", condominioId)
      .or(
        usuarioId
          ? `and(destino_tipo.eq.${destinoTipo},usuario_id.is.null),usuario_id.eq.${usuarioId}`
          : `and(destino_tipo.eq.${destinoTipo},usuario_id.is.null)`
      );
  }

  const { data, error } = await query.select("id");

  if (error) throw error;

  return data || [];
}

/* Compatibilidade temporária com o nome usado no AppLayout atual */
export async function contarNotificacoesNaoLidasAdministrativo({ perfil } = {}) {
  return contarNotificacoesNaoLidas({
    perfil,
    role: "admin_logistica",
  });
}