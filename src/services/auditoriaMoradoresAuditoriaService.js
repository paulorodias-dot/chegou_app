import {
  parsePhoneNumberFromString,
} from "libphonenumber-js";

import { supabase } from "./supabase";

const STATUS_AUDITORIA_VALIDOS = [
  "AGUARDANDO_AUDITORIA",
  "AUDITORIA_INICIADA",
  "REAUDITORIA_PENDENTE",
];

function normalizarStatus(valor = "") {
  return String(valor || "").trim().toUpperCase();
}

function somenteNumeros(valor = "") {
  return String(valor || "").replace(/\D/g, "");
}

export function formatarStatusAuditoria(status = "") {
  return normalizarStatus(status).replaceAll("_", " ");
}

/**
 * Formata o CPF integralmente.
 *
 * Utilizado para o titular durante a auditoria administrativa,
 * pois o condomínio já possui o documento para conferência.
 *
 * Exemplo:
 * 85814776587 -> 858.147.765-87
 */
export function formatarCpfCompleto(cpf = "") {
  const numero = somenteNumeros(cpf);

  if (numero.length !== 11) {
    return "Não informado";
  }

  return numero.replace(
    /(\d{3})(\d{3})(\d{3})(\d{2})/,
    "$1.$2.$3-$4"
  );
}

/**
 * Mantém o CPF dos dependentes parcialmente oculto.
 *
 * Exemplo:
 * 04085625608 -> 040.***.***-08
 */
export function mascararCpf(cpf = "") {
  const numero = somenteNumeros(cpf);

  if (numero.length !== 11) {
    return "Não informado";
  }

  return `${numero.slice(0, 3)}.***.***-${numero.slice(-2)}`;
}

function normalizarDdi(ddi = "") {
  return somenteNumeros(ddi);
}

function montarNumeroInternacional({
  telefone,
  ddi,
  paisPadrao = "BR",
} = {}) {
  const telefoneOriginal = String(telefone || "").trim();

  if (!telefoneOriginal) {
    return "";
  }

  /*
   * O número já está no formato internacional.
   *
   * Exemplo:
   * +5511964268411
   */
  if (telefoneOriginal.startsWith("+")) {
    return `+${somenteNumeros(telefoneOriginal)}`;
  }

  let numero = somenteNumeros(telefoneOriginal);

  if (!numero) {
    return "";
  }

  /*
   * Remove prefixos internacionais comuns.
   *
   * Exemplos:
   * 005511964268411
   * 0115511964268411
   */
  if (numero.startsWith("00")) {
    numero = numero.slice(2);

    return numero ? `+${numero}` : "";
  }

  const ddiNormalizado = normalizarDdi(ddi);

  /*
   * Número já contém o DDI informado.
   */
  if (
    ddiNormalizado &&
    numero.startsWith(ddiNormalizado) &&
    numero.length > ddiNormalizado.length + 7
  ) {
    return `+${numero}`;
  }

  /*
   * Número brasileiro já contém 55.
   */
  if (
    paisPadrao === "BR" &&
    numero.startsWith("55") &&
    numero.length >= 12
  ) {
    return `+${numero}`;
  }

  /*
   * Remove zero de operadora ou tronco nacional quando houver.
   *
   * Exemplo:
   * 011964268411 -> 11964268411
   */
  if (
    paisPadrao === "BR" &&
    numero.startsWith("0") &&
    numero.length >= 11
  ) {
    numero = numero.replace(/^0+/, "");
  }

  if (ddiNormalizado) {
    return `+${ddiNormalizado}${numero}`;
  }

  /*
   * O projeto opera inicialmente no Brasil.
   */
  if (paisPadrao === "BR") {
    return `+55${numero}`;
  }

  return `+${numero}`;
}

function formatarTelefoneBrasil(numeroNacional = "") {
  const numero = somenteNumeros(numeroNacional);

  if (numero.length !== 10 && numero.length !== 11) {
    return "";
  }

  const ddd = numero.slice(0, 2);
  const telefone = numero.slice(2);

  if (telefone.length === 9) {
    return `+55 (${ddd}) ${telefone.slice(0, 5)}-${telefone.slice(5)}`;
  }

  return `+55 (${ddd}) ${telefone.slice(0, 4)}-${telefone.slice(4)}`;
}

/**
 * Formata telefones utilizando DDI e o padrão do país.
 *
 * Brasil:
 * +5511964268411 -> +55 (11) 96426-8411
 *
 * Outros países:
 * utiliza o formato internacional fornecido por libphonenumber-js.
 */
export function formatarTelefoneInternacional({
  telefone,
  ddi,
  paisPadrao = "BR",
} = {}) {
  const numeroInternacional = montarNumeroInternacional({
    telefone,
    ddi,
    paisPadrao,
  });

  if (!numeroInternacional) {
    return "Não informado";
  }

  try {
    const telefoneInterpretado =
      parsePhoneNumberFromString(numeroInternacional);

    if (!telefoneInterpretado) {
      return numeroInternacional;
    }

    if (
      telefoneInterpretado.countryCallingCode === "55"
    ) {
      const telefoneBrasil = formatarTelefoneBrasil(
        telefoneInterpretado.nationalNumber
      );

      if (telefoneBrasil) {
        return telefoneBrasil;
      }
    }

    return telefoneInterpretado.formatInternational();
  } catch {
    return numeroInternacional;
  }
}

function converterDataNascimento(dataNascimento) {
  if (!dataNascimento) {
    return null;
  }

  if (dataNascimento instanceof Date) {
    return Number.isNaN(dataNascimento.getTime())
      ? null
      : dataNascimento;
  }

  const valor = String(dataNascimento).trim();

  /*
   * Formato brasileiro:
   * DD/MM/AAAA
   */
  const formatoBrasileiro = valor.match(
    /^(\d{2})\/(\d{2})\/(\d{4})$/
  );

  if (formatoBrasileiro) {
    const [, dia, mes, ano] = formatoBrasileiro;

    const data = new Date(
      Number(ano),
      Number(mes) - 1,
      Number(dia)
    );

    if (
      data.getFullYear() === Number(ano) &&
      data.getMonth() === Number(mes) - 1 &&
      data.getDate() === Number(dia)
    ) {
      return data;
    }

    return null;
  }

  /*
   * Formatos ISO:
   * AAAA-MM-DD
   * AAAA-MM-DDTHH:mm:ss
   */
  const data = new Date(valor);

  return Number.isNaN(data.getTime()) ? null : data;
}

export function calcularIdade(dataNascimento) {
  const nascimento = converterDataNascimento(dataNascimento);

  if (!nascimento) {
    return null;
  }

  const hoje = new Date();

  let idade =
    hoje.getFullYear() - nascimento.getFullYear();

  const diferencaMes =
    hoje.getMonth() - nascimento.getMonth();

  if (
    diferencaMes < 0 ||
    (
      diferencaMes === 0 &&
      hoje.getDate() < nascimento.getDate()
    )
  ) {
    idade -= 1;
  }

  return idade >= 0 ? idade : null;
}

function valorOuNaoInformado(valor) {
  if (
    valor === null ||
    valor === undefined ||
    String(valor).trim() === ""
  ) {
    return "Não informado";
  }

  return valor;
}

function montarResumoAuditoria(registro = {}) {
  const dependentes = Array.isArray(registro.dependentes)
    ? registro.dependentes
    : [];

  const funcionarios = Array.isArray(
    registro.funcionarios_lar
  )
    ? registro.funcionarios_lar
    : [];

  const pets = Array.isArray(registro.pets)
    ? registro.pets
    : [];

  const veiculos = Array.isArray(registro.veiculos)
    ? registro.veiculos
    : [];

  const garagem = Array.isArray(registro.garagem)
    ? registro.garagem
    : [];

  const conflitosGaragem = garagem.filter(
    (item) => item?.conflito === true
  );

  return {
    dependentes: dependentes.length,
    funcionarios: funcionarios.length,
    pets: pets.length,
    veiculos: veiculos.length,
    garagem: garagem.length,
    conflitosGaragem: conflitosGaragem.length,
    possuiConflitoGaragem:
      conflitosGaragem.length > 0,
  };
}

function ordenarDependentesPorIdade(dependentes = []) {
  return [...dependentes].sort((a, b) => {
    const idadeA =
      a.idade ??
      calcularIdade(
        a.data_nascimento_iso ||
          a.data_nascimento
      ) ??
      -1;

    const idadeB =
      b.idade ??
      calcularIdade(
        b.data_nascimento_iso ||
          b.data_nascimento
      ) ??
      -1;

    return idadeB - idadeA;
  });
}

function objetoSeguro(valor) {
  return (
    valor &&
    typeof valor === "object" &&
    !Array.isArray(valor)
  )
    ? valor
    : {};
}

function primeiroArrayValido(...valores) {
  for (const valorAtual of valores) {
    if (
      Array.isArray(valorAtual) &&
      valorAtual.length > 0
    ) {
      return valorAtual;
    }
  }

  const arrayVazio = valores.find(
    (valorAtual) => Array.isArray(valorAtual)
  );

  return arrayVazio || [];
}

function primeiroValorPreenchido(...valores) {
  return valores.find(
    (valorAtual) =>
      valorAtual !== null &&
      valorAtual !== undefined &&
      String(valorAtual).trim() !== ""
  );
}

function normalizarDependente(dependente = {}) {
  const ddi = primeiroValorPreenchido(
    dependente.ddi,
    dependente.codigo_pais,
    dependente.country_calling_code,
    dependente.countryCallingCode
  );

  const telefoneOriginal =
    primeiroValorPreenchido(
      dependente.whatsapp_e164,
      dependente.whatsapp,
      dependente.telefone,
      dependente.celular
    );

  const whatsappFormatado =
    formatarTelefoneInternacional({
      telefone: telefoneOriginal,
      ddi,
      paisPadrao: "BR",
    });

  const cpfDependente =
    primeiroValorPreenchido(
      dependente.cpf_formatado,
      dependente.cpf
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
      dependente.tipoVinculo ||
      dependente.vinculo ||
      dependente.relacao ||
      "",

    /*
     * CPF de dependentes permanece parcialmente oculto.
     */
    cpf_mascarado: mascararCpf(cpfDependente),

    telefone: whatsappFormatado,
    whatsapp: whatsappFormatado,
    whatsapp_formatado: whatsappFormatado,

    ddi:
      ddi
        ? `+${normalizarDdi(ddi)}`
        : "",

    login_proprio: Boolean(
      dependente.login_proprio ??
        dependente.acesso_proprio_futuro ??
        dependente.acessoProprio ??
        dependente.acesso_proprio ??
        dependente.possuiAcesso ??
        dependente.possui_acesso
    ),

    permite_retirada: Boolean(
      dependente.permite_retirada ??
        dependente.retira_portaria ??
        dependente.autorizadoRetirada ??
        dependente.autorizado_retirada ??
        dependente.podeRetirarEncomendas ??
        dependente.pode_retirar_encomendas
    ),

    recebe_encomendas: Boolean(
      dependente.recebe_encomendas ??
        dependente.recebeEncomendas ??
        dependente.podeReceberEncomendas ??
        dependente.pode_receber_encomendas
    ),

    autorizacao_menor_16: Boolean(
      dependente.autorizacao_menor_16 ??
        dependente.menor_16_ciencia
    ),

    idade:
      dependente.idade ??
      calcularIdade(
        dependente.data_nascimento_iso ||
          dependente.data_nascimento
      ),
  };
}

function normalizarFuncionario(funcionario = {}) {
  const ddi = primeiroValorPreenchido(
    funcionario.ddi,
    funcionario.codigo_pais,
    funcionario.country_calling_code,
    funcionario.countryCallingCode
  );

  const telefoneOriginal =
    primeiroValorPreenchido(
      funcionario.whatsapp_e164,
      funcionario.whatsapp,
      funcionario.telefone,
      funcionario.celular
    );

  const whatsappFormatado =
    formatarTelefoneInternacional({
      telefone: telefoneOriginal,
      ddi,
      paisPadrao: "BR",
    });

  return {
    ...funcionario,

    nome:
      funcionario.nome ||
      funcionario.nomeCompleto ||
      funcionario.nome_completo ||
      "",

    telefone: whatsappFormatado,
    whatsapp: whatsappFormatado,
    whatsapp_formatado: whatsappFormatado,

    ddi:
      ddi
        ? `+${normalizarDdi(ddi)}`
        : "",
  };
}

function normalizarPet(pet = {}) {
  return {
    ...pet,
    tipo:
      pet.tipo ||
      pet.especie ||
      "",
  };
}

function normalizarVeiculo(veiculo = {}) {
  return {
    ...veiculo,
    tipo:
      veiculo.tipo ||
      veiculo.categoria ||
      "",
  };
}

function formatarSituacaoVaga(situacao = "") {
  const mapa = {
    propria: "Própria",
    vaga_propria: "Própria",
    propria_uso: "Própria em uso",
    alugada: "Alugada",
    alugada_terceiro: "Alugada de terceiro",
    propria_alugada_terceiro:
      "Própria alugada a terceiro",
    cedida: "Cedida",
    emprestada: "Emprestada",
  };

  return (
    mapa[String(situacao || "").toLowerCase()] ||
    String(situacao || "")
      .replaceAll("_", " ")
      .replace(
        /\b\w/g,
        (letra) => letra.toUpperCase()
      ) ||
    "Não informado"
  );
}

function normalizarVaga(vaga = {}) {
  const situacaoOriginal =
    vaga.situacao ||
    vaga.vinculo ||
    vaga.tipo_vaga ||
    "";

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

    vinculo: formatarSituacaoVaga(
      situacaoOriginal
    ),

    situacao_original: situacaoOriginal,

    unidade_vinculada:
      vaga.unidade_vinculada ||
      vaga.unidade_origem ||
      "",

    conflito: vaga.conflito === true,
  };
}

function normalizarRegistroAuditoria(item = {}) {
  const raw = item.raw || item;

  const dadosComplementares = objetoSeguro(
    raw.dados_complementares
  );

  const wizardFinal = objetoSeguro(
    dadosComplementares.wizard_final
  );

  const tela1 = objetoSeguro(
    wizardFinal.tela1 ||
      dadosComplementares.tela1
  );

  const tela2 = objetoSeguro(
    wizardFinal.tela2 ||
      dadosComplementares.tela2
  );

  const tela3 = objetoSeguro(
    wizardFinal.tela3
  );

  const tela4 = objetoSeguro(
    wizardFinal.tela4
  );

  const tela5 = objetoSeguro(
    wizardFinal.tela5 ||
      dadosComplementares.tela5
  );

  const dependentesBrutos =
    primeiroArrayValido(
      raw.dependentes,
      dadosComplementares.pessoas_vinculadas,
      tela3.dependentes
    );

  const funcionariosBrutos =
    primeiroArrayValido(
      raw.funcionarios_lar,
      dadosComplementares.funcionarios_lar,
      tela4.funcionariosLar,
      tela4.funcionarios_lar
    );

  const petsBrutos = primeiroArrayValido(
    raw.pets,
    dadosComplementares.pets,
    tela4.pets
  );

  const veiculosBrutos =
    primeiroArrayValido(
      raw.veiculos,
      dadosComplementares.veiculos,
      tela5.veiculos
    );

  const vagasBrutas = primeiroArrayValido(
    raw.garagem,
    dadosComplementares.vagas,
    tela5.vagas
  );

  const dependentes =
    ordenarDependentesPorIdade(
      dependentesBrutos.map(
        normalizarDependente
      )
    );

  const funcionariosLar =
    funcionariosBrutos.map(
      normalizarFuncionario
    );

  const pets = petsBrutos.map(
    normalizarPet
  );

  const veiculos = veiculosBrutos.map(
    normalizarVeiculo
  );

  const garagem = vagasBrutas.map(
    normalizarVaga
  );

  const cpfResponsavel =
    primeiroValorPreenchido(
      raw.cpf,
      raw.documento_cpf_cnpj,
      dadosComplementares.cpf_formatado,
      dadosComplementares.cpf,
      tela2.cpf
    );

  const ddiResponsavel =
    primeiroValorPreenchido(
      tela2.ddi,
      dadosComplementares.ddi,
      dadosComplementares.codigo_pais,
      "55"
    );

  const telefoneResponsavel =
    primeiroValorPreenchido(
      dadosComplementares.whatsapp_e164,
      raw.telefone,
      tela2.whatsapp,
      dadosComplementares.whatsapp
    );

  const telefoneResponsavelFormatado =
    formatarTelefoneInternacional({
      telefone: telefoneResponsavel,
      ddi: ddiResponsavel,
      paisPadrao: "BR",
    });

  const resumo = montarResumoAuditoria({
    dependentes,
    funcionarios_lar: funcionariosLar,
    pets,
    veiculos,
    garagem,
  });

  return {
    id: raw.id,

    pre_cadastro_id:
      raw.pre_cadastro_id ||
      raw.id,

    business_id: raw.business_id,

    nome: valorOuNaoInformado(
      primeiroValorPreenchido(
        raw.nome,
        tela2.nomeCompleto,
        dadosComplementares.nome
      )
    ),

    email: valorOuNaoInformado(
      primeiroValorPreenchido(
        raw.email,
        tela2.emailPrincipal,
        dadosComplementares.email
      )
    ),

    telefone: telefoneResponsavelFormatado,
    whatsapp: telefoneResponsavelFormatado,
    whatsapp_formatado:
      telefoneResponsavelFormatado,

    ddi:
      ddiResponsavel
        ? `+${normalizarDdi(ddiResponsavel)}`
        : "Não informado",

    /*
     * CPF do titular exibido integralmente
     * para conferência administrativa.
     */
    cpf: formatarCpfCompleto(
      cpfResponsavel
    ),

    perfil_morador: valorOuNaoInformado(
      primeiroValorPreenchido(
        raw.perfil_morador,
        raw.tipo_morador,
        raw.perfil_unidade,
        dadosComplementares.perfil_unidade,
        tela1.perfilUnidade
      )
    ),

    torre: valorOuNaoInformado(
      raw.torre ||
      raw.bloco
    ),

    unidade: valorOuNaoInformado(
      raw.unidade
    ),

    status_auditoria:
      normalizarStatus(
        raw.status_auditoria
      ) ||
      "AGUARDANDO_AUDITORIA",

    status_preenchimento:
      normalizarStatus(
        raw.status_preenchimento ||
          raw.status_cadastro
      ) ||
      "WIZARD FINALIZADO",

    percentual_preenchimento:
      Number(
        raw.percentual_preenchimento ||
          100
      ),

    wizard_finalizado_em:
      raw.wizard_finalizado_em ||
      raw.finalizado_em ||
      dadosComplementares
        .finalizacao?.finalizado_em ||
      raw.atualizado_em ||
      raw.criado_em,

    atualizado_em: raw.atualizado_em,
    criado_em: raw.criado_em,

    identificacao_unidade:
      raw.identificacao_unidade ||
      tela1 ||
      {},

    dados_responsavel: {
      ...dadosComplementares,
      ...tela2,
      ...raw,

      cpf: formatarCpfCompleto(
        cpfResponsavel
      ),

      cpf_formatado:
        formatarCpfCompleto(
          cpfResponsavel
        ),

      ddi:
        ddiResponsavel
          ? `+${normalizarDdi(
              ddiResponsavel
            )}`
          : "",

      telefone:
        telefoneResponsavelFormatado,

      whatsapp:
        telefoneResponsavelFormatado,

      whatsapp_formatado:
        telefoneResponsavelFormatado,
    },

    dependentes,
    funcionarios_lar: funcionariosLar,
    pets,
    veiculos,
    garagem,

    preferencias: {
      ...(raw.preferencias || {}),

      canal_preferencial:
        raw.preferencias
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

      notificacoes: Boolean(
        dadosComplementares
          .notificacao_push ||
        dadosComplementares
          .notificacao_whatsapp ||
        dadosComplementares
          .notificacao_email
      ),

      push: Boolean(
        dadosComplementares
          .notificacao_push
      ),

      whatsapp: Boolean(
        dadosComplementares
          .notificacao_whatsapp
      ),

      email: Boolean(
        dadosComplementares
          .notificacao_email
      ),
    },

    divergencias: Array.isArray(
      raw.divergencias
    )
      ? raw.divergencias
      : [],

    resumo,

    estrutura_garagem: {
      possui_vaga: Boolean(
        dadosComplementares
          .possui_vaga ??
        tela5.possuiVaga ??
        garagem.length
      ),

      garagem_situacao:
        dadosComplementares
          .garagem_situacao ||
        tela5.garagemSituacao ||
        null,

      vagas: garagem,
    },

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
    throw new Error(
      "Condomínio não identificado."
    );
  }

  const { data, error } = await supabase
    .from("pre_cadastro_moradores")
    .select("*")
    .eq(
      "condominio_id",
      condominioId
    )
    .in(
      "status_auditoria",
      STATUS_AUDITORIA_VALIDOS
    )
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
    .limit(limite);

  if (error) {
    throw error;
  }

  const termo = String(
    busca || ""
  )
    .trim()
    .toLowerCase();

  const termoNumerico =
    somenteNumeros(busca);

  return (data || [])
    .map(normalizarRegistroAuditoria)
    .filter((item) => {
      if (
        status !== "TODOS" &&
        normalizarStatus(
          item.status_auditoria
        ) !== normalizarStatus(status)
      ) {
        return false;
      }

      if (
        torre !== "TODAS" &&
        String(item.torre).trim() !==
          String(torre).trim()
      ) {
        return false;
      }

      if (
        unidade !== "TODAS" &&
        String(item.unidade).trim() !==
          String(unidade).trim()
      ) {
        return false;
      }

      if (!termo) {
        return true;
      }

      const textoPesquisa = [
        item.nome,
        item.email,
        item.telefone,
        item.whatsapp,
        item.cpf,
        item.torre,
        item.unidade,
        item.business_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (
        textoPesquisa.includes(termo)
      ) {
        return true;
      }

      if (termoNumerico) {
        const textoNumerico =
          somenteNumeros(
            textoPesquisa
          );

        return textoNumerico.includes(
          termoNumerico
        );
      }

      return false;
    });
}

export async function obterResumoAuditoriaMoradores({
  condominioId,
} = {}) {
  const registros =
    await listarMoradoresParaAuditoria({
      condominioId,
      limite: 1000,
    });

  const hoje = new Date()
    .toISOString()
    .slice(0, 10);

  return {
    aguardando: registros.filter(
      (item) =>
        item.status_auditoria ===
        "AGUARDANDO_AUDITORIA"
    ).length,

    iniciada: registros.filter(
      (item) =>
        item.status_auditoria ===
        "AUDITORIA_INICIADA"
    ).length,

    reauditoraPendente:
      registros.filter(
        (item) =>
          item.status_auditoria ===
          "REAUDITORIA_PENDENTE"
      ).length,

    conflitosGaragem:
      registros.filter(
        (item) =>
          item.resumo
            ?.possuiConflitoGaragem
      ).length,

    aprovadosHoje:
      registros.filter(
        (item) =>
          item.status_auditoria ===
            "APROVADO" &&
          String(
            item.atualizado_em || ""
          ).slice(0, 10) === hoje
      ).length,

    total: registros.length,
  };
}

export async function marcarAuditoriaIniciada({
  perfil,
  preCadastroId,
} = {}) {
  if (!preCadastroId) {
    throw new Error(
      "Pré-cadastro não identificado."
    );
  }

  if (!perfil?.condominio_id) {
    throw new Error(
      "Condomínio não identificado no perfil."
    );
  }

  const {
    data: atual,
    error: erroBusca,
  } = await supabase
    .from("pre_cadastro_moradores")
    .select(
      "id, status_auditoria"
    )
    .eq(
      "id",
      preCadastroId
    )
    .eq(
      "condominio_id",
      perfil.condominio_id
    )
    .maybeSingle();

  if (erroBusca) {
    throw erroBusca;
  }

  if (!atual?.id) {
    throw new Error(
      "Cadastro não encontrado para auditoria."
    );
  }

  if (
    normalizarStatus(
      atual.status_auditoria
    ) !== "AGUARDANDO_AUDITORIA"
  ) {
    return atual;
  }

  const { data, error } =
    await supabase
      .from(
        "pre_cadastro_moradores"
      )
      .update({
        status_auditoria:
          "AUDITORIA_INICIADA",
        atualizado_em:
          new Date().toISOString(),
      })
      .eq(
        "id",
        preCadastroId
      )
      .eq(
        "condominio_id",
        perfil.condominio_id
      )
      .select("*")
      .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function registrarDecisaoAuditoriaMorador({
  perfil,
  preCadastroId,
  decisao,
  observacao,
} = {}) {
  if (!preCadastroId) {
    throw new Error(
      "Pré-cadastro não identificado."
    );
  }

  if (!perfil?.condominio_id) {
    throw new Error(
      "Condomínio não identificado no perfil."
    );
  }

  const statusDecisao =
    normalizarStatus(decisao);

  const statusPermitidos = [
    "APROVADO",
    "CORRECAO_SOLICITADA",
    "REPROVADO",
  ];

  if (
    !statusPermitidos.includes(
      statusDecisao
    )
  ) {
    throw new Error(
      "Decisão de auditoria inválida."
    );
  }

  if (
    [
      "CORRECAO_SOLICITADA",
      "REPROVADO",
    ].includes(statusDecisao) &&
    !String(observacao || "").trim()
  ) {
    throw new Error(
      "Informe a observação para esta decisão."
    );
  }

  const payload = {
    status_auditoria: statusDecisao,
    atualizado_em:
      new Date().toISOString(),
  };

  if (
    statusDecisao ===
    "CORRECAO_SOLICITADA"
  ) {
    payload.observacoes_correcao =
      String(
        observacao || ""
      ).trim();
  }

  if (
    statusDecisao === "REPROVADO"
  ) {
    payload.motivo_reprovacao =
      String(
        observacao || ""
      ).trim();
  }

  const { data, error } =
    await supabase
      .from(
        "pre_cadastro_moradores"
      )
      .update(payload)
      .eq(
        "id",
        preCadastroId
      )
      .eq(
        "condominio_id",
        perfil.condominio_id
      )
      .select("*")
      .single();

  if (error) {
    throw error;
  }

  return data;
}

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