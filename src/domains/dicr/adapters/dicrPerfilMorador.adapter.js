/**
 * ============================================================
 * SISTEMA CHEGOU!
 * DICR → PERFIL DO MORADOR
 * ============================================================
 *
 * Responsabilidade:
 * transformar o contrato canônico do DICR nos contratos
 * visuais consumidos pelo Perfil do Morador.
 *
 * Este Adapter:
 * - não consulta Supabase;
 * - não autoriza acesso;
 * - não consulta Wizard ou pré-cadastro;
 * - não escolhe arbitrariamente contexto residencial;
 * - não cria fallback para fontes externas ao DICR;
 * - não inventa semânticas ainda não consolidadas.
 * ============================================================
 */


function objetoValido(valor) {
  return (
    valor !== null &&
    typeof valor === "object" &&
    !Array.isArray(valor)
  );
}


function textoOuNull(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return null;
  }

  const texto =
    String(valor).trim();

  return texto || null;
}


/**
 * ============================================================
 * CONTEXTO RESIDENCIAL
 * ============================================================
 *
 * Nunca selecionar contextos[0].
 *
 * Uma mesma pessoa pode possuir:
 * - mais de uma unidade no mesmo condomínio;
 * - unidades em condomínios diferentes.
 *
 * O Adapter utiliza somente o contexto que o DICR declarou
 * explicitamente como único.
 * ============================================================
 */
function obterContextoUnico(dicr) {
  if (!objetoValido(dicr)) {
    return null;
  }

  if (dicr.selecao_necessaria === true) {
    return null;
  }

  if (!objetoValido(dicr.contexto)) {
    return null;
  }

  return dicr.contexto;
}


/**
 * ============================================================
 * APRESENTAÇÃO — TORRE / BLOCO
 * ============================================================
 *
 * Regra visual:
 *
 * identificador + nome
 * Exemplo:
 * 1 · Moca
 *
 * Se um dos elementos não existir, apresenta apenas
 * o elemento oficial disponível.
 *
 * torre_legado / bloco_legado permanecem como compatibilidade
 * interna do próprio DICR.
 * ============================================================
 */
function montarTorreBloco(residencia) {
  const identificador =
    textoOuNull(
      residencia?.torre_identificador
    );

  const nome =
    textoOuNull(
      residencia?.torre_nome
    );

  if (identificador && nome) {
    /*
     * Evita repetição caso, excepcionalmente,
     * identificador e nome sejam iguais.
     */
    if (
      identificador.toLocaleLowerCase(
        "pt-BR"
      ) ===
      nome.toLocaleLowerCase(
        "pt-BR"
      )
    ) {
      return nome;
    }

    return `${identificador} · ${nome}`;
  }

  if (nome) {
    return nome;
  }

  if (identificador) {
    return identificador;
  }

  return (
    textoOuNull(
      residencia?.torre_legado
    ) ??
    textoOuNull(
      residencia?.bloco_legado
    )
  );
}


/**
 * ============================================================
 * APRESENTAÇÃO — TIPO DE VÍNCULO RESIDENCIAL
 * ============================================================
 *
 * Converte somente valores conhecidos para linguagem
 * adequada ao Morador.
 *
 * Valores desconhecidos não recebem interpretação inventada:
 * são apenas humanizados para evitar exposição de código
 * técnico cru na interface.
 * ============================================================
 */
function formatarTipoVinculo(valor) {
  const original =
    textoOuNull(valor);

  if (!original) {
    return null;
  }

  const chave =
    original
      .trim()
      .toLocaleLowerCase("pt-BR")
      .replace(/[\s-]+/g, "_");

  const conhecidos = {
    proprietario:
      "Proprietário",

    proprietario_residente:
      "Proprietário residente",

    proprietario_nao_residente:
      "Proprietário não residente",

    inquilino:
      "Inquilino",

    inquilino_residente:
      "Inquilino residente",

    morador:
      "Morador",

    dependente:
      "Dependente",
  };

  if (conhecidos[chave]) {
    return conhecidos[chave];
  }

  /*
   * Para valor ainda não catalogado:
   * remove convenções técnicas de apresentação,
   * sem atribuir uma semântica nova.
   */
  const humanizado =
    original
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLocaleLowerCase("pt-BR");

  if (!humanizado) {
    return null;
  }

  return (
    humanizado.charAt(0)
      .toLocaleUpperCase("pt-BR") +
    humanizado.slice(1)
  );
}


/**
 * ============================================================
 * PERFIL.01 — CABEÇALHO
 * ============================================================
 */
export function adaptarDICRParaCabecalhoPerfil(
  dicr
) {
  const contexto =
    obterContextoUnico(dicr);

  if (!contexto) {
    return null;
  }

  const identidade =
    objetoValido(contexto.identidade)
      ? contexto.identidade
      : {};

  const conta =
    objetoValido(contexto.conta)
      ? contexto.conta
      : {};

  const organizacao =
    objetoValido(contexto.organizacao)
      ? contexto.organizacao
      : {};

  const residencia =
    objetoValido(contexto.residencia)
      ? contexto.residencia
      : {};

  return {
    nomeExibicao:
      textoOuNull(
        identidade.nome_exibicao
      ),

    condominioNome:
      textoOuNull(
        organizacao.condominio_nome
      ),

    torreIdentificador:
      textoOuNull(
        residencia.torre_identificador
      ),

    torreNome:
      textoOuNull(
        residencia.torre_nome
      ),

    torre:
      textoOuNull(
        residencia.torre_legado
      ),

    unidade:
      textoOuNull(
        residencia.unidade
      ) ??
      textoOuNull(
        residencia.unidade_legado
      ),

    fotoPerfil:
      textoOuNull(
        conta.foto_perfil
      ),
  };
}


/**
 * ============================================================
 * PERFIL.05 — MINHA CONTA
 * ============================================================
 */
export function adaptarDICRParaContaPerfil(
  dicr
) {
  const contexto =
    obterContextoUnico(dicr);

  if (!contexto) {
    return null;
  }

  const conta =
    objetoValido(contexto.conta)
      ? contexto.conta
      : {};

  return {
    situacaoConta: null,

    situacaoContaTipo:
      "neutro",

    emailAcesso:
      textoOuNull(
        conta.email_login
      ),

    dataCadastro: null,
  };
}


/**
 * ============================================================
 * PERFIL.02 — DADOS PESSOAIS
 * ============================================================
 */
export function adaptarDICRParaDadosPessoaisPerfil(
  dicr
) {
  const contexto =
    obterContextoUnico(dicr);

  if (!contexto) {
    return null;
  }

  const identidade =
    objetoValido(contexto.identidade)
      ? contexto.identidade
      : {};

  return {
    nomeCompleto:
      textoOuNull(
        identidade.nome_civil
      ),

    nomeSocial:
      textoOuNull(
        identidade.nome_social
      ),

    cpf:
      textoOuNull(
        identidade.cpf
      ),

    dataNascimento:
      textoOuNull(
        identidade.data_nascimento
      ),
  };
}


/**
 * ============================================================
 * PERFIL.03 — CONTATO
 * ============================================================
 */
export function adaptarDICRParaContatoPerfil(
  dicr
) {
  const contexto =
    obterContextoUnico(dicr);

  if (!contexto) {
    return null;
  }

  const contato =
    objetoValido(contexto.contato)
      ? contexto.contato
      : {};

  return {
    telefone:
      textoOuNull(
        contato.telefone
      ),

    email:
      textoOuNull(
        contato.email
      ),
  };
}


/**
 * ============================================================
 * PERFIL.04 — MINHA UNIDADE
 * ============================================================
 *
 * O Card é uma projeção do contexto residencial oficial.
 *
 * Não permite:
 * - selecionar contextos[0];
 * - consultar Wizard;
 * - utilizar IDs enviados pelo frontend como autorização;
 * - criar vínculo residencial por inferência.
 * ============================================================
 */
export function adaptarDICRParaMinhaUnidadePerfil(
  dicr
) {
  const contexto =
    obterContextoUnico(dicr);

  if (!contexto) {
    return null;
  }

  const organizacao =
    objetoValido(contexto.organizacao)
      ? contexto.organizacao
      : {};

  const residencia =
    objetoValido(contexto.residencia)
      ? contexto.residencia
      : {};

  return {
    condominio:
      textoOuNull(
        organizacao.condominio_nome
      ),

    torreBloco:
      montarTorreBloco(
        residencia
      ),

    unidade:
      textoOuNull(
        residencia.unidade
      ) ??
      textoOuNull(
        residencia.unidade_legado
      ),

    tipoVinculo:
      formatarTipoVinculo(
        residencia.tipo_morador
      ),
  };
}

/**
 * ============================================================
 * PERFIL MORADOR — CARD 06
 * MINHA FAMÍLIA E VÍNCULOS
 * ============================================================
 *
 * Adapta exclusivamente a projeção especializada retornada por:
 *
 * rpc_morador_familia_vinculos_resumo_v1
 *
 * para o contrato visual esperado por FamiliaVinculos.jsx.
 *
 * IMPORTANTE:
 * - não consulta tabelas;
 * - não calcula autorização;
 * - não mistura domínios;
 * - não converte ausência de dado em zero;
 * - zero só é aceito quando veio oficialmente do backend.
 * ============================================================
 */

function quantidadeOficialOuNull(valor) {
  /*
   * Não utilizar Number(valor) diretamente.
   *
   * Number(null) === 0
   * Number("") === 0
   *
   * Isso faria ausência de informação parecer um zero oficial.
   */
  if (
    typeof valor !== "number" ||
    !Number.isFinite(valor) ||
    valor < 0
  ) {
    return null;
  }

  return Math.floor(valor);
}

export function adaptarResumoFamiliaVinculosParaPerfil(
  resposta
) {
  if (
    !objetoValido(resposta) ||
    resposta.success !== true ||
    !objetoValido(resposta.resumo)
  ) {
    return null;
  }

  const resumo = resposta.resumo;

  const dependentes =
    quantidadeOficialOuNull(
      resumo.dependentes_total
    );

  const funcionarios =
    quantidadeOficialOuNull(
      resumo.funcionarios_total
    );

  const pets =
    quantidadeOficialOuNull(
      resumo.pets_total
    );

  const autorizacoesAtivas =
    quantidadeOficialOuNull(
      resumo.autorizacoes_ativas_total
    );

  /*
   * O contrato do Card 06 exige os quatro indicadores.
   *
   * Se qualquer um estiver ausente/inválido, não entregamos
   * um objeto parcialmente preenchido ao componente.
   *
   * Isso evita que FamiliaVinculos.jsx transforme null em 0
   * por meio da normalização visual existente.
   */
  if (
    dependentes === null ||
    funcionarios === null ||
    pets === null ||
    autorizacoesAtivas === null
  ) {
    return null;
  }

  return {
    dependentes,
    funcionarios,
    pets,
    autorizacoesAtivas,
  };
}

/**
 * ============================================================
 * PERFIL MORADOR — CARD 07
 * MEUS VEÍCULOS
 * ============================================================
 *
 * Adapta exclusivamente a projeção especializada retornada por:
 *
 * rpc_morador_veiculos_resumo_v1
 *
 * para o contrato visual esperado por Veiculos.jsx.
 *
 * IMPORTANTE:
 * - não consulta tabelas;
 * - não calcula autorização;
 * - não cria veículos;
 * - não cria associação veículo/vaga;
 * - não inventa veículo principal;
 * - não converte ausência de informação em zero oficial;
 * - não transforma ausência de vaga em uma vaga fictícia.
 * ============================================================
 */

function montarNomeVeiculo(veiculo) {
  if (!objetoValido(veiculo)) {
    return null;
  }

  const marca =
    textoOuNull(veiculo.marca);

  const modelo =
    textoOuNull(veiculo.modelo);

  if (marca && modelo) {
    return `${marca} ${modelo}`;
  }

  return (
    marca ??
    modelo ??
    textoOuNull(veiculo.tipo)
  );
}


export function adaptarResumoVeiculosParaPerfil(
  resposta
) {
  if (
    !objetoValido(resposta) ||
    resposta.success !== true ||
    !objetoValido(resposta.resumo) ||
    !Array.isArray(resposta.veiculos)
  ) {
    return null;
  }


  const quantidade =
    quantidadeOficialOuNull(
      resposta.resumo.quantidade
    );


  if (quantidade === null) {
    return null;
  }


  /*
   * Defesa de integridade:
   *
   * a quantidade oficial precisa corresponder à lista
   * efetivamente devolvida pelo contrato.
   *
   * Não corrigimos divergência silenciosamente no frontend.
   */
  if (
    quantidade !==
    resposta.veiculos.length
  ) {
    return null;
  }


  const veiculos =
    resposta.veiculos.map(
      (veiculo) => {
        const vaga =
          objetoValido(veiculo?.vaga)
            ? textoOuNull(
                veiculo.vaga
                  ?.identificacao
              )
            : null;


        return {
          nome:
            montarNomeVeiculo(
              veiculo
            ),

          placa:
            textoOuNull(
              veiculo?.placa
            ),

          vaga,

          /*
           * O domínio oficial ainda não possui conceito
           * consolidado de "veículo principal".
           *
           * `false` existe somente para compatibilidade com
           * o contrato visual atual de Veiculos.jsx.
           */
          principal: false,
        };
      }
    );


  return {
    quantidade,
    veiculos,
  };
}

/**
 * ============================================================
 * PERFIL MORADOR — CARD 08
 * VAGAS DE GARAGEM
 * ============================================================
 *
 * Adapta exclusivamente a projeção read-only retornada por:
 *
 * rpc_morador_vagas_resumo_v1
 *
 * REGRAS:
 * - a origem é a unidade residencial oficial;
 * - não deriva vagas dos veículos;
 * - não cria identificações;
 * - não interpreta ausência como zero;
 * - não consulta tabelas;
 * - não decide autorização;
 * - não implementa CRUD;
 * - não implementa aluguel/cessão nesta etapa.
 * ============================================================
 */
export function adaptarResumoVagasParaPerfil(
  resposta
) {
  if (
    !objetoValido(resposta) ||
    resposta.success !== true ||
    !objetoValido(resposta.resumo) ||
    !Array.isArray(resposta.vagas)
  ) {
    return null;
  }

  const quantidade =
    quantidadeOficialOuNull(
      resposta.resumo.quantidade
    );

  if (
    quantidade === null ||
    quantidade !== resposta.vagas.length
  ) {
    return null;
  }

  const vagas = resposta.vagas.map(
    (vaga) => {
      const identificador =
        textoOuNull(
          vaga?.identificacao
        );

      const status =
        textoOuNull(
          vaga?.status
        );

      /*
       * A identificação é parte essencial do contrato
       * visual atual da vaga.
       *
       * Não fabricamos "Vaga X" nem qualquer sequência
       * quando o backend não fornece identificação.
       */
      if (!identificador) {
        return null;
      }

      return {
        identificador,
        status,
      };
    }
  );

  /*
   * Não entregamos uma lista parcialmente válida.
   */
  if (
    vagas.some(
      (vaga) => vaga === null
    )
  ) {
    return null;
  }

  return {
    quantidade,
    vagas,
  };
}