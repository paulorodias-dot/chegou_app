import { supabase } from "./supabase";

const BUCKET_TRANSPORTADORAS = "transportadoras";
const LOGO_PADRAO = "logo-padrao-transportadora.png";

function extrairMensagemErro(error, mensagemPadrao) {
  if (!error) return mensagemPadrao;

  return (
    error.message ||
    error.details ||
    error.hint ||
    mensagemPadrao
  );
}

function validarResposta(data, mensagemPadrao) {
  if (!data?.ok) {
    throw new Error(data?.mensagem || mensagemPadrao);
  }

  return data;
}

export function obterLogoPublicoTransportadora(
  storagePath = LOGO_PADRAO
) {
  const caminho = String(storagePath || LOGO_PADRAO).trim();

  if (!caminho) return null;

  const { data } = supabase.storage
    .from(BUCKET_TRANSPORTADORAS)
    .getPublicUrl(caminho);

  return data?.publicUrl || null;
}

export async function listarTransportadorasMaster({
  busca = "",
  status = "",
  tipo = "",
  limite = 5,
  offset = 0,
} = {}) {
  const { data, error } = await supabase.rpc(
    "rpc_master_transportadoras_listar_v1",
    {
      p_busca: busca || null,
      p_status: status || null,
      p_tipo: tipo || null,
      p_limite: Number(limite || 5),
      p_offset: Number(offset || 0),
    }
  );

  if (error) {
    throw new Error(
      extrairMensagemErro(
        error,
        "Não foi possível carregar as transportadoras."
      )
    );
  }

  return validarResposta(
    data,
    "A Base Oficial de Transportadoras não respondeu corretamente."
  );
}

export async function obterKpisTransportadorasMaster() {
  const { data, error } = await supabase.rpc(
    "rpc_master_transportadoras_kpis_v1"
  );

  if (error) {
    throw new Error(
      extrairMensagemErro(
        error,
        "Não foi possível carregar os indicadores."
      )
    );
  }

  return validarResposta(
    data,
    "Os indicadores não responderam corretamente."
  );
}

export async function obterDetalhesTransportadoraMaster(
  transportadoraId
) {
  if (!transportadoraId) {
    throw new Error("Transportadora não informada.");
  }

  const { data, error } = await supabase.rpc(
    "rpc_master_transportadora_detalhes_v1",
    {
      p_transportadora_id: transportadoraId,
    }
  );

  if (error) {
    throw new Error(
      extrairMensagemErro(
        error,
        "Não foi possível carregar os detalhes."
      )
    );
  }

  return validarResposta(
    data,
    "Os detalhes da transportadora não responderam corretamente."
  );
}

export async function criarTransportadoraMaster(payload) {
  const { data, error } = await supabase.rpc(
    "rpc_master_transportadora_criar_v1",
    {
      p_nome_fantasia: payload.nome_fantasia,
      p_tipo: payload.tipo,
      p_status: payload.status,
      p_transportadora_oficial:
        payload.transportadora_oficial ?? true,
      p_aceita_rastreio: payload.aceita_rastreio ?? false,
      p_possui_integracao_api:
        payload.possui_integracao_api ?? false,
      p_observacoes: payload.observacoes || null,
      p_slug: payload.slug || null,
      p_logo_storage_path:
        payload.logo_storage_path || LOGO_PADRAO,
      p_logo_url: payload.logo_url || null,
      p_ip: payload.ip || null,
      p_user_agent: navigator.userAgent || null,
      p_navegador: navigator.userAgent || null,
      p_sistema_operacional:
        navigator.platform || null,
    }
  );

  if (error) {
    throw new Error(
      extrairMensagemErro(
        error,
        "Não foi possível cadastrar a transportadora."
      )
    );
  }

  return validarResposta(
    data,
    "Não foi possível concluir o cadastro."
  );
}

export async function editarTransportadoraMaster(
  transportadoraId,
  payload
) {
  const { data, error } = await supabase.rpc(
    "rpc_master_transportadora_editar_v1",
    {
      p_transportadora_id: transportadoraId,
      p_nome_fantasia: payload.nome_fantasia || null,
      p_tipo: payload.tipo || null,
      p_transportadora_oficial:
        payload.transportadora_oficial,
      p_aceita_rastreio: payload.aceita_rastreio,
      p_possui_integracao_api:
        payload.possui_integracao_api,
      p_observacoes: payload.observacoes ?? null,
      p_atualizar_observacoes: true,
      p_slug: payload.slug || null,
      p_ip: payload.ip || null,
      p_user_agent: navigator.userAgent || null,
      p_navegador: navigator.userAgent || null,
      p_sistema_operacional:
        navigator.platform || null,
    }
  );

  if (error) {
    throw new Error(
      extrairMensagemErro(
        error,
        "Não foi possível atualizar a transportadora."
      )
    );
  }

  return validarResposta(
    data,
    "Não foi possível concluir a atualização."
  );
}

export async function alterarStatusTransportadoraMaster({
  transportadoraId,
  status,
  justificativa,
}) {
  const { data, error } = await supabase.rpc(
    "rpc_master_transportadora_status_v1",
    {
      p_transportadora_id: transportadoraId,
      p_novo_status: status,
      p_justificativa: justificativa || null,
      p_ip: null,
      p_user_agent: navigator.userAgent || null,
      p_navegador: navigator.userAgent || null,
      p_sistema_operacional:
        navigator.platform || null,
    }
  );

  if (error) {
    throw new Error(
      extrairMensagemErro(
        error,
        "Não foi possível alterar o status."
      )
    );
  }

  return validarResposta(
    data,
    "Não foi possível alterar o status."
  );
}

export async function enviarLogoTransportadora({
  transportadoraId,
  arquivo,
}) {
  if (!transportadoraId || !arquivo) {
    throw new Error("Arquivo de logotipo não informado.");
  }

  const extensao =
    arquivo.name?.split(".").pop()?.toLowerCase() || "png";

  const caminho =
    `${transportadoraId}/logo-${Date.now()}.${extensao}`;

  const { error } = await supabase.storage
    .from(BUCKET_TRANSPORTADORAS)
    .upload(caminho, arquivo, {
      cacheControl: "3600",
      upsert: false,
      contentType: arquivo.type,
    });

  if (error) {
    throw new Error(
      extrairMensagemErro(
        error,
        "Não foi possível enviar o logotipo."
      )
    );
  }

  return caminho;
}

export async function atualizarLogoTransportadoraMaster({
  transportadoraId,
  storagePath,
  justificativa,
}) {
  const { data, error } = await supabase.rpc(
    "rpc_master_transportadora_logo_v1",
    {
      p_transportadora_id: transportadoraId,
      p_logo_storage_path: storagePath,
      p_logo_url: null,
      p_justificativa: justificativa || null,
      p_ip: null,
      p_user_agent: navigator.userAgent || null,
      p_navegador: navigator.userAgent || null,
      p_sistema_operacional:
        navigator.platform || null,
    }
  );

  if (error) {
    throw new Error(
      extrairMensagemErro(
        error,
        "Não foi possível atualizar o logotipo."
      )
    );
  }

  return validarResposta(
    data,
    "Não foi possível atualizar o logotipo."
  );
}

export async function restaurarLogoPadraoTransportadoraMaster(
  transportadoraId
) {
  const { data, error } = await supabase.rpc(
    "rpc_master_transportadora_logo_padrao_v1",
    {
      p_transportadora_id: transportadoraId,
      p_justificativa:
        "Restauração manual do logo padrão pelo Módulo Master.",
      p_ip: null,
      p_user_agent: navigator.userAgent || null,
      p_navegador: navigator.userAgent || null,
      p_sistema_operacional:
        navigator.platform || null,
    }
  );

  if (error) {
    throw new Error(
      extrairMensagemErro(
        error,
        "Não foi possível restaurar o logotipo padrão."
      )
    );
  }

  return validarResposta(
    data,
    "Não foi possível restaurar o logotipo."
  );
}

export async function criarAliasTransportadoraMaster({
  transportadoraId,
  alias,
}) {
  const { data, error } = await supabase.rpc(
    "rpc_master_transportadora_alias_criar_v1",
    {
      p_transportadora_id: transportadoraId,
      p_alias: alias,
      p_ip: null,
      p_user_agent: navigator.userAgent || null,
    }
  );

  if (error) {
    throw new Error(
      extrairMensagemErro(
        error,
        "Não foi possível adicionar o nome alternativo."
      )
    );
  }

  return validarResposta(
    data,
    "Não foi possível adicionar o nome alternativo."
  );
}

export async function alterarStatusAliasTransportadoraMaster({
  aliasId,
  ativo,
  justificativa,
}) {
  const { data, error } = await supabase.rpc(
    "rpc_master_transportadora_alias_status_v1",
    {
      p_alias_id: aliasId,
      p_ativo: Boolean(ativo),
      p_justificativa: justificativa || null,
      p_ip: null,
      p_user_agent: navigator.userAgent || null,
    }
  );

  if (error) {
    throw new Error(
      extrairMensagemErro(
        error,
        "Não foi possível alterar o nome alternativo."
      )
    );
  }

  return validarResposta(
    data,
    "Não foi possível alterar o nome alternativo."
  );
}

export async function listarAuditoriasTransportadoraMaster({
  transportadoraId,
  limite = 20,
  offset = 0,
}) {
  const { data, error } = await supabase.rpc(
    "rpc_master_transportadora_auditorias_v1",
    {
      p_transportadora_id: transportadoraId,
      p_limite: limite,
      p_offset: offset,
    }
  );

  if (error) {
    throw new Error(
      extrairMensagemErro(
        error,
        "Não foi possível carregar a auditoria."
      )
    );
  }

  return validarResposta(
    data,
    "Não foi possível carregar a auditoria."
  );
}