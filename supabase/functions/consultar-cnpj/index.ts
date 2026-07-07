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

const LIMITE_DIARIO = 3;
const CNPJ_TESTE_LIBERADO = "123456";

const onlyNumbers = (value = "") => String(value).replace(/\D/g, "");

function normalizarBrasilApi(data: any) {
  return {
    razao_social: data.razao_social || "",
    nome_fantasia: data.nome_fantasia || "",
    situacao_receita: data.descricao_situacao_cadastral || "",
    natureza_juridica: data.natureza_juridica || "",
    porte: data.porte || "",
    cnae_principal: data.cnae_fiscal_descricao || "",
    cnae_secundarios: data.cnaes_secundarios || [],
    cep: onlyNumbers(data.cep || ""),
    logradouro: data.logradouro || "",
    numero: data.numero || "",
    complemento: data.complemento || "",
    bairro: data.bairro || "",
    cidade: data.municipio || "",
    estado: data.uf || "",
    telefone_receita: data.ddd_telefone_1 || "",
    email_receita: data.email || "",
    dados_receita: data,
  };
}

function resposta(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return resposta({ error: "Método não permitido." }, 405);
    }

    const body = await req.json();

    const cnpjLimpo = onlyNumbers(body?.cnpj);
    const condominioId = body?.condominio_id || null;

    if (!cnpjLimpo) {
      return resposta({ error: "Informe o CNPJ para continuar." }, 400);
    }

    const isTeste = cnpjLimpo === CNPJ_TESTE_LIBERADO;

    if (!isTeste && cnpjLimpo.length !== 14) {
      return resposta({ error: "CNPJ inválido." }, 400);
    }

    if (isTeste) {
      const data = {
        cnpj: CNPJ_TESTE_LIBERADO,
        razao_social: "Fornecedor de Teste Sistema Chegou!",
        nome_fantasia: "Fornecedor Teste",
        descricao_situacao_cadastral: "ATIVA",
        natureza_juridica: "Teste interno",
        porte: "TESTE",
        cnae_fiscal_descricao: "Teste de cadastro",
        cep: "01001000",
        logradouro: "Praça da Sé",
        numero: "100",
        complemento: "",
        bairro: "Sé",
        municipio: "São Paulo",
        uf: "SP",
        ddd_telefone_1: "",
        email: "",
      };

      return resposta({
        data,
        dados_normalizados: normalizarBrasilApi(data),
        origem: "TESTE",
        mensagem: "Dados de teste preenchidos automaticamente.",
        limite: {
          livre: true,
          usadas: 0,
          limite: "livre para teste",
        },
      });
    }

    if (condominioId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (supabaseUrl && serviceRoleKey) {
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const hoje = new Date().toISOString().slice(0, 10);

        const { count, error: countError } = await supabase
          .from("consultas_cnpj_externas")
          .select("id", { count: "exact", head: true })
          .eq("condominio_id", condominioId)
          .eq("data_consulta", hoje);

        if (countError) {
          console.error("Erro ao validar limite diário:", countError);
        }

        const usadas = count || 0;

        if (usadas >= LIMITE_DIARIO) {
          return resposta(
            {
              error:
                "O limite diário de consultas automáticas foi atingido. Preencha os dados manualmente para concluir o cadastro.",
              codigo: "LIMITE_DIARIO",
              limite: {
                usadas,
                limite: LIMITE_DIARIO,
              },
            },
            429
          );
        }
      }
    }

    const response = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "Chegou-SaaS/1.0",
        },
      }
    );

    if (!response.ok) {
      if (condominioId) {
        await registrarConsulta({
          req,
          condominioId,
          cnpj: cnpjLimpo,
          sucesso: false,
          detalhes: { status: response.status },
        });
      }

      return resposta(
        {
          error:
            "Não encontramos os dados automaticamente. Preencha manualmente para continuar.",
        },
        response.status
      );
    }

    const data = await response.json();
    const dadosNormalizados = normalizarBrasilApi(data);

    if (condominioId) {
      await registrarConsulta({
        req,
        condominioId,
        cnpj: cnpjLimpo,
        sucesso: true,
        detalhes: {
          razao_social: dadosNormalizados.razao_social,
          nome_fantasia: dadosNormalizados.nome_fantasia,
          situacao_receita: dadosNormalizados.situacao_receita,
        },
      });
    }

    return resposta({
      data,
      dados_normalizados: dadosNormalizados,
      origem: "BRASILAPI",
      mensagem: "Dados encontrados e preenchidos automaticamente.",
    });
  } catch (error) {
    return resposta(
      {
        error:
          error?.message ||
          "Não foi possível consultar automaticamente. Preencha manualmente para continuar.",
      },
      500
    );
  }
});

async function registrarConsulta({
  req,
  condominioId,
  cnpj,
  sucesso,
  detalhes,
}: {
  req: Request;
  condominioId: string;
  cnpj: string;
  sucesso: boolean;
  detalhes: Record<string, unknown>;
}) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) return;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    let usuarioId = null;

    if (token) {
      const {
        data: { user },
      } = await supabase.auth.getUser(token);

      usuarioId = user?.id || null;
    }

    await supabase.from("consultas_cnpj_externas").insert({
      condominio_id: condominioId,
      usuario_id: usuarioId,
      cnpj,
      origem: "BRASILAPI",
      sucesso,
      detalhes,
    });
  } catch (error) {
    console.error("Erro ao registrar consulta CNPJ:", error);
  }
}