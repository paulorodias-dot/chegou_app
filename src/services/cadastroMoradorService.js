import { supabase } from "./supabase";

function somenteNumeros(valor = "") {
  return String(valor || "").replace(/\D/g, "");
}

function normalizarEmail(valor = "") {
  return String(valor || "").trim().toLowerCase();
}

function detectarNavegador() {
  const ua = navigator.userAgent || "";

  if (ua.includes("Chrome")) return "Google Chrome";
  if (ua.includes("Firefox")) return "Mozilla Firefox";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edge")) return "Microsoft Edge";

  return "Desconhecido";
}

function detectarSistemaOperacional() {
  const ua = navigator.userAgent || "";

  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Linux")) return "Linux";

  return "Desconhecido";
}

async function obterIpPublico() {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return data?.ip || null;
  } catch {
    return null;
  }
}

export function formatarDataHoraBR(data) {
  if (!data) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(data));
}

async function montarContextoTecnico() {
  return {
    ip: await obterIpPublico(),
    navegador: detectarNavegador(),
    sistema_operacional: detectarSistemaOperacional(),
    user_agent: navigator.userAgent || null,
  };
}

export async function registrarLogSistema({
  acao,
  condominio_id,
  usuario_id,
  email,
  origem,
  detalhes = {},
}) {
  const contexto = await montarContextoTecnico();

  const { error } = await supabase.from("logs_sistema").insert({
    acao,
    condominio_id,
    usuario_id,
    email,
    origem,
    detalhes: {
      ...detalhes,
      ...contexto,
    },
  });

  if (error) throw error;
}

export async function registrarAuditoriaMorador({
  business_id,
  condominio_id,
  pre_cadastro_id,
  usuario_id,
  unidade_id,
  status_auditoria,
  tipo_auditoria,
  origem_auditoria,
  dados_antes = null,
  dados_depois = null,
  divergencias = null,
  observacao_auditor = null,
}) {
  const contexto = await montarContextoTecnico();

  const { error } = await supabase.from("auditorias_morador").insert({
    business_id,
    condominio_id,
    pre_cadastro_id,
    usuario_id,
    unidade_id,
    status_auditoria,
    tipo_auditoria,
    origem_auditoria,
    dados_antes,
    dados_depois,
    divergencias,
    observacao_auditor,
    ip_auditor: contexto.ip,
    dispositivo_auditor: contexto.user_agent,
    navegador_auditor: contexto.navegador,
  });

  if (error) throw error;
}

export async function criarPreCadastroMoradorIndividual({
  perfil,
  condominio,
  dados,
}) {
  if (!perfil?.condominio_id) {
    throw new Error("Condomínio não identificado no perfil.");
  }

  const { data: authData } = await supabase.auth.getUser();

    const usuarioId =
    authData?.user?.id ||
    perfil?.usuario_id ||
    perfil?.id ||
    null;

  const payload = {
    business_id: dados.business_id || condominio?.business_id || null,
    condominio_id: perfil.condominio_id,
    unidade_id: dados.unidade_id || null,

    nome: String(dados.nome || "").trim(),
    email: normalizarEmail(dados.email),
    telefone: dados.telefone || somenteNumeros(dados.whatsapp),

    torre: dados.torre || null,
    bloco: dados.bloco || null,
    unidade: dados.unidade || null,

    tipo_morador: dados.tipo_morador || "morador",
    origem_cadastro: dados.origem_cadastro || "manual",

    status_cadastro: dados.status_cadastro || "RASCUNHO",
    status_convite: dados.status_convite || "NAO_ENVIADO",
    status_auditoria: dados.status_auditoria || "NAO_ENVIADO",

        percentual_preenchimento: dados.percentual_preenchimento ?? 10,
    possui_divergencia: dados.possui_divergencia ?? false,

    observacoes: dados.observacoes || null,
    dados_importados: dados.dados_importados || null,

    status_conta: dados.status_conta || "PENDENTE_APROVACAO",
    auth_ativo: dados.auth_ativo ?? false,
    status_acompanhamento: dados.status_acompanhamento || null,    

    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    };

  const { data: preCadastro, error } = await supabase
    .from("pre_cadastro_moradores")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;

  await registrarLogSistema({
    acao: "MORADOR_PRE_CADASTRO_CRIADO",
    condominio_id: perfil.condominio_id,
    usuario_id: usuarioId,
    email: payload.email,
    origem: "administrativo_individual",
    detalhes: {
      pre_cadastro_id: preCadastro.id,
      business_id: preCadastro.business_id,
      condominio_id: perfil.condominio_id,
      condominio_nome:
        condominio?.nome_fantasia || condominio?.razao_social || null,
      unidade_id: payload.unidade_id,
      torre: payload.torre,
      unidade: payload.unidade,
      nome: payload.nome,
      telefone: payload.telefone,
      status_cadastro: payload.status_cadastro,
      status_convite: payload.status_convite,
      executado_por_nome: perfil?.nome || null,
      executado_por_email: perfil?.email || null,
    },
  });

  await registrarAuditoriaMorador({
    business_id: preCadastro.business_id,
    condominio_id: perfil.condominio_id,
    pre_cadastro_id: preCadastro.id,
    usuario_id: usuarioId,
    unidade_id: payload.unidade_id,
    status_auditoria: "PRE_CADASTRO_CRIADO",
    tipo_auditoria: "CADASTRO_INDIVIDUAL",
    origem_auditoria: "ADMINISTRATIVO",
    dados_antes: null,
    dados_depois: preCadastro,
    observacao_auditor: "Pré-cadastro de morador criado individualmente.",
  });

  return preCadastro;
}

function identificarCamposAlterados(dadosAntes = {}, dadosDepois = {}) {
  const campos = {};

  Object.keys(dadosDepois).forEach((campo) => {
    const antes = dadosAntes?.[campo] ?? null;
    const depois = dadosDepois?.[campo] ?? null;

    if (String(antes ?? "") !== String(depois ?? "")) {
      campos[campo] = {
        antes,
        depois,
      };
    }
  });

  return campos;
}

export async function atualizarPreCadastroMorador({
  perfil,
  condominio,
  preCadastroId,
  dadosAntes,
  dadosDepois,
  metadadosEdicao = {},
}) {
  if (!preCadastroId) {
    throw new Error("Pré-cadastro não identificado.");
  }

  if (!perfil?.condominio_id) {
    throw new Error("Condomínio não identificado no perfil.");
  }

  const { data: preCadastroAtual, error: erroBuscaPreCadastro } = await supabase
    .from("pre_cadastro_moradores")
    .select("id, status_cadastro, status_convite, status_auditoria")
    .eq("id", preCadastroId)
    .eq("condominio_id", perfil.condominio_id)
    .maybeSingle();

  if (erroBuscaPreCadastro) throw erroBuscaPreCadastro;

  if (!preCadastroAtual) {
    throw new Error("Pré-cadastro não encontrado.");
  }

  const { data: conviteExistente, error: erroBuscaConvite } = await supabase
    .from("convites_morador")
    .select("id, status_convite, status_envio, token_revogado")
    .eq("pre_cadastro_id", preCadastroId)
    .eq("condominio_id", perfil.condominio_id)
    .maybeSingle();

  if (erroBuscaConvite) throw erroBuscaConvite;

  const statusCadastro = String(preCadastroAtual.status_cadastro || "")
    .trim()
    .toUpperCase();

  const statusConvite = String(
    preCadastroAtual.status_convite ||
      conviteExistente?.status_convite ||
      conviteExistente?.status_envio ||
      ""
  )
    .trim()
    .toUpperCase();

  const statusCadastroEditavel = ["RASCUNHO", "PRE_CADASTRO", "PRÉ-CADASTRO"].includes(
    statusCadastro
  );

  const statusConviteEditavel = ["", "—", "NAO_ENVIADO", "NÃO_ENVIADO"].includes(
    statusConvite
  );

  if (!statusCadastroEditavel || !statusConviteEditavel || conviteExistente?.id) {
    throw new Error(
      "Edição bloqueada. Após a criação do convite, os dados só podem ser alterados pelo morador no Wizard."
    );
  }

  const { data: authData } = await supabase.auth.getUser();

  const usuarioId =
    authData?.user?.id ||
    perfil?.usuario_id ||
    perfil?.id ||
    null;

  const camposEditados = identificarCamposAlterados(dadosAntes, dadosDepois);

  if (Object.keys(camposEditados).length === 0) {
    throw new Error("Nenhuma alteração identificada.");
  }

  const payloadAtualizacao = {
    ...dadosDepois,
    atualizado_em: new Date().toISOString(),
  };

  const { data: preCadastroAtualizado, error } = await supabase
    .from("pre_cadastro_moradores")
    .update(payloadAtualizacao)
    .eq("id", preCadastroId)
    .eq("condominio_id", perfil.condominio_id)
    .select("*")
    .single();

  if (error) throw error;

  await registrarLogSistema({
    acao: "MORADOR_PRE_CADASTRO_EDITADO",
    condominio_id: perfil.condominio_id,
    usuario_id: usuarioId,
    email: preCadastroAtualizado.email,
    origem: "administrativo_edicao",
    detalhes: {
      pre_cadastro_id: preCadastroId,
      business_id: preCadastroAtualizado.business_id,
      condominio_id: perfil.condominio_id,
      condominio_nome:
        condominio?.nome_fantasia || condominio?.razao_social || null,

      campos_editados: camposEditados,

      alterou_torre_unidade:
        metadadosEdicao?.alterou_torre_unidade || false,

      torre_anterior: metadadosEdicao?.torre_anterior || null,
      torre_nova: metadadosEdicao?.torre_nova || null,
      unidade_anterior: metadadosEdicao?.unidade_anterior || null,
      unidade_nova: metadadosEdicao?.unidade_nova || null,
      confirmado_pelo_usuario:
        metadadosEdicao?.confirmado_pelo_usuario || false,

      executado_por_nome: perfil?.nome || null,
      executado_por_email: perfil?.email || null,
    },
  });

  await registrarAuditoriaMorador({
    business_id: preCadastroAtualizado.business_id,
    condominio_id: perfil.condominio_id,
    pre_cadastro_id: preCadastroId,
    usuario_id: usuarioId,
    unidade_id: preCadastroAtualizado.unidade_id || null,

    status_auditoria: "PRE_CADASTRO_EDITADO",
    tipo_auditoria: "EDICAO_CADASTRAL",
    origem_auditoria: "ADMINISTRATIVO",

    dados_antes: dadosAntes,
    dados_depois: preCadastroAtualizado,
    divergencias: null,
    observacao_auditor: "Pré-cadastro editado pelo administrativo.",
  });

  return preCadastroAtualizado;
}

export async function cancelarPreCadastroMorador({
  perfil,
  condominio,
  preCadastro,
  motivo,
}) {
  if (!preCadastro?.id) {
    throw new Error("Pré-cadastro não identificado.");
  }

  if (!motivo || !String(motivo).trim()) {
    throw new Error("Informe o motivo do cancelamento.");
  }

  if (!perfil?.condominio_id) {
    throw new Error("Condomínio não identificado no perfil.");
  }

  const dadosAntes = preCadastro.raw || preCadastro;

  const { data: conviteExistente, error: erroBuscaConvite } = await supabase
    .from("convites_morador")
    .select("id, status_convite, status_envio")
    .eq("pre_cadastro_id", dadosAntes.id)
    .eq("condominio_id", perfil.condominio_id)
    .maybeSingle();

  if (erroBuscaConvite) throw erroBuscaConvite;

  if (conviteExistente?.id) {
    throw new Error(
      "Cancelamento bloqueado. Após a criação do convite, este cadastro passa para o fluxo de Auditoria e Convite."
    );
  }

  const { data: authData } = await supabase.auth.getUser();

  const usuarioId =
    authData?.user?.id ||
    perfil?.usuario_id ||
    perfil?.id ||
    null;

  const payloadAtualizacao = {
    status_cadastro: "CANCELADO",
    status_conta: "CANCELADO",
    bloqueado_para_edicao: true,
    motivo_reprovacao: String(motivo).trim(),
    observacoes_correcao: String(motivo).trim(),
    atualizado_em: new Date().toISOString(),
  };

  const { data: cancelado, error } = await supabase
    .from("pre_cadastro_moradores")
    .update(payloadAtualizacao)
    .eq("id", dadosAntes.id)
    .eq("condominio_id", perfil.condominio_id)
    .select("*")
    .single();

  if (error) throw error;

  await registrarLogSistema({
    acao: "MORADOR_PRE_CADASTRO_CANCELADO",
    condominio_id: perfil.condominio_id,
    usuario_id: usuarioId,
    email: cancelado.email,
    origem: "administrativo_cancelamento",
    detalhes: {
      pre_cadastro_id: cancelado.id,
      business_id: cancelado.business_id,
      condominio_id: perfil.condominio_id,
      condominio_nome:
        condominio?.nome_fantasia || condominio?.razao_social || null,
      nome: cancelado.nome,
      torre: cancelado.torre,
      unidade: cancelado.unidade,
      status_anterior: dadosAntes.status_cadastro || null,
      status_novo: "CANCELADO",
      motivo: String(motivo).trim(),
      libera_unidade_para_novo_pre_cadastro: true,
      executado_por_nome: perfil?.nome || null,
      executado_por_email: perfil?.email || null,
    },
  });

  await registrarAuditoriaMorador({
    business_id: cancelado.business_id,
    condominio_id: perfil.condominio_id,
    pre_cadastro_id: cancelado.id,
    usuario_id: usuarioId,
    unidade_id: cancelado.unidade_id || null,
    status_auditoria: "PRE_CADASTRO_CANCELADO",
    tipo_auditoria: "CANCELAMENTO_PRE_CADASTRO",
    origem_auditoria: "ADMINISTRATIVO",
    dados_antes: dadosAntes,
    dados_depois: cancelado,
    divergencias: null,
    observacao_auditor: String(motivo).trim(),
  });

  return cancelado;
}

function gerarLoteImportacaoMorador() {
  const agora = new Date();
  const data = agora.toISOString().slice(0, 10).replace(/-/g, "");
  const hora = String(agora.getHours()).padStart(2, "0");
  const minuto = String(agora.getMinutes()).padStart(2, "0");
  const segundo = String(agora.getSeconds()).padStart(2, "0");
  const aleatorio = Math.random().toString(36).slice(2, 7).toUpperCase();

  return `IMP-MOR-${data}-${hora}${minuto}${segundo}-${aleatorio}`;
}

function normalizarTextoImportacao(valor = "") {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatarTorreOficialImportacao(torre) {
  if (!torre) return "—";

  return [torre.nome, torre.identificador]
    .filter(Boolean)
    .join(" - ");
}

function normalizarLinhaImportacao(linha = {}) {
  const torreInformada =
    linha["Torre/Bloco"] ||
    linha["Torre"] ||
    linha["Bloco"] ||
    linha["Identificador Torre"] ||
    "";

  const nomeTorreInformado =
    linha["Nome Torre/Bloco"] ||
    linha["Nome Torre"] ||
    linha["Nome Bloco"] ||
    "";

  const unidade =
    linha["Unidade"] ||
    linha["Apartamento"] ||
    linha["AP"] ||
    linha["Apto"] ||
    "";

  const nome =
    linha["Nome Completo do Responsável"] ||
    linha["Nome"] ||
    linha["Responsável"] ||
    linha["Morador"] ||
    "";

  const ddi = linha["DDI"] || "+55";

  const telefone =
    linha["DDD + Número"] ||
    linha["WhatsApp"] ||
    linha["Telefone"] ||
    linha["Celular"] ||
    "";

  const email =
    linha["E-mail"] ||
    linha["Email"] ||
    linha["email"] ||
    "";

  const observacoes =
    linha["Observações"] ||
    linha["Observacao"] ||
    linha["Observação"] ||
    "";

  return {
    torre_informada: String(torreInformada || "").trim(),
    nome_torre_informado: String(nomeTorreInformado || "").trim(),
    unidade: String(unidade || "").trim(),
    nome: String(nome || "").trim(),
    ddi: String(ddi || "+55").trim(),
    telefone: String(telefone || "").trim(),
    email: normalizarEmail(email),
    observacoes: String(observacoes || "").trim(),
    linha_original: linha,
  };
}

function montarTelefoneImportacao(ddi = "+55", telefone = "") {
  const ddiLimpo = somenteNumeros(ddi) || "55";
  const telLimpo = somenteNumeros(telefone);

  if (!telLimpo) return "";

  return `+${ddiLimpo}${telLimpo}`;
}

function validarEmailImportacao(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function validarTelefoneImportacao(ddi = "+55", telefone = "") {
  const ddiLimpo = somenteNumeros(ddi);
  const telLimpo = somenteNumeros(telefone);

  if (!ddiLimpo || !telLimpo) return false;

  if (ddiLimpo === "55") {
    return telLimpo.length >= 10 && telLimpo.length <= 11;
  }

  return telLimpo.length >= 6;
}

function localizarTorreImportacao(torres = [], linha = {}) {
  const alvoIdentificador = normalizarTextoImportacao(linha.torre_informada);
  const alvoNome = normalizarTextoImportacao(linha.nome_torre_informado);

  return (
    torres.find((torre) => {
      const nome = normalizarTextoImportacao(torre.nome);
      const identificador = normalizarTextoImportacao(torre.identificador);

      return (
        nome === alvoIdentificador ||
        identificador === alvoIdentificador ||
        nome === alvoNome ||
        identificador === alvoNome
      );
    }) || null
  );
}

function nomesIguaisImportacao(a = "", b = "") {
  return normalizarTextoImportacao(a) === normalizarTextoImportacao(b);
}

function statusCanceladoImportacao(status = "") {
  return ["CANCELADO", "cancelado"].includes(status);
}

function statusAprovadoOuAtivoImportacao(item = {}) {
  const statusCadastro = item.status_cadastro;
  const statusConta = item.status_conta;
  const statusAcompanhamento = item.status_acompanhamento;

  return (
    ["APROVADO", "aprovado", "ativo"].includes(statusCadastro) ||
    ["conta_ativa"].includes(statusConta) ||
    ["conta_ativa", "aprovado"].includes(statusAcompanhamento)
  );
}

function localizarPreCadastroPorTorreUnidade(preCadastros = [], torre = {}, unidade = "") {
  const torreNome = normalizarTextoImportacao(torre?.nome);
  const torreIdentificador = normalizarTextoImportacao(torre?.identificador);
  const unidadeNormalizada = normalizarTextoImportacao(unidade);

  return (
    preCadastros.find((item) => {
      if (statusCanceladoImportacao(item.status_cadastro)) return false;

      const mesmaUnidade =
        normalizarTextoImportacao(item.unidade) === unidadeNormalizada;

      const mesmoTorreId =
        item.dados_importados?.torre_id &&
        torre?.id &&
        item.dados_importados.torre_id === torre.id;

      const mesmaTorre =
        mesmoTorreId ||
        normalizarTextoImportacao(item.torre) === torreNome ||
        normalizarTextoImportacao(item.bloco) === torreNome ||
        normalizarTextoImportacao(item.torre) === torreIdentificador ||
        normalizarTextoImportacao(item.bloco) === torreIdentificador;

      return mesmaUnidade && mesmaTorre;
    }) || null
  );
}

async function registrarDivergenciaImportacaoMorador({
  perfil,
  condominio,
  loteId,
  arquivoNome,
  linhaNumero,
  linha,
  motivo,
  orientacao,
  severidade = "media",
  registroExistente = null,
  contexto = {},
  usuarioId = null,
}) {
  const { error } = await supabase
    .from("importacao_moradores_divergencias")
    .insert({
      business_id: condominio?.business_id || null,
      condominio_id: perfil.condominio_id,
      lote_id: loteId,
      linha_planilha: linhaNumero,
      arquivo_nome: arquivoNome,

      torre_informada: linha.torre_informada || linha.nome_torre_informado || null,
      unidade_informada: linha.unidade || null,
      nome_informado: linha.nome || null,
      email_informado: linha.email || null,
      telefone_informado: montarTelefoneImportacao(linha.ddi, linha.telefone) || null,

      motivo,
      orientacao,
      severidade,

      dados_linha: linha.linha_original || {},
      registro_existente: registroExistente || {},

      criado_por: usuarioId,
      criado_por_email: perfil?.email || null,
      criado_por_nome: perfil?.nome || null,

      ip_origem: contexto.ip || null,
      navegador: contexto.navegador || null,
      sistema_operacional: contexto.sistema_operacional || null,
      user_agent: contexto.user_agent || null,
    });

  if (error) throw error;
}

export async function importarMoradoresXLSX({
  perfil,
  condominio,
  arquivoNome,
  linhas = [],
  torres = [],
  preCadastros = [],
}) {
  if (!perfil?.condominio_id) {
    throw new Error("Condomínio não identificado no perfil.");
  }

  if (!Array.isArray(linhas) || linhas.length === 0) {
    throw new Error("Nenhuma linha encontrada para importação.");
  }

  const { data: authData } = await supabase.auth.getUser();

  const usuarioId =
    authData?.user?.id ||
    perfil?.usuario_id ||
    perfil?.id ||
    null;

  const contexto = await montarContextoTecnico();
  const loteId = gerarLoteImportacaoMorador();

  const resumo = {
    lote_id: loteId,
    arquivo_nome: arquivoNome || "importacao_moradores.xlsx",
    total_linhas: linhas.length,
    criadas: 0,
    atualizadas: 0,
    divergencias: 0,
    ignoradas: 0,
    resultados: [],
  };

  await registrarLogSistema({
    acao: "IMPORTACAO_MORADOR_INICIADA",
    condominio_id: perfil.condominio_id,
    usuario_id: usuarioId,
    email: perfil?.email || null,
    origem: "administrativo_importacao_xlsx",
    detalhes: {
      lote_id: loteId,
      arquivo_nome: resumo.arquivo_nome,
      total_linhas: linhas.length,
      business_id: condominio?.business_id || null,
      condominio_nome:
        condominio?.nome_fantasia || condominio?.razao_social || null,
      executado_por_nome: perfil?.nome || null,
      executado_por_email: perfil?.email || null,
    },
  });

  const { data: preCadastrosAtuais, error: erroPreCadastrosAtuais } = await supabase
    .from("pre_cadastro_moradores")
    .select("*")
    .eq("condominio_id", perfil.condominio_id);

  if (erroPreCadastrosAtuais) throw erroPreCadastrosAtuais;

  const preCadastrosAtualizadosEmMemoria = [
    ...(preCadastrosAtuais || preCadastros || []),
  ];

  for (let index = 0; index < linhas.length; index += 1) {
    const linhaNumero = index + 2;
    const linha = normalizarLinhaImportacao(linhas[index]);

    const baseResultado = {
      linha: linhaNumero,
      torre: linha.torre_informada || linha.nome_torre_informado,
      unidade: linha.unidade,
      nome: linha.nome,
      email: linha.email,
      telefone: montarTelefoneImportacao(linha.ddi, linha.telefone),
    };

    let torreLabel = baseResultado.torre || "—";

    try {
      const torre = localizarTorreImportacao(torres, linha);
      torreLabel = torre ? formatarTorreOficialImportacao(torre) : baseResultado.torre || "—";

      if (!torre) {
        resumo.divergencias += 1;

        await registrarDivergenciaImportacaoMorador({
          perfil,
          condominio,
          loteId,
          arquivoNome: resumo.arquivo_nome,
          linhaNumero,
          linha,
          motivo: "TORRE_NAO_ENCONTRADA",
          orientacao: "Revise a coluna Torre/Bloco ou Nome Torre/Bloco conforme estrutura oficial do condomínio.",
          severidade: "alta",
          contexto,
          usuarioId,
        });

        await registrarLogSistema({
          acao: "IMPORTACAO_MORADOR_LINHA_DIVERGENTE",
          condominio_id: perfil.condominio_id,
          usuario_id: usuarioId,
          email: linha.email || perfil?.email || null,
          origem: "administrativo_importacao_xlsx",
          detalhes: {
            lote_id: loteId,
            linha_planilha: linhaNumero,
            motivo: "TORRE_NAO_ENCONTRADA",
            ...baseResultado,
          },
        });

        resumo.resultados.push({
          ...baseResultado,
          torre: torreLabel,
          resultado: "DIVERGENCIA",
          motivo: "TORRE_NAO_ENCONTRADA",
        });

        continue;
      }

      if (!linha.unidade) {
        resumo.divergencias += 1;

        await registrarDivergenciaImportacaoMorador({
          perfil,
          condominio,
          loteId,
          arquivoNome: resumo.arquivo_nome,
          linhaNumero,
          linha,
          motivo: "UNIDADE_OBRIGATORIA",
          orientacao: "Informe a unidade/apartamento na planilha.",
          severidade: "alta",
          contexto,
          usuarioId,
        });

        resumo.resultados.push({
          ...baseResultado,
          torre: torreLabel,
          resultado: "DIVERGENCIA",
          motivo: "UNIDADE_OBRIGATORIA",
        });

        continue;
      }

      if (!linha.nome) {
        resumo.divergencias += 1;

        await registrarDivergenciaImportacaoMorador({
          perfil,
          condominio,
          loteId,
          arquivoNome: resumo.arquivo_nome,
          linhaNumero,
          linha,
          motivo: "NOME_OBRIGATORIO",
          orientacao: "Informe o nome completo do responsável.",
          severidade: "alta",
          contexto,
          usuarioId,
        });

        resumo.resultados.push({
          ...baseResultado,
          torre: torreLabel,
          resultado: "DIVERGENCIA",
          motivo: "NOME_OBRIGATORIO",
        });

        continue;
      }

      if (!validarEmailImportacao(linha.email)) {
        resumo.divergencias += 1;

        await registrarDivergenciaImportacaoMorador({
          perfil,
          condominio,
          loteId,
          arquivoNome: resumo.arquivo_nome,
          linhaNumero,
          linha,
          motivo: "EMAIL_INVALIDO",
          orientacao: "Revise o e-mail informado na planilha.",
          severidade: "media",
          contexto,
          usuarioId,
        });

        resumo.resultados.push({
          ...baseResultado,
          torre: torreLabel,
          resultado: "DIVERGENCIA",
          motivo: "EMAIL_INVALIDO",
        });

        continue;
      }

      if (!validarTelefoneImportacao(linha.ddi, linha.telefone)) {
        resumo.divergencias += 1;

        await registrarDivergenciaImportacaoMorador({
          perfil,
          condominio,
          loteId,
          arquivoNome: resumo.arquivo_nome,
          linhaNumero,
          linha,
          motivo: "WHATSAPP_INVALIDO",
          orientacao: "Revise DDI, DDD e número do WhatsApp.",
          severidade: "media",
          contexto,
          usuarioId,
        });

        resumo.resultados.push({
          ...baseResultado,
          torre: torreLabel,
          resultado: "DIVERGENCIA",
          motivo: "WHATSAPP_INVALIDO",
        });

        continue;
      }

      const existente = localizarPreCadastroPorTorreUnidade(
        preCadastrosAtualizadosEmMemoria,
        torre,
        linha.unidade
      );

      if (existente && statusAprovadoOuAtivoImportacao(existente)) {
        resumo.divergencias += 1;

        await registrarDivergenciaImportacaoMorador({
          perfil,
          condominio,
          loteId,
          arquivoNome: resumo.arquivo_nome,
          linhaNumero,
          linha,
          motivo: "UNIDADE_COM_MORADOR_APROVADO",
          orientacao: "Use Gestão > Unidades e Vínculos para troca ou manutenção de morador aprovado.",
          severidade: "critica",
          registroExistente: existente,
          contexto,
          usuarioId,
        });

        await registrarLogSistema({
          acao: "IMPORTACAO_MORADOR_LINHA_DIVERGENTE",
          condominio_id: perfil.condominio_id,
          usuario_id: usuarioId,
          email: linha.email || perfil?.email || null,
          origem: "administrativo_importacao_xlsx",
          detalhes: {
            lote_id: loteId,
            linha_planilha: linhaNumero,
            motivo: "UNIDADE_COM_MORADOR_APROVADO",
            registro_existente_id: existente.id,
            ...baseResultado,
          },
        });

        resumo.resultados.push({
          ...baseResultado,
          torre: torreLabel,
          resultado: "DIVERGENCIA",
          motivo: "UNIDADE_COM_MORADOR_APROVADO",
        });

        continue;
      }

      if (existente) {
        if (!nomesIguaisImportacao(existente.nome, linha.nome)) {
          resumo.divergencias += 1;

          await registrarDivergenciaImportacaoMorador({
            perfil,
            condominio,
            loteId,
            arquivoNome: resumo.arquivo_nome,
            linhaNumero,
            linha,
            motivo: "UNIDADE_COM_NOME_DIFERENTE",
            orientacao: "A Torre/Unidade já possui pré-cadastro com outro nome. Revise manualmente antes de atualizar.",
            severidade: "alta",
            registroExistente: existente,
            contexto,
            usuarioId,
          });

          await registrarLogSistema({
            acao: "IMPORTACAO_MORADOR_LINHA_DIVERGENTE",
            condominio_id: perfil.condominio_id,
            usuario_id: usuarioId,
            email: linha.email || perfil?.email || null,
            origem: "administrativo_importacao_xlsx",
            detalhes: {
              lote_id: loteId,
              linha_planilha: linhaNumero,
              motivo: "UNIDADE_COM_NOME_DIFERENTE",
              registro_existente_id: existente.id,
              nome_existente: existente.nome,
              nome_importado: linha.nome,
              ...baseResultado,
            },
          });

          resumo.resultados.push({
            ...baseResultado,
            torre: torreLabel,
            resultado: "DIVERGENCIA",
            motivo: "UNIDADE_COM_NOME_DIFERENTE",
          });

          continue;
        }

        const dadosAntes = existente;

        const payloadAtualizacao = {
          email: linha.email,
          telefone: montarTelefoneImportacao(linha.ddi, linha.telefone),
          observacoes: linha.observacoes || existente.observacoes || null,
          atualizado_em: new Date().toISOString(),
        };

        const { data: atualizado, error: errorUpdate } = await supabase
          .from("pre_cadastro_moradores")
          .update(payloadAtualizacao)
          .eq("id", existente.id)
          .eq("condominio_id", perfil.condominio_id)
          .select("*")
          .single();

        if (errorUpdate) throw errorUpdate;

        resumo.atualizadas += 1;

        await registrarLogSistema({
          acao: "IMPORTACAO_MORADOR_LINHA_ATUALIZADA",
          condominio_id: perfil.condominio_id,
          usuario_id: usuarioId,
          email: atualizado.email,
          origem: "administrativo_importacao_xlsx",
          detalhes: {
            lote_id: loteId,
            linha_planilha: linhaNumero,
            pre_cadastro_id: atualizado.id,
            business_id: atualizado.business_id,
            campos_atualizados: ["email", "telefone", "observacoes"],
            nome: atualizado.nome,
            torre: atualizado.torre,
            unidade: atualizado.unidade,
            executado_por_nome: perfil?.nome || null,
            executado_por_email: perfil?.email || null,
          },
        });

        await registrarAuditoriaMorador({
          business_id: atualizado.business_id,
          condominio_id: perfil.condominio_id,
          pre_cadastro_id: atualizado.id,
          usuario_id: usuarioId,
          unidade_id: atualizado.unidade_id || null,
          status_auditoria: "PRE_CADASTRO_ATUALIZADO_IMPORTACAO",
          tipo_auditoria: "IMPORTACAO_XLSX_ATUALIZACAO",
          origem_auditoria: "ADMINISTRATIVO",
          dados_antes: dadosAntes,
          dados_depois: atualizado,
          divergencias: null,
          observacao_auditor: `Atualização via importação XLSX. Lote: ${loteId}`,
        });

        const posicao = preCadastrosAtualizadosEmMemoria.findIndex(
          (item) => item.id === atualizado.id
        );

        if (posicao >= 0) {
          preCadastrosAtualizadosEmMemoria[posicao] = atualizado;
        }

        resumo.resultados.push({
          ...baseResultado,
          torre: torreLabel,
          resultado: "ATUALIZAR",
          motivo: "Torre + Unidade + Nome iguais. Contato atualizado.",
        });

        continue;
      }

      const payloadCriacao = {
        business_id: condominio?.business_id || null,
        condominio_id: perfil.condominio_id,
        unidade_id: null,

        nome: linha.nome,
        email: linha.email,
        telefone: montarTelefoneImportacao(linha.ddi, linha.telefone),

        torre: torre.nome || linha.nome_torre_informado || linha.torre_informada,
        bloco: torre.identificador || linha.torre_informada || null,
        unidade: linha.unidade,

        tipo_morador: "morador",
        origem_cadastro: "xlsx",
        status_cadastro: "RASCUNHO",
        status_convite: "AGUARDANDO_ENVIO",
        status_auditoria: "NAO_ENVIADO",
        percentual_preenchimento: 10,
        possui_divergencia: false,
        observacoes: linha.observacoes || null,
        dados_importados: {
          lote_id: loteId,
          arquivo_nome: resumo.arquivo_nome,
          linha_planilha: linhaNumero,
          origem: "importacao_xlsx_moradores",
          dados_linha: linha.linha_original || {},
          torre_id: torre.id,
          torre_nome: torre.nome || null,
          torre_identificador: torre.identificador || null,
          criado_por: usuarioId,
          criado_em: new Date().toISOString(),
        },
        status_conta: "PENDENTE_APROVACAO",
        auth_ativo: false,
        status_acompanhamento: null,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      };

      const { data: criado, error: errorInsert } = await supabase
        .from("pre_cadastro_moradores")
        .insert(payloadCriacao)
        .select("*")
        .single();

      if (errorInsert) throw errorInsert;

      resumo.criadas += 1;
      preCadastrosAtualizadosEmMemoria.push(criado);

      await registrarLogSistema({
        acao: "IMPORTACAO_MORADOR_LINHA_CRIADA",
        condominio_id: perfil.condominio_id,
        usuario_id: usuarioId,
        email: criado.email,
        origem: "administrativo_importacao_xlsx",
        detalhes: {
          lote_id: loteId,
          linha_planilha: linhaNumero,
          pre_cadastro_id: criado.id,
          business_id: criado.business_id,
          nome: criado.nome,
          torre: criado.torre,
          unidade: criado.unidade,
          arquivo_nome: resumo.arquivo_nome,
          executado_por_nome: perfil?.nome || null,
          executado_por_email: perfil?.email || null,
        },
      });

      await registrarAuditoriaMorador({
        business_id: criado.business_id,
        condominio_id: perfil.condominio_id,
        pre_cadastro_id: criado.id,
        usuario_id: usuarioId,
        unidade_id: criado.unidade_id || null,
        status_auditoria: "PRE_CADASTRO_IMPORTADO",
        tipo_auditoria: "IMPORTACAO_XLSX",
        origem_auditoria: "ADMINISTRATIVO",
        dados_antes: null,
        dados_depois: criado,
        divergencias: null,
        observacao_auditor: `Pré-cadastro importado via XLSX. Lote: ${loteId}`,
      });

      resumo.resultados.push({
        ...baseResultado,
        torre: torreLabel,
        resultado: "CRIAR",
        motivo: "Novo pré-cadastro criado.",
      });
    } catch (error) {
      resumo.divergencias += 1;

      await registrarDivergenciaImportacaoMorador({
        perfil,
        condominio,
        loteId,
        arquivoNome: resumo.arquivo_nome,
        linhaNumero,
        linha,
        motivo: "ERRO_PROCESSAMENTO_LINHA",
        orientacao: error.message || "Erro inesperado ao processar a linha.",
        severidade: "critica",
        contexto,
        usuarioId,
      });

      resumo.resultados.push({
        ...baseResultado,
        torre: torreLabel || baseResultado.torre || "—",
        resultado: "DIVERGENCIA",
        motivo: error.message || "ERRO_PROCESSAMENTO_LINHA",
      });
    }
  }

  await registrarLogSistema({
    acao: "IMPORTACAO_MORADOR_FINALIZADA",
    condominio_id: perfil.condominio_id,
    usuario_id: usuarioId,
    email: perfil?.email || null,
    origem: "administrativo_importacao_xlsx",
    detalhes: {
      lote_id: loteId,
      arquivo_nome: resumo.arquivo_nome,
      total_linhas: resumo.total_linhas,
      criadas: resumo.criadas,
      atualizadas: resumo.atualizadas,
      divergencias: resumo.divergencias,
      ignoradas: resumo.ignoradas,
      business_id: condominio?.business_id || null,
      condominio_nome:
        condominio?.nome_fantasia || condominio?.razao_social || null,
      executado_por_nome: perfil?.nome || null,
      executado_por_email: perfil?.email || null,
    },
  });

  return resumo;
}