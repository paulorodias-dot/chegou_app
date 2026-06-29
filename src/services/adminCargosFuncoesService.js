import { supabase } from "./supabase";

function obterBusinessId(perfil) {
  return (
    perfil?.business_id ||
    perfil?.business_id_condominio ||
    perfil?.businessId ||
    null
  );
}

function obterUsuarioId(perfil) {
  return perfil?.usuario_id || perfil?.id || null;
}

function obterCondominioId(perfil) {
  return (
    perfil?.condominio_id ||
    perfil?.condominio_atual_id ||
    perfil?.usuario_condominio?.condominio_id ||
    perfil?.condominio?.id ||
    null
  );
}

function obterNomeUsuario(perfil) {
  return (
    perfil?.nome ||
    perfil?.nome_completo ||
    perfil?.nome_usuario ||
    perfil?.email ||
    "Usuário"
  );
}

export async function carregarKpisAdminCargosFuncoes({ perfil }) {
  const { data, error } = await supabase.rpc("rpc_admin_cargos_funcoes_kpis", {
    p_business_id: obterBusinessId(perfil),
    p_condominio_id: obterCondominioId(perfil),
  });

  if (error) {
    console.error("Erro ao carregar indicadores de cargos e funções:", error);
    throw new Error("Não foi possível carregar os indicadores agora.");
  }

  return {
    cargosAtivos: Number(data?.cargos_ativos || 0),
    funcoesDisponiveis: Number(data?.funcoes_disponiveis || 0),
    categorias: Number(data?.categorias || 0),
    solicitacoesPendentes: Number(data?.solicitacoes_pendentes || 0),
  };
}

export async function listarCatalogoAdminCargosFuncoes({ perfil, filtros }) {
  const { data, error } = await supabase.rpc("rpc_admin_cargos_funcoes_listar", {
    p_business_id: obterBusinessId(perfil),
    p_condominio_id: obterCondominioId(perfil),
    p_busca: filtros?.busca || null,
    p_categoria_id: filtros?.categoriaId || null,
    p_funcao_id: filtros?.funcaoId ? Number(filtros.funcaoId) : null,
    p_status: filtros?.status || null,
  });

  if (error) {
    console.error("Erro ao listar catálogo de cargos e funções:", error);
    throw new Error("Não foi possível carregar a lista agora.");
  }

  return Array.isArray(data) ? data : [];
}

export async function listarSolicitacoesAdminCargosFuncoes({ perfil }) {
  const { data, error } = await supabase.rpc(
    "rpc_admin_solicitacoes_cargos_listar",
    {
      p_business_id: obterBusinessId(perfil),
      p_condominio_id: obterCondominioId(perfil),
    }
  );

  if (error) {
    console.error("Erro ao listar solicitações de cargos:", error);
    throw new Error("Não foi possível carregar as solicitações agora.");
  }

  return Array.isArray(data) ? data : [];
}

export async function criarSolicitacaoAdminCargo({ perfil, formulario }) {
  const { data, error } = await supabase.rpc(
    "rpc_admin_solicitacao_cargo_criar",
    {
      p_business_id_condominio: obterBusinessId(perfil),
      p_condominio_id: obterCondominioId(perfil),
      p_nome_condominio:
        perfil?.nome_condominio ||
        perfil?.condominio_nome ||
        perfil?.nome_fantasia ||
        "Condomínio",
      p_business_id_solicitante: obterBusinessId(perfil),
      p_solicitante_id: obterUsuarioId(perfil),
      p_nome_solicitante: obterNomeUsuario(perfil),
      p_categoria_id: formulario?.categoriaId || null,
      p_funcao_id: formulario?.funcaoId ? Number(formulario.funcaoId) : null,
      p_cargo_solicitado: formulario?.cargoSolicitado || "",
      p_codigo_sugerido: formulario?.codigoSugerido || null,
      p_observacao_solicitante: formulario?.observacao || null,
    }
  );

  if (error) {
    console.error("Erro ao criar solicitação de cargo:", error);
    throw new Error(
      "Não foi possível enviar a solicitação agora. Tente novamente ou informe o suporte."
    );
  }

  return data;
}

export async function reenviarSolicitacaoAdminCargo({
  perfil,
  solicitacaoId,
  formulario,
}) {
  const { data, error } = await supabase.rpc(
    "rpc_admin_solicitacao_cargo_reenviar",
    {
      p_solicitacao_id: solicitacaoId,
      p_condominio_id: obterCondominioId(perfil),
      p_solicitante_id: obterUsuarioId(perfil),
      p_nome_solicitante: obterNomeUsuario(perfil),
      p_categoria_id: formulario?.categoriaId || null,
      p_funcao_id: formulario?.funcaoId ? Number(formulario.funcaoId) : null,
      p_cargo_solicitado: formulario?.cargoSolicitado || "",
      p_codigo_sugerido: formulario?.codigoSugerido || null,
      p_observacao_solicitante: formulario?.observacao || null,
    }
  );

  if (error) {
    console.error("Erro ao reenviar solicitação de cargo:", error);
    throw new Error(
      "Não foi possível reenviar a solicitação agora. Tente novamente ou informe o suporte."
    );
  }

  return data;
}