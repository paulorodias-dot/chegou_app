import { supabase } from "./supabase";

const STATUS_PRE_CADASTRO_VALIDOS = [
  "RASCUNHO",
  "PRE_CADASTRO",
  "IMPORTADO",
  "NAO_ENVIADO",
  "NÃO_ENVIADO",
  "PRONTO_CONVITE",
];

const STATUS_CONVITE_RETORNA_PRE_CADASTRO = [
  "CANCELADO",
  "REVOGADO",
  "EXPIRADO",
  "TOKEN_EXPIRADO",
];

function normalizarStatus(valor = "") {
  return String(valor || "").trim().toUpperCase();
}

function conviteEstaAtivo(convite = null) {
  if (!convite?.id) return false;

  const statusConvite = normalizarStatus(convite.status_convite);
  const statusEnvio = normalizarStatus(convite.status_envio);

  if (convite.token_revogado || convite.cancelado) return false;

  if (
    STATUS_CONVITE_RETORNA_PRE_CADASTRO.includes(statusConvite) ||
    STATUS_CONVITE_RETORNA_PRE_CADASTRO.includes(statusEnvio)
  ) {
    return false;
  }

  return true;
}

export function calcularCompletudePreCadastro(item = {}) {
  const pendencias = [];

  if (!item.nome) pendencias.push("Nome");
  if (!item.email) pendencias.push("E-mail");
  if (!item.telefone) pendencias.push("WhatsApp");
  if (!item.torre && !item.bloco) pendencias.push("Torre/Bloco");
  if (!item.unidade) pendencias.push("Unidade");

  const totalCampos = 5;
  const preenchidos = totalCampos - pendencias.length;
  const percentual = Math.max(0, Math.round((preenchidos / totalCampos) * 100));

  return {
    percentual,
    pendencias,
    pronto: percentual === 100,
  };
}

export async function listarPreCadastrosMoradores({
  condominioId,
  busca = "",
  status = "TODOS",
  origem = "TODAS",
  torre = "TODAS",
  limite = 500,
} = {}) {
  if (!condominioId) {
    throw new Error("Condomínio não identificado.");
  }

  const [{ data: preCadastros, error: erroPre }, { data: convites, error: erroConvites }] =
    await Promise.all([
      supabase
        .from("pre_cadastro_moradores")
        .select("*")
        .eq("condominio_id", condominioId)
        .order("atualizado_em", { ascending: false, nullsFirst: false })
        .order("criado_em", { ascending: false })
        .limit(limite),

      supabase
        .from("convites_morador")
        .select("*")
        .eq("condominio_id", condominioId),
    ]);

  if (erroPre) throw erroPre;
  if (erroConvites) throw erroConvites;

  const termo = String(busca || "").trim().toLowerCase();

  return (preCadastros || [])
    .map((item) => {
      const convite = (convites || []).find(
        (registro) => registro.pre_cadastro_id === item.id
      );

      const completude = calcularCompletudePreCadastro(item);

      const statusCadastro = normalizarStatus(
        item.status_cadastro || item.status_convite || "RASCUNHO"
      );

      const statusRetornoConvite = normalizarStatus(
        convite?.status_convite || convite?.status_envio
      );

      const statusTela =
        convite && !conviteEstaAtivo(convite)
          ? statusRetornoConvite || "REVOGADO"
          : statusCadastro;

      return {
        id: item.id,
        pre_cadastro_id: item.id,
        business_id: item.business_id,
        nome: item.nome || "Não informado",
        email: item.email || "—",
        telefone: item.telefone || "",
        torre: item.torre || item.bloco || "—",
        unidade: item.unidade || "—",
        origem: item.origem_cadastro || "manual",
        status: statusTela,
        status_cadastro: item.status_cadastro,
        status_convite: item.status_convite,
        percentual: completude.percentual,
        pendencias: completude.pendencias,
        pronto: completude.pronto,
        criado_em: item.criado_em,
        atualizado_em: item.atualizado_em,
        convite,
        raw: item,
      };
    })
    .filter((item) => {
      if (conviteEstaAtivo(item.convite)) return false;

      const statusOk =
        STATUS_PRE_CADASTRO_VALIDOS.includes(normalizarStatus(item.status)) ||
        STATUS_CONVITE_RETORNA_PRE_CADASTRO.includes(normalizarStatus(item.status));

      if (!statusOk) return false;

      if (status !== "TODOS" && normalizarStatus(item.status) !== normalizarStatus(status)) {
        return false;
      }

      if (origem !== "TODAS" && normalizarStatus(item.origem) !== normalizarStatus(origem)) {
        return false;
      }

      if (torre !== "TODAS" && String(item.torre).trim() !== String(torre).trim()) {
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

export async function buscarTorresPreCadastro({ condominioId } = {}) {
  if (!condominioId) return [];

  const { data, error } = await supabase
    .from("torres")
    .select("id, nome, identificador")
    .eq("condominio_id", condominioId)
    .order("nome", { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function obterResumoPreCadastro({ condominioId } = {}) {
  const registros = await listarPreCadastrosMoradores({
    condominioId,
    limite: 1000,
  });

  const hoje = new Date().toISOString().slice(0, 10);

  return {
    total: registros.length,
    prontos: registros.filter((item) => item.percentual === 100).length,
    pendencias: registros.filter((item) => item.percentual < 100).length,
    importadosHoje: registros.filter(
      (item) =>
        ["XLSX", "PDF"].includes(normalizarStatus(item.origem)) &&
        String(item.criado_em || "").slice(0, 10) === hoje
    ).length,
  };
}