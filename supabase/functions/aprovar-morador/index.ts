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

function obterIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    null
  );
}

function detectarSistemaOperacional(userAgent = "") {
  const ua = userAgent.toLowerCase();

  if (ua.includes("windows")) return "Windows";
  if (ua.includes("android")) return "Android";
  if (ua.includes("iphone") || ua.includes("ipad")) return "iOS";
  if (ua.includes("mac os") || ua.includes("macintosh")) return "macOS";
  if (ua.includes("linux")) return "Linux";

  return "Não identificado";
}

function detectarNavegador(userAgent = "") {
  const ua = userAgent.toLowerCase();

  if (ua.includes("edg/")) return "Microsoft Edge";
  if (ua.includes("chrome/") && !ua.includes("edg/")) return "Google Chrome";
  if (ua.includes("firefox/")) return "Mozilla Firefox";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "Safari";

  return "Não identificado";
}

async function obterChaveDescriptografia() {
  const secret = Deno.env.get("CHEGOU_AUTH_PASSWORD_SECRET");

  if (!secret || secret.length < 32) {
    throw new Error("CHEGOU_AUTH_PASSWORD_SECRET ausente ou inválida.");
  }

  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(secret));

  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["decrypt"]);
}

function base64ParaBytes(base64: string) {
  const binario = atob(base64);
  return Uint8Array.from(binario, (char) => char.charCodeAt(0));
}

async function descriptografarSenhaAuth(valor: string) {
  const partes = String(valor || "").split("$");

  if (partes.length !== 3 || partes[0] !== "v1") {
    throw new Error("Formato da senha temporária inválido.");
  }

  const [, ivBase64, encryptedBase64] = partes;

  const chave = await obterChaveDescriptografia();

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ParaBytes(ivBase64),
    },
    chave,
    base64ParaBytes(encryptedBase64)
  );

  return new TextDecoder().decode(decrypted);
}

async function registrarLog({
  supabaseAdmin,
  acao,
  condominio_id,
  usuario_id,
  email,
  origem,
  detalhes,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  acao: string;
  condominio_id?: string | null;
  usuario_id?: string | null;
  email?: string | null;
  origem?: string | null;
  detalhes?: Record<string, unknown>;
}) {
  try {
    await supabaseAdmin.from("logs_sistema").insert({
      acao,
      condominio_id: condominio_id || null,
      usuario_id: usuario_id || null,
      email: email || null,
      origem: origem || "sistema",
      detalhes: detalhes || {},
    });
  } catch (error) {
    console.error(`Erro ao registrar log ${acao}:`, error);
  }
}

function montarHtmlBoasVindas({
  nome,
  nomeCondominio,
  empresaEndereco,
  loginUrl,
}: {
  nome: string;
  nomeCondominio: string;
  empresaEndereco: string;
  loginUrl: string;
}) {
  return `
<div style="background:#f4f7fb;padding:20px;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 12px 30px rgba(15,23,42,0.08)">

    <div style="background:#174ea6;padding:22px;text-align:center">
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800">
        Chegou<span style="color:#ff7900">!</span>
      </h1>

      <p style="margin:6px 0 0;color:#eaf2ff;font-size:13px">
        Gestão Inteligente de Encomendas
      </p>
    </div>

    <div style="padding:24px;color:#0f172a;font-size:15px;line-height:1.55">

      <p style="margin:0 0 14px">
        Olá <strong>${nome}</strong>,
      </p>

      <p style="margin:0 0 14px">
        Seu cadastro no condomínio
        <strong>${nomeCondominio}</strong>
        foi aprovado com sucesso.
      </p>

      <p style="margin:0 0 16px">
        Agora você já pode acompanhar notificações, entregas e movimentações das suas encomendas diretamente pelo Sistema Chegou<span style="color:#ff7900">!</span>
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin:18px 0;color:#334155">
        <p style="margin:0;font-size:13px">
          Seu acesso já está liberado. Utilize seu e-mail cadastrado e a senha definida no Wizard para acessar o sistema.
        </p>
      </div>

      <div style="text-align:center;margin:24px 0 18px">
        <a
          href="${loginUrl}"
          style="display:inline-block;background:#ff7900;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;font-size:15px"
        >
          Acessar o Sistema Chegou!
        </a>
      </div>

      <p style="font-size:12px;color:#64748b;margin:0 0 18px">
        Caso o botão não funcione, copie e cole este endereço no navegador:<br>
        <span style="color:#174ea6;word-break:break-all">${loginUrl}</span>
      </p>

      <p style="margin:20px 0 0">
        <strong>Equipe Chegou<span style="color:#ff7900">!</span></strong>
      </p>
    </div>

    <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#64748b;border-top:1px solid #e5e7eb">
      <p style="margin:0">
        Este é um e-mail automático.
      </p>

      <p style="margin:6px 0">
        ${empresaEndereco}
      </p>

      <p style="margin:6px 0">
        © 2026 Chegou<span style="color:#ff7900">!</span>
      </p>
    </div>
  </div>
</div>
`;
}

function tipoUsuarioUnidade(tipoMorador = "") {
  const tipo = String(tipoMorador || "").toLowerCase();

  if (tipo.includes("inquilino") || tipo.includes("locatario")) {
    return "inquilino";
  }

  if (tipo.includes("dependente")) {
    return "dependente";
  }

  return "proprietario";
}

async function obterOuCriarUnidade({
  supabaseAdmin,
  condominioId,
  businessId,
  torreNome,
  unidadeNumero,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  condominioId: string;
  businessId?: string | null;
  torreNome?: string | null;
  unidadeNumero: string;
}) {
  const numero = String(unidadeNumero || "").trim();

  if (!numero) {
    throw new Error("Número da unidade não informado.");
  }

  const { data: torre } = await supabaseAdmin
    .from("torres")
    .select("id, nome")
    .eq("condominio_id", condominioId)
    .eq("nome", torreNome || "")
    .maybeSingle();

  let unidadeId: string | null = null;

  const { data: unidadeExistente, error: unidadeBuscaError } =
    await supabaseAdmin
      .from("unidades")
      .select("id")
      .eq("condominio_id", condominioId)
      .eq("numero", numero)
      .eq("torre_id", torre?.id || null)
      .maybeSingle();

  if (unidadeBuscaError) throw unidadeBuscaError;

  if (unidadeExistente?.id) {
    unidadeId = unidadeExistente.id;
  } else {
    const { data: novaUnidade, error: novaUnidadeError } =
      await supabaseAdmin
        .from("unidades")
        .insert({
          condominio_id: condominioId,
          business_id: businessId || null,
          torre_id: torre?.id || null,
          numero,
        })
        .select("id")
        .single();

    if (novaUnidadeError) throw novaUnidadeError;

    unidadeId = novaUnidade.id;
  }

  let condominioUnidadeId: string | null = null;

  const { data: condUnidadeExistente, error: condUnidadeBuscaError } =
    await supabaseAdmin
      .from("condominio_unidades")
      .select("id")
      .eq("condominio_id", condominioId)
      .eq("torre", torreNome || "")
      .eq("unidade", numero)
      .maybeSingle();

  if (condUnidadeBuscaError) throw condUnidadeBuscaError;

  if (condUnidadeExistente?.id) {
    condominioUnidadeId = condUnidadeExistente.id;
  } else {
    const { data: novaCondUnidade, error: novaCondUnidadeError } =
      await supabaseAdmin
        .from("condominio_unidades")
        .insert({
          condominio_id: condominioId,
          torre: torreNome || null,
          bloco: null,
          unidade: numero,
          ativo: true,
        })
        .select("id")
        .single();

    if (novaCondUnidadeError) throw novaCondUnidadeError;

    condominioUnidadeId = novaCondUnidade.id;
  }

  return {
    unidadeId,
    condominioUnidadeId,
  };
}

async function vincularUsuarioUnidade({
  supabaseAdmin,
  usuarioId,
  unidadeId,
  tipo,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  usuarioId: string;
  unidadeId: string;
  tipo: string;
}) {
  const { data: vinculoExistente, error: buscaVinculoError } =
    await supabaseAdmin
      .from("usuario_unidade")
      .select("id")
      .eq("usuario_id", usuarioId)
      .eq("unidade_id", unidadeId)
      .maybeSingle();

  if (buscaVinculoError) throw buscaVinculoError;

  if (vinculoExistente?.id) return vinculoExistente.id;

  const { data: novoVinculo, error: insertVinculoError } =
    await supabaseAdmin
      .from("usuario_unidade")
      .insert({
        usuario_id: usuarioId,
        unidade_id: unidadeId,
        tipo,
      })
      .select("id")
      .single();

  if (insertVinculoError) throw insertVinculoError;

  return novoVinculo.id;
}

function extrairVagasPreCadastro(preCadastro: Record<string, unknown>) {
  const dados = preCadastro.dados_complementares as Record<string, unknown> | null;

  const vagasDiretas = Array.isArray(dados?.vagas)
    ? dados?.vagas
    : [];

  const tela5 = dados?.tela5 as Record<string, unknown> | null;

  const vagasTela5 = Array.isArray(tela5?.vagas)
    ? tela5?.vagas
    : [];

  return vagasDiretas.length ? vagasDiretas : vagasTela5;
}

function normalizarSituacaoVaga(situacao = "") {
  const valor = String(situacao || "").trim().toLowerCase();

  if (!valor || valor === "sem_uso") return "sem_uso";
  if (valor.includes("uso")) return "em_uso";
  if (valor.includes("emprest")) return "emprestada";
  if (valor.includes("alug")) return "alugada";

  return valor;
}

function normalizarLocalizacaoVaga(vaga: Record<string, unknown>) {
  return String(
    vaga.local ||
      vaga.localizacao ||
      vaga.localizacao_vaga ||
      "Não informada"
  ).trim();
}

async function migrarVagasUnidade({
  supabaseAdmin,
  preCadastro,
  condominioId,
  unidadeId,
  usuarioId,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  preCadastro: Record<string, unknown>;
  condominioId: string;
  unidadeId: string;
  usuarioId: string;
}) {
  const vagas = extrairVagasPreCadastro(preCadastro);

  if (!vagas.length) {
    return [];
  }

  const registrosCriados: string[] = [];

  for (const vagaOriginal of vagas) {
    const vaga = vagaOriginal as Record<string, unknown>;

    const numeroVaga = String(
      vaga.identificacao ||
        vaga.numero_vaga ||
        vaga.identificacao_vaga ||
        ""
    ).trim();

    if (!numeroVaga) {
      continue;
    }

    const localizacao = normalizarLocalizacaoVaga(vaga);
    const tipoUso = normalizarSituacaoVaga(String(vaga.situacao || vaga.tipo_uso || ""));
    const emUso = tipoUso !== "sem_uso";

    const { data: vagaExistente, error: buscaVagaError } =
      await supabaseAdmin
        .from("vagas_unidade")
        .select("id")
        .eq("condominio_id", condominioId)
        .eq("unidade_id", unidadeId)
        .eq("numero_vaga", numeroVaga)
        .maybeSingle();

    if (buscaVagaError) {
      throw buscaVagaError;
    }

    const payloadVaga = {
      business_id: preCadastro.business_id || null,
      condominio_id: condominioId,
      unidade_id: unidadeId,
      morador_responsavel_id: usuarioId,
      proprietario_vaga_id: usuarioId,

      numero_vaga: numeroVaga,
      identificacao_vaga: numeroVaga,

      localizacao,
      localizacao_vaga: localizacao,

      tipo_vaga: "privativa",
      tipo_fisico_vaga: "padrao",

      status_vaga: "ATIVA",
      status: "ATIVA",

      em_uso: emUso,
      tipo_uso: tipoUso,
      modo_uso_vaga: tipoUso,

      vaga_pertence_unidade: true,
      autorizacao_status: "APROVADO",
      status_conflito: "SEM_CONFLITO",

      observacoes: String(vaga.observacoes || "").trim() || null,
      atualizado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (vagaExistente?.id) {
      const { error: updateVagaError } =
        await supabaseAdmin
          .from("vagas_unidade")
          .update(payloadVaga)
          .eq("id", vagaExistente.id);

      if (updateVagaError) {
        throw updateVagaError;
      }

      registrosCriados.push(vagaExistente.id);
    } else {
      const { data: novaVaga, error: insertVagaError } =
        await supabaseAdmin
          .from("vagas_unidade")
          .insert({
            ...payloadVaga,
            criado_em: new Date().toISOString(),
          })
          .select("id")
          .single();

      if (insertVagaError) {
        throw insertVagaError;
      }

      registrosCriados.push(novaVaga.id);
    }
  }

  return registrosCriados;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse(
        { error: "Método não permitido." },
        405
      );
    }

    const body = await req.json();

    const {
      auditoria_id,
      pre_cadastro_id,
      condominio_id,
      aprovado_por,
      aprovado_por_nome,
      aprovado_por_email,
    } = body;

    if (!auditoria_id && !pre_cadastro_id) {
      return jsonResponse(
        {
          error: "auditoria_id ou pre_cadastro_id obrigatório.",
        },
        400
      );
    }

    if (!auditoria_id && !condominio_id) {
      return jsonResponse(
        {
          error: "condominio_id obrigatório quando pre_cadastro_id for informado.",
        },
        400
      );
    }

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        {
          error:
            "Variáveis Supabase ausentes.",
        },
        500
      );
    }

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRoleKey
      );

    const appUrl =
      Deno.env.get("CHEGOU_APP_URL") ||
      "https://chegou-app.vercel.app";

    const loginUrl = `${appUrl.replace(/\/$/, "")}/login`;

    const ip = obterIp(req);

    const userAgent =
      req.headers.get("user-agent") || "";

    const sistemaOperacional =
      detectarSistemaOperacional(
        userAgent
      );

    const navegador =
      detectarNavegador(userAgent);

    const contextoRequisicao = {
      ip,
      user_agent: userAgent,
      sistema_operacional:
        sistemaOperacional,
      navegador,
    };

    let auditoria: Record<string, unknown> | null = null;
    let preCadastro: Record<string, unknown> | null = null;

    if (auditoria_id) {
      const { data, error } = await supabaseAdmin
        .from("auditorias_morador")
        .select(`
          *,
          pre_cadastro_moradores (*)
        `)
        .eq("id", auditoria_id)
        .maybeSingle();

      if (error) throw error;

      auditoria = data;
      preCadastro = data?.pre_cadastro_moradores || null;
    } else {
      const { data, error } = await supabaseAdmin
        .from("pre_cadastro_moradores")
        .select("*")
        .eq("id", pre_cadastro_id)
        .eq("condominio_id", condominio_id)
        .maybeSingle();

      if (error) throw error;

      preCadastro = data;

      const { data: auditoriaAtual } = await supabaseAdmin
        .from("auditorias_morador")
        .select("*")
        .eq("pre_cadastro_id", pre_cadastro_id)
        .eq("condominio_id", condominio_id)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      auditoria = auditoriaAtual || null;
    }

    if (!preCadastro) {
      return jsonResponse(
        {
          error: "Pré-cadastro não encontrado.",
        },
        404
      );
    }

    if (String(preCadastro.status_auditoria || "").toUpperCase() === "APROVADO") {
      return jsonResponse(
        {
          error: "Morador já aprovado.",
        },
        409
      );
    }

    if (!preCadastro.senha_preparada || !preCadastro.senha_auth_criptografada) {
      return jsonResponse(
        {
          error: "Senha do morador não preparada. O morador precisa finalizar a etapa de senha no Wizard.",
        },
        400
      );
    }

    const senhaAuth = await descriptografarSenhaAuth(
      String(preCadastro.senha_auth_criptografada)
    );

    const condominioIdFinal =
      String(preCadastro.condominio_id || condominio_id || auditoria?.condominio_id || "");

    const email =
      String(
        preCadastro.email || ""
      )
        .trim()
        .toLowerCase();

    if (!email) {
      return jsonResponse(
        {
          error:
            "E-mail não encontrado.",
        },
        400
      );
    }

    const nome =
      preCadastro.nome ||
      "Morador";

    let authUserId: string | null = null;

    const { data: usuarioSistemaExistente, error: buscaUsuarioSistemaError } =
      await supabaseAdmin
        .from("usuarios")
        .select("id")
        .eq("email", email)
        .maybeSingle();

    if (buscaUsuarioSistemaError) {
      throw buscaUsuarioSistemaError;
    }

    authUserId = usuarioSistemaExistente?.id || null;

    if (!authUserId) {
      const { data: novoAuth, error: createAuthError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: senhaAuth,
          email_confirm: true,
          user_metadata: {
            nome,
            tipo: "morador",
            nivel_id: 6,
            condominio_id: condominioIdFinal,
            business_id: preCadastro.business_id,
          },
        });

      if (createAuthError || !novoAuth?.user?.id) {
        throw createAuthError || new Error("Erro ao criar Auth.");
      }

      authUserId = novoAuth.user.id;
    } else {
      const { error: updateAuthError } =
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          password: senhaAuth,
          email_confirm: true,
          user_metadata: {
            nome,
            tipo: "morador",
            nivel_id: 6,
            condominio_id: condominioIdFinal,
            business_id: preCadastro.business_id,
          },
        });

      if (updateAuthError) throw updateAuthError;
    }

    const {
      data: usuarioExistente,
    } =
      await supabaseAdmin
        .from("usuarios")
        .select("id")
        .eq("id", authUserId)
        .maybeSingle();

    const payloadUsuario = {
      id: authUserId,

      business_id:
        preCadastro.business_id,

      nome,

      email,

      telefone:
        preCadastro.telefone,

      cpf:
        preCadastro.cpf,

      condominio_id:
        condominioIdFinal,

      nivel_id: 6,

      ativo: true,

      status_cadastro:
        "ativo",

      primeiro_acesso: true,

      notificacoes_ativas:
        true,

      data_aprovacao:
        new Date().toISOString(),

      aprovado_por:
        aprovado_por ||
        null,

      token_revogado:
        false,
    };

    if (usuarioExistente) {
      const {
        error:
          updateUsuarioError,
      } =
        await supabaseAdmin
          .from("usuarios")
          .update(
            payloadUsuario
          )
          .eq(
            "id",
            authUserId
          );

      if (
        updateUsuarioError
      ) {
        throw updateUsuarioError;
      }
    } else {
      const {
        error:
          insertUsuarioError,
      } =
        await supabaseAdmin
          .from("usuarios")
          .insert(
            payloadUsuario
          );

      if (
        insertUsuarioError
      ) {
        throw insertUsuarioError;
      }
    }

    const { unidadeId, condominioUnidadeId } = await obterOuCriarUnidade({
      supabaseAdmin,
      condominioId: condominioIdFinal,
      businessId: preCadastro.business_id || null,
      torreNome: String(preCadastro.torre || ""),
      unidadeNumero: String(preCadastro.unidade || ""),
    });

    const tipoVinculoUnidade = tipoUsuarioUnidade(
      String(preCadastro.tipo_morador || preCadastro.perfil_morador || "")
    );

    await vincularUsuarioUnidade({
      supabaseAdmin,
      usuarioId: authUserId,
      unidadeId,
      tipo: tipoVinculoUnidade,
    });

    const vagasMigradasIds = await migrarVagasUnidade({
      supabaseAdmin,
      preCadastro,
      condominioId: condominioIdFinal,
      unidadeId,
      usuarioId: authUserId,
    });

    const agora =
      new Date().toISOString();

    if (auditoria?.id) {
      const { error: updateAuditoriaError } = await supabaseAdmin
        .from("auditorias_morador")
        .update({
          usuario_id: authUserId,
          unidade_id: condominioUnidadeId,
          status_auditoria: "APROVADO",
          aprovado_em: agora,
          aprovado_por: aprovado_por || null,
          observacao_auditor: "Cadastro aprovado.",
          ip_auditor: ip,
          dispositivo_auditor: userAgent,
          navegador_auditor: navegador,
        })
        .eq("id", auditoria.id);

      if (updateAuditoriaError) {
        throw updateAuditoriaError;
      }
    }

    const { data: preCadastroAtualizado, error: updatePreCadastroError } =
      await supabaseAdmin
        .from("pre_cadastro_moradores")
        .update({
          status_auditoria: "APROVADO",
          status_conta: "CONTA_ATIVA",
          auth_ativo: true,
          auth_user_id: authUserId,
          senha_auth_criptografada: null,
          aprovado_em: agora,
          aprovado_por: aprovado_por || null,
          atualizado_em: agora,
        })
        .eq("id", preCadastro.id)
        .select(
          "id, status_auditoria, status_conta, auth_ativo, auth_user_id"
        )
        .maybeSingle();

    if (updatePreCadastroError) {
      throw updatePreCadastroError;
    }

    if (!preCadastroAtualizado?.id) {
      throw new Error("Pré-cadastro não foi atualizado após aprovação.");
    }

    const {
      data: convites,
    } =
      await supabaseAdmin
        .from(
          "convites_morador"
        )
        .select("id")
        .eq(
          "pre_cadastro_id",
          preCadastro.id
        );

    if (
      convites &&
      convites.length > 0
    ) {
      const ids =
        convites.map(
          (item) => item.id
        );

      const { error: updateConvitesError } =
        await supabaseAdmin
          .from(
            "convites_morador"
          )
          .update({
            token_utilizado:
              true,

            token_revogado:
              true,

            status_envio:
              "FINALIZADO",

            status_convite:
              "FINALIZADO",
          })
          .in("id", ids);

      if (
        updateConvitesError
      ) {
        throw updateConvitesError;
      }
    }

    const {
      data: condominio,
    } =
      await supabaseAdmin
        .from("condominios")
        .select(`
          nome_fantasia,
          razao_social
        `)
        .eq(
          "id",
          condominioIdFinal
        )
        .maybeSingle();

    const nomeCondominio =
      condominio
        ?.nome_fantasia ||
      condominio
        ?.razao_social ||
      "Condomínio";

    const empresaEndereco =
      Deno.env.get(
        "EMPRESA_ENDERECO"
      ) ||
      "[Endereço físico da empresa — definir no módulo institucional]";

    const brevoApiKey =
      Deno.env.get(
        "BREVO_API_KEY"
      );

    const remetenteEmail =
      Deno.env.get(
        "BREVO_SENDER_EMAIL"
      ) ||
      "sistemachegou@gmail.com";

    const remetenteNome =
      Deno.env.get(
        "BREVO_SENDER_NAME"
      ) ||
      "Chegou! Sistema";

    let emailStatus =
      "nao_enviado";

    let brevoMessageId =
      null;

    let brevoError =
      null;

    if (brevoApiKey) {
      try {
        const htmlContent =
          montarHtmlBoasVindas({
            nome,
            nomeCondominio,
            empresaEndereco,
            loginUrl,
          });

        const brevoResponse =
          await fetch(
            "https://api.brevo.com/v3/smtp/email",
            {
              method:
                "POST",

              headers: {
                "api-key":
                  brevoApiKey,

                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",
              },

              body:
                JSON.stringify(
                  {
                    sender: {
                      name:
                        remetenteNome,

                      email:
                        remetenteEmail,
                    },

                    to: [
                      {
                        email,
                        name:
                          nome,
                      },
                    ],

                    subject:
                      "Cadastro aprovado no Chegou!",

                    htmlContent,
                  }
                ),
            }
          );

        const brevoResult =
          await brevoResponse
            .json()
            .catch(
              () => ({})
            );

        if (
          !brevoResponse.ok
        ) {
          emailStatus =
            "erro";

          brevoError =
            brevoResult?.message ||
            brevoResult?.error ||
            "Erro Brevo.";
        } else {
          emailStatus =
            "enviado";

          brevoMessageId =
            brevoResult?.messageId ||
            null;
        }
      } catch (error) {
        emailStatus =
          "erro";

        brevoError =
          error instanceof Error
            ? error.message
            : "Erro inesperado.";
      }
    }

    if (emailStatus === "enviado") {
      await registrarLog({
        supabaseAdmin,
        acao: "EMAIL_APROVACAO_MORADOR_ENVIADO",
        condominio_id: condominioIdFinal,
        usuario_id: authUserId,
        email,
        origem: "brevo",
        detalhes: {
          tipo_email: "aprovacao_morador",
          brevo_message_id: brevoMessageId,
          remetente_email: remetenteEmail,
          remetente_nome: remetenteNome,
          login_url: loginUrl,
          pre_cadastro_id: preCadastro.id,
          auditoria_id: auditoria?.id || null,
          ...contextoRequisicao,
        },
      });
    }

    await registrarLog({
      supabaseAdmin,

      acao:
        "MORADOR_APROVADO",

      condominio_id:
        condominioIdFinal,

      usuario_id:
        authUserId,

      email,

      origem:
        "auditoria_morador",

      detalhes: {
        auditoria_id:
          auditoria?.id || null,

        pre_cadastro_id:
          preCadastro.id,

        aprovado_por,

        aprovado_por_nome,

        aprovado_por_email,

        vagas_migradas_ids: vagasMigradasIds,
        vagas_migradas_total: vagasMigradasIds.length,

        email_status:
          emailStatus,

        brevo_message_id:
          brevoMessageId,

        brevo_error:
          brevoError,

        ...contextoRequisicao,
      },
    });

    return jsonResponse({
      success: true,

      message:
        "Morador aprovado com sucesso.",

      usuario_id:
        authUserId,

      auditoria_id:
        auditoria?.id || null,

      pre_cadastro_id:
        preCadastro.id,

      email_status:
        emailStatus,

      brevo_message_id:
        brevoMessageId,

      brevo_error:
        brevoError,
    });
  } catch (error) {
    console.error(
      "Erro aprovar-morador:",
      error
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado.",
      },
      500
    );
  }
});