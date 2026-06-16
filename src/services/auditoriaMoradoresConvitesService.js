import { supabase } from "./supabase";

const STATUS_ATIVOS_AUDITORIA = [
  "RASCUNHO",
  "AGUARDANDO_ENVIO",
  "PROCESSANDO",
  "ERRO_ENVIO",
  "CONVITE_ENVIADO",
  "ABERTO",
  "EM_PREENCHIMENTO",
  "WIZARD_FINALIZADO",
  "AGUARDANDO_AUDITORIA",
  "CORRECAO_SOLICITADA",
  "APROVADO",
  "REPROVADO",
  "BLOQUEADO",
];

function normalizarStatusVisual(status) {
  if (!status) return "RASCUNHO";

  const mapa = {
    RASCUNHO: "RASCUNHO",
    AGUARDANDO_ENVIO: "NA FILA DE ENVIO",
    PROCESSANDO: "ENVIANDO E-MAIL",
    ERRO_ENVIO: "ERRO NO ENVIO",
    CONVITE_ENVIADO: "E-MAIL ENVIADO",
    ABERTO: "E-MAIL ABERTO",
    EM_PREENCHIMENTO: "EM PREENCHIMENTO",
    WIZARD_FINALIZADO: "WIZARD FINALIZADO",
    AGUARDANDO_AUDITORIA: "AGUARDANDO AUDITORIA",
    CORRECAO_SOLICITADA: "CORREÇÃO SOLICITADA",
    APROVADO: "APROVADO",
    REPROVADO: "REPROVADO",
    BLOQUEADO: "BLOQUEADO",
  };

  return mapa[status] || String(status).replaceAll("_", " ").toUpperCase();
}

function mapearStatusLegado(convite = {}, preCadastro = {}) {
  const statusEnvio = String(convite.status_envio || "").toUpperCase();
  const statusConvite = String(
    statusEnvio ||
      convite.status_convite ||
      preCadastro.status_convite ||
      ""
  ).toUpperCase();

    const statusCadastro = String(preCadastro.status_cadastro || "").toUpperCase();

    if (!convite?.id && statusCadastro === "RASCUNHO") {
      return "RASCUNHO";
    }

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

  if (statusConvite === "AGUARDANDO_ENVIO") {
    return "AGUARDANDO_ENVIO";
  }

  if (statusConvite === "PROCESSANDO") {
    return "PROCESSANDO";
  }

  if (statusConvite === "ERRO_ENVIO") {
    return "ERRO_ENVIO";
  }

  if (convite.convite_aberto || convite.convite_aberto_em) {
    return "ABERTO";
  }

  if (convite.wizard_finalizado || preCadastro.status_cadastro === "WIZARD_FINALIZADO") {
    return "WIZARD_FINALIZADO";
  }

  if (statusConvite === "ENVIADO" || statusConvite === "EMAIL_ENVIADO") {
    return "CONVITE_ENVIADO";
  }

  if (statusConvite === "PENDENTE") return "AGUARDANDO_ENVIO";

  if (
    !convite?.id &&
    ["RASCUNHO", "rascunho"].includes(String(preCadastro.status_cadastro || ""))
  ) {
    return "RASCUNHO";
  }

  if (
    String(preCadastro.status_cadastro || "").toUpperCase() === "RASCUNHO"
  ) {
    return "RASCUNHO";
  }

  return "RASCUNHO";

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
  dataInicio = "",
  dataFim = "",
  limite = 500,
} = {}) {
  if (!condominioId) {
    throw new Error("Condomínio autenticado não encontrado.");
  }

  const { data: convites, error: erroConvites } = await supabase
    .from("convites_morador")
    .select("*")
    .eq("condominio_id", condominioId)
    .eq("cancelado", false)
    .eq("token_revogado", false)
    .order("criado_em", { ascending: false })
    .limit(limite);

  if (erroConvites) throw erroConvites;

  const preCadastroIdsComConvite = [
    ...new Set((convites || []).map((c) => c.pre_cadastro_id).filter(Boolean)),
  ];

  let preCadastrosComConvite = [];
  let auditorias = [];

  if (preCadastroIdsComConvite.length) {
    const { data: preData, error: preError } = await supabase
      .from("pre_cadastro_moradores")
      .select("*")
      .in("id", preCadastroIdsComConvite);

    if (preError) throw preError;

    preCadastrosComConvite = preData || [];

    const { data: audData, error: audError } = await supabase
      .from("auditorias_morador")
      .select("*")
      .in("pre_cadastro_id", preCadastroIdsComConvite)
      .order("criado_em", { ascending: false });

    if (audError) throw audError;

    auditorias = audData || [];
  }

  const { data: preCadastrosRascunho, error: erroRascunhos } = await supabase
    .from("pre_cadastro_moradores")
    .select("*")
    .eq("condominio_id", condominioId)
    .or(
      [
        "status_cadastro.eq.RASCUNHO",
        "status_cadastro.eq.rascunho",
        "status_convite.eq.RASCUNHO",
        "status_convite.eq.rascunho",
        "status_convite.is.null",
      ].join(",")
    )
    .order("criado_em", { ascending: false })
    .limit(limite);

  if (erroRascunhos) throw erroRascunhos;

  const idsComConvite = new Set(preCadastroIdsComConvite);

  const rascunhosSemConvite = (preCadastrosRascunho || []).filter(
    (pre) => !idsComConvite.has(pre.id)
  );

  const preMap = new Map(preCadastrosComConvite.map((p) => [p.id, p]));
  const audMap = new Map();

  auditorias.forEach((a) => {
    if (!audMap.has(a.pre_cadastro_id)) {
      audMap.set(a.pre_cadastro_id, a);
    }
  });

  const registrosComConvite = (convites || []).map((convite) =>
    formatarRegistro(
      convite,
      preMap.get(convite.pre_cadastro_id),
      audMap.get(convite.pre_cadastro_id)
    )
  );

  const registrosRascunho = rascunhosSemConvite.map((preCadastro) => {
    const registro = formatarRegistro(
      {
        id: null,
        condominio_id: preCadastro.condominio_id,
        pre_cadastro_id: preCadastro.id,
        business_id: preCadastro.business_id,
        nome_destino: preCadastro.nome,
        email_destino: preCadastro.email,
        telefone_destino: preCadastro.telefone,
        status_envio: null,
        status_convite: null,
        token_revogado: false,
        cancelado: false,
        criado_em: preCadastro.criado_em,
      },
      preCadastro,
      null
    );

    return {
      ...registro,
      id: `rascunho-${preCadastro.id}`,
      convite_id: null,
      status_sistema: "RASCUNHO",
      status_visual: "RASCUNHO",
    };
  });

  let registros = [...registrosRascunho, ...registrosComConvite]
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

  if (dataInicio || dataFim) {
    const inicio = dataInicio ? new Date(`${dataInicio}T00:00:00`) : null;
    const fim = dataFim ? new Date(`${dataFim}T23:59:59`) : null;

    registros = registros.filter((item) => {
      const dataBase =
        item.ultima_atividade_em ||
        item.enviado_em ||
        item.convite?.criado_em ||
        item.pre_cadastro?.criado_em;

      if (!dataBase) return false;

      const data = new Date(dataBase);

      if (inicio && data < inicio) return false;
      if (fim && data > fim) return false;

      return true;
    });
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

export async function enviarConviteMoradorAuditoria({
  perfil,
  registro,
  enviarAgora = true,
  tipoEnvio = "individual",
}) {
  if (!perfil?.condominio_id) {
    throw new Error("Condomínio não identificado no perfil.");
  }

  if (!registro?.pre_cadastro_id) {
    throw new Error("Pré-cadastro não identificado.");
  }

  const { data, error } = await supabase.functions.invoke(
    "enviar-convite-morador",
    {
      body: {
        condominio_id: perfil.condominio_id,
        pre_cadastro_id: registro.pre_cadastro_id,
        nome: registro.nome,
        email: registro.email,
        telefone: registro.telefone,
        torre: registro.torre,
        unidade: registro.unidade,
        tipo_envio: tipoEnvio,
        origem_cadastro: "administrativo",
        enviado_por: perfil?.usuario_id || perfil?.id || null,
        prioridade: 0,
        enviar_agora: enviarAgora,
        observacoes: null,
        site_url: window.location.origin,
      },
    }
  );

  if (error || data?.success === false) {
    throw new Error(
      data?.error ||
        data?.message ||
        error?.message ||
        "Erro ao enviar convite do morador."
    );
  }

  return data;
}