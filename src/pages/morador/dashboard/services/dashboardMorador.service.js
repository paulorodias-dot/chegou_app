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

export async function carregarResumoOperacionalMorador({
  usuarioId,
  condominioId,
  businessId,
}) {
  if (!usuarioId) {
    return {
      unidade: null,
      torre: null,
      garagem: null,
      localGaragem: null,
      dependentes: null,
      vinculoTipo: null,
    };
  }

  /*
   * 1. Vínculo operacional do usuário com a unidade.
   */

  let vinculoQuery = supabase
    .from("usuario_unidade")
    .select(`
      id,
      usuario_id,
      unidade_id,
      tipo,
      created_at
    `)
    .eq("usuario_id", usuarioId)
    .order("created_at", {
      ascending: false,
    })
    .limit(1);

  const {
    data: vinculos,
    error: vinculoError,
  } = await vinculoQuery;

  if (vinculoError) {
    throw vinculoError;
  }

  const vinculo = vinculos?.[0] || null;

  if (!vinculo?.unidade_id) {
    return {
      unidade: null,
      torre: null,
      garagem: null,
      localGaragem: null,
      dependentes: null,
      vinculoTipo:
        normalizarValor(vinculo?.tipo),
    };
  }

  /*
   * 2. Unidade.
   */

  let unidadeQuery = supabase
    .from("unidades")
    .select(`
      id,
      business_id,
      condominio_id,
      torre_id,
      numero
    `)
    .eq("id", vinculo.unidade_id)
    .limit(1);

  if (condominioId) {
    unidadeQuery = unidadeQuery.eq(
      "condominio_id",
      condominioId
    );
  }

  if (businessId) {
    unidadeQuery = unidadeQuery.eq(
      "business_id",
      businessId
    );
  }

  const {
    data: unidades,
    error: unidadeError,
  } = await unidadeQuery;

  if (unidadeError) {
    throw unidadeError;
  }

  const unidade = unidades?.[0] || null;

  if (!unidade) {
    return {
      unidade: null,
      torre: null,
      garagem: null,
      localGaragem: null,
      dependentes: null,
      vinculoTipo:
        normalizarValor(vinculo.tipo),
    };
  }

  /*
   * 3. Torre.
   */

  let torre = null;

  if (unidade.torre_id) {
    let torreQuery = supabase
      .from("torres")
      .select(`
        id,
        business_id,
        condominio_id,
        nome,
        identificador
      `)
      .eq("id", unidade.torre_id)
      .limit(1);

    if (condominioId) {
      torreQuery = torreQuery.eq(
        "condominio_id",
        condominioId
      );
    }

    if (businessId) {
      torreQuery = torreQuery.eq(
        "business_id",
        businessId
      );
    }

    const {
      data: torres,
      error: torreError,
    } = await torreQuery;

    if (torreError) {
      console.warn(
        "[Dashboard Morador] Falha ao carregar torre:",
        torreError
      );
    } else {
      torre = torres?.[0] || null;
    }
  }

  /*
   * 4. Garagem.
   *
   * Falha aqui NÃO bloqueia o Dashboard.
   */

  let vaga = null;

  try {
    let vagaQuery = supabase
      .from("vagas_unidade")
      .select(`
        id,
        business_id,
        condominio_id,
        unidade_id,
        morador_responsavel_id,
        numero_vaga,
        identificacao_vaga,
        localizacao,
        localizacao_vaga,
        tipo_vaga,
        tipo_fisico_vaga,
        vaga_pertence_unidade,
        modo_uso_vaga,
        status_vaga,
        status,
        criado_em
      `)
      .eq("unidade_id", unidade.id)
      .order("criado_em", {
        ascending: true,
      })
      .limit(1);

    if (condominioId) {
      vagaQuery = vagaQuery.eq(
        "condominio_id",
        condominioId
      );
    }

    if (businessId) {
      vagaQuery = vagaQuery.eq(
        "business_id",
        businessId
      );
    }

    const {
      data: vagas,
      error: vagaError,
    } = await vagaQuery;

    if (vagaError) {
      console.warn(
        "[Dashboard Morador] Falha ao carregar garagem:",
        vagaError
      );
    } else {
      vaga = vagas?.[0] || null;
    }
  } catch (error) {
    console.warn(
      "[Dashboard Morador] Falha isolada ao consultar garagem:",
      error
    );
  }

  /*
   * 5. Dependentes.
   *
   * Contagem operacional.
   */

  let dependentes = null;

  try {
    const {
      count,
      error: dependentesError,
    } = await supabase
      .from("dependentes_unidade")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("unidade_id", unidade.id);

    if (dependentesError) {
      console.warn(
        "[Dashboard Morador] Falha ao carregar dependentes:",
        dependentesError
      );
    } else {
      dependentes = count ?? 0;
    }
  } catch (error) {
    console.warn(
      "[Dashboard Morador] Falha isolada ao consultar dependentes:",
      error
    );
  }

  return {
    unidade:
      normalizarValor(unidade.numero),

    torre:
      normalizarValor(torre?.nome) ||
      normalizarValor(
        torre?.identificador
      ),

    garagem:
      normalizarValor(
        vaga?.identificacao_vaga
      ) ||
      normalizarValor(
        vaga?.numero_vaga
      ),

    localGaragem:
      normalizarValor(
        vaga?.localizacao_vaga
      ) ||
      normalizarValor(
        vaga?.localizacao
      ),

    dependentes,

    vinculoTipo:
      normalizarValor(vinculo.tipo),
  };
}

/*
 * Os contratos reais dos três indicadores
 * ainda serão ligados aos respectivos domínios.
 *
 * Produção:
 * não inventamos números.
 */

export async function carregarIndicadoresDashboardMorador() {
  return {
    encomendasAguardando: null,

    emprestimosGaragem: null,

    servicosAgendados: null,
  };
}

/*
 * O calendário deve receber somente eventos
 * autorizados pelo domínio Serviços/Agenda.
 *
 * Não utilizar calendar.fake.js em produção.
 */

export async function carregarAgendaDashboardMorador() {
  return [];
}