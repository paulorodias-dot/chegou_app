import { supabase } from "./supabase";

const STATUS_ATIVOS_AUDITORIA = [
  "AGUARDANDO_ENVIO",
  "CONVITE_ENVIADO",
  "EM_PREENCHIMENTO",
  "AGUARDANDO_AUDITORIA",
  "CORRECAO_SOLICITADA",
  "APROVADO",
  "REPROVADO",
  "BLOQUEADO",
];

function normalizarStatusVisual(status) {
  if (!status) return "AGUARDANDO ENVIO";
  return String(status).replaceAll("_", " ").toUpperCase();
}

function mapearStatusLegado(convite = {}, preCadastro = {}) {
  const statusConvite = String(
    convite.status_convite ||
      preCadastro.status_convite ||
      convite.status_envio ||
      ""
  ).toUpperCase();

  if (convite.bloqueado || preCadastro.bloqueado) return "BLOQUEADO";
  if (convite.token_revogado) return "TOKEN_REVOGADO";
  if (preCadastro.status_auditoria === "APROVADO") return "APROVADO";
  if (preCadastro.status_auditoria === "REPROVADO") return "REPROVADO";
  if (preCadastro.status_auditoria === "CORRECAO_SOLICITADA") return "CORRECAO_SOLICITADA";
  if (convite.wizard_finalizado || preCadastro.status_cadastro === "AGUARDANDO_AUDITORIA") {
    return "AGUARDANDO_AUDITORIA";
  }
  if (preCadastro.percentual_preenchimento > 0 || preCadastro.status_cadastro === "EM_PREENCHIMENTO") {
    return "EM_PREENCHIMENTO";
  }
  if (statusConvite === "ENVIADO" || statusConvite === "EMAIL_ENVIADO") {
    return "CONVITE_ENVIADO";
  }
  if (statusConvite === "PENDENTE") return "CONVITE_ENVIADO";

  return "AGUARDANDO_ENVIO";
}

function calcularUltimaAtividade(item = {}) {
  const datas = [
    item.atualizado_em,
    item.updated_at,
    item.ultimo_acesso_em,
    item.convite_aberto_em,
    item.wizard_finalizado_em,
    item.enviado_em,
    item.criado_em,
  ].filter(Boolean);

  if (!datas.length) return null;

  return datas
    .map((data) => new Date(data))
    .sort((a, b) => b.getTime() - a.getTime())[0]
    .toISOString();
}

function formatarRegistro(convite, preCadastro, auditoria) {
  const statusSistema = mapearStatusLegado(convite, preCadastro);

  return {
    id: convite.id,
    business_id:
      preCadastro?.business_id ||
      convite?.business_id ||
      null,

    convite_id: convite.id,
    pre_cadastro_id: convite.pre_cadastro_id,
    condominio_id: convite.condominio_id,

    nome: convite.nome_destino || preCadastro?.nome || "-",
    email: convite.email_destino || preCadastro?.email || "-",
    telefone: preCadastro?.telefone || convite.telefone_destino || "-",
    torre: preCadastro?.torre || "-",
    unidade: preCadastro?.unidade || "-",

    status_sistema: statusSistema,
    status_visual: normalizarStatusVisual(statusSistema),

    status_envio: convite.status_envio || null,
    status_convite: convite.status_convite || null,
    status_entrega: convite.status_entrega || null,
    status_auditoria: auditoria?.status_auditoria || preCadastro?.status_auditoria || null,

    enviado_em: convite.enviado_em || null,
    token_expira_em: convite.token_expira_em || null,
    convite_aberto: convite.convite_aberto || false,
    convite_aberto_em: convite.convite_aberto_em || null,
    wizard_finalizado: convite.wizard_finalizado || false,
    wizard_finalizado_em: convite.wizard_finalizado_em || null,
    token_revogado: convite.token_revogado || false,
    bloqueado: convite.bloqueado || false,

    ultima_atividade_em: calcularUltimaAtividade({
      ...convite,
      atualizado_em: preCadastro?.atualizado_em,
    }),

    percentual_preenchimento: preCadastro?.percentual_preenchimento || 0,
    quantidade_reenvios: convite.quantidade_reenvios || 0,

    auditoria,
    pre_cadastro: preCadastro,
    convite,
  };
}

export async function listarAuditoriaConvitesMoradores({
  condominioId,
  busca = "",
  status = "TODOS",
  torre = "TODAS",
  unidade = "TODAS",
  limite = 50,
} = {}) {
  if (!condominioId) {
    throw new Error("Condomínio autenticado não encontrado.");
  }

  let query = supabase
    .from("convites_morador")
    .select("*")
    .eq("condominio_id", condominioId)
    .eq("cancelado", false)
    .eq("token_revogado", false)
    .order("criado_em", { ascending: false })
    .limit(limite);

  const { data: convites, error } = await query;

  if (error) throw error;

  const preCadastroIds = [...new Set((convites || []).map((c) => c.pre_cadastro_id).filter(Boolean))];

  let preCadastros = [];
  let auditorias = [];

  if (preCadastroIds.length) {
    const { data: preData, error: preError } = await supabase
      .from("pre_cadastro_moradores")
      .select("*")
      .in("id", preCadastroIds);

    if (preError) throw preError;
    preCadastros = preData || [];

    const { data: audData, error: audError } = await supabase
      .from("auditorias_morador")
      .select("*")
      .in("pre_cadastro_id", preCadastroIds)
      .order("criado_em", { ascending: false });

    if (audError) throw audError;
    auditorias = audData || [];
  }

  const preMap = new Map(preCadastros.map((p) => [p.id, p]));
  const audMap = new Map();

  auditorias.forEach((a) => {
    if (!audMap.has(a.pre_cadastro_id)) {
      audMap.set(a.pre_cadastro_id, a);
    }
  });

  let registros = (convites || [])
    .map((convite) =>
      formatarRegistro(
        convite,
        preMap.get(convite.pre_cadastro_id),
        audMap.get(convite.pre_cadastro_id)
      )
    )
    .filter((item) => item.status_sistema !== "CONTA_ATIVA")
    .filter((item) => STATUS_ATIVOS_AUDITORIA.includes(item.status_sistema));

  if (busca.trim()) {
    const termo = busca.trim().toLowerCase();

    registros = registros.filter((item) =>
      [
        item.nome,
        item.email,
        item.telefone,
        item.unidade,
        item.torre,
        item.business_id,
      ]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termo))
    );
  }

  if (status !== "TODOS") {
    registros = registros.filter((item) => item.status_sistema === status);
  }

  if (torre !== "TODAS") {
    registros = registros.filter((item) => item.torre === torre);
  }

  if (unidade !== "TODAS") {
    registros = registros.filter((item) => item.unidade === unidade);
  }

  return registros;
}

export async function obterResumoAuditoriaConvitesMoradores({ condominioId } = {}) {
  const registros = await listarAuditoriaConvitesMoradores({
    condominioId,
    limite: 500,
  });

  return {
    convitesEnviados: registros.filter((r) => r.status_sistema === "CONVITE_ENVIADO").length,
    aguardandoAbertura: registros.filter(
      (r) => r.status_sistema === "CONVITE_ENVIADO" && !r.convite_aberto
    ).length,
    emPreenchimento: registros.filter((r) => r.status_sistema === "EM_PREENCHIMENTO").length,
    aguardandoAuditoria: registros.filter((r) => r.status_sistema === "AGUARDANDO_AUDITORIA").length,
    aprovados: registros.filter((r) => r.status_sistema === "APROVADO").length,
    reprovadosBloqueados: registros.filter(
      (r) => r.status_sistema === "REPROVADO" || r.status_sistema === "BLOQUEADO"
    ).length,
  };
}

export async function buscarTorresAuditoriaMoradores({ condominioId } = {}) {
  if (!condominioId) return [];

  const { data, error } = await supabase
    .from("torres")
    .select("id, nome")
    .eq("condominio_id", condominioId)
    .order("nome", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function copiarLinkConviteMorador(convite) {
  const link = convite?.payload_envio?.link_wizard;

  if (!link) {
    throw new Error("Link do convite não encontrado.");
  }

  await navigator.clipboard.writeText(link);
  return link;
}

export async function obterLimiteEnvioDiario({ condominioId } = {}) {
  if (!condominioId) {
    return {
      convites: { usados: 0, limite: 40 },
      confirmacoes: { usados: 0, limite: 20 },
    };
  }

  const agora = new Date();
  const inicio = new Date(agora);
  inicio.setHours(0, 0, 0, 0);

  const fim = new Date(agora);
  fim.setHours(23, 59, 59, 999);

  const { count: totalConvites, error } = await supabase
    .from("convites_morador")
    .select("id", { count: "exact", head: true })
    .eq("condominio_id", condominioId)
    .in("status_envio", ["ENVIADO", "EMAIL_ENVIADO", "enviado"])
    .gte("enviado_em", inicio.toISOString())
    .lte("enviado_em", fim.toISOString());

  if (error) throw error;

  return {
    convites: {
      usados: totalConvites || 0,
      limite: 40,
    },
    confirmacoes: {
      usados: 0,
      limite: 20,
    },
  };
}