import {
  parsePhoneNumberFromString,
} from "libphonenumber-js";

import { supabase } from "./supabase";

const STATUS_AUDITORIA_VALIDOS = [
  "AGUARDANDO_AUDITORIA",
  "AUDITORIA_INICIADA",
  "REAUDITORIA_PENDENTE",
];

/*
 * Dados mínimos necessários para montar a tabela.
 *
 * O cadastro completo não é carregado aqui.
 */
const CAMPOS_LISTA_AUDITORIA = [
  "id",
  "business_id",
  "nome",
  "torre",
  "unidade",
  "status_auditoria",
  "status_cadastro",
  "percentual_preenchimento",
  "wizard_finalizado_em",
  "atualizado_em",
  "criado_em",
].join(",");

function normalizarStatus(valor = "") {
  return String(valor || "")
    .trim()
    .toUpperCase();
}

function somenteNumeros(valor = "") {
  return String(valor || "")
    .replace(/\D/g, "");
}

function gerarUuidCliente() {
  if (globalThis?.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const bytes =
    new Uint8Array(16);

  globalThis.crypto
    .getRandomValues(bytes);

  bytes[6] =
    (bytes[6] & 0x0f) |
    0x40;

  bytes[8] =
    (bytes[8] & 0x3f) |
    0x80;

  const hex = [...bytes]
    .map((byte) =>
      byte
        .toString(16)
        .padStart(2, "0")
    )
    .join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

function obterContextoNavegador() {
  if (
    typeof window === "undefined"
  ) {
    return {
      ip: null,
      user_agent: null,
    };
  }

  return {
    ip: null,
    user_agent:
      window.navigator
        ?.userAgent || null,
  };
}

export function formatarStatusAuditoria(
  status = ""
) {
  const mapa = {
    AGUARDANDO_AUDITORIA:
      "Aguardando Auditoria",

    AUDITORIA_INICIADA:
      "Auditoria Iniciada",

    REAUDITORIA_PENDENTE:
      "Reauditoria Pendente",

    CORRECAO_SOLICITADA:
      "Correção Solicitada",

    APROVADO:
      "Aprovado",

    REPROVADO:
      "Reprovado",
  };

  const valor =
    normalizarStatus(status);

  return (
    mapa[valor] ||
    String(status || "")
      .replaceAll("_", " ")
  );
}

export function formatarCpfCompleto(
  cpf = ""
) {
  const numero =
    somenteNumeros(cpf);

  if (numero.length !== 11) {
    return "Não informado";
  }

  return numero.replace(
    /(\d{3})(\d{3})(\d{3})(\d{2})/,
    "$1.$2.$3-$4"
  );
}

export function mascararCpf(
  cpf = ""
) {
  const numero =
    somenteNumeros(cpf);

  if (numero.length !== 11) {
    return "Não informado";
  }

  return `${numero.slice(
    0,
    3
  )}.***.***-${numero.slice(-2)}`;
}

function normalizarDdi(
  ddi = ""
) {
  return somenteNumeros(ddi);
}

function primeiroValorPreenchido(
  ...valores
) {
  return valores.find(
    (item) =>
      item !== null &&
      item !== undefined &&
      String(item).trim() !== ""
  );
}

function objetoSeguro(valor) {
  if (
    valor &&
    typeof valor === "object" &&
    !Array.isArray(valor)
  ) {
    return valor;
  }

  return {};
}

function primeiroArrayValido(
  ...valores
) {
  for (
    const valor of valores
  ) {
    if (
      Array.isArray(valor) &&
      valor.length
    ) {
      return valor;
    }
  }

  const vazio =
    valores.find(
      Array.isArray
    );

  return vazio || [];
}

function montarNumeroInternacional({
  telefone,
  ddi,
  paisPadrao = "BR",
} = {}) {
  const original =
    String(
      telefone || ""
    ).trim();

  if (!original) {
    return "";
  }

  if (
    original.startsWith("+")
  ) {
    return `+${somenteNumeros(
      original
    )}`;
  }

  let numero =
    somenteNumeros(original);

  if (!numero) {
    return "";
  }

  if (
    numero.startsWith("00")
  ) {
    numero =
      numero.slice(2);

    return numero
      ? `+${numero}`
      : "";
  }

  const ddiNormalizado =
    normalizarDdi(ddi);

  if (
    ddiNormalizado &&
    numero.startsWith(
      ddiNormalizado
    ) &&
    numero.length >
      ddiNormalizado.length + 7
  ) {
    return `+${numero}`;
  }

  if (
    paisPadrao === "BR" &&
    numero.startsWith("55") &&
    numero.length >= 12
  ) {
    return `+${numero}`;
  }

  if (
    paisPadrao === "BR" &&
    numero.startsWith("0") &&
    numero.length >= 11
  ) {
    numero =
      numero.replace(
        /^0+/,
        ""
      );
  }

  if (ddiNormalizado) {
    return `+${ddiNormalizado}${numero}`;
  }

  if (
    paisPadrao === "BR"
  ) {
    return `+55${numero}`;
  }

  return `+${numero}`;
}

export function formatarTelefoneInternacional({
  telefone,
  ddi,
  paisPadrao = "BR",
} = {}) {
  const numero =
    montarNumeroInternacional({
      telefone,
      ddi,
      paisPadrao,
    });

  if (!numero) {
    return "Não informado";
  }

  try {
    const interpretado =
      parsePhoneNumberFromString(
        numero
      );

    if (!interpretado) {
      return numero;
    }

    return interpretado
      .formatInternational();
  } catch {
    return numero;
  }
}

function converterDataNascimento(
  valor
) {
  if (!valor) {
    return null;
  }

  const texto =
    String(valor).trim();

  const brasileiro =
    texto.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/
    );

  if (brasileiro) {
    const [
      ,
      dia,
      mes,
      ano,
    ] = brasileiro;

    const data =
      new Date(
        Number(ano),
        Number(mes) - 1,
        Number(dia)
      );

    return Number.isNaN(
      data.getTime()
    )
      ? null
      : data;
  }

  const data =
    new Date(texto);

  return Number.isNaN(
    data.getTime()
  )
    ? null
    : data;
}

export function calcularIdade(
  dataNascimento
) {
  const nascimento =
    converterDataNascimento(
      dataNascimento
    );

  if (!nascimento) {
    return null;
  }

  const hoje =
    new Date();

  let idade =
    hoje.getFullYear() -
    nascimento.getFullYear();

  const diferencaMes =
    hoje.getMonth() -
    nascimento.getMonth();

  if (
    diferencaMes < 0 ||
    (
      diferencaMes === 0 &&
      hoje.getDate() <
        nascimento.getDate()
    )
  ) {
    idade -= 1;
  }

  return idade >= 0
    ? idade
    : null;
}

function normalizarDependente(
  dependente = {}
) {
  const ddi =
    primeiroValorPreenchido(
      dependente.ddi,
      dependente.codigo_pais,
      dependente.country_calling_code
    );

  const telefone =
    primeiroValorPreenchido(
      dependente.whatsapp_e164,
      dependente.whatsapp,
      dependente.telefone,
      dependente.celular
    );

  const cpf =
    primeiroValorPreenchido(
      dependente.cpf_formatado,
      dependente.cpf
    );

  const idade =
    dependente.idade ??
    calcularIdade(
      dependente.data_nascimento_iso ||
      dependente.data_nascimento
    );

  return {
    ...dependente,

    nome:
      dependente.nome ||
      dependente.nomeCompleto ||
      dependente.nome_completo ||
      "",

    parentesco:
      dependente.parentesco ||
      dependente.tipo_vinculo ||
      dependente.vinculo ||
      "",

    cpf_mascarado:
      mascararCpf(cpf),

    telefone:
      formatarTelefoneInternacional({
        telefone,
        ddi,
      }),

    idade,

    login_proprio:
      Boolean(
        dependente.login_proprio ??
        dependente.acesso_proprio ??
        dependente.possui_acesso
      ),

    permite_retirada:
      Boolean(
        dependente.permite_retirada ??
        dependente.autorizado_retirada ??
        dependente.pode_retirar_encomendas
      ),

    autorizacao_menor_16:
      Boolean(
        dependente.autorizacao_menor_16 ??
        dependente.menor_16_ciencia
      ),
  };
}

function normalizarFuncionario(
  funcionario = {}
) {
  const ddi =
    primeiroValorPreenchido(
      funcionario.ddi,
      funcionario.codigo_pais
    );

  const telefone =
    primeiroValorPreenchido(
      funcionario.whatsapp_e164,
      funcionario.whatsapp,
      funcionario.telefone,
      funcionario.celular
    );

  return {
    ...funcionario,

    nome:
      funcionario.nome ||
      funcionario.nomeCompleto ||
      funcionario.nome_completo ||
      "",

    telefone:
      formatarTelefoneInternacional({
        telefone,
        ddi,
      }),
  };
}

function normalizarPet(
  pet = {}
) {
  return {
    ...pet,

    tipo:
      pet.tipo ||
      pet.especie ||
      "",
  };
}

function normalizarVeiculo(
  veiculo = {}
) {
  return {
    ...veiculo,

    tipo:
      veiculo.tipo ||
      veiculo.categoria ||
      "",
  };
}

function normalizarVaga(
  vaga = {}
) {
  return {
    ...vaga,

    numero_vaga:
      vaga.numero_vaga ||
      vaga.identificacao ||
      vaga.numero ||
      "",

    tipo_vaga:
      vaga.tipo_vaga ||
      vaga.local ||
      "Não informado",

    vinculo:
      vaga.vinculo ||
      vaga.situacao ||
      "Não informado",

    unidade_vinculada:
      vaga.unidade_vinculada ||
      vaga.unidade_origem ||
      "",

    conflito:
      vaga.conflito === true,
  };
}

function montarResumoDetalhe({
  dependentes,
  funcionarios,
  pets,
  veiculos,
  garagem,
}) {
  const conflitos =
    garagem.filter(
      (item) =>
        item?.conflito === true
    );

  return {
    dependentes:
      dependentes.length,

    funcionarios:
      funcionarios.length,

    pets:
      pets.length,

    veiculos:
      veiculos.length,

    garagem:
      garagem.length,

    conflitosGaragem:
      conflitos.length,

    possuiConflitoGaragem:
      conflitos.length > 0,
  };
}

/*
 * Monta o cadastro completo de UM morador.
 *
 * Esta função só é usada depois que o usuário
 * escolhe Visualizar Resumo ou Auditar.
 */
function normalizarDetalheAuditoria(
  item = {}
) {
  const dadosComplementares =
    objetoSeguro(
      item.dados_complementares
    );

  const wizardFinal =
    objetoSeguro(
      dadosComplementares
        .wizard_final
    );

  const tela1 =
    objetoSeguro(
      wizardFinal.tela1 ||
      dadosComplementares.tela1
    );

  const tela2 =
    objetoSeguro(
      wizardFinal.tela2 ||
      dadosComplementares.tela2
    );

  const tela3 =
    objetoSeguro(
      wizardFinal.tela3
    );

  const tela4 =
    objetoSeguro(
      wizardFinal.tela4
    );

  const tela5 =
    objetoSeguro(
      wizardFinal.tela5 ||
      dadosComplementares.tela5
    );

  const dependentes =
    primeiroArrayValido(
      item.dependentes,
      dadosComplementares
        .pessoas_vinculadas,
      tela3.dependentes
    )
      .map(
        normalizarDependente
      )
      .sort(
        (a, b) =>
          Number(
            b.idade ?? -1
          ) -
          Number(
            a.idade ?? -1
          )
      );

  const funcionarios =
    primeiroArrayValido(
      item.funcionarios_lar,
      dadosComplementares
        .funcionarios_lar,
      tela4.funcionariosLar,
      tela4.funcionarios_lar
    ).map(
      normalizarFuncionario
    );

  const pets =
    primeiroArrayValido(
      item.pets,
      dadosComplementares.pets,
      tela4.pets
    ).map(
      normalizarPet
    );

  const veiculos =
    primeiroArrayValido(
      item.veiculos,
      dadosComplementares
        .veiculos,
      tela5.veiculos
    ).map(
      normalizarVeiculo
    );

  const garagem =
    primeiroArrayValido(
      item.garagem,
      dadosComplementares.vagas,
      tela5.vagas
    ).map(
      normalizarVaga
    );

  const cpf =
    primeiroValorPreenchido(
      item.cpf,
      item.documento_cpf_cnpj,
      dadosComplementares.cpf,
      dadosComplementares
        .cpf_formatado,
      tela2.cpf
    );

  const ddi =
    primeiroValorPreenchido(
      tela2.ddi,
      dadosComplementares.ddi,
      "55"
    );

  const telefone =
    primeiroValorPreenchido(
      dadosComplementares
        .whatsapp_e164,
      item.telefone,
      tela2.whatsapp,
      dadosComplementares
        .whatsapp
    );

  const resumo =
    montarResumoDetalhe({
      dependentes,
      funcionarios,
      pets,
      veiculos,
      garagem,
    });

  return {
    id:
      item.id,

    pre_cadastro_id:
      item.id,

    business_id:
      item.business_id,

    nome:
      primeiroValorPreenchido(
        item.nome,
        tela2.nomeCompleto,
        dadosComplementares.nome
      ) ||
      "Não informado",

    email:
      primeiroValorPreenchido(
        item.email,
        tela2.emailPrincipal,
        dadosComplementares.email
      ) ||
      "Não informado",

    telefone:
      formatarTelefoneInternacional({
        telefone,
        ddi,
      }),

    cpf:
      formatarCpfCompleto(cpf),

    perfil_morador:
      primeiroValorPreenchido(
        item.perfil_morador,
        item.tipo_morador,
        item.perfil_unidade,
        dadosComplementares
          .perfil_unidade,
        tela1.perfilUnidade
      ) ||
      "Não informado",

    torre:
      item.torre ||
      "Não informado",

    unidade:
      item.unidade ||
      "Não informado",

    status_auditoria:
      normalizarStatus(
        item.status_auditoria
      ),

    status_preenchimento:
      normalizarStatus(
        item.status_preenchimento ||
        item.status_cadastro
      ),

    percentual_preenchimento:
      Number(
        item.percentual_preenchimento ||
        100
      ),

    wizard_finalizado_em:
      item.wizard_finalizado_em ||
      item.atualizado_em ||
      item.criado_em,

    atualizado_em:
      item.atualizado_em,

    criado_em:
      item.criado_em,

    identificacao_unidade:
      item.identificacao_unidade ||
      tela1 ||
      {},

    dados_responsavel: {
      ...tela2,

      nome:
        item.nome,

      email:
        item.email,

      cpf:
        formatarCpfCompleto(cpf),

      telefone:
        formatarTelefoneInternacional({
          telefone,
          ddi,
        }),
    },

    dependentes,

    funcionarios_lar:
      funcionarios,

    pets,

    veiculos,

    garagem,

    preferencias: {
      canal_preferencial:
        item.preferencias
          ?.canal_preferencial ||
        (
          dadosComplementares
            .notificacao_whatsapp
            ? "WhatsApp"
            : dadosComplementares
                .notificacao_push
              ? "Push"
              : dadosComplementares
                  .notificacao_email
                ? "E-mail"
                : "Não informado"
        ),

      notificacoes:
        Boolean(
          dadosComplementares
            .notificacao_push ||
          dadosComplementares
            .notificacao_whatsapp ||
          dadosComplementares
            .notificacao_email
        ),

      privacidade:
        item.preferencias
          ?.privacidade,

      observacoes:
        item.preferencias
          ?.observacoes,
    },

    divergencias:
      Array.isArray(
        item.divergencias
      )
        ? item.divergencias
        : [],

    resumo,

    observacoes:
      item.observacoes,

    raw:
      item,
  };
}

function montarRegistroLista(
  item = {}
) {
  return {
    id:
      item.id,

    pre_cadastro_id:
      item.id,

    business_id:
      item.business_id,

    nome:
      item.nome ||
      "Não informado",

    torre:
      item.torre ||
      "Não informado",

    unidade:
      item.unidade ||
      "Não informado",

    status_auditoria:
      normalizarStatus(
        item.status_auditoria
      ),

    status_preenchimento:
      normalizarStatus(
        item.status_cadastro
      ),

    percentual_preenchimento:
      Number(
        item.percentual_preenchimento ||
        100
      ),

    wizard_finalizado_em:
      item.wizard_finalizado_em ||
      item.atualizado_em ||
      item.criado_em,

    atualizado_em:
      item.atualizado_em,

    criado_em:
      item.criado_em,
  };
}

/*
 * ============================================================
 * LISTA
 * ============================================================
 *
 * A tabela recebe somente a página necessária.
 */
export async function listarMoradoresParaAuditoria({
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
      "Condomínio não identificado."
    );
  }

  const pageSize =
    Math.max(
      1,
      Math.min(
        Number(limite) || 10,
        50
      )
    );

  const paginaAtual =
    Math.max(
      1,
      Number(pagina) || 1
    );

  const inicio =
    (paginaAtual - 1) *
    pageSize;

  const fim =
    inicio +
    pageSize -
    1;

  let query =
    supabase
      .from(
        "pre_cadastro_moradores"
      )
      .select(
        CAMPOS_LISTA_AUDITORIA,
        {
          count: "exact",
        }
      )
      .eq(
        "condominio_id",
        condominioId
      )
      .in(
        "status_auditoria",
        STATUS_AUDITORIA_VALIDOS
      );

  if (
    status !== "TODOS"
  ) {
    query =
      query.eq(
        "status_auditoria",
        status
      );
  }

  if (
    torre !== "TODAS"
  ) {
    query =
      query.eq(
        "torre",
        torre
      );
  }

  if (
    unidade !== "TODAS"
  ) {
    query =
      query.eq(
        "unidade",
        unidade
      );
  }

  if (
    busca.trim()
  ) {
    const termo =
      busca
        .trim()
        .replaceAll(",", " ");

    query =
      query.or(
        [
          `nome.ilike.%${termo}%`,
          `unidade.ilike.%${termo}%`,
          `torre.ilike.%${termo}%`,
          `business_id.ilike.%${termo}%`,
        ].join(",")
      );
  }

  if (dataInicio) {
    query =
      query.gte(
        "wizard_finalizado_em",
        new Date(
          `${dataInicio}T00:00:00`
        ).toISOString()
      );
  }

  if (dataFim) {
    query =
      query.lte(
        "wizard_finalizado_em",
        new Date(
          `${dataFim}T23:59:59.999`
        ).toISOString()
      );
  }

  const {
    data,
    error,
    count,
  } = await query
    .order(
      "wizard_finalizado_em",
      {
        ascending: true,
        nullsFirst: false,
      }
    )
    .order(
      "atualizado_em",
      {
        ascending: true,
        nullsFirst: false,
      }
    )
    .range(
      inicio,
      fim
    );

  if (error) {
    throw error;
  }

  return {
    registros:
      (data || [])
        .map(
          montarRegistroLista
        ),

    total:
      Number(
        count || 0
      ),

    pagina:
      paginaAtual,

    limite:
      pageSize,

    possuiProxima:
      fim + 1 <
      Number(count || 0),
  };
}

/*
 * ============================================================
 * RESUMO
 * ============================================================
 *
 * Faz apenas contagens.
 * Não carrega cadastro completo.
 */
export async function obterResumoAuditoriaMoradores({
  condominioId,
} = {}) {
  if (!condominioId) {
    return {
      aguardando: 0,
      iniciada: 0,
      reauditoraPendente: 0,
      aprovadosHoje: 0,
      total: 0,
    };
  }

  const contarStatus =
    async (status) => {
      const {
        count,
        error,
      } = await supabase
        .from(
          "pre_cadastro_moradores"
        )
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
        .eq(
          "status_auditoria",
          status
        );

      if (error) {
        throw error;
      }

      return Number(
        count || 0
      );
    };

  const [
    aguardando,
    iniciada,
    reauditoraPendente,
  ] = await Promise.all([
    contarStatus(
      "AGUARDANDO_AUDITORIA"
    ),

    contarStatus(
      "AUDITORIA_INICIADA"
    ),

    contarStatus(
      "REAUDITORIA_PENDENTE"
    ),
  ]);

  return {
    aguardando,
    iniciada,
    reauditoraPendente,

    aprovadosHoje: 0,

    total:
      aguardando +
      iniciada +
      reauditoraPendente,
  };
}

/*
 * ============================================================
 * DETALHE
 * ============================================================
 *
 * Somente UM cadastro completo por vez.
 */
export async function obterDetalheAuditoriaMorador({
  condominioId,
  preCadastroId,
} = {}) {
  if (
    !condominioId ||
    !preCadastroId
  ) {
    throw new Error(
      "Cadastro não identificado."
    );
  }

  const {
    data,
    error,
  } = await supabase
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
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.id) {
    throw new Error(
      "Cadastro não encontrado."
    );
  }

  return normalizarDetalheAuditoria(
    data
  );
}

/*
 * ============================================================
 * INICIAR AUDITORIA
 * ============================================================
 */
export async function marcarAuditoriaIniciada({
  perfil,
  preCadastroId,
} = {}) {
  if (!preCadastroId) {
    throw new Error(
      "Cadastro não identificado."
    );
  }

  const condominioId =
    perfil?.condominio_id ||
    perfil?.condominio_atual_id ||
    perfil?.usuario_condominio
      ?.condominio_id ||
    null;

  if (!condominioId) {
    throw new Error(
      "Condomínio não identificado."
    );
  }

  const contexto =
    obterContextoNavegador();

  const {
    data,
    error,
  } = await supabase.rpc(
    "rpc_admin_morador_auditoria_iniciar_v1",
    {
      p_pre_cadastro_id:
        preCadastroId,

      p_ip:
        contexto.ip,

      p_user_agent:
        contexto.user_agent,
    }
  );

  if (error) {
    throw error;
  }

  if (
    data?.success === false
  ) {
    throw new Error(
      data?.error ||
      "Não foi possível iniciar a auditoria."
    );
  }

  return {
    success: true,
    status_auditoria:
      "AUDITORIA_INICIADA",
  };
}

/*
 * ============================================================
 * APROVAR
 * ============================================================
 */
export async function aprovarMoradorAuditoria({
  perfil,
  preCadastroId,
} = {}) {
  if (!preCadastroId) {
    throw new Error(
      "Cadastro não identificado."
    );
  }

  const condominioId =
    perfil?.condominio_id ||
    perfil?.condominio_atual_id ||
    perfil?.usuario_condominio
      ?.condominio_id ||
    null;

  if (!condominioId) {
    throw new Error(
      "Condomínio não identificado."
    );
  }

  const {
    data,
    error,
  } =
    await supabase.functions
      .invoke(
        "aprovar-morador",
        {
          body: {
            pre_cadastro_id:
              preCadastroId,

            condominio_id:
              condominioId,

            aprovado_por:
              perfil?.id ||
              null,

            aprovado_por_nome:
              perfil?.nome ||
              null,

            aprovado_por_email:
              perfil?.email ||
              null,
          },
        }
      );

  if (
    error ||
    data?.error
  ) {
    throw new Error(
      data?.error ||
      error?.message ||
      "Não foi possível aprovar o cadastro."
    );
  }

  return data;
}

/*
 * ============================================================
 * CORREÇÃO / REPROVAÇÃO
 * ============================================================
 */
export async function registrarDecisaoAuditoriaMorador({
  perfil,
  preCadastroId,
  decisao,
  observacao,
} = {}) {
  if (!preCadastroId) {
    throw new Error(
      "Cadastro não identificado."
    );
  }

  const condominioId =
    perfil?.condominio_id ||
    perfil?.condominio_atual_id ||
    perfil?.usuario_condominio
      ?.condominio_id ||
    null;

  if (!condominioId) {
    throw new Error(
      "Condomínio não identificado."
    );
  }

  const status =
    normalizarStatus(
      decisao
    );

  const contexto =
    obterContextoNavegador();

  if (
    status === "REPROVADO"
  ) {
    const motivo =
      String(
        observacao || ""
      ).trim();

    if (!motivo) {
      throw new Error(
        "Informe o motivo da reprovação."
      );
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      "rpc_admin_morador_auditoria_decidir_v1",
      {
        p_pre_cadastro_id:
          preCadastroId,

        p_acao:
          "REPROVAR",

        p_correlation_id:
          gerarUuidCliente(),

        p_idempotency_key:
          gerarUuidCliente(),

        p_observacoes:
          null,

        p_motivo:
          motivo,

        p_ip:
          contexto.ip,

        p_user_agent:
          contexto.user_agent,
      }
    );

    if (error) {
      throw error;
    }

    if (
      data?.success === false
    ) {
      throw new Error(
        data?.error ||
        "Não foi possível reprovar o cadastro."
      );
    }

    return data;
  }

  if (
    status ===
    "CORRECAO_SOLICITADA"
  ) {
    const observacoes =
      String(
        observacao || ""
      ).trim();

    if (!observacoes) {
      throw new Error(
        "Informe o que precisa ser corrigido."
      );
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      "solicitar_correcao_morador",
      {
        p_pre_cadastro_id:
          preCadastroId,

        p_admin_id:
          perfil?.id ||
          null,

        p_campos:
          [],

        p_observacoes:
          observacoes,

        p_ip:
          contexto.ip,

        p_user_agent:
          contexto.user_agent,
      }
    );

    if (error) {
      throw error;
    }

    const retorno =
      Array.isArray(data)
        ? data[0]
        : data;

    if (
      retorno?.success === false
    ) {
      throw new Error(
        retorno?.error ||
        "Não foi possível solicitar a correção."
      );
    }

    return (
      retorno || {
        success: true,
        status:
          "CORRECAO_SOLICITADA",
      }
    );
  }

  throw new Error(
    "Escolha uma decisão válida."
  );
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

  const {
    data,
    error,
  } = await supabase
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