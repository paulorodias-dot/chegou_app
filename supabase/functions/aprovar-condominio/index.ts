import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function onlyNumbers(value = "") {
  return value.replace(/\D/g, "");
}

function normalizarCodigo(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function montarBusinessId(codigoCondominio = "") {
  const codigo = normalizarCodigo(codigoCondominio || "COND");
  return `${codigo}-SIND-001`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Método não permitido." }, 405);
    }

    const { condominio_id } = await req.json();

    if (!condominio_id) {
      return jsonResponse({ error: "condominio_id é obrigatório." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { error: "Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes." },
        500
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: condominio, error: condominioError } = await supabaseAdmin
      .from("condominios")
      .select(`
        id,
        cnpj,
        codigo_condominio,
        razao_social,
        nome_fantasia,
        email_condominio,
        telefone_condominio,
        status_cadastro,
        responsavel_logistica (
          id,
          nome,
          email,
          telefone,
          funcao
        )
      `)
      .eq("id", condominio_id)
      .single();

    if (condominioError || !condominio) {
      return jsonResponse({ error: "Condomínio não encontrado." }, 404);
    }

    if (condominio.status_cadastro === "ativo") {
      return jsonResponse(
        { error: "Este condomínio já está ativo/aprovado." },
        409
      );
    }

    const responsavel = condominio.responsavel_logistica?.[0];

    if (!responsavel?.email) {
      return jsonResponse(
        { error: "Responsável sem e-mail cadastrado." },
        400
      );
    }

    const email = String(responsavel.email).trim().toLowerCase();
    const nome = responsavel.nome || "Responsável do Condomínio";
    const businessId = montarBusinessId(condominio.codigo_condominio);

    const { data: usuariosExistentes, error: listarAuthError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (listarAuthError) {
      throw listarAuthError;
    }

    const usuarioAuthExistente = usuariosExistentes.users.find(
      (user) => user.email?.toLowerCase() === email
    );

    let authUserId = usuarioAuthExistente?.id;

    if (!authUserId) {
      const { data: novoUsuario, error: criarAuthError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            nome,
            tipo: "sindico",
            nivel_id: 2,
            condominio_id: condominio.id,
            codigo_condominio: condominio.codigo_condominio,
            business_id: businessId,
          },
        });

      if (criarAuthError || !novoUsuario?.user?.id) {
        throw criarAuthError || new Error("Erro ao criar usuário Auth.");
      }

      authUserId = novoUsuario.user.id;
    } else {
      const { error: atualizarAuthError } =
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          email_confirm: true,
          user_metadata: {
            nome,
            tipo: "sindico",
            nivel_id: 2,
            condominio_id: condominio.id,
            codigo_condominio: condominio.codigo_condominio,
            business_id: businessId,
          },
        });

      if (atualizarAuthError) throw atualizarAuthError;
    }

    const { data: usuarioExistente } = await supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("id", authUserId)
      .maybeSingle();

    const payloadUsuario = {
      id: authUserId,
      business_id: businessId,
      nome,
      email,
      condominio_id: condominio.id,
      nivel_id: 2,
      ativo: true,
      permite_visibilidade: false,
      data_nascimento: null,
      permite_exibir_aniversario: false,
    };

    if (usuarioExistente) {
      const { error: atualizarUsuarioError } = await supabaseAdmin
        .from("usuarios")
        .update(payloadUsuario)
        .eq("id", authUserId);

      if (atualizarUsuarioError) throw atualizarUsuarioError;
    } else {
      const { error: inserirUsuarioError } = await supabaseAdmin
        .from("usuarios")
        .insert(payloadUsuario);

      if (inserirUsuarioError) throw inserirUsuarioError;
    }

    const agora = new Date().toISOString();

    const { error: atualizarCondominioError } = await supabaseAdmin
      .from("condominios")
      .update({
        status_cadastro: "ativo",
        aprovado_em: agora,
        data_aprovacao: agora,
        motivo_rejeicao: null,
        rejeitado_em: null,
        atualizado_em: agora,
      })
      .eq("id", condominio.id);

    if (atualizarCondominioError) throw atualizarCondominioError;

    const siteUrl =
      Deno.env.get("SITE_URL") ||
      Deno.env.get("APP_URL") ||
      "https://chegou-app.vercel.app";

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: `${siteUrl}/login`,
        },
      });

    if (linkError) throw linkError;

    return jsonResponse({
      success: true,
      message: "Condomínio aprovado e usuário criado/liberado com sucesso.",
      condominio_id: condominio.id,
      usuario_id: authUserId,
      email,
      nome,
      nivel_id: 2,
      business_id: businessId,
      codigo_condominio: condominio.codigo_condominio,
      recovery_link: linkData?.properties?.action_link || null,
    });
  } catch (error) {
    console.error("Erro aprovar-condominio:", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao aprovar condomínio.",
      },
      500
    );
  }
});