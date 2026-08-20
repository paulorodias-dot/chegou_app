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

/*
 * ============================================================
 * CAMPOS LEVES
 * ============================================================
 *
 * A tabela de Convites não precisa carregar payload completo,
 * HTML de e-mail, respostas integrais, JSONs do Wizard etc.
 *
 * Detalhes completos passam a ser carregados somente quando
 * o usuário solicita uma visualização que realmente precise
 * deles.
 * ============================================================
 */

const CAMPOS_CONVITE_LISTA = [
  "id",
  "pre_cadastro_id",
  "condominio_id",
  "nome_destino",
  "email_destino",
  "telefone_destino",
  "status_envio",
  "status_convite",
  "enviado_em",
  "token_expira_em",
  "convite_aberto",
  "convite_aberto_em",
  "wizard_finalizado",
  "wizard_finalizado_em",
  "token_revogado",
  "cancelado",
  "atualizado_em",
  "criado_em",
].join(",");

const CAMPOS_PRE_CADASTRO_LISTA = [
  "id",
  "business_id",
  "condominio_id",
  "nome",
  "email",
  "telefone",
  "torre",
  "unidade",
  "status_cadastro",
  "status_convite",
  "status_auditoria",
  "percentual_preenchimento",
  "etapa_atual",
  "convite_enviado_em",
  "convite_aberto_em",
  "wizard_finalizado_em",
  "origem_cadastro",
  "atualizado_em",
  "criado_em",
].join(",");

const CAMPOS_AUDITORIA_LISTA = [
  "id",
  "pre_cadastro_id",
  "status_auditoria",
  "observacao_auditor",
  "mensagem_para_morador",
  "aprovado_em",
  "rejeitado_em",
  "criado_em",
].join(",");

function normalizarStatus(valor = "") {
  return String(valor || "")
    .trim()
    .toUpperCase();
}

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

  return (
    mapa[status] ||
    String(status)
      .replaceAll("_", " ")
      .toUpperCase()
  );
}

function possuiConviteReal(convite = {}) {
  /*
   * A existência do ciclo de Convite é determinada pela
   * entidade convites_morador.
   *
   * Campos auxiliares do Pré-Cadastro não podem transformar,
   * sozinhos, um cadastro administrativo em convite enviado.
   */
  return Boolean(convite?.id);
}

function obterEtapaWizard(preCadastro = {}) {
  const etapa = Number(
    preCadastro?.etapa_atual || 0
  );

  return Number.isFinite(etapa)
    ? etapa
    : 0;
}

function obterPercentualWizardVisual(
  convite = {},
  preCadastro = {}
) {
  /*
   * REGRA:
   *
   * Pré-Cadastro administrativo = 0%.
   *
   * Convite criado, mas Morador ainda não ultrapassou
   * a primeira tela = 0%.
   *
   * O preenchimento passa a ser apresentado somente
   * depois que o Morador avança além da Tela 1.
   *
   * Nome, e-mail, telefone, torre e unidade preenchidos
   * pelo Administrativo não contam como progresso
   * realizado pelo Morador.
   */

  if (!possuiConviteReal(convite)) {
    return 0;
  }

  if (obterEtapaWizard(preCadastro) <= 1) {
    return 0;
  }

  const percentual = Number(
    preCadastro?.percentual_preenchimento || 0
  );

  if (!Number.isFinite(percentual)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      percentual
    )
  );
}

function mapearStatusLegado(
  convite = {},
  preCadastro = {}
) {
  const conviteExiste =
    possuiConviteReal(convite);

  const statusEnvio =
    normalizarStatus(
      convite?.status_envio
    );

  const statusConvite =
    normalizarStatus(
      convite?.status_convite
    );

  const statusCadastro =
    normalizarStatus(
      preCadastro?.status_cadastro
    );

  const statusAuditoria =
    normalizarStatus(
      preCadastro?.status_auditoria
    );

  const etapaWizard =
    obterEtapaWizard(
      preCadastro
    );

  const percentualWizard =
    obterPercentualWizardVisual(
      convite,
      preCadastro
    );

  /*
   * ============================================================
   * 1. ESTADOS ADMINISTRATIVOS FINAIS
   * ============================================================
   */

  if (
    statusAuditoria ===
    "APROVADO"
  ) {
    return "APROVADO";
  }

  if (
    statusAuditoria ===
    "REPROVADO"
  ) {
    return "REPROVADO";
  }

  if (
    statusAuditoria ===
    "CORRECAO_SOLICITADA"
  ) {
    return "CORRECAO_SOLICITADA";
  }

  /*
   * ============================================================
   * 2. SEM CONVITE REAL = PRÉ-CADASTRO
   * ============================================================
   *
   * Dados preenchidos pelo Administrativo não significam
   * que o Morador começou o Wizard.
   */

  if (!conviteExiste) {
    return "RASCUNHO";
  }

  /*
   * ============================================================
   * 3. WIZARD FINALIZADO
   * ============================================================
   */

  if (
    convite?.wizard_finalizado ||
    convite?.wizard_finalizado_em ||
    preCadastro?.wizard_finalizado_em ||
    statusCadastro ===
      "WIZARD_FINALIZADO" ||
    statusCadastro ===
      "AGUARDANDO_AUDITORIA"
  ) {
    return "AGUARDANDO_AUDITORIA";
  }

  /*
   * ============================================================
   * 4. WIZARD EM PREENCHIMENTO
   * ============================================================
   *
   * Esta condição precisa vir ANTES dos estados de envio.
   *
   * Depois que o Morador ultrapassou a Tela 1, a etapa do
   * Wizard passa a representar o estado mais avançado do
   * processo.
   *
   * Exemplo:
   *
   * enviado_em = preenchido
   * etapa_atual = 4
   * percentual_preenchimento = 48
   *
   * Resultado correto:
   *
   * EM_PREENCHIMENTO / 48%
   *
   * e não:
   *
   * E-MAIL ENVIADO
   */

  if (
    etapaWizard > 1 &&
    (
      percentualWizard > 0 ||
      statusCadastro ===
        "EM_PREENCHIMENTO" ||
      statusCadastro ===
        "AGUARDANDO_PREENCHIMENTO"
    )
  ) {
    return "EM_PREENCHIMENTO";
  }

  /*
   * Proteção adicional:
   *
   * Se a etapa já avançou além da Tela 1, ela própria é uma
   * evidência de que o Morador iniciou o preenchimento, mesmo
   * que algum status legado ainda não tenha acompanhado.
   */

  if (etapaWizard > 1) {
    return "EM_PREENCHIMENTO";
  }

  /*
   * ============================================================
   * 5. CONVITE ABERTO, MAS AINDA NA TELA 1
   * ============================================================
   */

  if (
    convite?.convite_aberto ||
    convite?.convite_aberto_em ||
    preCadastro?.convite_aberto_em
  ) {
    return "ABERTO";
  }

  /*
   * ============================================================
   * 6. E-MAIL EFETIVAMENTE ENVIADO
   * ============================================================
   *
   * enviado_em é a evidência física do envio e prevalece
   * sobre estados transitórios antigos da fila.
   */

  if (
    convite?.enviado_em ||
    preCadastro?.convite_enviado_em ||
    statusEnvio === "ENVIADO" ||
    statusEnvio ===
      "EMAIL_ENVIADO" ||
    statusConvite === "ENVIADO" ||
    statusConvite ===
      "EMAIL_ENVIADO"
  ) {
    return "CONVITE_ENVIADO";
  }

  /*
   * ============================================================
   * 7. ERRO DE ENVIO
   * ============================================================
   */

  if (
    statusEnvio ===
      "ERRO_ENVIO" ||
    statusConvite ===
      "ERRO_ENVIO"
  ) {
    return "ERRO_ENVIO";
  }

  /*
   * ============================================================
   * 8. PROCESSANDO
   * ============================================================
   */

  if (
    statusEnvio ===
      "PROCESSANDO" ||
    statusConvite ===
      "PROCESSANDO"
  ) {
    return "PROCESSANDO";
  }

  /*
   * ============================================================
   * 9. AGUARDANDO ENVIO
   * ============================================================
   */

  if (
    statusEnvio ===
      "AGUARDANDO_ENVIO" ||
    statusEnvio ===
      "PENDENTE" ||
    statusConvite ===
      "AGUARDANDO_ENVIO" ||
    statusConvite ===
      "PENDENTE"
  ) {
    return "AGUARDANDO_ENVIO";
  }

  /*
   * Existe Convite, porém ainda não existe evidência
   * de processamento ou envio.
   */

  return "AGUARDANDO_ENVIO";
}

function calcularUltimaAtividade(
  convite = {},
  preCadastro = {}
) {
  const datas = [
    convite.atualizado_em,
    convite.updated_at,
    convite.ultimo_acesso_em,
    convite.convite_aberto_em,
    convite.wizard_finalizado_em,
    convite.enviado_em,
    preCadastro.atualizado_em,
    convite.criado_em,
    preCadastro.criado_em,
  ].filter(Boolean);

  if (!datas.length) {
    return null;
  }

  const datasValidas = datas
    .map((valor) => new Date(valor))
    .filter(
      (data) =>
        !Number.isNaN(data.getTime())
    )
    .sort(
      (a, b) =>
        b.getTime() - a.getTime()
    );

  if (!datasValidas.length) {
    return null;
  }

  return datasValidas[0].toISOString();
}

function formatarRegistro(
  convite = {},
  preCadastro = {},
  auditoria = null
) {
  const statusSistema =
    mapearStatusLegado(
      convite,
      preCadastro
    );

  const conviteId =
    convite?.id || null;

  const preCadastroId =
    convite?.pre_cadastro_id ||
    preCadastro?.id ||
    null;

  return {
    id:
      conviteId ||
      `rascunho-${preCadastroId}`,

    business_id:
      preCadastro?.business_id ||
      convite?.business_id ||
      null,

    convite_id:
      conviteId,

    pre_cadastro_id:
      preCadastroId,

    condominio_id:
      convite?.condominio_id ||
      preCadastro?.condominio_id ||
      null,

    nome:
      convite?.nome_destino ||
      preCadastro?.nome ||
      "—",

    email:
      convite?.email_destino ||
      preCadastro?.email ||
      "—",

    telefone:
      preCadastro?.telefone ||
      convite?.telefone_destino ||
      "—",

    torre:
      preCadastro?.torre ||
      "—",

    unidade:
      preCadastro?.unidade ||
      "—",

    status_sistema:
      statusSistema,

    status_visual:
      normalizarStatusVisual(
        statusSistema
      ),

    status_envio:
      convite?.status_envio ||
      null,

    /*
     * Sem Convite real, o estado apresentado é RASCUNHO.
     * Não herdamos status_convite do Pré-Cadastro.
     */
    status_convite:
      conviteId
        ? (
            convite?.status_convite ||
            null
          )
        : "RASCUNHO",

    status_entrega:
      convite?.status_entrega ||
      null,

    status_auditoria:
      auditoria?.status_auditoria ||
      preCadastro?.status_auditoria ||
      null,

    enviado_em:
      convite?.enviado_em ||
      null,

    token_expira_em:
      convite?.token_expira_em ||
      null,

    convite_aberto: Boolean(
      convite?.convite_aberto
    ),

    convite_aberto_em:
      convite?.convite_aberto_em ||
      preCadastro?.convite_aberto_em ||
      null,

    wizard_finalizado: Boolean(
      convite?.wizard_finalizado
    ),

    wizard_finalizado_em:
      convite?.wizard_finalizado_em ||
      preCadastro?.wizard_finalizado_em ||
      null,

    etapa_atual:
      obterEtapaWizard(
        preCadastro
      ),

    token_revogado: Boolean(
      convite?.token_revogado
    ),

    bloqueado: false,

    ultima_atividade_em:
      calcularUltimaAtividade(
        convite,
        preCadastro
      ),

    /*
     * O percentual exibido representa o preenchimento
     * realizado pelo Morador no Wizard.
     *
     * Dados administrativos do Pré-Cadastro não contam.
     */
    percentual_preenchimento:
      obterPercentualWizardVisual(
        convite,
        preCadastro
      ),

    quantidade_reenvios:
      Number(
        convite?.quantidade_reenvios ||
        0
      ),

    canal_envio:
      convite?.canal_envio ||
      null,

    tipo_envio:
      convite?.tipo_envio ||
      null,

    status_token:
      convite?.status_token ||
      null,

    origem_envio:
      convite?.origem_envio ||
      convite?.origem ||
      null,

    origem_cadastro:
      preCadastro?.origem_cadastro ||
      null,

    auditoria: auditoria
      ? { ...auditoria }
      : null,

    /*
     * Objetos reduzidos.
     *
     * Não carregamos payload de envio, HTML,
     * dados complementares ou o Wizard completo
     * durante a abertura da tabela.
     */
    pre_cadastro: preCadastro
      ? { ...preCadastro }
      : null,

    convite: conviteId
      ? { ...convite }
      : null,
  };
}

function mapearMaisRecentePorChave(
  registros = [],
  chave
) {
  const mapa = new Map();

  registros.forEach((item) => {
    const id = item?.[chave];

    if (!id) return;

    if (!mapa.has(id)) {
      mapa.set(id, item);
    }
  });

  return mapa;
}

function aplicarFiltroPeriodo(
  registros,
  dataInicio,
  dataFim
) {
  if (!dataInicio && !dataFim) {
    return registros;
  }

  const inicio = dataInicio
    ? new Date(
        `${dataInicio}T00:00:00`
      )
    : null;

  const fim = dataFim
    ? new Date(
        `${dataFim}T23:59:59.999`
      )
    : null;

  return registros.filter((item) => {
    const dataBase =
      item.ultima_atividade_em ||
      item.enviado_em ||
      item.convite?.criado_em ||
      item.pre_cadastro?.criado_em;

    if (!dataBase) {
      return false;
    }

    const data = new Date(dataBase);

    if (
      Number.isNaN(data.getTime())
    ) {
      return false;
    }

    if (inicio && data < inicio) {
      return false;
    }

    if (fim && data > fim) {
      return false;
    }

    return true;
  });
}

function aplicarFiltrosLista(
  registros,
  {
    busca = "",
    status = "TODOS",
    torre = "TODAS",
    unidade = "TODAS",
    dataInicio = "",
    dataFim = "",
  } = {}
) {
  let lista = registros.filter(
    (item) =>
      STATUS_ATIVOS_AUDITORIA.includes(
        item.status_sistema
      )
  );

  const termo = String(busca || "")
    .trim()
    .toLowerCase();

  if (termo) {
    lista = lista.filter((item) =>
      [
        item.nome,
        item.email,
        item.telefone,
        item.unidade,
        item.torre,
        item.business_id,
      ]
        .filter(Boolean)
        .some((valor) =>
          String(valor)
            .toLowerCase()
            .includes(termo)
        )
    );
  }

  if (status !== "TODOS") {
    lista = lista.filter(
      (item) =>
        item.status_sistema === status
    );
  }

  if (torre !== "TODAS") {
    lista = lista.filter(
      (item) =>
        String(item.torre) ===
        String(torre)
    );
  }

  if (unidade !== "TODAS") {
    lista = lista.filter(
      (item) =>
        String(item.unidade) ===
        String(unidade)
    );
  }

  lista = aplicarFiltroPeriodo(
    lista,
    dataInicio,
    dataFim
  );

  return lista;
}

async function buscarPreCadastrosPorIds(
  ids = []
) {
  if (!ids.length) {
    return [];
  }

  const { data, error } =
    await supabase
      .from("pre_cadastro_moradores")
      .select(
        CAMPOS_PRE_CADASTRO_LISTA
      )
      .in("id", ids);

  if (error) {
    throw error;
  }

  return data || [];
}

async function buscarAuditoriasPorIds(
  ids = []
) {
  if (!ids.length) {
    return [];
  }

  const { data, error } =
    await supabase
      .from("auditorias_morador")
      .select(
        CAMPOS_AUDITORIA_LISTA
      )
      .in(
        "pre_cadastro_id",
        ids
      )
      .order(
        "criado_em",
        {
          ascending: false,
        }
      );

  if (error) {
    throw error;
  }

  return data || [];
}

/*
 * ============================================================
 * LISTA DE CONVITES
 * ============================================================
 *
 * Carrega somente os campos necessários para a tabela.
 *
 * Pré-Cadastros sem Convite continuam aparecendo,
 * porém obrigatoriamente como RASCUNHO.
 * ============================================================
 */

export async function listarAuditoriaConvitesMoradores({
  condominioId,
  busca = "",
  status = "TODOS",
  torre = "TODAS",
  unidade = "TODAS",
  dataInicio = "",
  dataFim = "",
  pagina = 1,
  limite = 10,
} = {}) {
  if (!condominioId) {
    throw new Error(
      "Condomínio autenticado não encontrado."
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
   * Existem temporariamente duas fontes:
   *
   * 1. Convites;
   * 2. Pré-Cadastros ainda sem Convite.
   */

  const offset =
    (paginaAtual - 1) *
    pageSize;

  const janela =
    offset +
    pageSize +
    Math.max(
      20,
      pageSize * 2
    );

  const [
    respostaConvites,
    respostaRascunhos,
  ] = await Promise.all([
    supabase
      .from("convites_morador")
      .select(
        CAMPOS_CONVITE_LISTA,
        {
          count: "exact",
        }
      )
      .eq(
        "condominio_id",
        condominioId
      )
      .eq(
        "cancelado",
        false
      )
      .eq(
        "token_revogado",
        false
      )
      .order(
        "criado_em",
        {
          ascending: false,
        }
      )
      .range(
        0,
        Math.max(
          0,
          janela - 1
        )
      ),

    supabase
      .from("pre_cadastro_moradores")
      .select(
        CAMPOS_PRE_CADASTRO_LISTA,
        {
          count: "exact",
        }
      )
      .eq(
        "condominio_id",
        condominioId
      )
      .or(
        [
          "status_cadastro.eq.RASCUNHO",
          "status_cadastro.eq.rascunho",
          "status_convite.eq.RASCUNHO",
          "status_convite.eq.rascunho",
          "status_convite.is.null",
        ].join(",")
      )
      .order(
        "criado_em",
        {
          ascending: false,
        }
      )
      .range(
        0,
        Math.max(
          0,
          janela - 1
        )
      ),
  ]);

  if (respostaConvites.error) {
    throw respostaConvites.error;
  }

  if (respostaRascunhos.error) {
    throw respostaRascunhos.error;
  }

  /*
   * Mantemos somente o Convite mais recente
   * de cada Pré-Cadastro.
   */

  const convitesMaisRecentes = [];
  const idsIncluidos = new Set();

  (
    respostaConvites.data || []
  ).forEach((convite) => {
    const chave =
      convite.pre_cadastro_id ||
      convite.id;

    if (
      idsIncluidos.has(chave)
    ) {
      return;
    }

    idsIncluidos.add(chave);

    convitesMaisRecentes.push(
      convite
    );
  });

  const preCadastroIds =
    [
      ...new Set(
        convitesMaisRecentes
          .map(
            (convite) =>
              convite.pre_cadastro_id
          )
          .filter(Boolean)
      ),
    ];

  const [
    preCadastrosComConvite,
    auditorias,
  ] = await Promise.all([
    buscarPreCadastrosPorIds(
      preCadastroIds
    ),
    buscarAuditoriasPorIds(
      preCadastroIds
    ),
  ]);

  const preMap =
    new Map(
      preCadastrosComConvite.map(
        (item) => [
          item.id,
          item,
        ]
      )
    );

  const audMap =
    mapearMaisRecentePorChave(
      auditorias,
      "pre_cadastro_id"
    );

  const registrosComConvite =
    convitesMaisRecentes.map(
      (convite) =>
        formatarRegistro(
          convite,
          preMap.get(
            convite.pre_cadastro_id
          ) || {},
          audMap.get(
            convite.pre_cadastro_id
          ) || null
        )
    );

  /*
   * Um Pré-Cadastro que já possui Convite não pode
   * aparecer novamente como Rascunho.
   */

  const idsComConvite =
    new Set(
      preCadastroIds
    );

  const registrosRascunho =
    (
      respostaRascunhos.data ||
      []
    )
      .filter(
        (preCadastro) =>
          !idsComConvite.has(
            preCadastro.id
          )
      )
      .map(
        (preCadastro) =>
          formatarRegistro(
            {},
            preCadastro,
            null
          )
      );

  let registros = [
    ...registrosRascunho,
    ...registrosComConvite,
  ];

  registros =
    aplicarFiltrosLista(
      registros,
      {
        busca,
        status,
        torre,
        unidade,
        dataInicio,
        dataFim,
      }
    );

  registros.sort(
    (a, b) => {
      const dataA =
        new Date(
          a.ultima_atividade_em ||
            a.enviado_em ||
            a.pre_cadastro
              ?.criado_em ||
            0
        ).getTime();

      const dataB =
        new Date(
          b.ultima_atividade_em ||
            b.enviado_em ||
            b.pre_cadastro
              ?.criado_em ||
            0
        ).getTime();

      return dataB - dataA;
    }
  );

  const paginaRegistros =
    registros.slice(
      offset,
      offset + pageSize
    );

  const totalReferencia =
    Number(
      respostaConvites.count || 0
    ) +
    Number(
      respostaRascunhos.count || 0
    );

  return {
    registros:
      paginaRegistros,

    pagina:
      paginaAtual,

    limite:
      pageSize,

    total:
      totalReferencia,

    possuiProxima:
      registros.length >
        offset + pageSize ||
      janela <
        totalReferencia,
  };
}

/*
 * ============================================================
 * RESUMO
 * ============================================================
 */

export async function obterResumoAuditoriaConvitesMoradores({
  condominioId,
} = {}) {
  if (!condominioId) {
    return {
      convitesEnviados: 0,
      aguardandoAbertura: 0,
      emPreenchimento: 0,
      aguardandoAuditoria: 0,
      aprovados: 0,
      reprovadosBloqueados: 0,
    };
  }

  const [
    respostaConvites,
    respostaPreCadastros,
  ] = await Promise.all([
    supabase
      .from("convites_morador")
      .select(
        [
          "id",
          "pre_cadastro_id",
          "status_envio",
          "status_convite",
          "convite_aberto",
          "convite_aberto_em",
          "wizard_finalizado",
          "wizard_finalizado_em",
          "token_revogado",
          "cancelado",
          "enviado_em",
          "criado_em",
        ].join(",")
      )
      .eq(
        "condominio_id",
        condominioId
      )
      .eq(
        "cancelado",
        false
      ),

    supabase
      .from("pre_cadastro_moradores")
      .select(
        [
          "id",
          "status_cadastro",
          "status_convite",
          "status_auditoria",
          "percentual_preenchimento",
          "etapa_atual",
          "convite_enviado_em",
          "convite_aberto_em",
          "wizard_finalizado_em",
        ].join(",")
      )
      .eq(
        "condominio_id",
        condominioId
      ),
  ]);

  if (respostaConvites.error) {
    throw respostaConvites.error;
  }

  if (
    respostaPreCadastros.error
  ) {
    throw respostaPreCadastros.error;
  }

  const preMap =
    new Map(
      (
        respostaPreCadastros.data ||
        []
      ).map((item) => [
        item.id,
        item,
      ])
    );

  const convitesMaisRecentes = [];
  const idsIncluidos = new Set();

  (
    respostaConvites.data ||
    []
  )
    .sort(
      (a, b) =>
        new Date(
          b.criado_em || 0
        ).getTime() -
        new Date(
          a.criado_em || 0
        ).getTime()
    )
    .forEach((convite) => {
      const chave =
        convite.pre_cadastro_id ||
        convite.id;

      if (
        idsIncluidos.has(chave)
      ) {
        return;
      }

      idsIncluidos.add(chave);

      convitesMaisRecentes.push(
        convite
      );
    });

  const resumo = {
    convitesEnviados: 0,
    aguardandoAbertura: 0,
    emPreenchimento: 0,
    aguardandoAuditoria: 0,
    aprovados: 0,
    reprovadosBloqueados: 0,
  };

  convitesMaisRecentes.forEach(
    (convite) => {
      const preCadastro =
        preMap.get(
          convite.pre_cadastro_id
        ) || {};

      const status =
        mapearStatusLegado(
          convite,
          preCadastro
        );

      if (
        status ===
        "CONVITE_ENVIADO"
      ) {
        resumo.convitesEnviados += 1;

        if (
          !convite.convite_aberto &&
          !convite.convite_aberto_em
        ) {
          resumo.aguardandoAbertura += 1;
        }
      }

      if (
        status ===
        "EM_PREENCHIMENTO"
      ) {
        resumo.emPreenchimento += 1;
      }

      if (
        status ===
        "AGUARDANDO_AUDITORIA"
      ) {
        resumo.aguardandoAuditoria += 1;
      }

      if (status === "APROVADO") {
        resumo.aprovados += 1;
      }

      if (
        status === "REPROVADO" ||
        status === "BLOQUEADO"
      ) {
        resumo.reprovadosBloqueados += 1;
      }
    }
  );

  return resumo;
}

/*
 * ============================================================
 * TORRES
 * ============================================================
 */

export async function buscarTorresAuditoriaMoradores({
  condominioId,
} = {}) {
  if (!condominioId) {
    return [];
  }

  const { data, error } =
    await supabase
      .from("torres")
      .select(
        "id, nome"
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

/*
 * ============================================================
 * DETALHE SOB DEMANDA
 * ============================================================
 */

export async function obterDetalheAuditoriaConviteMorador({
  condominioId,
  conviteId,
  preCadastroId,
} = {}) {
  if (
    !condominioId ||
    !preCadastroId
  ) {
    throw new Error(
      "Registro do morador não identificado."
    );
  }

  const consultas = [
    supabase
      .from(
        "pre_cadastro_moradores"
      )
      .select("*")
      .eq(
        "condominio_id",
        condominioId
      )
      .eq(
        "id",
        preCadastroId
      )
      .maybeSingle(),

    supabase
      .from(
        "auditorias_morador"
      )
      .select("*")
      .eq(
        "pre_cadastro_id",
        preCadastroId
      )
      .order(
        "criado_em",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle(),
  ];

  if (conviteId) {
    consultas.push(
      supabase
        .from("convites_morador")
        .select("*")
        .eq(
          "condominio_id",
          condominioId
        )
        .eq(
          "id",
          conviteId
        )
        .maybeSingle()
    );
  }

  const resultados =
    await Promise.all(
      consultas
    );

  const [
    preResultado,
    auditoriaResultado,
    conviteResultado,
  ] = resultados;

  if (preResultado.error) {
    throw preResultado.error;
  }

  if (
    auditoriaResultado.error
  ) {
    throw auditoriaResultado.error;
  }

  if (
    conviteResultado?.error
  ) {
    throw conviteResultado.error;
  }

  const preCadastro =
    preResultado.data ||
    {};

  const auditoria =
    auditoriaResultado.data ||
    null;

  const convite =
    conviteResultado?.data ||
    {};

  return formatarRegistro(
    convite,
    preCadastro,
    auditoria
  );
}

/*
 * ============================================================
 * COPIAR LINK DO CONVITE
 * ============================================================
 */

export async function copiarLinkConviteMorador(
  convite
) {
  const link =
    convite?.payload_envio
      ?.link_wizard ||
    convite?.link_wizard;

  if (!link) {
    throw new Error(
      "Link do convite não encontrado."
    );
  }

  await navigator.clipboard.writeText(
    link
  );

  return link;
}

/*
 * ============================================================
 * LIMITE DIÁRIO
 * ============================================================
 */

export async function obterLimiteEnvioDiario({
  condominioId,
} = {}) {
  if (!condominioId) {
    return {
      convites: {
        usados: 0,
        limite: 40,
      },

      confirmacoes: {
        usados: 0,
        limite: 20,
      },
    };
  }

  const agora = new Date();

  const inicio = new Date(agora);

  inicio.setHours(
    0,
    0,
    0,
    0
  );

  const fim = new Date(agora);

  fim.setHours(
    23,
    59,
    59,
    999
  );

  const {
    count: totalConvites,
    error,
  } = await supabase
    .from("convites_morador")
    .select(
      "id",
      {
        count: "exact",
        head: true,
      }
    )
    .eq(
      "condominio_id",
      condominioId
    )
    .in(
      "status_envio",
      [
        "ENVIADO",
        "EMAIL_ENVIADO",
        "enviado",
      ]
    )
    .gte(
      "enviado_em",
      inicio.toISOString()
    )
    .lte(
      "enviado_em",
      fim.toISOString()
    );

  if (error) {
    throw error;
  }

  return {
    convites: {
      usados:
        totalConvites || 0,

      limite: 40,
    },

    confirmacoes: {
      usados: 0,
      limite: 20,
    },
  };
}

/*
 * ============================================================
 * ENVIO DO CONVITE
 * ============================================================
 *
 * enviarAgora = false:
 * programa o convite para envio.
 *
 * O processamento assíncrono respeita a cadência
 * configurada para os e-mails.
 * ============================================================
 */

export async function enviarConviteMoradorAuditoria({
  perfil,
  registro,
  enviarAgora = false,
  tipoEnvio = "individual",
}) {
  const condominioId =
    perfil?.condominio_id ||
    perfil?.condominio_atual_id ||
    perfil?.usuario_condominio
      ?.condominio_id ||
    null;

  if (!condominioId) {
    throw new Error(
      "Condomínio não identificado no perfil."
    );
  }

  if (
    !registro?.pre_cadastro_id
  ) {
    throw new Error(
      "Cadastro do morador não identificado."
    );
  }

  const { data, error } =
    await supabase.functions.invoke(
      "enviar-convite-morador",
      {
        body: {
          condominio_id:
            condominioId,

          pre_cadastro_id:
            registro.pre_cadastro_id,

          nome:
            registro.nome,

          email:
            registro.email,

          telefone:
            registro.telefone,

          torre:
            registro.torre,

          unidade:
            registro.unidade,

          tipo_envio:
            tipoEnvio,

          origem_cadastro:
            "administrativo",

          enviado_por:
            perfil?.usuario_id ||
            perfil?.id ||
            null,

          prioridade: 0,

          enviar_agora:
            enviarAgora,

          observacoes: null,

          site_url:
            window.location.origin,
        },
      }
    );

  if (
    error ||
    data?.success === false
  ) {
    throw new Error(
      data?.error ||
        data?.message ||
        error?.message ||
        "Não foi possível enviar o convite. Tente novamente."
    );
  }

  return data;
}