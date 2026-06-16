import { supabase } from "./supabase";

const STATUS_AUDITORIA_VALIDOS = [
  "AGUARDANDO_AUDITORIA",
  "AUDITORIA_INICIADA",
  "REAUDITORIA_PENDENTE",
];

function normalizarStatus(valor = "") {
  return String(valor || "").trim().toUpperCase();
}

export function formatarStatusAuditoria(status = "") {
  return normalizarStatus(status).replaceAll("_", " ");
}

export function mascararCpf(cpf = "") {
  const numero = String(cpf || "").replace(/\D/g, "");

  if (numero.length !== 11) return "Não informado";

  return `***.${numero.slice(3, 6)}.***-${numero.slice(9, 11)}`;
}

export function calcularIdade(dataNascimento) {
  if (!dataNascimento) return null;

  const nascimento = new Date(dataNascimento);
  const hoje = new Date();

  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();

  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade -= 1;
  }

  return idade;
}

function valorOuNaoInformado(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === "") {
    return "Não informado";
  }

  return valor;
}

function montarResumoAuditoria(registro = {}) {
  const dependentes = Array.isArray(registro.dependentes)
    ? registro.dependentes
    : [];

  const funcionarios = Array.isArray(registro.funcionarios_lar)
    ? registro.funcionarios_lar
    : [];

  const pets = Array.isArray(registro.pets) ? registro.pets : [];
  const veiculos = Array.isArray(registro.veiculos) ? registro.veiculos : [];
  const garagem = Array.isArray(registro.garagem) ? registro.garagem : [];

  const conflitosGaragem = garagem.filter((item) => item?.conflito === true);

  return {
    dependentes: dependentes.length,
    funcionarios: funcionarios.length,
    pets: pets.length,
    veiculos: veiculos.length,
    garagem: garagem.length,
    conflitosGaragem: conflitosGaragem.length,
    possuiConflitoGaragem: conflitosGaragem.length > 0,
  };
}

function ordenarDependentesPorIdade(dependentes = []) {
  return [...dependentes].sort((a, b) => {
    const idadeA = calcularIdade(a.data_nascimento) ?? -1;
    const idadeB = calcularIdade(b.data_nascimento) ?? -1;

    return idadeB - idadeA;
  });
}

function normalizarRegistroAuditoria(item = {}) {
  const raw = item.raw || item;

  const dependentes = ordenarDependentesPorIdade(raw.dependentes || []);
  const resumo = montarResumoAuditoria({
    ...raw,
    dependentes,
  });

  return {
    id: raw.id,
    pre_cadastro_id: raw.pre_cadastro_id || raw.id,
    business_id: raw.business_id,

    nome: valorOuNaoInformado(raw.nome),
    email: valorOuNaoInformado(raw.email),
    telefone: valorOuNaoInformado(raw.telefone),
    cpf: mascararCpf(raw.cpf),
    perfil_morador: valorOuNaoInformado(raw.perfil_morador || raw.tipo_morador),

    torre: valorOuNaoInformado(raw.torre || raw.bloco),
    unidade: valorOuNaoInformado(raw.unidade),

    status_auditoria:
      normalizarStatus(raw.status_auditoria) || "AGUARDANDO_AUDITORIA",

    status_preenchimento:
      normalizarStatus(raw.status_preenchimento || raw.status_cadastro) ||
      "WIZARD FINALIZADO",

    percentual_preenchimento: Number(raw.percentual_preenchimento || 100),

    wizard_finalizado_em:
      raw.wizard_finalizado_em ||
      raw.finalizado_em ||
      raw.atualizado_em ||
      raw.criado_em,

    atualizado_em: raw.atualizado_em,
    criado_em: raw.criado_em,

    identificacao_unidade: raw.identificacao_unidade || {},
    dados_responsavel: raw.dados_responsavel || raw,
    dependentes,
    funcionarios_lar: raw.funcionarios_lar || [],
    pets: raw.pets || [],
    veiculos: raw.veiculos || [],
    garagem: raw.garagem || [],
    preferencias: raw.preferencias || {},
    divergencias: raw.divergencias || [],

    resumo,
    raw,
  };
}

export async function listarMoradoresParaAuditoria({
  condominioId,
  busca = "",
  status = "TODOS",
  torre = "TODAS",
  unidade = "TODAS",
  limite = 500,
} = {}) {
  if (!condominioId) {
    throw new Error("Condomínio não identificado.");
  }

  const { data, error } = await supabase
    .from("pre_cadastro_moradores")
    .select("*")
    .eq("condominio_id", condominioId)
    .in("status_auditoria", STATUS_AUDITORIA_VALIDOS)
    .order("wizard_finalizado_em", { ascending: true, nullsFirst: false })
    .order("atualizado_em", { ascending: true, nullsFirst: false })
    .limit(limite);

  if (error) throw error;

  const termo = String(busca || "").trim().toLowerCase();

  return (data || [])
    .map(normalizarRegistroAuditoria)
    .filter((item) => {
      if (
        status !== "TODOS" &&
        normalizarStatus(item.status_auditoria) !== normalizarStatus(status)
      ) {
        return false;
      }

      if (torre !== "TODAS" && String(item.torre).trim() !== String(torre).trim()) {
        return false;
      }

      if (
        unidade !== "TODAS" &&
        String(item.unidade).trim() !== String(unidade).trim()
      ) {
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
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(termo);
    });
}

export async function obterResumoAuditoriaMoradores({ condominioId } = {}) {
  const registros = await listarMoradoresParaAuditoria({
    condominioId,
    limite: 1000,
  });

  const hoje = new Date().toISOString().slice(0, 10);

  return {
    aguardando: registros.filter(
      (item) => item.status_auditoria === "AGUARDANDO_AUDITORIA"
    ).length,
    iniciada: registros.filter(
      (item) => item.status_auditoria === "AUDITORIA_INICIADA"
    ).length,
    reauditoraPendente: registros.filter(
      (item) => item.status_auditoria === "REAUDITORIA_PENDENTE"
    ).length,
    conflitosGaragem: registros.filter(
      (item) => item.resumo?.possuiConflitoGaragem
    ).length,
    aprovadosHoje: registros.filter(
      (item) =>
        item.status_auditoria === "APROVADO" &&
        String(item.atualizado_em || "").slice(0, 10) === hoje
    ).length,
    total: registros.length,
  };
}

export async function marcarAuditoriaIniciada({
  perfil,
  preCadastroId,
} = {}) {
  if (!preCadastroId) {
    throw new Error("Pré-cadastro não identificado.");
  }

  if (!perfil?.condominio_id) {
    throw new Error("Condomínio não identificado no perfil.");
  }

  const { data: atual, error: erroBusca } = await supabase
    .from("pre_cadastro_moradores")
    .select("id, status_auditoria")
    .eq("id", preCadastroId)
    .eq("condominio_id", perfil.condominio_id)
    .maybeSingle();

  if (erroBusca) throw erroBusca;

  if (!atual?.id) {
    throw new Error("Cadastro não encontrado para auditoria.");
  }

  if (normalizarStatus(atual.status_auditoria) !== "AGUARDANDO_AUDITORIA") {
    return atual;
  }

  const { data, error } = await supabase
    .from("pre_cadastro_moradores")
    .update({
      status_auditoria: "AUDITORIA_INICIADA",
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", preCadastroId)
    .eq("condominio_id", perfil.condominio_id)
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

export async function registrarDecisaoAuditoriaMorador({
  perfil,
  preCadastroId,
  decisao,
  observacao,
} = {}) {
  if (!preCadastroId) {
    throw new Error("Pré-cadastro não identificado.");
  }

  if (!perfil?.condominio_id) {
    throw new Error("Condomínio não identificado no perfil.");
  }

  const statusDecisao = normalizarStatus(decisao);

  const statusPermitidos = [
    "APROVADO",
    "CORRECAO_SOLICITADA",
    "REPROVADO",
  ];

  if (!statusPermitidos.includes(statusDecisao)) {
    throw new Error("Decisão de auditoria inválida.");
  }

  if (
    ["CORRECAO_SOLICITADA", "REPROVADO"].includes(statusDecisao) &&
    !String(observacao || "").trim()
  ) {
    throw new Error("Informe a observação para esta decisão.");
  }

  const payload = {
    status_auditoria: statusDecisao,
    atualizado_em: new Date().toISOString(),
  };

  if (statusDecisao === "CORRECAO_SOLICITADA") {
    payload.observacoes_correcao = String(observacao || "").trim();
  }

  if (statusDecisao === "REPROVADO") {
    payload.motivo_reprovacao = String(observacao || "").trim();
  }

  const { data, error } = await supabase
    .from("pre_cadastro_moradores")
    .update(payload)
    .eq("id", preCadastroId)
    .eq("condominio_id", perfil.condominio_id)
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

export async function buscarTorresAuditoriaMoradores({ condominioId } = {}) {
  if (!condominioId) return [];

  const { data, error } = await supabase
    .from("torres")
    .select("id, nome, identificador")
    .eq("condominio_id", condominioId)
    .order("nome", { ascending: true });

  if (error) throw error;

  return data || [];
}