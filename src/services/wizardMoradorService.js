import { supabase } from "./supabase";

function tratarErro(
  error,
  fallback = "Não foi possível concluir esta ação."
) {
  if (error?.message) {
    return error.message;
  }

  return fallback;
}

function normalizarResposta(data) {
  return (
    data?.data ||
    data?.payload ||
    data?.wizard ||
    data
  );
}

export function obterInfoDispositivoWizard() {
  const userAgent =
    navigator.userAgent || "";

  return {
    user_agent: userAgent,

    dispositivo:
      /Mobi|Android/i.test(userAgent)
        ? "mobile"
        : "desktop",

    navegador: userAgent,

    sistema_operacional:
      navigator.platform || "",
  };
}

export async function carregarWizardMorador(
  token
) {
  const info =
    obterInfoDispositivoWizard();

  const { data, error } =
    await supabase.functions.invoke(
      "wizard-morador-carregar",
      {
        body: {
          token,
          contexto: info,
        },
      }
    );

  if (
    error ||
    data?.success === false
  ) {
    throw new Error(
      data?.message ||
        data?.error ||
        tratarErro(
          error,
          "Não foi possível abrir seu cadastro. Tente novamente."
        )
    );
  }

  return normalizarResposta(data);
}

export async function autosaveWizardMorador({
  token,
  etapa,
  dados,
  sessaoId,
  progresso,
}) {
  const info =
    obterInfoDispositivoWizard();

  const { data, error } =
    await supabase.functions.invoke(
      "wizard-morador-autosave",
      {
        body: {
          token,
          etapa,
          dados,

          sessao_id:
            sessaoId || null,

          progresso:
            progresso || 0,

          acao: "AUTOSAVE",

          contexto: info,
        },
      }
    );

  if (
    error ||
    data?.success === false
  ) {
    throw new Error(
      data?.message ||
        data?.error ||
        tratarErro(
          error,
          "Não foi possível salvar suas alterações agora."
        )
    );
  }

  return normalizarResposta(data);
}

export async function salvarEtapaWizardMorador({
  token,
  etapa,
  dados,
  avancar = true,
}) {
  const info =
    obterInfoDispositivoWizard();

  const { data, error } =
    await supabase.functions.invoke(
      "wizard-morador-salvar-etapa",
      {
        body: {
          token,
          etapa,
          dados,
          avancar,
          contexto: info,
        },
      }
    );

  if (
    error ||
    data?.success === false
  ) {
    throw new Error(
      data?.message ||
        data?.error ||
        tratarErro(
          error,
          "Não foi possível salvar esta etapa. Tente novamente."
        )
    );
  }

  return normalizarResposta(data);
}

export async function enviarWizardParaAuditoria({
  token,
  aceiteTermos,
  aceiteLgpd,
  dadosFinais,
}) {
  const info =
    obterInfoDispositivoWizard();

  const { data, error } =
    await supabase.functions.invoke(
      "wizard-morador-enviar-auditoria",
      {
        body: {
          token,

          aceite_termos:
            aceiteTermos,

          aceite_lgpd:
            aceiteLgpd,

          dados_finais:
            dadosFinais || {},

          contexto: info,
        },
      }
    );

  if (
    error ||
    data?.success === false
  ) {
    throw new Error(
      data?.message ||
        data?.error ||
        tratarErro(
          error,
          "Não foi possível enviar seu cadastro para análise."
        )
    );
  }

  return normalizarResposta(data);
}

/*
 * LEGADO — NÃO UTILIZAR NO NOVO FLUXO.
 *
 * A correção do cadastro deve ser solicitada pelo Administrativo.
 * O Morador não inicia um pedido de reenvio.
 *
 * Esta função será removida definitivamente junto com o eventual
 * consumidor frontend correspondente, evitando quebrar imports
 * durante a homologação tela a tela.
 */
export async function solicitarReenvioConviteMorador({
  token,
  email,
  motivo,
}) {
  const info =
    obterInfoDispositivoWizard();

  const { data, error } =
    await supabase.functions.invoke(
      "wizard-morador-solicitar-reenvio",
      {
        body: {
          token:
            token || null,

          email:
            email || null,

          motivo:
            motivo ||
            "Solicitação de reenvio.",

          contexto: info,
        },
      }
    );

  if (
    error ||
    data?.success === false
  ) {
    throw new Error(
      data?.message ||
        data?.error ||
        tratarErro(
          error,
          "Não foi possível concluir esta solicitação."
        )
    );
  }

  return normalizarResposta(data);
}

export async function consultarStatusWizardMorador({
  token,
  email,
  protocolo,
}) {
  const { data, error } =
    await supabase.functions.invoke(
      "wizard-morador-status",
      {
        body: {
          token:
            token || null,

          email:
            email || null,

          protocolo:
            protocolo || null,
        },
      }
    );

  if (
    error ||
    data?.success === false
  ) {
    throw new Error(
      data?.message ||
        data?.error ||
        tratarErro(
          error,
          "Não foi possível consultar o andamento do seu cadastro."
        )
    );
  }

  return normalizarResposta(data);
}

export async function prepararSenhaWizardMorador({
  token,
  senha,
  confirmarSenha,
  email,
  cpf,
}) {
  const info =
    obterInfoDispositivoWizard();

  const { data, error } =
    await supabase.functions.invoke(
      "wizard-morador-preparar-senha",
      {
        body: {
          token,
          senha,

          confirmar_senha:
            confirmarSenha,

          email_login:
            email || null,

          cpf_login:
            cpf || null,

          contexto: info,
        },
      }
    );

  if (
    error ||
    data?.success === false
  ) {
    throw new Error(
      data?.message ||
        data?.error ||
        tratarErro(
          error,
          "Não foi possível salvar sua senha. Tente novamente."
        )
    );
  }

  return normalizarResposta(data);
}

export async function salvarPesquisaWizardMorador({
  token,
  protocolo,
  pesquisa,
}) {
  const info =
    obterInfoDispositivoWizard();

  const { data, error } =
    await supabase.functions.invoke(
      "wizard-morador-salvar-pesquisa",
      {
        body: {
          token,
          protocolo,
          pesquisa,
          contexto: info,
        },
      }
    );

  if (
    error ||
    data?.success === false
  ) {
    throw new Error(
      data?.message ||
        data?.error ||
        tratarErro(
          error,
          "Não foi possível salvar sua resposta."
        )
    );
  }

  return normalizarResposta(data);
}