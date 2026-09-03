-- ============================================================================
-- SISTEMA CHEGOU!
-- GATE E3.3-E.7E.2D.6C
--
-- CENTRAL DE NOTIFICAÇÕES
-- CONSUMIDOR AUTOMÁTICO DO OUTBOX — ENCOMENDA DISPONÍVEL PARA RETIRADA
--
-- OBJETIVOS
-- 1. endurecer o projetor ENCOMENDA_DISPONIVEL_RETIRADA;
-- 2. eliminar dependência do estado atual da Encomenda;
-- 3. eliminar resolução arbitrária de Auth por ORDER BY/LIMIT 1;
-- 4. remover rota frontend ainda não homologada;
-- 5. criar checkpoint técnico independente para o consumidor da Central;
-- 6. criar worker automático, idempotente e com retry/backoff;
-- 7. executar o worker automaticamente via pg_cron;
-- 8. não alterar status_processamento global do Outbox;
-- 9. produzir efetivamente somente IN_APP nesta fase;
-- 10. preparar contrato para WHATSAPP/API, PUSH e EMAIL.
--
-- IMPORTANTE
-- WhatsApp Web/Desktop/App Mobile permanecem sob governança da Central,
-- porém pertencem a fluxo acionado por outra experiência da aplicação.
-- Não são disparados automaticamente por este worker.
-- ============================================================================


-- ============================================================================
-- 1. ÍNDICE PARCIAL DO EVENTO CONSUMIDO PELA CENTRAL
-- ============================================================================

create index if not exists
  idx_encomendas_outbox_disponivel_central
on public.encomendas_eventos_outbox (
  criado_em,
  event_id
)
where
  event_type = 'ENCOMENDA_DISPONIVEL_RETIRADA'
  and event_version = 1
  and entrada_id is not null;


-- ============================================================================
-- 2. CHECKPOINT TÉCNICO DO CONSUMIDOR
--
-- NÃO É SEGUNDA FILA DE NEGÓCIO.
-- NÃO COPIA payload, destinatário, template ou canais.
--
-- A fonte autoritativa do fato continua sendo:
--   public.encomendas_eventos_outbox
-- ============================================================================

create table if not exists
  public.central_notificacoes_consumos_outbox
(
  id uuid
    primary key
    default gen_random_uuid(),

  event_id uuid
    not null,

  consumidor text
    not null,

  status text
    not null
    default 'PENDENTE',

  tentativas integer
    not null
    default 0,

  proxima_tentativa_em timestamptz null,

  ultimo_erro_codigo text null,

  ultimo_erro_sanitizado text null,

  primeira_tentativa_em timestamptz null,

  ultima_tentativa_em timestamptz null,

  processado_em timestamptz null,

  criado_em timestamptz
    not null
    default now(),

  atualizado_em timestamptz
    not null
    default now(),

  constraint
    central_notificacoes_consumos_outbox_event_fkey
    foreign key (event_id)
    references public.encomendas_eventos_outbox(event_id)
    on delete restrict,

  constraint
    central_notificacoes_consumos_outbox_status_check
    check (
      status in (
        'PENDENTE',
        'PROCESSANDO',
        'PROCESSADO',
        'ERRO_TEMPORARIO',
        'ERRO_FINAL'
      )
    ),

  constraint
    central_notificacoes_consumos_outbox_tentativas_check
    check (
      tentativas >= 0
    ),

  constraint
    uq_central_notificacoes_consumo_evento
    unique (
      event_id,
      consumidor
    )
);


create index if not exists
  idx_central_notificacoes_consumos_pendentes
on public.central_notificacoes_consumos_outbox (
  consumidor,
  status,
  proxima_tentativa_em,
  criado_em
);


-- ============================================================================
-- 3. UPDATED_AT
-- ============================================================================

drop trigger if exists
  trg_central_notificacoes_consumos_touch
on public.central_notificacoes_consumos_outbox;

create trigger
  trg_central_notificacoes_consumos_touch
before update
on public.central_notificacoes_consumos_outbox
for each row
execute function
  public.fn_central_notificacoes_touch_atualizado_em_v1();


-- ============================================================================
-- 4. SEGURANÇA DA TABELA DE CHECKPOINT
-- ============================================================================

alter table
  public.central_notificacoes_consumos_outbox
enable row level security;

alter table
  public.central_notificacoes_consumos_outbox
force row level security;


revoke all
on table public.central_notificacoes_consumos_outbox
from public;

revoke all
on table public.central_notificacoes_consumos_outbox
from anon;

revoke all
on table public.central_notificacoes_consumos_outbox
from authenticated;


grant
  select,
  insert,
  update,
  delete
on table public.central_notificacoes_consumos_outbox
to service_role;


-- ============================================================================
-- 5. PROJETOR HARDENED
-- ============================================================================

create or replace function
public.fn_central_notificacoes_projetar_encomenda_disponivel_v1(
  p_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$

declare

  v_evento
    public.encomendas_eventos_outbox%rowtype;

  v_encomenda
    public.encomendas%rowtype;

  v_entrada
    public.encomendas_entradas%rowtype;

  v_dependente
    public.dependentes_unidade%rowtype;

  v_responsavel
    public.morador_unidade_vinculos%rowtype;


  v_usuario_id uuid;
  v_pessoa_id uuid;
  v_morador_vinculo_id uuid;
  v_dependente_id uuid;
  v_responsavel_vinculo_id uuid;


  v_usuarios_ids uuid[];


  v_tipo_destinatario text;
  v_origem_resolucao text;


  v_notificacao_id uuid;
  v_item_id uuid;
  v_destinatario_id uuid;
  v_inbox_id uuid;
  v_entrega_id uuid;


  v_codigo text;
  v_chave_notificacao text;
  v_chave_entrega text;


  v_titulo text :=
    'Encomenda disponível para retirada';

  v_resumo text :=
    'Sua encomenda está disponível para retirada.';

  v_conteudo text :=
    'Sua encomenda está disponível para retirada. '
    || 'Acesse o Sistema Chegou! para consultar os detalhes '
    || 'e seguir o fluxo autorizado de retirada.';

begin

  -- ==========================================================================
  -- 5.1 EVENT_ID OBRIGATÓRIO
  -- ==========================================================================

  if p_event_id is null then
    raise exception
      'event_id é obrigatório.'
      using errcode = '22004';
  end if;


  -- ==========================================================================
  -- 5.2 FAST PATH DE IDEMPOTÊNCIA
  -- ==========================================================================

  select
    i.central_notificacao_id
  into
    v_notificacao_id
  from public.central_notificacoes_itens i
  where i.event_id = p_event_id;

  if found then
    return jsonb_build_object(
      'ok', true,
      'idempotente', true,
      'event_id', p_event_id,
      'central_notificacao_id',
        v_notificacao_id
    );
  end if;


  -- ==========================================================================
  -- 5.3 SERIALIZAÇÃO POR EVENT_ID
  --
  -- Evita que duas execuções do worker projetem simultaneamente
  -- o mesmo evento.
  -- ==========================================================================

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_event_id::text,
      0
    )
  );


  -- Revalidação depois do lock.

  select
    i.central_notificacao_id
  into
    v_notificacao_id
  from public.central_notificacoes_itens i
  where i.event_id = p_event_id;

  if found then
    return jsonb_build_object(
      'ok', true,
      'idempotente', true,
      'event_id', p_event_id,
      'central_notificacao_id',
        v_notificacao_id
    );
  end if;


  -- ==========================================================================
  -- 5.4 EVENTO AUTORITATIVO
  -- ==========================================================================

  select *
  into v_evento
  from public.encomendas_eventos_outbox e
  where e.event_id = p_event_id;

  if not found then
    raise exception
      'Evento de Encomendas não encontrado no Outbox.'
      using errcode = 'P0002';
  end if;


  -- ==========================================================================
  -- 5.5 CONTRATO ESTRITO V1 DO EVENTO
  -- ==========================================================================

  if v_evento.event_type
       is distinct from
       'ENCOMENDA_DISPONIVEL_RETIRADA'
  then
    raise exception
      'O evento informado não pertence ao contrato ENCOMENDA_DISPONIVEL_RETIRADA.'
      using errcode = '23514';
  end if;


  if v_evento.event_version
       is distinct from 1
  then
    raise exception
      'Versão do evento não suportada pelo projetor V1.'
      using errcode = '23514';
  end if;


  if v_evento.origem
       is distinct from 'MODULO_PORTARIA'
     or
     v_evento.modulo
       is distinct from 'CENTRAL_ENCOMENDAS'
  then
    raise exception
      'Origem ou módulo do evento não corresponde ao contrato autorizado.'
      using errcode = '23514';
  end if;


  if v_evento.encomenda_id is null
     or v_evento.entrada_id is null
     or v_evento.pre_recebimento_id is null
     or v_evento.business_id is null
     or v_evento.condominio_id is null
     or v_evento.unidade_id is null
  then
    raise exception
      'Evento incompleto para projeção na Central de Notificações.'
      using errcode = '23514';
  end if;


  if v_evento.payload is null
     or jsonb_typeof(v_evento.payload)
          is distinct from 'object'
  then
    raise exception
      'Payload do evento é inválido.'
      using errcode = '23514';
  end if;


  -- ==========================================================================
  -- 5.6 VALIDAR O FATO HISTÓRICO
  --
  -- NÃO exigir que a Encomenda ainda esteja no estado corrente
  -- DISPONIVEL_RETIRADA.
  --
  -- O fato histórico autoritativo é:
  -- ARMAZENADA -> DISPONIVEL_RETIRADA.
  -- ==========================================================================

  if v_evento.payload ->> 'status_anterior'
       is distinct from 'ARMAZENADA'
     or
     v_evento.payload ->> 'status_novo'
       is distinct from 'DISPONIVEL_RETIRADA'
  then
    raise exception
      'O payload não representa a transição oficial ARMAZENADA para DISPONIVEL_RETIRADA.'
      using errcode = '23514';
  end if;


  -- ==========================================================================
  -- 5.7 ENCOMENDA AUTORITATIVA
  -- ==========================================================================

  select *
  into v_encomenda
  from public.encomendas e
  where e.id = v_evento.encomenda_id;

  if not found then
    raise exception
      'Encomenda do evento não foi encontrada.'
      using errcode = 'P0002';
  end if;


  if v_encomenda.business_id
       is distinct from
       v_evento.business_id

     or v_encomenda.condominio_id
       is distinct from
       v_evento.condominio_id

     or v_encomenda.pre_recebimento_id
       is distinct from
       v_evento.pre_recebimento_id

     or v_encomenda.correlation_id
       is distinct from
       v_evento.correlation_id

     or v_encomenda.unidade_id
       is distinct from
       v_evento.unidade_id
  then
    raise exception
      'A Encomenda não corresponde ao contexto do evento.'
      using errcode = '23514';
  end if;


  if v_encomenda.disponibilizado_em is null then
    raise exception
      'A Encomenda não possui evidência oficial de disponibilização.'
      using errcode = '23514';
  end if;


  -- ==========================================================================
  -- 5.8 ENTRADA OFICIAL
  -- ==========================================================================

  select *
  into v_entrada
  from public.encomendas_entradas ee
  where ee.id = v_evento.entrada_id;

  if not found then
    raise exception
      'Entrada Oficial do evento não foi encontrada.'
      using errcode = 'P0002';
  end if;


  if v_entrada.encomenda_id
       is distinct from
       v_encomenda.id

     or v_entrada.business_id
       is distinct from
       v_evento.business_id

     or v_entrada.condominio_id
       is distinct from
       v_evento.condominio_id

     or v_entrada.pre_recebimento_id
       is distinct from
       v_evento.pre_recebimento_id

     or v_entrada.correlation_id
       is distinct from
       v_evento.correlation_id
  then
    raise exception
      'A Entrada Oficial não corresponde integralmente ao evento.'
      using errcode = '23514';
  end if;


  -- ==========================================================================
  -- 5.9 RESOLUÇÃO DO DESTINATÁRIO
  -- ==========================================================================

  if v_encomenda.destinatario_tipo = 'MORADOR' then

    -- ------------------------------------------------------------------------
    -- MORADOR DIRETO
    -- ------------------------------------------------------------------------

    if v_encomenda.destinatario_usuario_id is null
       or v_encomenda.destinatario_pessoa_id is null
       or v_encomenda.destinatario_morador_vinculo_id is null
    then
      raise exception
        'Encomenda MORADOR sem identidade nominal canônica completa.'
        using errcode = '23514';
    end if;


    if not exists (
      select 1
      from public.morador_unidade_vinculos muv
      where muv.id =
              v_encomenda.destinatario_morador_vinculo_id

        and muv.pessoa_id =
              v_encomenda.destinatario_pessoa_id

        and muv.condominio_id =
              v_encomenda.condominio_id

        and muv.unidade_id =
              v_encomenda.unidade_id

        and muv.ativo = true
    ) then

      raise exception
        'Vínculo do Morador destinatário não está ativo no contexto da Encomenda.'
        using errcode = '23514';

    end if;


    if not exists (
      select 1
      from public.usuario_condominio_vinculos ucv

      join public.usuarios u
        on u.id = ucv.usuario_id

      where ucv.usuario_id =
              v_encomenda.destinatario_usuario_id

        and ucv.pessoa_id =
              v_encomenda.destinatario_pessoa_id

        and ucv.condominio_id =
              v_encomenda.condominio_id

        and ucv.ativo = true
        and u.ativo = true
    ) then

      raise exception
        'Usuário do Morador destinatário não possui vínculo ativo no condomínio.'
        using errcode = '23514';

    end if;


    v_usuario_id :=
      v_encomenda.destinatario_usuario_id;

    v_pessoa_id :=
      v_encomenda.destinatario_pessoa_id;

    v_morador_vinculo_id :=
      v_encomenda.destinatario_morador_vinculo_id;

    v_dependente_id := null;
    v_responsavel_vinculo_id := null;

    v_tipo_destinatario :=
      'MORADOR';

    v_origem_resolucao :=
      'MORADOR_DIRETO';


  elsif v_encomenda.destinatario_tipo = 'DEPENDENTE' then

    -- ------------------------------------------------------------------------
    -- DEPENDENTE
    -- ------------------------------------------------------------------------

    if v_encomenda.destinatario_dependente_id is null
       or
       v_encomenda.destinatario_responsavel_vinculo_id is null
    then
      raise exception
        'Encomenda DEPENDENTE sem referências nominais obrigatórias.'
        using errcode = '23514';
    end if;


    select *
    into v_dependente
    from public.dependentes_unidade d
    where d.id =
      v_encomenda.destinatario_dependente_id;

    if not found then
      raise exception
        'Dependente nominal da Encomenda não foi encontrado.'
        using errcode = 'P0002';
    end if;


    if v_dependente.business_id
         is distinct from
         v_encomenda.business_id

       or v_dependente.condominio_id
         is distinct from
         v_encomenda.condominio_id

       or v_dependente.unidade_id
         is distinct from
         v_encomenda.unidade_id

       or v_dependente.morador_responsavel_id
         is distinct from
         v_encomenda.destinatario_responsavel_vinculo_id

       or v_dependente.status
         is distinct from 'ATIVO'
    then

      raise exception
        'Dependente nominal não corresponde ao contexto autorizado da Encomenda.'
        using errcode = '23514';

    end if;


    v_usuario_id := null;
    v_usuarios_ids := null;


    -- ------------------------------------------------------------------------
    -- TENTAR DEPENDENTE DIRETO
    -- ------------------------------------------------------------------------

    if coalesce(
         v_dependente.recebe_encomenda,
         false
       ) = true

       and coalesce(
         v_dependente.conta_autorizada,
         false
       ) = true

       and coalesce(
         v_dependente.possui_login,
         false
       ) = true

       and v_dependente.pessoa_id is not null
    then

      select
        array_agg(
          distinct ucv.usuario_id
          order by ucv.usuario_id
        )
      into
        v_usuarios_ids
      from public.usuario_condominio_vinculos ucv

      join public.usuarios u
        on u.id = ucv.usuario_id

      where ucv.pessoa_id =
              v_dependente.pessoa_id

        and ucv.condominio_id =
              v_dependente.condominio_id

        and ucv.ativo = true
        and u.ativo = true;


      if coalesce(
           cardinality(v_usuarios_ids),
           0
         ) > 1
      then

        raise exception
          'Dependente possui mais de um usuário ativo elegível no condomínio.'
          using errcode = '23514';

      end if;


      if coalesce(
           cardinality(v_usuarios_ids),
           0
         ) = 1
      then

        v_usuario_id :=
          v_usuarios_ids[1];

      end if;

    end if;


    if v_usuario_id is not null then

      -- ----------------------------------------------------------------------
      -- DEPENDENTE AUTORIZADO
      -- ----------------------------------------------------------------------

      v_pessoa_id :=
        v_dependente.pessoa_id;

      v_morador_vinculo_id :=
        null;

      v_dependente_id :=
        v_dependente.id;

      v_responsavel_vinculo_id :=
        v_dependente.morador_responsavel_id;

      v_tipo_destinatario :=
        'DEPENDENTE';

      v_origem_resolucao :=
        'DEPENDENTE_AUTORIZADO';


    else

      -- ----------------------------------------------------------------------
      -- FALLBACK PARA MORADOR RESPONSÁVEL
      -- ----------------------------------------------------------------------

      select *
      into v_responsavel
      from public.morador_unidade_vinculos muv
      where muv.id =
        v_dependente.morador_responsavel_id;

      if not found then
        raise exception
          'Morador Responsável do Dependente não foi encontrado.'
          using errcode = 'P0002';
      end if;


      if v_responsavel.condominio_id
           is distinct from
           v_encomenda.condominio_id

         or v_responsavel.unidade_id
           is distinct from
           v_encomenda.unidade_id

         or v_responsavel.ativo
           is distinct from true
      then

        raise exception
          'Morador Responsável não possui vínculo ativo no contexto da Encomenda.'
          using errcode = '23514';

      end if;


      v_usuarios_ids := null;


      select
        array_agg(
          distinct ucv.usuario_id
          order by ucv.usuario_id
        )
      into
        v_usuarios_ids
      from public.usuario_condominio_vinculos ucv

      join public.usuarios u
        on u.id = ucv.usuario_id

      where ucv.pessoa_id =
              v_responsavel.pessoa_id

        and ucv.condominio_id =
              v_responsavel.condominio_id

        and ucv.ativo = true
        and u.ativo = true;


      if coalesce(
           cardinality(v_usuarios_ids),
           0
         ) = 0
      then

        raise exception
          'Morador Responsável não possui usuário canônico ativo no condomínio.'
          using errcode = '23514';

      end if;


      if cardinality(v_usuarios_ids) > 1 then

        raise exception
          'Morador Responsável possui mais de um usuário ativo elegível no condomínio.'
          using errcode = '23514';

      end if;


      v_usuario_id :=
        v_usuarios_ids[1];

      v_pessoa_id :=
        v_responsavel.pessoa_id;

      v_morador_vinculo_id :=
        v_responsavel.id;

      v_dependente_id :=
        v_dependente.id;

      v_responsavel_vinculo_id :=
        v_responsavel.id;

      v_tipo_destinatario :=
        'MORADOR_RESPONSAVEL';

      v_origem_resolucao :=
        'DEPENDENTE_ROTEADO_RESPONSAVEL';

    end if;


  else

    raise exception
      'Tipo nominal de destinatário ainda não suportado pelo projetor V1: %',
      coalesce(
        v_encomenda.destinatario_tipo,
        'NULL'
      )
      using errcode = '23514';

  end if;


  -- ==========================================================================
  -- 5.10 CHAVES DETERMINÍSTICAS
  -- ==========================================================================

  v_codigo :=
    'NTF-ENCOM-DISP-'
    || replace(
      p_event_id::text,
      '-',
      ''
    );

  v_chave_notificacao :=
    'ENCOMENDA_DISPONIVEL_RETIRADA:'
    || p_event_id::text;

  v_chave_entrega :=
    v_chave_notificacao
    || ':'
    || v_usuario_id::text
    || ':IN_APP';


  -- ==========================================================================
  -- 5.11 NOTIFICAÇÃO LÓGICA
  --
  -- Nesta fase:
  -- - SEM rota frontend não homologada;
  -- - SEM Token;
  -- - SEM QR Code;
  -- - somente IN_APP é efetivamente produzido.
  -- ==========================================================================

  insert into public.central_notificacoes (
    codigo,
    chave_idempotencia,

    event_id,
    event_type,
    event_version,

    correlation_id,
    causation_id,

    business_id,
    condominio_id,

    natureza,
    categoria_codigo,
    prioridade,
    classificacao_atencao,

    titulo,
    resumo,
    conteudo,

    icone_codigo,

    origem,
    modulo,

    origem_tipo,
    origem_id,

    rota_destino,
    abrir_em,

    status,
    requer_acao,

    retencao_dias,

    criado_por_agente,

    metadata,
    schema_version
  )
  values (
    v_codigo,
    v_chave_notificacao,

    v_evento.event_id,
    v_evento.event_type,
    v_evento.event_version,

    v_evento.correlation_id,
    v_evento.causation_id,

    v_evento.business_id,
    v_evento.condominio_id,

    'OPERACIONAL',
    'ENCOMENDA_DISPONIVEL_RETIRADA',
    'ALTA',
    'IMPORTANTE',

    v_titulo,
    v_resumo,
    v_conteudo,

    null,

    'MODULO_PORTARIA',
    'CENTRAL_ENCOMENDAS',

    'ENCOMENDA',
    v_encomenda.id,

    null,
    'SEM_ACAO',

    'ATIVA',
    false,

    30,

    'CENTRAL_NOTIFICACOES_PROJECTOR_V1',

    jsonb_build_object(
      'contrato',
        'ENCOMENDA_DISPONIVEL_RETIRADA_V1',

      'pre_recebimento_id',
        v_evento.pre_recebimento_id,

      'entrada_id',
        v_evento.entrada_id,

      'encomenda_id',
        v_encomenda.id,

      'unidade_id',
        v_encomenda.unidade_id,

      'destinatario_tipo_nominal',
        v_encomenda.destinatario_tipo,

      'destinatario_tipo_efetivo',
        v_tipo_destinatario,

      'origem_resolucao',
        v_origem_resolucao,

      'token_incluido',
        false,

      'qr_code_incluido',
        false,

      'canais_automaticos_previstos',
        jsonb_build_array(
          'IN_APP',
          'WHATSAPP_API',
          'PUSH',
          'EMAIL'
        ),

      'canal_ativo_nesta_versao',
        'IN_APP',

      'whatsapp_automatico_subcanal',
        'API',

      'whatsapp_api_prioridade',
        jsonb_build_array(
          'CHEGOU_API',
          'CONDOMINIO_API'
        ),

      'whatsapp_assistido_aplicativo',
        false
    ),

    1
  )
  returning id
  into v_notificacao_id;


  -- ==========================================================================
  -- 5.12 ITEM
  -- ==========================================================================

  insert into public.central_notificacoes_itens (
    central_notificacao_id,

    business_id,
    condominio_id,

    event_id,
    event_type,
    event_version,
    correlation_id,
    causation_id,

    pre_recebimento_id,
    encomenda_id,
    entrada_id,
    unidade_id,

    destinatario_tipo_nominal,
    destinatario_usuario_id_nominal,
    destinatario_pessoa_id_nominal,
    destinatario_morador_vinculo_id_nominal,
    destinatario_dependente_id_nominal,
    destinatario_responsavel_vinculo_id_nominal,

    metadata
  )
  values (
    v_notificacao_id,

    v_evento.business_id,
    v_evento.condominio_id,

    v_evento.event_id,
    v_evento.event_type,
    v_evento.event_version,
    v_evento.correlation_id,
    v_evento.causation_id,

    v_evento.pre_recebimento_id,
    v_encomenda.id,
    v_evento.entrada_id,
    v_encomenda.unidade_id,

    v_encomenda.destinatario_tipo,
    v_encomenda.destinatario_usuario_id,
    v_encomenda.destinatario_pessoa_id,
    v_encomenda.destinatario_morador_vinculo_id,
    v_encomenda.destinatario_dependente_id,
    v_encomenda.destinatario_responsavel_vinculo_id,

    jsonb_build_object(
      'numero_encomenda',
        v_encomenda.numero_encomenda
    )
  )
  returning id
  into v_item_id;


  -- ==========================================================================
  -- 5.13 DESTINATÁRIO EFETIVO
  -- ==========================================================================

  insert into public.central_notificacoes_destinatarios (
    central_notificacao_id,

    business_id,
    condominio_id,
    unidade_id,

    tipo_destinatario,

    usuario_id,
    pessoa_id,
    morador_vinculo_id,
    dependente_id,
    responsavel_vinculo_id,

    origem_resolucao,

    status,

    metadata
  )
  values (
    v_notificacao_id,

    v_evento.business_id,
    v_evento.condominio_id,
    v_encomenda.unidade_id,

    v_tipo_destinatario,

    v_usuario_id,
    v_pessoa_id,
    v_morador_vinculo_id,
    v_dependente_id,
    v_responsavel_vinculo_id,

    v_origem_resolucao,

    'ATIVO',

    jsonb_build_object(
      'event_id',
        v_evento.event_id,

      'encomenda_id',
        v_encomenda.id
    )
  )
  returning id
  into v_destinatario_id;


  -- ==========================================================================
  -- 5.14 INBOX IN_APP
  -- ==========================================================================

  insert into public.central_notificacoes_inbox (
    central_notificacao_id,
    central_destinatario_id,

    business_id,
    condominio_id,

    usuario_id,

    status
  )
  values (
    v_notificacao_id,
    v_destinatario_id,

    v_evento.business_id,
    v_evento.condominio_id,

    v_usuario_id,

    'ATIVA'
  )
  returning id
  into v_inbox_id;


  -- ==========================================================================
  -- 5.15 DELIVERY IN_APP
  --
  -- Encomendas / IN_APP:
  -- - obrigatório;
  -- - não consulta preferência;
  -- - persistência da Inbox é entrega técnica interna.
  -- ==========================================================================

  insert into public.central_notificacoes_entregas (
    central_notificacao_id,
    central_destinatario_id,

    business_id,
    condominio_id,

    canal,
    subcanal,

    status,

    regra_preferencia,
    preferencia_resultado,

    template_codigo,
    template_versao,

    chave_idempotencia,

    enfileirada_em,
    processando_em,
    enviada_em,
    entregue_em,

    metadata
  )
  values (
    v_notificacao_id,
    v_destinatario_id,

    v_evento.business_id,
    v_evento.condominio_id,

    'IN_APP',
    null,

    'ENTREGUE',

    'NAO_APLICAVEL',
    'NAO_APLICAVEL',

    'ENCOMENDA_DISPONIVEL_RETIRADA_IN_APP',
    1,

    v_chave_entrega,

    now(),
    now(),
    now(),
    now(),

    jsonb_build_object(
      'inbox_id',
        v_inbox_id,

      'persistencia_interna',
        true,

      'provider_externo',
        false
    )
  )
  returning id
  into v_entrega_id;


  -- ==========================================================================
  -- 5.16 RESPOSTA
  -- ==========================================================================

  return jsonb_build_object(
    'ok', true,
    'idempotente', false,

    'event_id',
      v_evento.event_id,

    'central_notificacao_id',
      v_notificacao_id,

    'central_item_id',
      v_item_id,

    'central_destinatario_id',
      v_destinatario_id,

    'central_inbox_id',
      v_inbox_id,

    'central_entrega_id',
      v_entrega_id,

    'canal',
      'IN_APP',

    'destinatario_usuario_id',
      v_usuario_id,

    'destinatario_tipo',
      v_tipo_destinatario,

    'origem_resolucao',
      v_origem_resolucao
  );

end;
$function$;


-- ============================================================================
-- 6. GRANTS DO PROJETOR
-- ============================================================================

revoke all
on function
  public.fn_central_notificacoes_projetar_encomenda_disponivel_v1(uuid)
from public;

revoke all
on function
  public.fn_central_notificacoes_projetar_encomenda_disponivel_v1(uuid)
from anon;

revoke all
on function
  public.fn_central_notificacoes_projetar_encomenda_disponivel_v1(uuid)
from authenticated;


grant execute
on function
  public.fn_central_notificacoes_projetar_encomenda_disponivel_v1(uuid)
to service_role;


-- ============================================================================
-- 7. WORKER AUTOMÁTICO DA CENTRAL
-- ============================================================================

create or replace function
public.fn_central_notificacoes_processar_outbox_v1(
  p_limite integer default 25
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$

declare

  c_consumidor constant text :=
    'CENTRAL_NOTIFICACOES_ENCOMENDAS_V1';

  c_max_tentativas constant integer :=
    5;


  v_limite integer;

  v_reg record;

  v_tentativa integer;

  v_processados integer :=
    0;

  v_erros_temporarios integer :=
    0;

  v_erros_finais integer :=
    0;

  v_idempotentes integer :=
    0;


  v_resultado jsonb;

  v_erro_codigo text;
  v_erro_mensagem text;

  v_proxima_tentativa timestamptz;

begin

  -- ==========================================================================
  -- 7.1 LIMITE SEGURO
  -- ==========================================================================

  v_limite :=
    greatest(
      1,
      least(
        coalesce(
          p_limite,
          25
        ),
        100
      )
    );


  -- ==========================================================================
  -- 7.2 REGISTRAR NO CHECKPOINT EVENTOS V2 ELEGÍVEIS
  --
  -- Não altera status_processamento do Outbox.
  -- Não captura eventos históricos V1 sem entrada_id.
  -- ==========================================================================

  insert into
    public.central_notificacoes_consumos_outbox (
      event_id,
      consumidor,
      status
    )
  select
    o.event_id,
    c_consumidor,
    'PENDENTE'
  from public.encomendas_eventos_outbox o

  where o.event_type =
          'ENCOMENDA_DISPONIVEL_RETIRADA'

    and o.event_version = 1

    and o.entrada_id is not null

    and o.encomenda_id is not null

    and o.pre_recebimento_id is not null

    and o.business_id is not null

    and o.condominio_id is not null

    and not exists (
      select 1
      from public.central_notificacoes_itens i
      where i.event_id = o.event_id
    )

  on conflict (
    event_id,
    consumidor
  )
  do nothing;


  -- ==========================================================================
  -- 7.3 PROCESSAMENTO
  --
  -- FOR UPDATE SKIP LOCKED:
  -- múltiplas execuções do worker não processam simultaneamente
  -- o mesmo checkpoint.
  -- ==========================================================================

  for v_reg in

    select
      c.id as consumo_id,
      c.event_id,
      o.criado_em as evento_criado_em

    from
      public.central_notificacoes_consumos_outbox c

    join
      public.encomendas_eventos_outbox o
        on o.event_id = c.event_id

    where
      c.consumidor = c_consumidor

      and c.status in (
        'PENDENTE',
        'ERRO_TEMPORARIO'
      )

      and (
        c.proxima_tentativa_em is null
        or c.proxima_tentativa_em <= now()
      )

    order by
      o.criado_em,
      o.event_id

    limit v_limite

    for update of c
    skip locked

  loop

    -- ------------------------------------------------------------------------
    -- Se já existe projeção, apenas convergir checkpoint.
    -- ------------------------------------------------------------------------

    if exists (
      select 1
      from public.central_notificacoes_itens i
      where i.event_id = v_reg.event_id
    ) then

      update
        public.central_notificacoes_consumos_outbox

      set
        status =
          'PROCESSADO',

        processado_em =
          coalesce(
            processado_em,
            now()
          ),

        proxima_tentativa_em =
          null,

        ultimo_erro_codigo =
          null,

        ultimo_erro_sanitizado =
          null

      where id =
        v_reg.consumo_id;


      v_idempotentes :=
        v_idempotentes + 1;

      continue;

    end if;


    -- ------------------------------------------------------------------------
    -- Registrar tentativa FORA do bloco EXCEPTION.
    --
    -- Assim a tentativa não é revertida quando o projetor falha.
    -- ------------------------------------------------------------------------

    update
      public.central_notificacoes_consumos_outbox

    set
      status =
        'PROCESSANDO',

      tentativas =
        tentativas + 1,

      primeira_tentativa_em =
        coalesce(
          primeira_tentativa_em,
          now()
        ),

      ultima_tentativa_em =
        now(),

      proxima_tentativa_em =
        null

    where id =
      v_reg.consumo_id

    returning tentativas
    into v_tentativa;


    -- ------------------------------------------------------------------------
    -- Subtransação do projetor.
    -- ------------------------------------------------------------------------

    begin

      v_resultado :=
        public.fn_central_notificacoes_projetar_encomenda_disponivel_v1(
          v_reg.event_id
        );


      update
        public.central_notificacoes_consumos_outbox

      set
        status =
          'PROCESSADO',

        processado_em =
          now(),

        proxima_tentativa_em =
          null,

        ultimo_erro_codigo =
          null,

        ultimo_erro_sanitizado =
          null

      where id =
        v_reg.consumo_id;


      v_processados :=
        v_processados + 1;


    exception
      when others then

        get stacked diagnostics
          v_erro_codigo =
            returned_sqlstate,

          v_erro_mensagem =
            message_text;


        -- --------------------------------------------------------------------
        -- Erros de contrato/autorização/ausência estrutural são permanentes.
        -- --------------------------------------------------------------------

        if v_erro_codigo in (
          '22004',
          '23514',
          'P0002'
        ) then

          update
            public.central_notificacoes_consumos_outbox

          set
            status =
              'ERRO_FINAL',

            proxima_tentativa_em =
              null,

            ultimo_erro_codigo =
              v_erro_codigo,

            ultimo_erro_sanitizado =
              left(
                coalesce(
                  v_erro_mensagem,
                  'Erro estrutural não identificado.'
                ),
                1000
              )

          where id =
            v_reg.consumo_id;


          v_erros_finais :=
            v_erros_finais + 1;


        elsif v_tentativa >=
              c_max_tentativas
        then

          update
            public.central_notificacoes_consumos_outbox

          set
            status =
              'ERRO_FINAL',

            proxima_tentativa_em =
              null,

            ultimo_erro_codigo =
              v_erro_codigo,

            ultimo_erro_sanitizado =
              left(
                coalesce(
                  v_erro_mensagem,
                  'Limite de tentativas atingido.'
                ),
                1000
              )

          where id =
            v_reg.consumo_id;


          v_erros_finais :=
            v_erros_finais + 1;


        else

          -- ------------------------------------------------------------------
          -- BACKOFF CONTROLADO
          --
          -- tentativa 1 -> +1 minuto
          -- tentativa 2 -> +5 minutos
          -- tentativa 3 -> +15 minutos
          -- tentativa 4 -> +1 hora
          -- ------------------------------------------------------------------

          v_proxima_tentativa :=
            now()
            +
            case v_tentativa

              when 1 then
                interval '1 minute'

              when 2 then
                interval '5 minutes'

              when 3 then
                interval '15 minutes'

              else
                interval '1 hour'

            end;


          update
            public.central_notificacoes_consumos_outbox

          set
            status =
              'ERRO_TEMPORARIO',

            proxima_tentativa_em =
              v_proxima_tentativa,

            ultimo_erro_codigo =
              v_erro_codigo,

            ultimo_erro_sanitizado =
              left(
                coalesce(
                  v_erro_mensagem,
                  'Erro temporário não identificado.'
                ),
                1000
              )

          where id =
            v_reg.consumo_id;


          v_erros_temporarios :=
            v_erros_temporarios + 1;

        end if;

    end;

  end loop;


  -- ==========================================================================
  -- 7.4 RESPOSTA DO WORKER
  -- ==========================================================================

  return jsonb_build_object(
    'ok',
      true,

    'consumidor',
      c_consumidor,

    'limite',
      v_limite,

    'processados',
      v_processados,

    'idempotentes_convergidos',
      v_idempotentes,

    'erros_temporarios',
      v_erros_temporarios,

    'erros_finais',
      v_erros_finais,

    'executado_em',
      now()
  );

end;
$function$;


-- ============================================================================
-- 8. GRANTS DO WORKER
-- ============================================================================

revoke all
on function
  public.fn_central_notificacoes_processar_outbox_v1(integer)
from public;

revoke all
on function
  public.fn_central_notificacoes_processar_outbox_v1(integer)
from anon;

revoke all
on function
  public.fn_central_notificacoes_processar_outbox_v1(integer)
from authenticated;


grant execute
on function
  public.fn_central_notificacoes_processar_outbox_v1(integer)
to service_role;


-- ============================================================================
-- 9. HARDENING DO PG_CRON
--
-- Usuários da aplicação não administram jobs.
-- O scheduler existente continua funcionando.
-- ============================================================================

revoke execute
on function cron.schedule(text, text)
from public;

revoke execute
on function cron.schedule(text, text, text)
from public;

revoke execute
on function cron.unschedule(bigint)
from public;

revoke execute
on function cron.unschedule(text)
from public;


revoke execute
on function cron.schedule(text, text)
from anon, authenticated, service_role;

revoke execute
on function cron.schedule(text, text, text)
from anon, authenticated, service_role;

revoke execute
on function cron.unschedule(bigint)
from anon, authenticated, service_role;

revoke execute
on function cron.unschedule(text)
from anon, authenticated, service_role;


-- ============================================================================
-- 10. JOB AUTOMÁTICO
--
-- Não utilizar HTTP/Edge Function nesta fase.
--
-- O processamento acontece diretamente no Postgres:
--   pg_cron -> worker -> projetor.
-- ============================================================================

do $$
begin

  if exists (
    select 1
    from cron.job
    where jobname =
      'central-notificacoes-encomendas-a-cada-minuto'
  ) then

    perform cron.unschedule(
      'central-notificacoes-encomendas-a-cada-minuto'
    );

  end if;


  perform cron.schedule(
    'central-notificacoes-encomendas-a-cada-minuto',
    '* * * * *',
    'select public.fn_central_notificacoes_processar_outbox_v1(25);'
  );

end;
$$;


-- ============================================================================
-- 11. OBSERVAÇÕES DE CONTRATO
--
-- CANAIS AUTOMÁTICOS DE ENCOMENDAS
--
-- IN_APP
--   - ativo nesta versão;
--   - obrigatório;
--   - sem preferência.
--
-- WHATSAPP
--   - somente API no fluxo automático;
--   - obrigatório quando integração estiver operacional/homologada;
--   - sem preferência;
--   - prioridade de integração:
--       1. API Sistema Chegou!
--       2. API do Condomínio
--
-- PUSH
--   - preparado;
--   - não produzido nesta versão;
--   - quando ativado: respeita preferência + subscription técnica válida.
--
-- EMAIL
--   - preparado;
--   - não produzido nesta versão;
--   - quando ativado: respeita preferência + política comercial vigente.
--
-- WHATSAPP WEB / DESKTOP / APP MOBILE
--   - continuam pertencendo à Central de Notificações;
--   - serão solicitados por outra experiência da aplicação;
--   - NÃO são disparados automaticamente por este worker.
-- ============================================================================
