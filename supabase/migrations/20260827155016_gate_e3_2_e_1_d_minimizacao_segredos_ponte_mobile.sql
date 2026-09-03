-- =====================================================================
-- SISTEMA CHEGOU!
-- CENTRAL DE ENCOMENDAS — ENTRADA OFICIAL
--
-- GATE E3.2-E.1-D
-- MINIMIZAÇÃO DOS SEGREDOS DA PONTE MOBILE
--
-- OBJETIVO
-- ---------------------------------------------------------------------
-- - token puro nunca é persistido;
-- - hash do QR existe somente enquanto o pareamento estiver disponível;
-- - hash da sessão existe somente enquanto a sessão Mobile estiver ativa;
-- - expiração/revogação/encerramento elimina material de autenticação;
-- - preservar somente auditoria operacional mínima.
-- =====================================================================


-- =====================================================================
-- 1. HASH DO QR PASSA A PODER SER DESCARTADO
-- =====================================================================

alter table
  public.encomendas_entrada_pontes_mobile

alter column
  token_pareamento_hash
drop not null;


-- =====================================================================
-- 2. CONECTAR
--
-- Consome definitivamente o segredo do QR.
-- =====================================================================

create or replace function
  public.rpc_encomenda_entrada_ponte_mobile_conectar_v1(
    p_token text,
    p_ip text default null,
    p_user_agent text default null,
    p_tipo_dispositivo text default null,
    p_identificador_dispositivo text default null
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$

declare

  v_token text;

  v_token_hash text;

  v_ponte
    public.encomendas_entrada_pontes_mobile%rowtype;

  v_sessao_token text;

  v_sessao_hash text;

  v_agora timestamptz :=
    now();

begin

  v_token :=
    nullif(
      btrim(
        coalesce(
          p_token,
          ''
        )
      ),
      ''
    );


  if v_token is null then

    raise exception
      'Token inválido.'
      using errcode = '22023';

  end if;


  v_token_hash :=
    public.fn_encomendas_hash_token_v1(
      v_token
    );


  select *

  into v_ponte

  from public.encomendas_entrada_pontes_mobile

  where token_pareamento_hash =
        v_token_hash

  for update;


  if not found then

    raise exception
      'Ponte inválida ou expirada.'
      using errcode = '42501';

  end if;


  if v_ponte.status <>
     'AGUARDANDO_CONEXAO'
  then

    raise exception
      'Este QR Code não está mais disponível.'
      using errcode = '42501';

  end if;


  -- ===================================================================
  -- PAREAMENTO EXPIRADO
  --
  -- O hash perde sua finalidade e é eliminado.
  -- ===================================================================

  if v_agora >
     v_ponte.pareamento_expira_em
  then

    update
      public.encomendas_entrada_pontes_mobile

    set
      status =
        'EXPIRADA_PAREAMENTO',

      token_pareamento_hash =
        null,

      encerrado_em =
        v_agora,

      motivo_encerramento =
        'TEMPO_PAREAMENTO_EXCEDIDO',

      atualizado_em =
        v_agora

    where id =
          v_ponte.id;


    raise exception
      'O QR Code expirou. Gere uma nova conexão.'
      using errcode = '42501';

  end if;


  -- ===================================================================
  -- NOVO SEGREDO EXCLUSIVO DA SESSÃO MOBILE
  -- ===================================================================

  v_sessao_token :=
      replace(
        gen_random_uuid()::text,
        '-',
        ''
      )
    ||
      replace(
        gen_random_uuid()::text,
        '-',
        ''
      );


  v_sessao_hash :=
    public.fn_encomendas_hash_token_v1(
      v_sessao_token
    );


  -- ===================================================================
  -- CONECTAR + DESTRUIR HASH DO QR
  -- ===================================================================

  update
    public.encomendas_entrada_pontes_mobile

  set
    status =
      'CONECTADA',

    /*
     * O QR já cumpriu sua finalidade.
     * Não preservamos nem o hash.
     */
    token_pareamento_hash =
      null,

    token_pareamento_usado_em =
      v_agora,


    sessao_mobile_hash =
      v_sessao_hash,

    conectado_em =
      v_agora,

    ultima_atividade_em =
      v_agora,

    ultimo_heartbeat_em =
      v_agora,

    expira_em =
      v_agora +
      interval '10 minutes',


    mobile_ip =
      nullif(
        btrim(
          coalesce(
            p_ip,
            ''
          )
        ),
        ''
      ),

    mobile_user_agent =
      nullif(
        btrim(
          coalesce(
            p_user_agent,
            ''
          )
        ),
        ''
      ),

    mobile_tipo_dispositivo =
      nullif(
        btrim(
          coalesce(
            p_tipo_dispositivo,
            ''
          )
        ),
        ''
      ),

    mobile_identificador_dispositivo =
      nullif(
        btrim(
          coalesce(
            p_identificador_dispositivo,
            ''
          )
        ),
        ''
      ),


    /*
     * Rede é apenas telemetria.
     * Não é autoridade de acesso.
     */
    rede_coincidente =
      case

        when desktop_ip is null
          or nullif(
               btrim(
                 coalesce(
                   p_ip,
                   ''
                 )
               ),
               ''
             ) is null
          then null

        else
          desktop_ip =
          nullif(
            btrim(
              p_ip
            ),
            ''
          )

      end,

    atualizado_em =
      v_agora

  where id =
        v_ponte.id;


  insert into
    public.encomendas_entrada_ponte_mobile_eventos
  (
    ponte_id,
    origem,
    tipo
  )
  values
  (
    v_ponte.id,
    'MOBILE',
    'MOBILE_CONECTADO'
  );


  return jsonb_build_object(

    'ok',
      true,

    'ponte_id',
      v_ponte.id,

    /*
     * ÚNICO retorno do segredo Mobile puro.
     */
    'sessao_token',
      v_sessao_token,

    'status',
      'CONECTADA',

    'condominio_id',
      v_ponte.condominio_id,

    'pre_recebimento_id',
      v_ponte.pre_recebimento_id,

    'conectado_em',
      v_agora,

    'ultima_atividade_em',
      v_agora,

    'expira_em',
      v_agora +
      interval '10 minutes',

    'inatividade_segundos',
      60
  );

end;
$function$;


-- =====================================================================
-- 3. HEARTBEAT
--
-- Ao detectar expiração, elimina hash da sessão.
-- Heartbeat continua NÃO renovando atividade operacional.
-- =====================================================================

create or replace function
  public.rpc_encomenda_entrada_ponte_mobile_heartbeat_v1(
    p_ponte_id uuid,
    p_sessao_token text
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$

declare

  v_hash text;

  v_ponte
    public.encomendas_entrada_pontes_mobile%rowtype;

  v_agora timestamptz :=
    now();

begin

  v_hash :=
    public.fn_encomendas_hash_token_v1(
      coalesce(
        p_sessao_token,
        ''
      )
    );


  select *

  into v_ponte

  from public.encomendas_entrada_pontes_mobile

  where id =
        p_ponte_id

  for update;


  if not found
     or v_ponte.sessao_mobile_hash
        is null
     or v_ponte.sessao_mobile_hash
        is distinct from
        v_hash
  then

    raise exception
      'Sessão Mobile inválida.'
      using errcode = '42501';

  end if;


  if v_ponte.status <>
     'CONECTADA'
  then

    return jsonb_build_object(

      'ok',
        false,

      'status',
        v_ponte.status
    );

  end if;


  -- ===================================================================
  -- TTL ABSOLUTO
  -- ===================================================================

  if v_ponte.expira_em is null
     or v_agora >
        v_ponte.expira_em
  then

    update
      public.encomendas_entrada_pontes_mobile

    set
      status =
        'EXPIRADA_TTL',

      sessao_mobile_hash =
        null,

      encerrado_em =
        v_agora,

      motivo_encerramento =
        'TTL_EXCEDIDO',

      atualizado_em =
        v_agora

    where id =
          v_ponte.id;


    return jsonb_build_object(

      'ok',
        false,

      'status',
        'EXPIRADA_TTL'
    );

  end if;


  -- ===================================================================
  -- INATIVIDADE OPERACIONAL
  -- ===================================================================

  if v_ponte.ultima_atividade_em is null
     or v_agora >
        v_ponte.ultima_atividade_em +
        interval '60 seconds'
  then

    update
      public.encomendas_entrada_pontes_mobile

    set
      status =
        'EXPIRADA_INATIVIDADE',

      sessao_mobile_hash =
        null,

      encerrado_em =
        v_agora,

      motivo_encerramento =
        'INATIVIDADE_60_SEGUNDOS',

      atualizado_em =
        v_agora

    where id =
          v_ponte.id;


    return jsonb_build_object(

      'ok',
        false,

      'status',
        'EXPIRADA_INATIVIDADE'
    );

  end if;


  /*
   * IMPORTANTE:
   *
   * heartbeat NÃO altera ultima_atividade_em.
   */

  update
    public.encomendas_entrada_pontes_mobile

  set
    ultimo_heartbeat_em =
      v_agora,

    atualizado_em =
      v_agora

  where id =
        v_ponte.id;


  return jsonb_build_object(

    'ok',
      true,

    'status',
      'CONECTADA',

    'server_now',
      v_agora,

    'ultima_atividade_em',
      v_ponte.ultima_atividade_em,

    'expira_inatividade_em',
      v_ponte.ultima_atividade_em +
      interval '60 seconds',

    'expira_em',
      v_ponte.expira_em
  );

end;
$function$;


-- =====================================================================
-- 4. ATIVIDADE MOBILE
--
-- Expiração também elimina o segredo da sessão.
-- =====================================================================

create or replace function
  public.rpc_encomenda_entrada_ponte_mobile_atividade_v1(
    p_ponte_id uuid,
    p_sessao_token text,
    p_tipo text,
    p_volume_id uuid default null,
    p_client_event_id uuid default null,
    p_payload jsonb default '{}'::jsonb
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$

declare

  v_hash text;

  v_ponte
    public.encomendas_entrada_pontes_mobile%rowtype;

  v_agora timestamptz :=
    now();

begin

  v_hash :=
    public.fn_encomendas_hash_token_v1(
      coalesce(
        p_sessao_token,
        ''
      )
    );


  select *

  into v_ponte

  from public.encomendas_entrada_pontes_mobile

  where id =
        p_ponte_id

  for update;


  if not found
     or v_ponte.sessao_mobile_hash
        is null
     or v_ponte.sessao_mobile_hash
        is distinct from
        v_hash
  then

    raise exception
      'Sessão Mobile inválida.'
      using errcode = '42501';

  end if;


  if v_ponte.status <>
     'CONECTADA'
  then

    raise exception
      'A Ponte não está conectada.'
      using errcode = '42501';

  end if;


  -- ===================================================================
  -- TTL
  -- ===================================================================

  if v_agora >
     v_ponte.expira_em
  then

    update
      public.encomendas_entrada_pontes_mobile

    set
      status =
        'EXPIRADA_TTL',

      sessao_mobile_hash =
        null,

      encerrado_em =
        v_agora,

      motivo_encerramento =
        'TTL_EXCEDIDO',

      atualizado_em =
        v_agora

    where id =
          v_ponte.id;


    raise exception
      'A Ponte expirou.'
      using errcode = '42501';

  end if;


  -- ===================================================================
  -- INATIVIDADE
  -- ===================================================================

  if v_agora >
     v_ponte.ultima_atividade_em +
     interval '60 seconds'
  then

    update
      public.encomendas_entrada_pontes_mobile

    set
      status =
        'EXPIRADA_INATIVIDADE',

      sessao_mobile_hash =
        null,

      encerrado_em =
        v_agora,

      motivo_encerramento =
        'INATIVIDADE_60_SEGUNDOS',

      atualizado_em =
        v_agora

    where id =
          v_ponte.id;


    raise exception
      'A Ponte expirou por inatividade.'
      using errcode = '42501';

  end if;


  -- ===================================================================
  -- VOLUME DO MESMO LOTE
  -- ===================================================================

  if p_volume_id is not null
     and not exists (

       select 1

       from public.encomendas_volumes v

       where v.id =
             p_volume_id

         and v.pre_recebimento_id =
             v_ponte.pre_recebimento_id

         and v.removido_em
             is null

     )
  then

    raise exception
      'O Volume não pertence a esta Ponte.'
      using errcode = '42501';

  end if;


  -- ===================================================================
  -- IDEMPOTÊNCIA
  -- ===================================================================

  if p_client_event_id is not null
     and exists (

       select 1

       from public.encomendas_entrada_ponte_mobile_eventos e

       where e.ponte_id =
             v_ponte.id

         and e.client_event_id =
             p_client_event_id

     )
  then

    /*
     * Reenvio da mesma atividade:
     * não duplica evento.
     *
     * É atividade operacional válida,
     * portanto renova ultima_atividade_em.
     */

    update
      public.encomendas_entrada_pontes_mobile

    set
      ultima_atividade_em =
        v_agora,

      ultimo_heartbeat_em =
        v_agora,

      atualizado_em =
        v_agora

    where id =
          v_ponte.id;


    return jsonb_build_object(

      'ok',
        true,

      'idempotente',
        true,

      'status',
        'CONECTADA',

      'ultima_atividade_em',
        v_agora,

      'expira_inatividade_em',
        v_agora +
        interval '60 seconds',

      'expira_em',
        v_ponte.expira_em
    );

  end if;


  -- ===================================================================
  -- EVENTO
  -- ===================================================================

  insert into
    public.encomendas_entrada_ponte_mobile_eventos
  (
    ponte_id,
    volume_id,
    origem,
    tipo,
    client_event_id,
    payload
  )
  values
  (
    v_ponte.id,
    p_volume_id,
    'MOBILE',

    coalesce(
      nullif(
        btrim(
          p_tipo
        ),
        ''
      ),
      'ATIVIDADE'
    ),

    p_client_event_id,

    coalesce(
      p_payload,
      '{}'::jsonb
    )
  );


  update
    public.encomendas_entrada_pontes_mobile

  set
    ultima_atividade_em =
      v_agora,

    ultimo_heartbeat_em =
      v_agora,

    atualizado_em =
      v_agora

  where id =
        v_ponte.id;


  return jsonb_build_object(

    'ok',
      true,

    'idempotente',
      false,

    'status',
      'CONECTADA',

    'ultima_atividade_em',
      v_agora,

    'expira_inatividade_em',
      v_agora +
      interval '60 seconds',

    'expira_em',
      v_ponte.expira_em
  );

end;
$function$;


-- =====================================================================
-- 5. STATUS DESKTOP
--
-- Se o desktop detectar expiração, também limpa o segredo morto.
-- =====================================================================

create or replace function
  public.rpc_encomenda_entrada_ponte_mobile_status_v1(
    p_ponte_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$

declare

  v_auth_id uuid :=
    auth.uid();

  v_ponte
    public.encomendas_entrada_pontes_mobile%rowtype;

  v_agora timestamptz :=
    now();

  v_eventos jsonb;

begin

  if v_auth_id is null then

    raise exception
      'Usuário não autenticado.'
      using errcode = '42501';

  end if;


  select *

  into v_ponte

  from public.encomendas_entrada_pontes_mobile

  where id =
        p_ponte_id

  for update;


  if not found then

    raise exception
      'Ponte não encontrada.'
      using errcode = 'P0002';

  end if;


  if v_ponte.operador_auth_id <>
     v_auth_id
  then

    raise exception
      'Acesso negado.'
      using errcode = '42501';

  end if;


  -- ===================================================================
  -- QR EXPIRADO SEM PAREAMENTO
  -- ===================================================================

  if v_ponte.status =
     'AGUARDANDO_CONEXAO'
     and v_agora >
         v_ponte.pareamento_expira_em
  then

    update
      public.encomendas_entrada_pontes_mobile

    set
      status =
        'EXPIRADA_PAREAMENTO',

      token_pareamento_hash =
        null,

      encerrado_em =
        v_agora,

      motivo_encerramento =
        'TEMPO_PAREAMENTO_EXCEDIDO',

      atualizado_em =
        v_agora

    where id =
          v_ponte.id;

    v_ponte.status :=
      'EXPIRADA_PAREAMENTO';

    v_ponte.token_pareamento_hash :=
      null;


  -- ===================================================================
  -- TTL
  -- ===================================================================

  elsif v_ponte.status =
        'CONECTADA'
        and v_agora >
            v_ponte.expira_em
  then

    update
      public.encomendas_entrada_pontes_mobile

    set
      status =
        'EXPIRADA_TTL',

      sessao_mobile_hash =
        null,

      encerrado_em =
        v_agora,

      motivo_encerramento =
        'TTL_EXCEDIDO',

      atualizado_em =
        v_agora

    where id =
          v_ponte.id;

    v_ponte.status :=
      'EXPIRADA_TTL';

    v_ponte.sessao_mobile_hash :=
      null;


  -- ===================================================================
  -- INATIVIDADE
  -- ===================================================================

  elsif v_ponte.status =
        'CONECTADA'
        and v_agora >
            v_ponte.ultima_atividade_em +
            interval '60 seconds'
  then

    update
      public.encomendas_entrada_pontes_mobile

    set
      status =
        'EXPIRADA_INATIVIDADE',

      sessao_mobile_hash =
        null,

      encerrado_em =
        v_agora,

      motivo_encerramento =
        'INATIVIDADE_60_SEGUNDOS',

      atualizado_em =
        v_agora

    where id =
          v_ponte.id;

    v_ponte.status :=
      'EXPIRADA_INATIVIDADE';

    v_ponte.sessao_mobile_hash :=
      null;

  end if;


  -- ===================================================================
  -- EVENTOS RECENTES
  -- ===================================================================

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(

          'id',
            x.id,

          'tipo',
            x.tipo,

          'origem',
            x.origem,

          'volume_id',
            x.volume_id,

          'criado_em',
            x.criado_em
        )
        order by
          x.criado_em desc
      ),
      '[]'::jsonb
    )

  into v_eventos

  from (

    select
      e.id,
      e.tipo,
      e.origem,
      e.volume_id,
      e.criado_em

    from public.encomendas_entrada_ponte_mobile_eventos e

    where e.ponte_id =
          v_ponte.id

    order by
      e.criado_em desc

    limit 12

  ) x;


  return jsonb_build_object(

    'ok',
      true,

    'ponte_id',
      v_ponte.id,

    'status',
      v_ponte.status,

    'pre_recebimento_id',
      v_ponte.pre_recebimento_id,

    'condominio_id',
      v_ponte.condominio_id,

    'server_now',
      v_agora,

    'conectado_em',
      v_ponte.conectado_em,

    'ultima_atividade_em',
      v_ponte.ultima_atividade_em,

    'ultimo_heartbeat_em',
      v_ponte.ultimo_heartbeat_em,

    'expira_inatividade_em',
      case

        when v_ponte.ultima_atividade_em
             is null
          then null

        else
          v_ponte.ultima_atividade_em +
          interval '60 seconds'

      end,

    'expira_em',
      v_ponte.expira_em,

    'rede_coincidente',
      v_ponte.rede_coincidente,

    'mobile_tipo_dispositivo',
      v_ponte.mobile_tipo_dispositivo,

    'eventos',
      v_eventos
  );

end;
$function$;


-- =====================================================================
-- 6. ENCERRAR PELO DESKTOP
--
-- Destrói todos os segredos remanescentes.
-- =====================================================================

create or replace function
  public.rpc_encomenda_entrada_ponte_mobile_encerrar_v1(
    p_ponte_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$

declare

  v_auth_id uuid :=
    auth.uid();

  v_ponte
    public.encomendas_entrada_pontes_mobile%rowtype;

begin

  if v_auth_id is null then

    raise exception
      'Usuário não autenticado.'
      using errcode = '42501';

  end if;


  select *

  into v_ponte

  from public.encomendas_entrada_pontes_mobile

  where id =
        p_ponte_id

  for update;


  if not found then

    raise exception
      'Ponte não encontrada.'
      using errcode = 'P0002';

  end if;


  if v_ponte.operador_auth_id <>
     v_auth_id
  then

    raise exception
      'Acesso negado.'
      using errcode = '42501';

  end if;


  update
    public.encomendas_entrada_pontes_mobile

  set
    status =
      'ENCERRADA',

    /*
     * Nenhum segredo permanece utilizável.
     */
    token_pareamento_hash =
      null,

    sessao_mobile_hash =
      null,

    encerrado_em =
      now(),

    encerrado_por_auth_id =
      v_auth_id,

    motivo_encerramento =
      'ENCERRADA_PELO_OPERADOR',

    atualizado_em =
      now()

  where id =
        v_ponte.id;


  insert into
    public.encomendas_entrada_ponte_mobile_eventos
  (
    ponte_id,
    origem,
    tipo
  )
  values
  (
    v_ponte.id,
    'DESKTOP',
    'PONTE_ENCERRADA'
  );


  return jsonb_build_object(

    'ok',
      true,

    'ponte_id',
      v_ponte.id,

    'status',
      'ENCERRADA'
  );

end;
$function$;


-- =====================================================================
-- 7. CRIAR NOVA PONTE
--
-- Ao revogar uma anterior, também destrói seus segredos.
-- =====================================================================

create or replace function
  public.rpc_encomenda_entrada_ponte_mobile_criar_v1(
    p_pre_recebimento_id uuid,
    p_ip text default null,
    p_user_agent text default null
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$

declare

  v_auth_id uuid :=
    auth.uid();

  v_lote record;

  v_token text;

  v_token_hash text;

  v_ponte_id uuid;

  v_pareamento_expira_em timestamptz;

begin

  if v_auth_id is null then

    raise exception
      'Usuário não autenticado.'
      using errcode = '42501';

  end if;


  select
    pr.id,
    pr.business_id,
    pr.condominio_id,
    pr.status

  into v_lote

  from public.encomendas_pre_recebimentos pr

  where pr.id =
        p_pre_recebimento_id;


  if not found then

    raise exception
      'Lote não encontrado.'
      using errcode = 'P0002';

  end if;


  if not public.fn_encomendas_pode_operar_condominio_v1(
    v_lote.condominio_id
  ) then

    raise exception
      'Acesso negado.'
      using errcode = '42501';

  end if;


  if not exists (

    select 1

    from public.encomendas_volumes v

    where v.pre_recebimento_id =
          v_lote.id

      and v.removido_em
          is null

      and v.encomenda_id
          is null

      and coalesce(
            v.status,
            ''
          ) <> 'PROMOVIDO'

  ) then

    raise exception
      'Este lote não possui volumes disponíveis para a Ponte.'
      using errcode = '23514';

  end if;


  -- ===================================================================
  -- REVOGAÇÃO SEGURA DE PONTE ANTERIOR
  -- ===================================================================

  update
    public.encomendas_entrada_pontes_mobile

  set
    status =
      'REVOGADA',

    token_pareamento_hash =
      null,

    sessao_mobile_hash =
      null,

    encerrado_em =
      now(),

    encerrado_por_auth_id =
      v_auth_id,

    motivo_encerramento =
      'NOVA_PONTE_GERADA',

    atualizado_em =
      now()

  where operador_auth_id =
        v_auth_id

    and pre_recebimento_id =
        v_lote.id

    and status in (
      'AGUARDANDO_CONEXAO',
      'CONECTADA'
    );


  -- ===================================================================
  -- NOVO TOKEN
  -- ===================================================================

  v_token :=
      replace(
        gen_random_uuid()::text,
        '-',
        ''
      )
    ||
      replace(
        gen_random_uuid()::text,
        '-',
        ''
      );


  v_token_hash :=
    public.fn_encomendas_hash_token_v1(
      v_token
    );


  v_pareamento_expira_em :=
    now() +
    interval '2 minutes';


  insert into
    public.encomendas_entrada_pontes_mobile
  (
    business_id,
    condominio_id,
    pre_recebimento_id,
    operador_auth_id,

    status,

    token_pareamento_hash,
    pareamento_expira_em,

    desktop_ip,
    desktop_user_agent
  )
  values
  (
    v_lote.business_id,
    v_lote.condominio_id,
    v_lote.id,
    v_auth_id,

    'AGUARDANDO_CONEXAO',

    v_token_hash,
    v_pareamento_expira_em,

    nullif(
      btrim(
        coalesce(
          p_ip,
          ''
        )
      ),
      ''
    ),

    nullif(
      btrim(
        coalesce(
          p_user_agent,
          ''
        )
      ),
      ''
    )
  )

  returning id
  into v_ponte_id;


  insert into
    public.encomendas_entrada_ponte_mobile_eventos
  (
    ponte_id,
    origem,
    tipo
  )
  values
  (
    v_ponte_id,
    'DESKTOP',
    'PONTE_CRIADA'
  );


  return jsonb_build_object(

    'ok',
      true,

    'ponte_id',
      v_ponte_id,

    'token_pareamento',
      v_token,

    'status',
      'AGUARDANDO_CONEXAO',

    'pareamento_expira_em',
      v_pareamento_expira_em,

    'inatividade_segundos',
      60,

    'ttl_conectado_segundos',
      600
  );

end;
$function$;


-- =====================================================================
-- 8. GRANTS
--
-- As assinaturas não mudaram, mas reforçamos explicitamente o contrato.
-- =====================================================================

revoke all on function
  public.rpc_encomenda_entrada_ponte_mobile_criar_v1(
    uuid,
    text,
    text
  )
from public, anon;

grant execute on function
  public.rpc_encomenda_entrada_ponte_mobile_criar_v1(
    uuid,
    text,
    text
  )
to authenticated, service_role;


revoke all on function
  public.rpc_encomenda_entrada_ponte_mobile_status_v1(
    uuid
  )
from public, anon;

grant execute on function
  public.rpc_encomenda_entrada_ponte_mobile_status_v1(
    uuid
  )
to authenticated, service_role;


revoke all on function
  public.rpc_encomenda_entrada_ponte_mobile_encerrar_v1(
    uuid
  )
from public, anon;

grant execute on function
  public.rpc_encomenda_entrada_ponte_mobile_encerrar_v1(
    uuid
  )
to authenticated, service_role;


revoke all on function
  public.rpc_encomenda_entrada_ponte_mobile_conectar_v1(
    text,
    text,
    text,
    text,
    text
  )
from public;

grant execute on function
  public.rpc_encomenda_entrada_ponte_mobile_conectar_v1(
    text,
    text,
    text,
    text,
    text
  )
to anon, authenticated, service_role;


revoke all on function
  public.rpc_encomenda_entrada_ponte_mobile_heartbeat_v1(
    uuid,
    text
  )
from public;

grant execute on function
  public.rpc_encomenda_entrada_ponte_mobile_heartbeat_v1(
    uuid,
    text
  )
to anon, authenticated, service_role;


revoke all on function
  public.rpc_encomenda_entrada_ponte_mobile_atividade_v1(
    uuid,
    text,
    text,
    uuid,
    uuid,
    jsonb
  )
from public;

grant execute on function
  public.rpc_encomenda_entrada_ponte_mobile_atividade_v1(
    uuid,
    text,
    text,
    uuid,
    uuid,
    jsonb
  )
to anon, authenticated, service_role;