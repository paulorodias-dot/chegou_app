import { supabase } from "./supabase";

function tratarErro(error, fallback = "Erro inesperado no WizardMorador.") {
  if (error?.message) return error.message;
  return fallback;
}

function normalizarResposta(data) {
  return data?.data || data?.payload || data?.wizard || data;
}

export function obterInfoDispositivoWizard() {
  const userAgent = navigator.userAgent || "";

  return {
    user_agent: userAgent,
    dispositivo: /Mobi|Android/i.test(userAgent) ? "mobile" : "desktop",
    navegador: userAgent,
    sistema_operacional: navigator.platform || "",
  };
}

export async function carregarWizardMorador(token) {
  const info = obterInfoDispositivoWizard();

  const { data, error } = await supabase.functions.invoke(
    "wizard-morador-carregar",
    {
      body: {
        token,
        contexto: info,
      },
    }
  );

  if (error || data?.success === false) {
    throw new Error(
      data?.message ||
        data?.error ||
        tratarErro(error, "Erro ao carregar cadastro.")
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
  const info = obterInfoDispositivoWizard();

  const { data, error } = await supabase.functions.invoke(
    "wizard-morador-autosave",
    {
      body: {
        token,
        etapa,
        dados,
        sessao_id: sessaoId || null,
        progresso: progresso || 0,
        acao: "AUTOSAVE",
        contexto: info,
      },
    }
  );

  if (error || data?.success === false) {
    throw new Error(
      data?.message || data?.error || tratarErro(error, "Erro no autosave.")
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
  const info = obterInfoDispositivoWizard();

  const { data, error } = await supabase.functions.invoke(
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

  if (error || data?.success === false) {
    throw new Error(
      data?.message ||
        data?.error ||
        tratarErro(error, "Erro ao salvar etapa.")
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
  const info = obterInfoDispositivoWizard();

  const { data, error } = await supabase.functions.invoke(
    "wizard-morador-enviar-auditoria",
    {
      body: {
        token,
        aceite_termos: aceiteTermos,
        aceite_lgpd: aceiteLgpd,
        dados_finais: dadosFinais || {},
        contexto: info,
        criar_notificacao_responsavel_logistica: true,
      },
    }
  );

  if (error || data?.success === false) {
    throw new Error(
      data?.message ||
        data?.error ||
        tratarErro(error, "Erro ao enviar para auditoria.")
    );
  }

  return normalizarResposta(data);
}

export async function solicitarReenvioConviteMorador({ token, email, motivo }) {
  const info = obterInfoDispositivoWizard();

  const { data, error } = await supabase.functions.invoke(
    "wizard-morador-solicitar-reenvio",
    {
      body: {
        token: token || null,
        email: email || null,
        motivo: motivo || "Solicitação de reenvio pelo morador.",
        contexto: info,
      },
    }
  );

  if (error || data?.success === false) {
    throw new Error(
      data?.message ||
        data?.error ||
        tratarErro(error, "Erro ao solicitar reenvio.")
    );
  }

  return normalizarResposta(data);
}

export async function consultarStatusWizardMorador({ token, email, protocolo }) {
  const { data, error } = await supabase.functions.invoke(
    "wizard-morador-status",
    {
      body: {
        token: token || null,
        email: email || null,
        protocolo: protocolo || null,
      },
    }
  );

  if (error || data?.success === false) {
    throw new Error(
      data?.message ||
        data?.error ||
        tratarErro(error, "Erro ao consultar status.")
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
  const info = obterInfoDispositivoWizard();

  const { data, error } = await supabase.functions.invoke(
    "wizard-morador-preparar-senha",
    {
      body: {
        token,
        senha,
        confirmar_senha: confirmarSenha,
        email_login: email || null,
        cpf_login: cpf || null,
        contexto: info,
      },
    }
  );

  if (error || data?.success === false) {
    throw new Error(
      data?.message ||
        data?.error ||
        tratarErro(error, "Erro ao preparar senha.")
    );
  }

  return normalizarResposta(data);
}

export async function salvarPesquisaWizardMorador({
  token,
  protocolo,
  pesquisa,
}) {
  const info = obterInfoDispositivoWizard();

  const { data, error } = await supabase.functions.invoke(
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

  if (error || data?.success === false) {
    throw new Error(
      data?.message ||
        data?.error ||
        tratarErro(error, "Erro ao salvar pesquisa.")
    );
  }

  return normalizarResposta(data);
}