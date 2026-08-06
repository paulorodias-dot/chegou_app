import { supabase } from "./supabase";

export const PASSWORD_RECOVERY_PUBLIC_MESSAGE =
  "Se existir uma conta vinculada ao e-mail informado, enviaremos as instruções para redefinir sua senha. O e-mail pode levar até 3 minutos para chegar. Verifique também a caixa de spam ou lixo eletrônico.";

export async function solicitarRecuperacaoSenha(email) {
  const emailNormalizado = String(email || "")
    .trim()
    .toLowerCase();

  const { data, error } = await supabase.functions.invoke(
    "solicitar-recuperacao-senha",
    {
      body: {
        email: emailNormalizado,
      },
    }
  );

  if (error) {
    console.error(error);

    throw new Error(
      "Não foi possível concluir a solicitação neste momento."
    );
  }

  return {
    success: true,
    message:
      data?.message ??
      PASSWORD_RECOVERY_PUBLIC_MESSAGE,

    estimatedDeliveryMinutes:
      Number(data?.estimated_delivery_minutes) || 3,

    correlationId:
      typeof data?.correlation_id === "string"
        ? data.correlation_id
        : null,
  };
}

/**
 * Prepara a sessão temporária de recuperação.
 * Compatível com PKCE (code) e com access_token
 * retornado na URL.
 */
export async function prepararSessaoRecuperacaoSenha() {
  const currentUrl = new URL(window.location.href);

  // Fluxo PKCE
  const code = currentUrl.searchParams.get("code");

  if (code) {
    const { error } =
      await supabase.auth.exchangeCodeForSession(
        code
      );

    if (error) {
      throw error;
    }

    currentUrl.searchParams.delete("code");

    window.history.replaceState(
      {},
      document.title,
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
    );
  }

  // Fluxo Token
  const hash = window.location.hash.replace(
    /^#/,
    ""
  );

  if (hash) {
    const hashParams = new URLSearchParams(hash);

    const accessToken =
      hashParams.get("access_token");

    const refreshToken =
      hashParams.get("refresh_token");

    if (accessToken && refreshToken) {
      const { error } =
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

      if (error) {
        throw error;
      }

      window.history.replaceState(
        {},
        document.title,
        `${window.location.pathname}${window.location.search}`
      );
    }
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return session;
}

/**
 * Observa alterações da sessão.
 * O evento PASSWORD_RECOVERY é disparado
 * quando o usuário chega através do link
 * enviado pelo Supabase.
 */
export function observarRecuperacaoSenha(
  callback
) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(
    (event, session) => {
      callback({
        event,
        session,
        isPasswordRecovery:
          event === "PASSWORD_RECOVERY",
      });
    }
  );

  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Atualiza a senha do usuário
 * utilizando a sessão temporária
 * criada pelo link de recuperação.
 */
export async function atualizarSenhaRecuperada(
  novaSenha
) {
  const { data, error } =
    await supabase.auth.updateUser({
      password: novaSenha,
    });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Encerra apenas a sessão local
 * após a redefinição da senha.
 */
export async function encerrarSessaoRecuperacao() {
  const { error } =
    await supabase.auth.signOut({
      scope: "local",
    });

  if (error) {
    throw error;
  }
}