import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );
}

function agoraBrasilia() {
  const partes = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "America/Sao_Paulo",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    },
  ).formatToParts(new Date());

  const mapa = Object.fromEntries(
    partes.map((parte) => [
      parte.type,
      parte.value,
    ]),
  );

  return {
    hora: Number(mapa.hour),
    minuto: Number(mapa.minute),

    dataHoraTexto:
      `${mapa.year}-${mapa.month}-${mapa.day} ` +
      `${mapa.hour}:${mapa.minute}:${mapa.second}`,
  };
}

function dentroJanelaEnvio() {
  const brasilia = agoraBrasilia();

  return (
    brasilia.hora >= 8 &&
    brasilia.hora < 20
  );
}

function normalizarTipoEmail(
  tipoEmail: unknown,
) {
  return String(
    tipoEmail || "",
  )
    .trim()
    .toLowerCase();
}

function normalizarCategoriaEmail(
  categoriaEmail: unknown,
) {
  return String(
    categoriaEmail || "",
  )
    .trim()
    .toLowerCase();
}

function ehEmailAprovacaoMorador(
  item: Record<string, any>,
) {
  return (
    normalizarTipoEmail(
      item.tipo_email,
    ) === "aprovacao_morador"
  );
}

function ehEmailConviteMorador(
  item: Record<string, any>,
) {
  const tipo =
    normalizarTipoEmail(
      item.tipo_email,
    );

  const categoria =
    normalizarCategoriaEmail(
      item.categoria_email,
    );

  return (
    categoria === "convite" ||
    tipo === "convite_morador" ||
    tipo ===
      "reenvio_convite_morador"
  );
}

function ehConviteAcessoFuncionario(
  item: Record<string, any>,
) {
  return (
    String(
      item.tipo_email || "",
    )
      .trim()
      .toUpperCase() ===
    "CONVITE_ACESSO_FUNCIONARIO"
  );
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
  supabaseAdmin: ReturnType<
    typeof createClient
  >;
  acao: string;
  condominio_id?: string | null;
  usuario_id?: string | null;
  email?: string | null;
  origem?: string | null;
  detalhes?: Record<
    string,
    unknown
  >;
}) {
  try {
    await supabaseAdmin
      .from("logs_sistema")
      .insert({
        acao,
        condominio_id:
          condominio_id || null,

        usuario_id:
          usuario_id || null,

        email:
          email || null,

        origem:
          origem ||
          "processar_fila_emails",

        detalhes:
          detalhes || {},
      });
  } catch (error) {
    console.error(
      `Erro ao registrar log ${acao}:`,
      error,
    );
  }
}

async function buscarPreCadastro({
  supabaseAdmin,
  preCadastroId,
}: {
  supabaseAdmin: ReturnType<
    typeof createClient
  >;
  preCadastroId:
    | string
    | null
    | undefined;
}) {
  if (!preCadastroId) {
    return null;
  }

  try {
    const {
      data,
      error,
    } = await supabaseAdmin
      .from(
        "pre_cadastro_moradores",
      )
      .select(
        `
          id,
          nome,
          email,
          torre,
          unidade,
          business_id,
          condominio_id
        `,
      )
      .eq(
        "id",
        preCadastroId,
      )
      .maybeSingle();

    if (error) {
      console.error(
        "Erro ao buscar pré-cadastro para notificação:",
        error,
      );

      return null;
    }

    return data || null;
  } catch (error) {
    console.error(
      "Erro inesperado ao buscar pré-cadastro:",
      error,
    );

    return null;
  }
}

async function criarNotificacaoErroEnvio({
  supabaseAdmin,
  item,
  erro,
}: {
  supabaseAdmin: ReturnType<
    typeof createClient
  >;
  item: Record<string, any>;
  erro: string;
}) {
  const preCadastro =
    await buscarPreCadastro({
      supabaseAdmin,

      preCadastroId:
        item.pre_cadastro_id,
    });

  /*
   * ======================================================
   * APROVAÇÃO DE MORADOR
   *
   * A aprovação do cadastro já ocorreu.
   * Uma falha de comunicação NÃO significa que o
   * administrativo deve aprovar o Morador novamente.
   * ======================================================
   */
  if (
    ehEmailAprovacaoMorador(item)
  ) {
    await supabaseAdmin
      .from("notificacoes")
      .insert({
        usuario_id: null,

        titulo:
          "Falha no e-mail de aprovação do morador",

        mensagem:
          `O cadastro de ${
            preCadastro?.nome ||
            item.nome_destino ||
            "um morador"
          } já foi aprovado, mas não foi possível entregar o e-mail de confirmação. ` +
          "Não refaça a aprovação. Revise apenas os dados de contato e a comunicação pendente.",

        tipo:
          "erro_envio_aprovacao_morador",

        lida: false,

        origem:
          "processar_fila_emails",

        business_id:
          preCadastro?.business_id ||
          item.business_id ||
          null,

        condominio_id:
          preCadastro?.condominio_id ||
          item.condominio_id ||
          null,

        prioridade: "alta",

        icone:
          "mail-warning",

        modulo:
          "moradores",

        destino_tipo:
          "administrativo",

        enviada_in_app: true,
        enviada_email: false,

        metadata: {
          pre_cadastro_id:
            item.pre_cadastro_id ||
            null,

          auditoria_id:
            item.auditoria_id ||
            null,

          usuario_id:
            item.usuario_id ||
            null,

          fila_email_id:
            item.id,

          tipo_email:
            item.tipo_email,

          template_email:
            item.template_email ||
            null,

          nome:
            preCadastro?.nome ||
            item.nome_destino ||
            null,

          email:
            preCadastro?.email ||
            item.email_destino ||
            null,

          torre:
            preCadastro?.torre ||
            null,

          unidade:
            preCadastro?.unidade ||
            null,

          motivo_tecnico:
            erro,

          orientacao:
            "O cadastro já está aprovado. Não execute uma nova aprovação. Trate somente a comunicação pendente ou o dado de contato.",
        },
      });

    return;
  }

  /*
   * ======================================================
   * CONVITE DE MORADOR
   * Mantém o comportamento já existente.
   * ======================================================
   */
  if (
    ehEmailConviteMorador(item)
  ) {
    await supabaseAdmin
      .from("notificacoes")
      .insert({
        usuario_id: null,

        titulo:
          "Falha no envio do convite",

        mensagem:
          `Não foi possível entregar o convite para ${
            preCadastro?.nome ||
            item.nome_destino ||
            "morador"
          }. Revise o e-mail e entre em contato com o morador para ajuste.`,

        tipo:
          "erro_envio_convite",

        lida: false,

        origem:
          "processar_fila_emails",

        business_id:
          preCadastro?.business_id ||
          item.business_id ||
          null,

        condominio_id:
          preCadastro?.condominio_id ||
          item.condominio_id ||
          null,

        prioridade:
          "alta",

        icone:
          "mail-warning",

        modulo:
          "moradores",

        destino_tipo:
          "administrativo",

        enviada_in_app:
          true,

        enviada_email:
          false,

        metadata: {
          pre_cadastro_id:
            item.pre_cadastro_id,

          convite_id:
            item.convite_id,

          fila_email_id:
            item.id,

          nome:
            preCadastro?.nome ||
            item.nome_destino ||
            null,

          email:
            preCadastro?.email ||
            item.email_destino ||
            null,

          torre:
            preCadastro?.torre ||
            null,

          unidade:
            preCadastro?.unidade ||
            null,

          motivo_tecnico:
            erro,

          orientacao:
            "Após o limite de tentativas, o envio automático foi interrompido. O administrativo deve revisar o e-mail do morador.",
        },
      });

    return;
  }

  /*
   * ======================================================
   * OUTROS TIPOS
   *
   * Não classificar automaticamente como convite.
   * Registra log para rastreabilidade.
   *
   * A governança específica de notificações para outros
   * tipos continua pertencendo ao domínio correspondente.
   * ======================================================
   */
  await registrarLog({
    supabaseAdmin,

    acao:
      "EMAIL_ERRO_FINAL_NOTIFICACAO_ESPECIFICA_NAO_CONFIGURADA",

    condominio_id:
      item.condominio_id ||
      null,

    usuario_id:
      item.usuario_id ||
      null,

    email:
      item.email_destino ||
      null,

    origem:
      "processar_fila_emails",

    detalhes: {
      fila_email_id:
        item.id,

      tipo_email:
        item.tipo_email ||
        null,

      categoria_email:
        item.categoria_email ||
        null,

      template_email:
        item.template_email ||
        null,

      erro,
    },
  });
}

function gerarHtmlConviteAcessoFuncionario({
  item,
  payload,
}: {
  item: Record<string, any>;
  payload: Record<string, any>;
}) {
  const appUrl =
    Deno.env.get("APP_URL") ||
    Deno.env.get("VITE_APP_URL") ||
    "http://localhost:5173";

  const token =
    payload.token;

  const username =
    payload.username || "";

  const nomeFuncionario =
    payload.nome_funcionario ||
    item.nome_destino ||
    "Funcionário";

  const nomeCondominio =
    payload.nome_condominio ||
    "seu condomínio";

  const cargoFuncao =
    payload.cargo_funcao ||
    "Funcionário";

  const link =
    `${appUrl}/criar-senha-responsavel?tipo=funcionario&token=${token}`;

  return `
  <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">

      <div style="background:#ffedd5;padding:34px 28px;text-align:center;color:#0f172a;">
        <div style="font-size:34px;font-weight:800;letter-spacing:-1px;">
          Chegou<span style="color:#f97316;">!</span>
        </div>

        <div style="margin-top:8px;font-size:16px;color:#7c2d12;">
          Gestão Inteligente de Encomendas
        </div>
      </div>

      <div style="padding:34px 34px 28px;">
        <h1 style="margin:0 0 20px;font-size:25px;line-height:1.25;color:#0f172a;">
          Olá ${nomeFuncionario},
        </h1>

        <p style="font-size:16px;line-height:1.65;color:#334155;margin:0 0 18px;">
          Você recebeu um convite para acessar o
          <strong>Sistema Chegou!</strong>
          como <strong>${cargoFuncao}</strong> do condomínio
          <strong>${nomeCondominio}</strong>.
        </p>

        <p style="font-size:16px;line-height:1.65;color:#334155;margin:0 0 24px;">
          Para concluir seu primeiro acesso, crie uma senha segura usando o botão abaixo.
        </p>

        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:18px;margin:24px 0;">
          <p style="margin:0;color:#7c2d12;font-size:15px;line-height:1.6;">
            <strong>Login:</strong> ${username}<br/>
            <strong>Validade:</strong> 5 dias<br/>
            <strong>Uso:</strong> link único e pessoal
          </p>
        </div>

        <div style="text-align:center;margin:32px 0;">
          <a
            href="${link}"
            style="
              display:inline-block;
              background:#f97316;
              color:#ffffff;
              text-decoration:none;
              padding:15px 30px;
              border-radius:12px;
              font-weight:800;
              font-size:16px;
            "
          >
            Criar minha senha
          </a>
        </div>

        <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-top:24px;">
          <p style="margin:0;color:#64748b;font-size:14px;line-height:1.6;">
            Este link é pessoal, seguro e de uso único. Não compartilhe com terceiros.
          </p>
        </div>

        <p style="color:#64748b;font-size:14px;line-height:1.6;margin:24px 0 8px;">
          Caso o botão acima não funcione, copie e cole o link abaixo no navegador:
        </p>

        <p style="color:#2563eb;font-size:13px;word-break:break-all;margin:0 0 28px;">
          ${link}
        </p>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;" />

        <p style="font-size:15px;color:#334155;line-height:1.6;margin:0;">
          Seja bem-vindo ao Sistema Chegou!
        </p>

        <p style="font-size:16px;color:#0f172a;font-weight:800;margin:18px 0 0;">
          Equipe Chegou<span style="color:#f97316;">!</span>
        </p>
      </div>

      <div style="background:#f8fafc;text-align:center;padding:24px 28px;color:#64748b;font-size:13px;line-height:1.7;">
        <p style="margin:0 0 8px;">
          Este é um e-mail automático. Não responda esta mensagem.
        </p>

        <p style="margin:0 0 8px;">
          [Endereço físico da empresa — definir no módulo institucional]
        </p>

        <p style="margin:0;">
          © 2026 Chegou<span style="color:#f97316;">!</span>
          Todos os direitos reservados.
        </p>
      </div>
    </div>
  </div>
  `;
}

async function atualizarStatusRelacionado({
  supabaseAdmin,
  item,
  status,
  enviadoEm = null,
  brevoResult = null,
  brevoMessageId = null,
  mensagemErro = null,
}: {
  supabaseAdmin: ReturnType<
    typeof createClient
  >;

  item: Record<string, any>;

  status:
    | "processando"
    | "aguardando_envio"
    | "enviado"
    | "erro_envio";

  enviadoEm?: string | null;

  brevoResult?:
    | Record<string, unknown>
    | null;

  brevoMessageId?:
    | string
    | null;

  mensagemErro?:
    | string
    | null;
}) {
  /*
   * ======================================================
   * CONVITE DE MORADOR
   * ======================================================
   */
  if (item.convite_id) {
    const payloadConvite:
      Record<string, unknown> = {
        status_envio:
          status,

        updated_at:
          new Date()
            .toISOString(),
      };

    if (enviadoEm) {
      payloadConvite.enviado_em =
        enviadoEm;
    }

    if (brevoResult) {
      payloadConvite.resposta_brevo =
        brevoResult;
    }

    if (brevoMessageId) {
      payloadConvite.brevo_message_id =
        brevoMessageId;
    }

    if (mensagemErro) {
      payloadConvite.mensagem_erro =
        mensagemErro;
    }

    await supabaseAdmin
      .from("convites_morador")
      .update(payloadConvite)
      .eq(
        "id",
        item.convite_id,
      );
  }

  /*
   * ======================================================
   * CONVITE DE FUNCIONÁRIO
   * ======================================================
   */
  const conviteFuncionarioId =
    item.payload
      ?.convite_acesso_funcionario_id ||
    null;

  if (conviteFuncionarioId) {
    const statusFuncionario =
      status === "enviado"
        ? "ENVIADO"
        : status === "erro_envio"
          ? "ERRO_ENVIO"
          : status === "processando"
            ? "PROCESSANDO"
            : "AGUARDANDO_ENVIO";

    const payloadFuncionario:
      Record<string, unknown> = {
        status:
          statusFuncionario,

        atualizado_em:
          new Date()
            .toISOString(),
      };

    if (enviadoEm) {
      payloadFuncionario.enviado_em =
        enviadoEm;
    }

    if (brevoResult) {
      payloadFuncionario.resposta_brevo =
        brevoResult;
    }

    if (brevoMessageId) {
      payloadFuncionario.brevo_message_id =
        brevoMessageId;
    }

    if (mensagemErro) {
      payloadFuncionario.ultimo_erro =
        mensagemErro;
    }

    await supabaseAdmin
      .from(
        "convites_acesso_funcionarios",
      )
      .update(
        payloadFuncionario,
      )
      .eq(
        "id",
        conviteFuncionarioId,
      );
  }

  /*
   * ======================================================
   * PRÉ-CADASTRO
   *
   * CRÍTICO:
   *
   * pre_cadastro_id também pode existir em comunicações
   * posteriores à aprovação.
   *
   * Portanto, somente e-mails pertencentes ao domínio
   * CONVITE podem alterar:
   *
   *   status_convite
   *   convite_enviado_em
   *
   * aprovacao_morador NÃO altera esses campos.
   * ======================================================
   */
  if (
    item.pre_cadastro_id &&
    ehEmailConviteMorador(item)
  ) {
    const payloadPre:
      Record<string, unknown> = {
        status_convite:
          status,

        atualizado_em:
          new Date()
            .toISOString(),
      };

    if (enviadoEm) {
      payloadPre.convite_enviado_em =
        enviadoEm;
    }

    await supabaseAdmin
      .from(
        "pre_cadastro_moradores",
      )
      .update(payloadPre)
      .eq(
        "id",
        item.pre_cadastro_id,
      );
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(
      "ok",
      {
        headers:
          corsHeaders,
      },
    );
  }

  try {
    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL",
      );

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    const brevoApiKey =
      Deno.env.get(
        "BREVO_API_KEY",
      );

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      return jsonResponse(
        {
          success:
            false,

          error:
            "SUPABASE_URL ou SERVICE_ROLE ausente.",
        },
        500,
      );
    }

    if (!brevoApiKey) {
      return jsonResponse(
        {
          success:
            false,

          error:
            "BREVO_API_KEY não configurada.",
        },
        500,
      );
    }

    /*
     * ======================================================
     * JANELA NORMAL DE COMUNICAÇÃO
     *
     * Aprovação de Morador não possui bypass.
     * Recuperação de senha possui fluxo próprio de
     * prioridade/segurança e não deve ser redefinida aqui.
     * ======================================================
     */
    if (!dentroJanelaEnvio()) {
      return jsonResponse({
        success:
          true,

        enviado:
          false,

        motivo:
          "Fora da janela de envio 08h às 20h Brasília.",

        horario_brasilia:
          agoraBrasilia()
            .dataHoraTexto,
      });
    }

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRoleKey,
      );

    const remetenteEmail =
      Deno.env.get(
        "BREVO_SENDER_EMAIL",
      ) ||
      "noreply@sistemachegou.com.br";

    const remetenteNome =
      Deno.env.get(
        "BREVO_SENDER_NAME",
      ) ||
      "Sistema Chegou!";

    /*
     * ======================================================
     * CONFIGURAÇÃO GLOBAL
     * ======================================================
     */
    const {
      data: configuracao,
    } = await supabaseAdmin
      .from(
        "configuracoes_envio_email",
      )
      .select("*")
      .eq(
        "ativo",
        true,
      )
      .limit(1)
      .maybeSingle();

    if (
      configuracao?.pausar_envios
    ) {
      return jsonResponse({
        success:
          true,

        enviado:
          false,

        motivo:
          "Envios pausados nas configurações.",
      });
    }

    const maxTentativas =
      Number(
        configuracao
          ?.max_tentativas ||
          3,
      );

    const limiteDiarioConvites =
      Number(
        configuracao
          ?.limite_diario_convites ||
          40,
      );

    /*
     * ======================================================
     * ANTI-SPAM GLOBAL
     * máximo 1 envio/minuto
     * ======================================================
     */
    const umMinutoAtras =
      new Date(
        Date.now() -
          60 * 1000,
      ).toISOString();

    const {
      count:
        enviadosUltimoMinuto,
    } = await supabaseAdmin
      .from("fila_emails")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        },
      )
      .eq(
        "status_envio",
        "enviado",
      )
      .gte(
        "enviado_em",
        umMinutoAtras,
      );

    if (
      Number(
        enviadosUltimoMinuto ||
        0,
      ) > 0
    ) {
      return jsonResponse({
        success:
          true,

        enviado:
          false,

        motivo:
          "Anti-spam ativo: já houve envio no último minuto.",
      });
    }

    /*
     * ======================================================
     * LIMITE DIÁRIO DE CONVITES
     *
     * IMPORTANTE:
     *
     * O limite pertence à categoria CONVITE.
     * Não pode interromper:
     *
     *   aprovacao_morador
     *   cadastro
     *   segurança
     *   demais categorias
     *
     * Se o limite for atingido, apenas itens da categoria
     * convite deixam de ser elegíveis nesta execução.
     * ======================================================
     */
    const inicioDia =
      new Date();

    inicioDia.setHours(
      0,
      0,
      0,
      0,
    );

    const fimDia =
      new Date();

    fimDia.setHours(
      23,
      59,
      59,
      999,
    );

    const {
      count:
        convitesHoje,
    } = await supabaseAdmin
      .from("fila_emails")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        },
      )
      .eq(
        "categoria_email",
        "convite",
      )
      .eq(
        "status_envio",
        "enviado",
      )
      .gte(
        "enviado_em",
        inicioDia
          .toISOString(),
      )
      .lte(
        "enviado_em",
        fimDia
          .toISOString(),
      );

    const limiteConvitesAtingido =
      Number(
        convitesHoje || 0,
      ) >=
      limiteDiarioConvites;

    if (
      limiteConvitesAtingido
    ) {
      await registrarLog({
        supabaseAdmin,

        acao:
          "LIMITE_DIARIO_CONVITES_ATINGIDO",

        origem:
          "processar_fila_emails",

        detalhes: {
          limite_diario_convites:
            limiteDiarioConvites,

          convites_enviados_hoje:
            Number(
              convitesHoje ||
              0,
            ),

          comportamento:
            "CONVITES_EXCLUIDOS_DA_SELECAO_DESTA_EXECUCAO",

          demais_categorias_continuam:
            true,
        },
      });
    }

    /*
     * ======================================================
     * SELEÇÃO DO PRÓXIMO ITEM
     * ======================================================
     */
    const agora =
      new Date()
        .toISOString();

    let filaQuery =
      supabaseAdmin
        .from("fila_emails")
        .select("*")
        .in(
          "status_envio",
          [
            "aguardando_envio",
            "erro_envio",
          ],
        )
        .eq(
          "pausado",
          false,
        )
        .eq(
          "cancelado",
          false,
        )
        .eq(
          "processado",
          false,
        )
        .lte(
          "quantidade_tentativas",
          maxTentativas - 1,
        )
        .or(
          `proxima_tentativa_em.is.null,proxima_tentativa_em.lte.${agora}`,
        );

    /*
     * Se a franquia de convites acabou,
     * exclui SOMENTE categoria convite.
     *
     * Mantemos também registros antigos cuja categoria
     * eventualmente seja NULL.
     */
    if (
      limiteConvitesAtingido
    ) {
      filaQuery =
        filaQuery.or(
          "categoria_email.is.null,categoria_email.neq.convite",
        );
    }

    const {
      data: fila,
      error: filaError,
    } = await filaQuery
      .order(
        "prioridade",
        {
          ascending: false,
        },
      )
      .order(
        "peso_envio",
        {
          ascending: false,
        },
      )
      .order(
        "criado_em",
        {
          ascending: true,
        },
      )
      .limit(1);

    if (filaError) {
      throw filaError;
    }

    const item =
      fila?.[0];

    if (!item) {
      return jsonResponse({
        success:
          true,

        enviado:
          false,

        motivo:
          limiteConvitesAtingido
            ? "Nenhum e-mail não pertencente à categoria convite está pendente e elegível."
            : "Nenhum e-mail pendente elegível na fila.",

        limite_convites_atingido:
          limiteConvitesAtingido,
      });
    }

    /*
     * ======================================================
     * LOCK OTIMISTA
     * ======================================================
     */
    const {
      data:
        itemBloqueado,
      error:
        lockError,
    } = await supabaseAdmin
      .from("fila_emails")
      .update({
        status_envio:
          "processando",

        atualizado_em:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        item.id,
      )
      .in(
        "status_envio",
        [
          "aguardando_envio",
          "erro_envio",
        ],
      )
      .select("*")
      .maybeSingle();

    if (lockError) {
      throw lockError;
    }

    if (!itemBloqueado) {
      return jsonResponse({
        success:
          true,

        enviado:
          false,

        motivo:
          "Item já foi capturado por outro processamento.",
      });
    }

    /*
     * ======================================================
     * PROPAGAÇÃO DE ESTADO
     *
     * atualizarStatusRelacionado() agora é consciente
     * do tipo de comunicação.
     * ======================================================
     */
    await atualizarStatusRelacionado({
      supabaseAdmin,
      item:
        itemBloqueado,
      status:
        "processando",
    });

    await registrarLog({
      supabaseAdmin,

      acao:
        "EMAIL_PROCESSANDO",

      condominio_id:
        itemBloqueado
          .condominio_id,

      usuario_id:
        itemBloqueado
          .usuario_id,

      email:
        itemBloqueado
          .email_destino,

      origem:
        "processar_fila_emails",

      detalhes: {
        fila_email_id:
          itemBloqueado.id,

        convite_id:
          itemBloqueado
            .convite_id ||
          null,

        pre_cadastro_id:
          itemBloqueado
            .pre_cadastro_id ||
          null,

        auditoria_id:
          itemBloqueado
            .auditoria_id ||
          null,

        tipo_email:
          itemBloqueado
            .tipo_email ||
          null,

        categoria_email:
          itemBloqueado
            .categoria_email ||
          null,

        template_email:
          itemBloqueado
            .template_email ||
          null,

        tentativa:
          Number(
            itemBloqueado
              .quantidade_tentativas ||
            0,
          ) + 1,
      },
    });

    /*
     * ======================================================
     * CONTEÚDO
     * ======================================================
     */
    const payload =
      itemBloqueado
        .payload ||
      {};

    let htmlContent =
      payload
        .html_content ||
      "";

    const textContent =
      payload
        .text_content ||
      "";

    /*
     * Legado temporário:
     * convite de funcionário ainda possui fallback próprio.
     */
    if (
      !htmlContent &&
      ehConviteAcessoFuncionario(
        itemBloqueado,
      )
    ) {
      htmlContent =
        gerarHtmlConviteAcessoFuncionario({
          item:
            itemBloqueado,
          payload,
        });
    }

    if (!htmlContent) {
      throw new Error(
        "htmlContent is missing",
      );
    }

    /*
     * ======================================================
     * BREVO
     * ======================================================
     */
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
            JSON.stringify({
              sender: {
                name:
                  remetenteNome,

                email:
                  remetenteEmail,
              },

              to: [
                {
                  email:
                    itemBloqueado
                      .email_destino,

                  name:
                    ehConviteAcessoFuncionario(
                      itemBloqueado,
                    )
                      ? itemBloqueado
                          .nome_destino ||
                        "Funcionário"
                      : itemBloqueado
                          .nome_destino ||
                        "Morador",
                },
              ],

              subject:
                itemBloqueado
                  .assunto ||
                "Mensagem do Sistema Chegou!",

              htmlContent,

              ...(textContent
                ? {
                    textContent,
                  }
                : {}),
            }),
        },
      );

    const brevoResult =
      await brevoResponse
        .json()
        .catch(
          () => ({}),
        );

    /*
     * ======================================================
     * FALHA
     * ======================================================
     */
    if (
      !brevoResponse.ok
    ) {
      const tentativaAtual =
        Number(
          itemBloqueado
            .quantidade_tentativas ||
          0,
        ) + 1;

      const erro =
        brevoResult
          ?.message ||
        brevoResult
          ?.error ||
        "Erro desconhecido no envio de e-mail.";

      const maxTentativasItem =
        Number(
          itemBloqueado
            .max_tentativas ||
          maxTentativas,
        );

      const atingiuLimite =
        tentativaAtual >=
        maxTentativasItem;

      await supabaseAdmin
        .from("fila_emails")
        .update({
          status_envio:
            atingiuLimite
              ? "erro_envio"
              : "aguardando_envio",

          quantidade_tentativas:
            tentativaAtual,

          erro_em:
            new Date()
              .toISOString(),

          mensagem_erro:
            erro,

          resposta_brevo:
            brevoResult,

          processado:
            false,

          pausado:
            atingiuLimite,

          proxima_tentativa_em:
            atingiuLimite
              ? null
              : new Date(
                  Date.now() +
                    tentativaAtual *
                      10 *
                      60 *
                      1000,
                ).toISOString(),

          atualizado_em:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          itemBloqueado.id,
        );

      await atualizarStatusRelacionado({
        supabaseAdmin,

        item:
          itemBloqueado,

        status:
          atingiuLimite
            ? "erro_envio"
            : "aguardando_envio",

        brevoResult,

        mensagemErro:
          erro,
      });

      if (
        atingiuLimite
      ) {
        await criarNotificacaoErroEnvio({
          supabaseAdmin,

          item:
            itemBloqueado,

          erro,
        });
      }

      await registrarLog({
        supabaseAdmin,

        acao:
          atingiuLimite
            ? "EMAIL_ERRO_FINAL"
            : "EMAIL_ERRO_REPROCESSAR",

        condominio_id:
          itemBloqueado
            .condominio_id,

        usuario_id:
          itemBloqueado
            .usuario_id,

        email:
          itemBloqueado
            .email_destino,

        origem:
          "processar_fila_emails",

        detalhes: {
          fila_email_id:
            itemBloqueado.id,

          convite_id:
            itemBloqueado
              .convite_id ||
            null,

          pre_cadastro_id:
            itemBloqueado
              .pre_cadastro_id ||
            null,

          auditoria_id:
            itemBloqueado
              .auditoria_id ||
            null,

          tipo_email:
            itemBloqueado
              .tipo_email ||
            null,

          categoria_email:
            itemBloqueado
              .categoria_email ||
            null,

          template_email:
            itemBloqueado
              .template_email ||
            null,

          tentativa:
            tentativaAtual,

          max_tentativas:
            maxTentativasItem,

          erro,

          resposta_brevo:
            brevoResult,
        },
      });

      return jsonResponse({
        success:
          true,

        enviado:
          false,

        status:
          atingiuLimite
            ? "erro_envio"
            : "aguardando_envio",

        tentativa:
          tentativaAtual,

        max_tentativas:
          maxTentativasItem,

        tipo_email:
          itemBloqueado
            .tipo_email ||
          null,

        fila_email_id:
          itemBloqueado.id,

        erro,
      });
    }

    /*
     * ======================================================
     * SUCESSO
     * ======================================================
     */
    const enviadoEm =
      new Date()
        .toISOString();

    const brevoMessageId =
      brevoResult
        ?.messageId ||
      null;

    await supabaseAdmin
      .from("fila_emails")
      .update({
        status_envio:
          "enviado",

        enviado_em:
          enviadoEm,

        brevo_message_id:
          brevoMessageId,

        resposta_brevo:
          brevoResult,

        processado:
          true,

        erro_em:
          null,

        codigo_erro:
          null,

        mensagem_erro:
          null,

        proxima_tentativa_em:
          null,

        atualizado_em:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        itemBloqueado.id,
      );

    await atualizarStatusRelacionado({
      supabaseAdmin,

      item:
        itemBloqueado,

      status:
        "enviado",

      enviadoEm,

      brevoResult,

      brevoMessageId,
    });

    await registrarLog({
      supabaseAdmin,

      acao:
        "EMAIL_ENVIADO",

      condominio_id:
        itemBloqueado
          .condominio_id,

      usuario_id:
        itemBloqueado
          .usuario_id,

      email:
        itemBloqueado
          .email_destino,

      origem:
        "processar_fila_emails",

      detalhes: {
        fila_email_id:
          itemBloqueado.id,

        convite_id:
          itemBloqueado
            .convite_id ||
          null,

        pre_cadastro_id:
          itemBloqueado
            .pre_cadastro_id ||
          null,

        auditoria_id:
          itemBloqueado
            .auditoria_id ||
          null,

        tipo_email:
          itemBloqueado
            .tipo_email ||
          null,

        categoria_email:
          itemBloqueado
            .categoria_email ||
          null,

        template_email:
          itemBloqueado
            .template_email ||
          null,

        brevo_message_id:
          brevoMessageId,
      },
    });

    return jsonResponse({
      success:
        true,

      enviado:
        true,

      fila_email_id:
        itemBloqueado.id,

      tipo_email:
        itemBloqueado
          .tipo_email ||
        null,

      categoria_email:
        itemBloqueado
          .categoria_email ||
        null,

      email:
        itemBloqueado
          .email_destino,

      brevo_message_id:
        brevoMessageId,

      enviado_em:
        enviadoEm,
    });
  } catch (error) {
    console.error(
      "Erro processar-fila-emails:",
      error,
    );

    return jsonResponse(
      {
        success:
          false,

        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao processar fila de e-mails.",
      },
      500,
    );
  }
});