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

const CAMPOS_LISTA_PRE_CADASTRO = [
  "id",
  "business_id",
  "nome",
  "email",
  "telefone",
  "torre",
  "bloco",
  "unidade",
  "origem_cadastro",
  "status_cadastro",
  "status_convite",
  "criado_em",
  "atualizado_em",
].join(",");

const CAMPOS_CONVITE_RESUMO = [
  "id",
  "pre_cadastro_id",
  "status_convite",
  "status_envio",
  "token_revogado",
  "cancelado",
  "criado_em",
].join(",");

function normalizarStatus(valor = "") {
  return String(valor || "").trim().toUpperCase();
}

function normalizarTexto(valor = "") {
  return String(valor || "").trim();
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

function compararConvitesMaisRecentes(a, b) {
  const dataA = new Date(a?.criado_em || 0).getTime();
  const dataB = new Date(b?.criado_em || 0).getTime();

  return dataB - dataA;
}

function mapearConviteMaisRecentePorPreCadastro(convites = []) {
  const mapa = new Map();

  [...convites]
    .sort(compararConvitesMaisRecentes)
    .forEach((convite) => {
      if (!convite?.pre_cadastro_id) return;

      if (!mapa.has(convite.pre_cadastro_id)) {
        mapa.set(convite.pre_cadastro_id, convite);
      }
    });

  return mapa;
}

export function calcularCompletudePreCadastro(item = {}) {
  const pendencias = [];

  if (!normalizarTexto(item.nome)) {
    pendencias.push("Nome");
  }

  if (!normalizarTexto(item.email)) {
    pendencias.push("E-mail");
  }

  if (!normalizarTexto(item.telefone)) {
    pendencias.push("WhatsApp");
  }

  if (!normalizarTexto(item.torre) && !normalizarTexto(item.bloco)) {
    pendencias.push("Torre/Bloco");
  }

  if (!normalizarTexto(item.unidade)) {
    pendencias.push("Unidade");
  }

  const totalCampos = 5;
  const preenchidos = totalCampos - pendencias.length;

  const percentual = Math.max(
    0,
    Math.round((preenchidos / totalCampos) * 100)
  );

  return {
    percentual,
    pendencias,
    pronto: percentual === 100,
  };
}

function montarRegistroLista(item = {}, convite = null) {
  const completude = calcularCompletudePreCadastro(item);

  const statusCadastro = normalizarStatus(
    item.status_cadastro ||
      item.status_convite ||
      "RASCUNHO"
  );

  const statusRetornoConvite = normalizarStatus(
    convite?.status_convite ||
      convite?.status_envio
  );

  const statusTela =
    convite && !conviteEstaAtivo(convite)
      ? statusRetornoConvite || statusCadastro
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

    convite: convite || null,
  };
}

function aplicarFiltrosLocais(
  registros,
  {
    busca = "",
    status = "TODOS",
    origem = "TODAS",
    torre = "TODAS",
  } = {}
) {
  const termo = normalizarTexto(busca).toLowerCase();

  return registros.filter((item) => {
    /*
     * Se existe convite ativo, o morador não pertence mais
     * à etapa de Pré-Cadastro.
     */
    if (conviteEstaAtivo(item.convite)) {
      return false;
    }

    const statusNormalizado = normalizarStatus(item.status);

    const statusOk =
      STATUS_PRE_CADASTRO_VALIDOS.includes(statusNormalizado) ||
      STATUS_CONVITE_RETORNA_PRE_CADASTRO.includes(
        statusNormalizado
      );

    if (!statusOk) {
      return false;
    }

    if (
      status !== "TODOS" &&
      statusNormalizado !== normalizarStatus(status)
    ) {
      return false;
    }

    if (
      origem !== "TODAS" &&
      normalizarStatus(item.origem) !== normalizarStatus(origem)
    ) {
      return false;
    }

    if (
      torre !== "TODAS" &&
      String(item.torre).trim() !== String(torre).trim()
    ) {
      return false;
    }

    if (!termo) {
      return true;
    }

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

function aplicarPeriodoQuery(
  query,
  dataInicio,
  dataFim
) {
  let consulta = query;

  if (dataInicio) {
    consulta = consulta.gte(
      "atualizado_em",
      new Date(
        `${dataInicio}T00:00:00`
      ).toISOString()
    );
  }

  if (dataFim) {
    consulta = consulta.lte(
      "atualizado_em",
      new Date(
        `${dataFim}T23:59:59.999`
      ).toISOString()
    );
  }

  return consulta;
}

async function buscarConvitesResumidosPorPreCadastros(
  preCadastroIds = []
) {
  if (!preCadastroIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("convites_morador")
    .select(CAMPOS_CONVITE_RESUMO)
    .in("pre_cadastro_id", preCadastroIds)
    .order("criado_em", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * ============================================================
 * LISTAGEM LEVE DE PRÉ-CADASTROS
 * ============================================================
 *
 * PRINCIPAIS REGRAS:
 *
 * 1. Não utiliza select("*").
 *
 * 2. Não baixa 500/1000 registros completos para mostrar
 *    somente 10 registros na tabela.
 *
 * 3. O período é aplicado diretamente no banco.
 *
 * 4. Busca somente os convites relacionados aos pré-cadastros
 *    da pequena janela consultada.
 *
 * 5. Os dados completos do morador não são carregados aqui.
 *
 * 6. O detalhe completo será buscado somente quando o usuário
 *    realmente precisar editar/cancelar o registro.
 *
 * Esta implementação é uma etapa intermediária.
 *
 * A futura Central de Auditoria deverá possuir um contrato
 * backend próprio (RPC/View/API) capaz de devolver lista,
 * total e KPIs de maneira totalmente autoritativa.
 * ============================================================
 */
export async function listarPreCadastrosMoradores({
  condominioId,
  busca = "",
  status = "TODOS",
  origem = "TODAS",
  torre = "TODAS",
  dataInicio = "",
  dataFim = "",
  pagina = 1,
  limite = 10,
} = {}) {
  if (!condominioId) {
    throw new Error(
      "Condomínio não identificado."
    );
  }

  const pageSize = Math.max(
    1,
    Math.min(
      Number(limite) || 10,
      50
    )
  );

  const paginaAtual = Math.max(
    1,
    Number(pagina) || 1
  );

  /*
   * Mantemos uma margem pequena porque alguns registros
   * poderão ser descartados depois de verificarmos se
   * possuem convite ativo.
   *
   * Mesmo assim, estamos muito abaixo do comportamento
   * anterior de baixar 500 ou 1000 registros completos.
   */
  const margem = Math.max(
    20,
    pageSize * 2
  );

  const inicio =
    (paginaAtual - 1) * pageSize;

  const rangeInicio = Math.max(
    0,
    inicio
  );

  const rangeFim =
    rangeInicio +
    pageSize +
    margem -
    1;

  let query = supabase
    .from("pre_cadastro_moradores")
    .select(
      CAMPOS_LISTA_PRE_CADASTRO,
      {
        count: "exact",
      }
    )
    .eq(
      "condominio_id",
      condominioId
    )
    .order(
      "atualizado_em",
      {
        ascending: false,
        nullsFirst: false,
      }
    )
    .order(
      "criado_em",
      {
        ascending: false,
      }
    );

  /*
   * ==========================================================
   * FILTRO DE ORIGEM
   * ==========================================================
   */
  if (origem !== "TODAS") {
    query = query.eq(
      "origem_cadastro",
      String(origem).toLowerCase()
    );
  }

  /*
   * ==========================================================
   * FILTRO DE TORRE
   * ==========================================================
   */
  if (torre !== "TODAS") {
    query = query.or(
      `torre.eq.${torre},bloco.eq.${torre}`
    );
  }

  /*
   * ==========================================================
   * BUSCA
   * ==========================================================
   *
   * A busca agora acontece no Supabase, evitando baixar
   * centenas de registros para procurar no navegador.
   */
  if (busca.trim()) {
    const termo = busca
      .trim()
      .replaceAll(",", " ");

    query = query.or(
      [
        `nome.ilike.%${termo}%`,
        `email.ilike.%${termo}%`,
        `telefone.ilike.%${termo}%`,
        `unidade.ilike.%${termo}%`,
        `business_id.ilike.%${termo}%`,
      ].join(",")
    );
  }

  /*
   * ==========================================================
   * PERÍODO
   * ==========================================================
   */
  query = aplicarPeriodoQuery(
    query,
    dataInicio,
    dataFim
  );

  /*
   * ==========================================================
   * PAGINAÇÃO NO BANCO
   * ==========================================================
   */
  const {
    data: preCadastros,
    error: erroPre,
    count: totalBruto,
  } = await query.range(
    rangeInicio,
    rangeFim
  );

  if (erroPre) {
    throw erroPre;
  }

  /*
   * ==========================================================
   * CONVITES SOMENTE DA JANELA CONSULTADA
   * ==========================================================
   */
  const ids = (
    preCadastros || []
  )
    .map((item) => item.id)
    .filter(Boolean);

  const convites =
    await buscarConvitesResumidosPorPreCadastros(
      ids
    );

  const conviteMap =
    mapearConviteMaisRecentePorPreCadastro(
      convites
    );

  /*
   * ==========================================================
   * NORMALIZAÇÃO
   * ==========================================================
   */
  const registrosFiltrados =
    aplicarFiltrosLocais(
      (preCadastros || []).map(
        (item) =>
          montarRegistroLista(
            item,
            conviteMap.get(item.id) ||
              null
          )
      ),
      {
        busca,
        status,
        origem,
        torre,
      }
    );

  /*
   * O navegador recebe somente a quantidade efetivamente
   * necessária para a página.
   */
  const registros =
    registrosFiltrados.slice(
      0,
      pageSize
    );

  return {
    registros,

    /*
     * ATENÇÃO:
     *
     * totalBruto representa o conjunto-base informado pelo
     * PostgREST antes da exclusão local dos convites ativos.
     *
     * Portanto, ele ainda não deve ser tratado como o
     * contador autoritativo definitivo da futura Central
     * de Auditoria.
     *
     * Isso será resolvido posteriormente com RPC/View.
     */
    total: Number(
      totalBruto || 0
    ),

    pagina: paginaAtual,

    limite: pageSize,

    possuiProxima:
      registrosFiltrados.length >
        pageSize ||
      rangeFim + 1 <
        Number(totalBruto || 0),
  };
}

/**
 * ============================================================
 * RESUMO DO PRÉ-CADASTRO
 * ============================================================
 *
 * Esta versão elimina o select("*") e deixa de transferir
 * JSONs completos do Wizard.
 *
 * Ainda é uma implementação transitória.
 *
 * A arquitetura definitiva deverá mover estes KPIs para
 * uma RPC/View agregada no PostgreSQL.
 * ============================================================
 */
export async function obterResumoPreCadastro({
  condominioId,
  dataInicio = "",
  dataFim = "",
} = {}) {
  if (!condominioId) {
    return {
      total: 0,
      prontos: 0,
      pendencias: 0,
      importadosHoje: 0,
    };
  }

  let query = supabase
    .from("pre_cadastro_moradores")
    .select(
      CAMPOS_LISTA_PRE_CADASTRO
    )
    .eq(
      "condominio_id",
      condominioId
    )
    .order(
      "atualizado_em",
      {
        ascending: false,
        nullsFirst: false,
      }
    );

  query = aplicarPeriodoQuery(
    query,
    dataInicio,
    dataFim
  );

  const {
    data: preCadastros,
    error,
  } = await query;

  if (error) {
    throw error;
  }

  /*
   * Precisamos identificar quais registros ainda pertencem
   * realmente ao Pré-Cadastro.
   *
   * Porém buscamos apenas os campos mínimos dos convites.
   */
  const ids = (
    preCadastros || []
  )
    .map((item) => item.id)
    .filter(Boolean);

  const convites =
    await buscarConvitesResumidosPorPreCadastros(
      ids
    );

  const conviteMap =
    mapearConviteMaisRecentePorPreCadastro(
      convites
    );

  const registros =
    aplicarFiltrosLocais(
      (preCadastros || []).map(
        (item) =>
          montarRegistroLista(
            item,
            conviteMap.get(item.id) ||
              null
          )
      ),
      {}
    );

  const hoje =
    new Date()
      .toISOString()
      .slice(0, 10);

  return registros.reduce(
    (acc, item) => {
      acc.total += 1;

      if (item.percentual === 100) {
        acc.prontos += 1;
      } else {
        acc.pendencias += 1;
      }

      const origem =
        normalizarStatus(
          item.origem
        );

      const criadoHoje =
        item.criado_em &&
        new Date(
          item.criado_em
        )
          .toISOString()
          .slice(0, 10) === hoje;

      if (
        ["XLSX", "PDF"].includes(
          origem
        ) &&
        criadoHoje
      ) {
        acc.importadosHoje += 1;
      }

      return acc;
    },
    {
      total: 0,
      prontos: 0,
      pendencias: 0,
      importadosHoje: 0,
    }
  );
}

/**
 * ============================================================
 * TORRES
 * ============================================================
 *
 * Consulta pequena e independente.
 */
export async function buscarTorresPreCadastro({
  condominioId,
} = {}) {
  if (!condominioId) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from("torres")
    .select(
      "id, nome, identificador"
    )
    .eq(
      "condominio_id",
      condominioId
    )
    .order(
      "nome",
      {
        ascending: true,
      }
    );

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * ============================================================
 * DETALHE COMPLETO SOB DEMANDA
 * ============================================================
 *
 * Aqui o select("*") é intencionalmente permitido.
 *
 * Diferença fundamental:
 *
 * ANTES:
 *   select("*") em centenas de moradores.
 *
 * AGORA:
 *   select("*") em UM morador quando o usuário realmente
 *   solicita uma operação que necessita do cadastro completo.
 *
 * Esse método é usado, por exemplo, para:
 *
 * - editar;
 * - cancelar;
 * - operações que necessitem dos dados completos.
 * ============================================================
 */
export async function obterPreCadastroMoradorDetalhe({
  condominioId,
  preCadastroId,
} = {}) {
  if (
    !condominioId ||
    !preCadastroId
  ) {
    throw new Error(
      "Pré-cadastro não identificado."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("pre_cadastro_moradores")
    .select("*")
    .eq(
      "condominio_id",
      condominioId
    )
    .eq(
      "id",
      preCadastroId
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.id) {
    throw new Error(
      "Pré-cadastro não encontrado."
    );
  }

  return data;
}