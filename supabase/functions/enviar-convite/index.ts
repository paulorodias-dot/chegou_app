import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Método não permitido." }),
        { status: 405, headers: jsonHeaders }
      );
    }

    const body = await req.json();

    const {
      condominio_id,
      responsavel_id,
      email,
      nome_responsavel,
      nome_condominio,
    } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "E-mail é obrigatório." }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // 🔐 cria client admin
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 🔑 gera token único
    const token = crypto.randomUUID();

    // ⏳ expiração (24h)
    const expira_em = new Date();
    expira_em.setHours(expira_em.getHours() + 24);

    // 💾 salva convite
    const { error: conviteError } = await supabase
      .from("convites_condominio")
      .insert({
        condominio_id,
        responsavel_id,
        email_destino: email,
        nome_responsavel,
        nome_condominio,
        token,
        tipo_convite: "administrativo",
        expira_em,
        status: "pendente",
    });

    if (conviteError) throw conviteError;

    // 🔗 link dinâmico conforme origem da chamada
    const origin = req.headers.get("origin");

    const allowedOrigins = [
      "http://localhost:5173",
      "https://chegou-app.vercel.app",
    ];

    const appUrl = allowedOrigins.includes(origin || "")
      ? origin
      : Deno.env.get("APP_URL") || "http://localhost:5173";

    const link = `${appUrl}/primeiro-acesso?token=${token}`;

    // 📧 envio de e-mail (template Chegou!)

    const assunto = `Convite para cadastro do condomínio no Chegou!`;

    const enderecoEmpresa = Deno.env.get("EMPRESA_ENDERECO") || "";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background:#f5f7fb; padding:20px;">
        <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:10px; overflow:hidden;">

        <!-- HEADER -->
        <div style="background:#0f2f6b; color:#ffffff; padding:20px;">
          <h2 style="margin:0;">
            Chegou<span style="color:#f97316;">!</span>
          </h2>
          <p style="margin:5px 0 0; font-size:14px;">
            Gestão Inteligente de Encomendas
          </p>
        </div>

        <!-- BODY -->
          <div style="padding:24px; color:#1f2937; line-height:1.6;">

            <p>Olá <strong>${nome_responsavel || ""}</strong>,</p>

            <p>
              Que alegria receber o <strong>${nome_condominio}</strong> no
              Chegou<span style="color:#f97316;">!</span>
            </p>

            <p>
              Você foi convidado para iniciar o cadastro do condomínio em nossa plataforma de gestão inteligente de encomendas.
            </p>

            <p>
              Durante o cadastro, você poderá revisar os dados do condomínio, complementar as informações necessárias e preparar o ambiente para validação da Equipe Chegou<span style="color:#f97316;">!</span>.
            </p>

            <p>
              Por segurança, este link de convite possui validade de <strong>48 horas</strong>, conforme Políticas Internas de Convites do Chegou<span style="color:#f97316;">!</span>.
            </p>

            <p>
              Caso expire, será necessário solicitar o reenvio do convite.<br/>
              Após a confirmação e validação do cadastro, este convite será automaticamente desativado.
            </p>

            <p><strong>Equipe Chegou<span style="color:#f97316;">!</span></strong></p>

            <!-- BOTÃO -->
            <div style="text-align:center; margin:30px 0;">
              <a href="${link}"
                style="background:#0f2f6b; color:#ffffff; padding:14px 18px; text-decoration:none; border-radius:8px; font-weight:bold; display:block; max-width:320px; width:100%; box-sizing:border-box; margin:0 auto; text-align:center; line-height:1.4;">
                Acessar cadastro do condomínio
              </a>
            </div>

            <p style="font-size:13px; color:#6b7280;">
              Se o botão não funcionar, copie e cole este link no navegador:<br/>
              ${link}
            </p>

      </div>

      <!-- FOOTER -->
      <div style="border-top:3px solid #f97316; padding:20px; font-size:13px; color:#6b7280;">
        <p style="margin:0;">
          Atenciosamente,<br/>
          <strong>Equipe Chegou<span style="color:#f97316;">!</span></strong>
        </p>

        <p style="margin:10px 0 0;">
          📌 Este é um e-mail automático. Não é necessário responder.
        </p>

        <p style="margin:10px 0 0;">
          ${enderecoEmpresa ? `📍 ${enderecoEmpresa}<br/>` : ""}
          ✉️ sistemachegou@gmail.com
        </p>
      </div>

    </div>
  </div>
`;

// 📧 envio real pelo Brevo
const brevoApiKey = Deno.env.get("BREVO_API_KEY");
const emailFrom = Deno.env.get("EMAIL_FROM") || "paulorodias@gmail.com";

if (!brevoApiKey) {
  throw new Error("BREVO_API_KEY não configurada.");
}

const response = await fetch("https://api.brevo.com/v3/smtp/email", {
  method: "POST",
  headers: {
    "accept": "application/json",
    "api-key": brevoApiKey,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    sender: {
      name: "Chegou! Sistema",
      email: emailFrom,
    },
    to: [
      {
        email: email,
        name: nome_responsavel || "",
      },
    ],
    subject: assunto,
    htmlContent,
  }),
});

const result = await response.json();

if (!response.ok) {
  console.error("Erro Brevo:", result);
  throw new Error(result?.message || "Erro ao enviar e-mail.");
}

console.log("E-mail enviado via Brevo:", result);

    return new Response(
      JSON.stringify({
        success: true,
        token,
        link,
      }),
      { status: 200, headers: jsonHeaders }
    );

      } catch (error) {
    const err = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    console.error("ERRO FUNCTION ENVIAR-CONVITE:", err);

    return new Response(
      JSON.stringify({
        error: err.message || "Erro ao gerar convite.",
        details: err.details || null,
        hint: err.hint || null,
        code: err.code || null,
      }),
      { status: 500, headers: jsonHeaders }
    );
  }
});