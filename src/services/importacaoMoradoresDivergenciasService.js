import { supabase } from "./supabase";
import { registrarLogSistema } from "./cadastroMoradorService";

function montarContextoTecnicoDivergencia() {
  const ua = navigator.userAgent || "";

  const navegador = (() => {
    if (ua.includes("Edg")) return "Microsoft Edge";
    if (ua.includes("Chrome")) return "Google Chrome";
    if (ua.includes("Firefox")) return "Mozilla Firefox";
    if (ua.includes("Safari")) return "Safari";
    return "Desconhecido";
  })();

  const sistemaOperacional = (() => {
    if (ua.includes("Windows")) return "Windows";
    if (ua.includes("Android")) return "Android";
    if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
    if (ua.includes("Mac")) return "macOS";
    if (ua.includes("Linux")) return "Linux";
    return "Desconhecido";
  })();

  return {
    navegador,
    sistema_operacional: sistemaOperacional,
    user_agent: ua,
  };
}

export async function listarDivergenciasMoradores({
  condominioId,
  status = "pendente",
  motivo = "todos",
  severidade = "todos",
  termo = "",
}) {
  if (!condominioId) {
    throw new Error("Condomínio não identificado.");
  }

  let query = supabase
    .from("importacao_moradores_divergencias")
    .select(`
      *,
      usuario_resolucao:usuarios!importacao_moradores_divergencias_resolvida_por_fkey (
        id,
        nome,
        email
      )
    `)
    .eq("condominio_id", condominioId)
    .order("criado_em", { ascending: false });

  if (status !== "todos") {
    query = query.eq("status_divergencia", status);
  }

  if (motivo !== "todos") {
    query = query.eq("motivo", motivo);
  }

  if (severidade !== "todos") {
    query = query.eq("severidade", severidade);
  }

  const { data, error } = await query;

  if (error) throw error;

  const termoNormalizado = String(termo || "").toLowerCase().trim();

  if (!termoNormalizado) return data || [];

  return (data || []).filter((item) => {
    const texto = [
      item.lote_id,
      item.nome_informado,
      item.email_informado,
      item.telefone_informado,
      item.torre_informada,
      item.unidade_informada,
      item.motivo,
      item.orientacao,
      item.severidade,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return texto.includes(termoNormalizado);
  });
}

export async function buscarDivergenciaMorador(id) {
  if (!id) throw new Error("Divergência não informada.");

  const { data, error } = await supabase
    .from("importacao_moradores_divergencias")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function resolverDivergenciaMorador({
  divergencia,
  perfil,
  observacao,
}) {
  if (!divergencia?.id) {
    throw new Error("Divergência não informada.");
  }

  const contexto = montarContextoTecnicoDivergencia();

  const { data: authData } = await supabase.auth.getUser();

  const usuarioId =
    authData?.user?.id ||
    perfil?.usuario_id ||
    perfil?.id ||
    null;

  const { data, error } = await supabase
    .from("importacao_moradores_divergencias")
    .update({
      status_divergencia: "resolvida",
      resolvida_em: new Date().toISOString(),
      resolvida_por: usuarioId,
      observacao_resolucao: observacao || "Divergência marcada como resolvida.",
    })
    .eq("id", divergencia.id)
    .select("*")
    .single();

  if (error) throw error;

  await registrarLogSistema({
    acao: "IMPORTACAO_MORADOR_DIVERGENCIA_RESOLVIDA",
    condominio_id: divergencia.condominio_id,
    usuario_id: usuarioId,
    email: perfil?.email || divergencia.criado_por_email || null,
    origem: "cadastro_moradores_divergencias",
    detalhes: {
      divergencia_id: divergencia.id,
      lote_id: divergencia.lote_id,
      linha_planilha: divergencia.linha_planilha,
      motivo: divergencia.motivo,
      severidade: divergencia.severidade,
      nome_informado: divergencia.nome_informado,
      torre_informada: divergencia.torre_informada,
      unidade_informada: divergencia.unidade_informada,
      observacao_resolucao: observacao || null,
      executado_por_nome: perfil?.nome || null,
      executado_por_email: perfil?.email || null,
      ...contexto,
    },
  });

  return data;
}

export async function ignorarDivergenciaMorador({
  divergencia,
  perfil,
  observacao,
}) {
  if (!divergencia?.id) {
    throw new Error("Divergência não informada.");
  }

  const motivo = String(observacao || "").trim();

  if (!motivo) {
    throw new Error("Informe uma justificativa para ignorar a divergência.");
  }

  const contexto = montarContextoTecnicoDivergencia();

  const { data: authData } = await supabase.auth.getUser();

  const usuarioId =
    authData?.user?.id ||
    perfil?.usuario_id ||
    perfil?.id ||
    null;

  const { data, error } = await supabase
    .from("importacao_moradores_divergencias")
    .update({
      status_divergencia: "ignorada",
      resolvida_em: new Date().toISOString(),
      resolvida_por: usuarioId,
      observacao_resolucao: motivo,
    })
    .eq("id", divergencia.id)
    .select("*")
    .single();

  if (error) throw error;

  await registrarLogSistema({
    acao: "IMPORTACAO_MORADOR_DIVERGENCIA_IGNORADA",
    condominio_id: divergencia.condominio_id,
    usuario_id: usuarioId,
    email: perfil?.email || divergencia.criado_por_email || null,
    origem: "cadastro_moradores_divergencias",
    detalhes: {
      divergencia_id: divergencia.id,
      lote_id: divergencia.lote_id,
      linha_planilha: divergencia.linha_planilha,
      motivo: divergencia.motivo,
      severidade: divergencia.severidade,
      nome_informado: divergencia.nome_informado,
      torre_informada: divergencia.torre_informada,
      unidade_informada: divergencia.unidade_informada,
      justificativa: motivo,
      executado_por_nome: perfil?.nome || null,
      executado_por_email: perfil?.email || null,
      ...contexto,
    },
  });

  return data;
}

export async function cancelarDivergenciaMorador({
  divergencia,
  perfil,
  observacao,
}) {
  if (!divergencia?.id) {
    throw new Error("Divergência não informada.");
  }

  const motivo = String(observacao || "").trim();

  if (!motivo) {
    throw new Error("Informe uma justificativa para cancelar a divergência.");
  }

  const contexto = montarContextoTecnicoDivergencia();

  const { data: authData } = await supabase.auth.getUser();

  const usuarioId =
    authData?.user?.id ||
    perfil?.usuario_id ||
    perfil?.id ||
    null;

  const { data, error } = await supabase
    .from("importacao_moradores_divergencias")
    .update({
      status_divergencia: "cancelada",
      resolvida_em: new Date().toISOString(),
      resolvida_por: usuarioId,
      observacao_resolucao: motivo,
    })
    .eq("id", divergencia.id)
    .select("*")
    .single();

  if (error) throw error;

  await registrarLogSistema({
    acao: "IMPORTACAO_MORADOR_DIVERGENCIA_CANCELADA",
    condominio_id: divergencia.condominio_id,
    usuario_id: usuarioId,
    email: perfil?.email || divergencia.criado_por_email || null,
    origem: "cadastro_moradores_divergencias",
    detalhes: {
      divergencia_id: divergencia.id,
      lote_id: divergencia.lote_id,
      linha_planilha: divergencia.linha_planilha,
      motivo: divergencia.motivo,
      severidade: divergencia.severidade,
      justificativa: motivo,
      executado_por_nome: perfil?.nome || null,
      executado_por_email: perfil?.email || null,
      ...contexto,
    },
  });

  return data;
}