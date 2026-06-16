import { supabase } from "./supabase";

const STATUS_HISTORICO = [
  "TODOS",
  "RASCUNHO",
  "PRE_CADASTRO",
  "CANCELADO",
  "AGUARDANDO_ENVIO",
  "PROGRAMADO",
  "ENVIADO",
  "ENTREGUE",
  "ABERTO",
  "EM_PREENCHIMENTO",
  "WIZARD_FINALIZADO",
  "AGUARDANDO_AUDITORIA",
  "AUDITORIA_INICIADA",
  "CORRECAO_SOLICITADA",
  "REAUDITORIA_PENDENTE",
  "APROVADO",
  "REPROVADO",
  "TOKEN_EXPIRADO",
  "REVOGADO",
  "BLOQUEADO",
];

function normalizarStatus(valor = "") {
  return String(valor || "").trim().toUpperCase();
}

export function formatarStatusHistorico(status = "") {
  const valor = normalizarStatus(status);

  const mapa = {
    PRE_CADASTRO: "PRÉ-CADASTRO",
    CORRECAO_SOLICITADA: "CORREÇÃO SOLICITADA",
    REAUDITORIA_PENDENTE: "REAUDITORIA PENDENTE",
  };

  return mapa[valor] || valor.replaceAll("_", " ");
}

export function obterClasseStatusHistorico(status = "") {
  const valor = normalizarStatus(status);

  if (["APROVADO", "ENTREGUE", "ABERTO"].includes(valor)) return "positivo";
  if (["CORRECAO_SOLICITADA", "REAUDITORIA_PENDENTE", "EM_PREENCHIMENTO"].includes(valor)) return "atencao";
  if (["REPROVADO", "CANCELADO", "REVOGADO", "BLOQUEADO", "TOKEN_EXPIRADO"].includes(valor)) return "negativo";
  if (["AGUARDANDO_AUDITORIA", "AUDITORIA_INICIADA"].includes(valor)) return "auditoria";
  if (["ENVIADO", "PROGRAMADO", "AGUARDANDO_ENVIO"].includes(valor)) return "convite";

  return "neutro";
}

export function listarStatusHistorico() {
  return STATUS_HISTORICO.map((status) => ({
    value: status,
    label: status === "TODOS" ? "Todos os status" : formatarStatusHistorico(status),
  }));
}

function obterStatusPrincipal(item = {}) {
  return (
    normalizarStatus(item.status_auditoria) ||
    normalizarStatus(item.status_convite) ||
    normalizarStatus(item.status_cadastro) ||
    normalizarStatus(item.status_preenchimento) ||
    "RASCUNHO"
  );
}

function obterDataPrincipal(item = {}) {
  return (
    item.atualizado_em ||
    item.wizard_finalizado_em ||
    item.criado_em ||
    item.data_evento ||
    null
  );
}

function obterResponsavel(item = {}) {
  return (
    item.atualizado_por_nome ||
    item.auditor_nome ||
    item.responsavel_nome ||
    item.criado_por_nome ||
    "Sistema"
  );
}

function normalizarHistorico(item = {}) {
  const status = obterStatusPrincipal(item);

  return {
    id: item.id,
    pre_cadastro_id: item.pre_cadastro_id || item.id,
    business_id: item.business_id,

    nome: item.nome || "Não informado",
    email: item.email || "Não informado",
    telefone: item.telefone || "Não informado",
    torre: item.torre || item.bloco || "Não informado",
    unidade: item.unidade || "Não informado",

    status,
    status_cadastro: item.status_cadastro,
    status_convite: item.status_convite,
    status_auditoria: item.status_auditoria,
    status_preenchimento: item.status_preenchimento,

    responsavel: obterResponsavel(item),
    origem: item.origem_cadastro || item.origem || "Sistema",

    data_evento: obterDataPrincipal(item),
    criado_em: item.criado_em,
    atualizado_em: item.atualizado_em,
    wizard_finalizado_em: item.wizard_finalizado_em,

    observacao:
      item.observacoes_correcao ||
      item.motivo_reprovacao ||
      item.observacoes ||
      "",

    raw: item,
  };
}

export async function listarHistoricoMoradores({
  condominioId,
  busca = "",
  status = "TODOS",
  torre = "TODAS",
  unidade = "TODAS",
  dataInicio = "",
  dataFim = "",
  limite = 500,
} = {}) {
  if (!condominioId) {
    throw new Error("Condomínio não identificado.");
  }

  let query = supabase
    .from("pre_cadastro_moradores")
    .select("*")
    .eq("condominio_id", condominioId)
    .order("atualizado_em", { ascending: false, nullsFirst: false })
    .order("criado_em", { ascending: false })
    .limit(limite);

  if (dataInicio) {
    query = query.gte("atualizado_em", `${dataInicio}T00:00:00`);
  }

  if (dataFim) {
    query = query.lte("atualizado_em", `${dataFim}T23:59:59`);
  }

  const { data, error } = await query;

  if (error) throw error;

  const termo = String(busca || "").trim().toLowerCase();

  return (data || [])
    .map(normalizarHistorico)
    .filter((item) => {
      if (status !== "TODOS" && normalizarStatus(item.status) !== normalizarStatus(status)) {
        return false;
      }

      if (torre !== "TODAS" && String(item.torre).trim() !== String(torre).trim()) {
        return false;
      }

      if (unidade !== "TODAS" && String(item.unidade).trim() !== String(unidade).trim()) {
        return false;
      }

      if (!termo) return true;

      return [
        item.nome,
        item.email,
        item.telefone,
        item.torre,
        item.unidade,
        item.business_id,
        item.status,
        item.responsavel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(termo);
    });
}

export async function obterResumoHistoricoMoradores({
  condominioId,
  dataInicio = "",
  dataFim = "",
} = {}) {
  const registros = await listarHistoricoMoradores({
    condominioId,
    dataInicio,
    dataFim,
    limite: 1000,
  });

  return {
    total: registros.length,
    aprovados: registros.filter((item) => item.status === "APROVADO").length,
    correcoes: registros.filter((item) => item.status === "CORRECAO_SOLICITADA").length,
    canceladosReprovados: registros.filter((item) =>
      ["CANCELADO", "REPROVADO", "REVOGADO", "BLOQUEADO"].includes(item.status)
    ).length,
  };
}

export async function buscarTorresHistoricoMoradores({ condominioId } = {}) {
  if (!condominioId) return [];

  const { data, error } = await supabase
    .from("torres")
    .select("id, nome, identificador")
    .eq("condominio_id", condominioId)
    .order("nome", { ascending: true });

  if (error) throw error;

  return data || [];
}

export function montarTimelineHistorico(item = {}) {
  const raw = item.raw || item;

  const eventos = [
    {
      chave: "pre_cadastro",
      titulo: "Pré-cadastro criado",
      status: raw.criado_em ? "Concluído" : "Não informado",
      data: raw.criado_em,
      ativo: Boolean(raw.criado_em),
    },
    {
      chave: "convite",
      titulo: "Convite",
      status: formatarStatusHistorico(raw.status_convite || "Não informado"),
      data: raw.ultimo_envio_em || raw.enviado_em,
      ativo: Boolean(raw.status_convite),
    },
    {
      chave: "wizard",
      titulo: "Wizard",
      status: formatarStatusHistorico(raw.status_preenchimento || raw.status_cadastro || "Não informado"),
      data: raw.wizard_finalizado_em,
      ativo: Boolean(raw.status_preenchimento || raw.wizard_finalizado_em),
    },
    {
      chave: "auditoria",
      titulo: "Auditoria",
      status: formatarStatusHistorico(raw.status_auditoria || "Não informado"),
      data: raw.atualizado_em,
      ativo: Boolean(raw.status_auditoria),
    },
  ];

  return eventos;
}