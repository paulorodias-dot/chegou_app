import { supabase } from "../../../../services/supabase";

function normalizarValor(valor) {
  if (
    valor === undefined ||
    valor === null ||
    String(valor).trim() === ""
  ) {
    return null;
  }

  return valor;
}

function normalizarArray(valor) {
  return Array.isArray(valor)
    ? valor
    : [];
}

function montarTorreExibicao({
  nome,
  identificador,
}) {
  const nomeNormalizado =
    normalizarValor(nome);

  const identificadorNormalizado =
    normalizarValor(identificador);

  if (
    identificadorNormalizado &&
    nomeNormalizado
  ) {
    return `${identificadorNormalizado} · ${nomeNormalizado}`;
  }

  return (
    nomeNormalizado ||
    identificadorNormalizado ||
    null
  );
}

function criarResumoVazio() {
  return {
    pessoaId: null,

    nomeCivil: null,
    nomeSocial: null,
    nomeMorador: null,

    usuarioId: null,

    nivelId: null,

    tipoUsuario: null,

    condominioId: null,

    condominioNome: null,

    moradorVinculoId: null,

    tipoMorador: null,

    vinculoPrincipal: null,

    vinculoAtivo: null,

    unidadeOperacionalId: null,

    unidadeOficialId: null,

    unidade: null,

    torreId: null,

    torreNome: null,

    torreIdentificador: null,

    torreExibicao: null,

    dependentes: [],

    dependentesTotal: 0,

    garagens: [],

    garagensTotal: 0,
  };
}

function mapearDependente(item) {
  return {
    id:
      item?.id || null,

    pessoaId:
      item?.pessoa_id || null,

    nome:
      normalizarValor(
        item?.nome
      ),

    tipoVinculo:
      normalizarValor(
        item?.tipo_vinculo
      ),

    status:
      normalizarValor(
        item?.status
      ),

    possuiLogin:
      item?.possui_login === true,

    menorIdade:
      item?.menor_idade === true,
  };
}

function mapearGaragem(item) {
  return {
    id:
      item?.id || null,

    numero:
      normalizarValor(
        item?.identificacao_vaga
      ) ||
      normalizarValor(
        item?.numero_vaga
      ),

    local:
      normalizarValor(
        item?.localizacao_vaga
      ) ||
      normalizarValor(
        item?.localizacao
      ),

    tipo:
      normalizarValor(
        item?.tipo_vaga
      ),

    tipoFisico:
      normalizarValor(
        item?.tipo_fisico_vaga
      ),

    modoUso:
      normalizarValor(
        item?.modo_uso_vaga
      ) ||
      normalizarValor(
        item?.tipo_uso
      ) ||
      normalizarValor(
        item?.usuario_vaga
      ),

    pertenceUnidade:
      item?.vaga_pertence_unidade ===
        true,

    autorizacaoStatus:
      normalizarValor(
        item?.autorizacao_status
      ),

    statusVaga:
      normalizarValor(
        item?.status_vaga
      ),

    status:
      normalizarValor(
        item?.status
      ),

    emUso:
      item?.em_uso === true,
  };
}

export async function carregarResumoOperacionalMorador() {
  const resumoVazio =
    criarResumoVazio();

  const {
    data,
    error,
  } = await supabase.rpc(
    "rpc_morador_dashboard_contexto_v1"
  );

  if (error) {
    console.error(
      "[Dashboard Morador] Erro na RPC de contexto:",
      error
    );

    throw error;
  }

  const contexto =
    Array.isArray(data)
      ? data[0] || null
      : data || null;

  if (!contexto) {
    console.warn(
      "[Dashboard Morador] Nenhum contexto autorizado foi retornado."
    );

    return resumoVazio;
  }

  const dependentes =
    normalizarArray(
      contexto.dependentes
    ).map(mapearDependente);

  const garagens =
    normalizarArray(
      contexto.garagens
    ).map(mapearGaragem);

  const torreNome =
    normalizarValor(
      contexto.torre
    );

  const torreIdentificador =
    normalizarValor(
      contexto.torre_identificador
    );

  const nomeCivil =
    normalizarValor(
      contexto.nome_civil
    );

  const nomeSocial =
    normalizarValor(
      contexto.nome_social
    );

  return {
    pessoaId:
      contexto.pessoa_id || null,

    nomeCivil,

    nomeSocial,

    /*
     * Autoridade de apresentação:
     *
     * Nome Social
     * ↓
     * Nome Civil
     */
    nomeMorador:
      normalizarValor(
        contexto.nome_exibicao
      ) ||
      nomeSocial ||
      nomeCivil,

    usuarioId:
      contexto.usuario_id || null,

    nivelId:
      contexto.nivel_id ?? null,

    tipoUsuario:
      normalizarValor(
        contexto.tipo_usuario
      ),

    condominioId:
      contexto.condominio_id ||
      null,

    condominioNome:
      normalizarValor(
        contexto.condominio_nome
      ),

    moradorVinculoId:
      contexto
        .morador_unidade_vinculo_id ||
      null,

    tipoMorador:
      normalizarValor(
        contexto.tipo_morador
      ),

    vinculoPrincipal:
      contexto.principal === true,

    vinculoAtivo:
      true,

    unidadeOperacionalId:
      contexto.unidade_operacional_id ||
      null,

    unidadeOficialId:
      contexto.unidade_oficial_id ||
      null,

    unidade:
      normalizarValor(
        contexto.unidade
      ),

    torreId:
      contexto.torre_id || null,

    torreNome,

    torreIdentificador,

    torreExibicao:
      montarTorreExibicao({
        nome: torreNome,
        identificador:
          torreIdentificador,
      }),

    dependentes,

    dependentesTotal:
      Number(
        contexto.dependentes_total ??
          dependentes.length
      ),

    garagens,

    garagensTotal:
      Number(
        contexto.garagens_total ??
          garagens.length
      ),
  };
}

export async function carregarIndicadoresDashboardMorador() {
  return {
    encomendasAguardando: null,
    rastreiosAtivos: null,
    emprestimosGaragem: null,
    servicosAgendados: null,
  };
}

export async function carregarAgendaDashboardMorador() {
  return [];
}