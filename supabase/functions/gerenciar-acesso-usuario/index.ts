import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validarSenha(senha: string) {
  return typeof senha === "string" && senha.length >= 8;
}

async function buscarAuthUserPorEmail(supabaseAdmin: any, email: string) {
  const alvo = email.toLowerCase().trim();

  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw error;

    const user = data?.users?.find(
      (u: any) => u.email?.toLowerCase() === alvo
    );

    if (user) return user;
    if (!data?.users || data.users.length < 1000) break;
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, message: "Método não permitido." }, 405);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse(
        { success: false, message: "Configuração do servidor não encontrada." },
        500
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();

    const tipoFluxo = body?.tipo_fluxo;
    const token = body?.token;
    const senha = body?.senha;
    const confirmarSenha = body?.confirmar_senha;

    const fluxosPermitidos = [
      "PRIMEIRO_ACESSO_FUNCIONARIO",
      "REENVIO_CONVITE_FUNCIONARIO",
      "RESET_SENHA_FUNCIONARIO",
    ];

    if (!fluxosPermitidos.includes(tipoFluxo)) {
      return jsonResponse({ success: false, message: "Tipo de acesso inválido." }, 400);
    }

    if (!token) {
      return jsonResponse({ success: false, message: "Link de acesso inválido." }, 400);
    }

    if (!validarSenha(senha)) {
      return jsonResponse(
        { success: false, message: "A senha deve ter pelo menos 8 caracteres." },
        400
      );
    }

    if (senha !== confirmarSenha) {
      return jsonResponse({ success: false, message: "As senhas não conferem." }, 400);
    }

    const { data: tokenInfo, error: tokenError } = await supabaseAdmin.rpc(
      "rpc_funcionario_validar_token_acesso_v1",
      { p_token: token }
    );

    if (tokenError) throw tokenError;

    if (!tokenInfo?.valido) {
      return jsonResponse(
        {
          success: false,
          message: "Link inválido. Solicite um novo convite.",
        },
        400
      );
    }

    const tipoFluxoToken = tokenInfo?.convite?.tipo_fluxo;

    if (tipoFluxoToken !== tipoFluxo) {
      return jsonResponse(
        {
          success: false,
          message: "Este link não corresponde ao tipo de acesso solicitado.",
        },
        400
      );
    }

    const conviteId = tokenInfo?.convite?.id;
    const funcionarioCondominioId = tokenInfo?.funcionario?.id;
    const condominioId = tokenInfo?.condominio?.id;
    const email = tokenInfo?.funcionario?.email?.toLowerCase()?.trim();
    const username = tokenInfo?.convite?.username?.toLowerCase()?.trim();

    if (!conviteId || !funcionarioCondominioId || !condominioId || !email || !username) {
      return jsonResponse(
        {
          success: false,
          message: "Não foi possível identificar os dados de acesso. Solicite um novo convite.",
        },
        400
      );
    }

    const { data: funcionario, error: funcionarioError } = await supabaseAdmin
      .from("funcionarios_condominio")
      .select(`
        id,
        business_id,
        condominio_id,
        pessoa_id,
        usuario_id,
        usuario_condominio_vinculo_id,
        categoria_id,
        cargo_id,
        funcao_id,
        tipo_funcionario,
        status_acesso,
        pessoas:pessoa_id (
          nome_completo,
          cpf,
          telefone,
          email
        ),
        cargos:cargo_id (
          nivel_hierarquico
        )
      `)
      .eq("id", funcionarioCondominioId)
      .single();

    if (funcionarioError) throw funcionarioError;

    if (!funcionario) {
      return jsonResponse({ success: false, message: "Funcionário não encontrado." }, 404);
    }

    const pessoa = Array.isArray(funcionario.pessoas)
      ? funcionario.pessoas[0]
      : funcionario.pessoas;

    const cargo = Array.isArray(funcionario.cargos)
      ? funcionario.cargos[0]
      : funcionario.cargos;

    let authUserId = funcionario.usuario_id || null;

    if (!authUserId) {
      const authUser = await buscarAuthUserPorEmail(supabaseAdmin, email);
      authUserId = authUser?.id || null;
    }

    if (tipoFluxo === "RESET_SENHA_FUNCIONARIO" && !authUserId) {
      return jsonResponse(
        {
          success: false,
          message:
            "Não foi possível localizar o acesso deste funcionário. Solicite a criação de acesso novamente.",
        },
        400
      );
    }

    if (!authUserId) {
      const { data: novoAuth, error: createAuthError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: senha,
          email_confirm: true,
          user_metadata: {
            nome: pessoa?.nome_completo,
            username,
            origem: "FUNCIONARIO_CONDOMINIO",
            condominio_id: condominioId,
            funcionario_condominio_id: funcionarioCondominioId,
          },
        });

      if (createAuthError) throw createAuthError;
      authUserId = novoAuth?.user?.id;
    } else {
      const { error: updateAuthError } =
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          password: senha,
          email_confirm: true,
          user_metadata: {
            nome: pessoa?.nome_completo,
            username,
            origem: "FUNCIONARIO_CONDOMINIO",
            condominio_id: condominioId,
            funcionario_condominio_id: funcionarioCondominioId,
          },
        });

      if (updateAuthError) throw updateAuthError;
    }

    if (!authUserId) {
      return jsonResponse(
        { success: false, message: "Não foi possível concluir o acesso do funcionário." },
        500
      );
    }

    const tipoVinculo =
      String(tokenInfo?.cargo?.cargo || tokenInfo?.cargo?.funcao || "")
        .toLowerCase()
        .includes("zelador")
        ? "zelador"
        : String(tokenInfo?.cargo?.cargo || tokenInfo?.cargo?.funcao || "")
            .toLowerCase()
            .includes("admin")
        ? "administrativo"
        : "porteiro";

    const nivelId = 5;

    const { error: upsertUsuarioError } = await supabaseAdmin
      .from("usuarios")
      .upsert(
        {
          id: authUserId,
          business_id: funcionario.business_id,
          nome: pessoa?.nome_completo,
          email,
          condominio_id: condominioId,
          nivel_id: nivelId,
          ativo: true,
          telefone: pessoa?.telefone || null,
          cpf: pessoa?.cpf || null,
          status_cadastro: "ativo",
          primeiro_acesso: false,
          tipo_usuario: "FUNCIONARIO",
          origem: "MODULO_ADMINISTRATIVO",
          username,
        },
        { onConflict: "id" }
      );

    if (upsertUsuarioError) throw upsertUsuarioError;

    const { data: vinculoExistente, error: vinculoBuscaError } =
      await supabaseAdmin
        .from("usuario_condominio_vinculos")
        .select("id")
        .eq("usuario_id", authUserId)
        .eq("condominio_id", condominioId)
        .in("tipo_vinculo", ["porteiro", "zelador", "administrativo"])
        .maybeSingle();

    if (vinculoBuscaError) throw vinculoBuscaError;

    let vinculoId = vinculoExistente?.id;

    if (!vinculoId) {
      const { data: novoVinculo, error: vinculoInsertError } =
        await supabaseAdmin
          .from("usuario_condominio_vinculos")
          .insert({
            usuario_id: authUserId,
            pessoa_id: funcionario.pessoa_id,
            condominio_id: condominioId,
            username,
            tipo_vinculo: tipoVinculo,
            cargo: funcionario.tipo_funcionario,
            ativo: true,
            email_login: email,
          })
          .select("id")
          .single();

      if (vinculoInsertError) throw vinculoInsertError;
      vinculoId = novoVinculo.id;
    } else {
      const { error: vinculoUpdateError } = await supabaseAdmin
        .from("usuario_condominio_vinculos")
        .update({
          username,
          email_login: email,
          ativo: true,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", vinculoId);

      if (vinculoUpdateError) throw vinculoUpdateError;
    }

    if (funcionario.funcao_id) {
      const { data: funcaoExistente, error: funcaoBuscaError } =
        await supabaseAdmin
          .from("usuario_funcoes")
          .select("id")
          .eq("usuario_id", authUserId)
          .eq("condominio_id", condominioId)
          .eq("funcao_id", funcionario.funcao_id)
          .maybeSingle();

      if (funcaoBuscaError) throw funcaoBuscaError;

      if (!funcaoExistente) {
        const { error: funcaoInsertError } = await supabaseAdmin
          .from("usuario_funcoes")
          .insert({
            usuario_id: authUserId,
            condominio_id: condominioId,
            funcao_id: funcionario.funcao_id,
          });

        if (funcaoInsertError) throw funcaoInsertError;
      }
    }

    const { error: atualizarFuncionarioError } = await supabaseAdmin
      .from("funcionarios_condominio")
      .update({
        usuario_id: authUserId,
        usuario_condominio_vinculo_id: vinculoId,
        status_acesso: "ACESSO_ATIVO",
        atualizado_em: new Date().toISOString(),
        motivo_ultima_alteracao: "Primeiro acesso concluído",
      })
      .eq("id", funcionarioCondominioId);

    if (atualizarFuncionarioError) throw atualizarFuncionarioError;

    const { error: marcarError } = await supabaseAdmin.rpc(
      "rpc_funcionario_marcar_primeiro_acesso_concluido_v1",
      {
        p_convite_id: conviteId,
        p_usuario_id: authUserId,
      }
    );

    if (marcarError) throw marcarError;

    return jsonResponse({
      success: true,
      message:
        tipoFluxo === "RESET_SENHA_FUNCIONARIO"
          ? "Senha atualizada com sucesso."
          : "Acesso criado com sucesso.",
    });
  } catch (error) {
    console.error("Erro gerenciar-acesso-usuario:", error);

    return jsonResponse(
      {
        success: false,
        message:
          "Não foi possível concluir o acesso. Tente novamente ou solicite um novo convite.",
      },
      500
    );
  }
});