import { supabase } from "../../../../../services/supabase";

function primeiroRegistro(data) {
  return Array.isArray(data)
    ? data[0] || null
    : data || null;
}

export async function carregarContextoMoradorRetiradas() {
  const { data, error } = await supabase.rpc(
    "rpc_morador_dashboard_contexto_v1"
  );

  if (error) {
    throw error;
  }

  const contexto = primeiroRegistro(data);

  if (!contexto?.condominio_id) {
    throw new Error(
      "Não foi possível identificar o condomínio ativo."
    );
  }

  const unidadeId =
    contexto.unidade_operacional_id ||
    contexto.unidade_id ||
    null;

  if (!unidadeId) {
    throw new Error(
      "Não foi possível identificar a unidade ativa."
    );
  }

  return {
    condominioId: contexto.condominio_id,
    unidadeId,
    unidadeOficialId:
      contexto.unidade_oficial_id || null,
    unidade: contexto.unidade || null,
    torre:
      contexto.torre_identificador ||
      contexto.torre ||
      null,
  };
}

export async function carregarMoradorRetiradas({
  condominioId,
  unidadeId,
  escopo,
  ordem,
  limite,
  offset,
}) {
  const { data, error } = await supabase.rpc(
    "rpc_morador_minhas_retiradas_v2",
    {
      p_condominio_id: condominioId,
      p_unidade_id: unidadeId,
      p_escopo: escopo,
      p_ordem: ordem,
      p_limite: limite,
      p_offset: offset,
    }
  );

  if (error) {
    throw error;
  }

  if (!data || data.ok !== true) {
    throw new Error(
      "Não foi possível carregar suas encomendas."
    );
  }

  return data;
}

function obterMetadadosDispositivo() {
  if (typeof window === "undefined") {
    return {
      ip: null,
      userAgent: null,
      navegador: null,
      sistemaOperacional: null,
      tipoDispositivo: null,
    };
  }

  const userAgent =
    typeof navigator !== "undefined"
      ? navigator.userAgent || null
      : null;

  const largura =
    window.innerWidth ||
    document?.documentElement?.clientWidth ||
    null;

  let tipoDispositivo = "DESKTOP";

  if (largura && largura <= 767) {
    tipoDispositivo = "MOBILE";
  } else if (largura && largura <= 1024) {
    tipoDispositivo = "TABLET";
  }

  return {
    // IP não deve ser inventado pelo frontend.
    ip: null,
    userAgent,
    navegador: null,
    sistemaOperacional: null,
    tipoDispositivo,
  };
}

function parametrosCredencial({
  condominioId,
  unidadeId,
  encomendaId,
}) {
  const dispositivo = obterMetadadosDispositivo();

  return {
    p_condominio_id: condominioId,
    p_unidade_id: unidadeId,
    p_encomenda_id: encomendaId,
    p_ip: dispositivo.ip,
    p_user_agent: dispositivo.userAgent,
    p_navegador: dispositivo.navegador,
    p_sistema_operacional: dispositivo.sistemaOperacional,
    p_tipo_dispositivo: dispositivo.tipoDispositivo,
  };
}

export async function criarCredencialMoradorRetirada({
  condominioId,
  unidadeId,
  encomendaId,
}) {
  const { data, error } = await supabase.rpc(
    "rpc_morador_token_retirada_criar_v1",
    parametrosCredencial({
      condominioId,
      unidadeId,
      encomendaId,
    })
  );

  if (error) {
    throw error;
  }

  if (!data || data.ok !== true) {
    throw new Error(
      "Não foi possível gerar sua credencial de retirada."
    );
  }

  return data;
}

export async function regenerarCredencialMoradorRetirada({
  condominioId,
  unidadeId,
  encomendaId,
}) {
  const { data, error } = await supabase.rpc(
    "rpc_morador_token_retirada_regenerar_v1",
    parametrosCredencial({
      condominioId,
      unidadeId,
      encomendaId,
    })
  );

  if (error) {
    throw error;
  }

  if (!data || data.ok !== true) {
    throw new Error(
      "Não foi possível gerar uma nova credencial de retirada."
    );
  }

  return data;
}

export async function acompanharMoradorRetirada({
  condominioId,
  unidadeId,
  encomendaId,
}) {
  if (
    !condominioId ||
    !unidadeId ||
    !encomendaId
  ) {
    throw new Error(
      "Não foi possível identificar a encomenda para acompanhar a retirada."
    );
  }

  const { data, error } = await supabase.rpc(
    "rpc_morador_retirada_acompanhar_v1",
    {
      p_condominio_id: condominioId,
      p_unidade_id: unidadeId,
      p_encomenda_id: encomendaId,
    }
  );

  if (error) {
    throw error;
  }

  if (!data || data.ok !== true) {
    throw new Error(
      "Não foi possível acompanhar a retirada desta encomenda."
    );
  }

  return data;
}