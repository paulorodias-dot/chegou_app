-- =====================================================================
-- SISTEMA CHEGOU!
-- CENTRAL DE ENCOMENDAS — ENTRADA OFICIAL
--
-- GATE E3.2-E.3-A
-- CONTEXTO MOBILE + RESULTADO DURÁVEL DA PONTE
--
-- MOBILE:
-- - acessa somente por sessão temporária;
-- - recebe somente o lote autorizado;
-- - não confirma Entrada;
-- - envia somente resultado de captura;
-- - não envia fotografia para persistência.
-- =====================================================================


-- =====================================================================
-- 1. RESULTADOS DA PONTE
-- =====================================================================

create table if not exists
  public.encomendas_entrada_ponte_mobile_resultados
(
  id uuid
    primary key
    default gen_random_uuid(),

  ponte_id uuid
    not null
    references public.encomendas_entrada_pontes_mobile(id)
    on delete cascade,

  volume_id uuid
    not null
    references public.encomendas_volumes(id)
    on delete cascade,

  client_event_id uuid
    not null,

  tipo text
    not null
    check (
      tipo in (
        'CODIGO',
        'ETIQUETA_OCR'
      )
    ),

  codigo text,

  nome text,

  torre_bloco text,

  unidade text,

  confianca numeric(5,2),

  criado_em timestamptz
    not null
    default now(),

  consumido_em timestamptz,

  unique (
    ponte_id,
    client_event_id
  )
);


create index if not exists
  idx_entrada_ponte_resultados_desktop
on public.encomendas_entrada_ponte_mobile_resultados
(
  ponte_id,
  consumido_em,
  criado_em
);


create index if not exists
  idx_entrada_ponte_resultados_volume
on public.encomendas_entrada_ponte_mobile_resultados
(
  volume_id,
  criado_em desc
);


alter table
  public.encomendas_entrada_ponte_mobile_resultados
enable row level security;


revoke all
on table
  public.encomendas_entrada_ponte_mobile_resultados
from public, anon, authenticated;


-- =====================================================================
-- 2. CONTEXTO DO MOBILE
-- =====================================================================

create or replace function
  public.rpc_encomenda_entrada_ponte_mobile_contexto_v1(
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

  v_lote record;

  v_volumes jsonb;

begin

  -- ===================================================================
  -- SESSÃO
  -- ===================================================================

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
     or v_ponte.sessao_mobile_hash is null
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


    raise exception
      'A conexão expirou.'
      using errcode = '42501';

  end if;


  -- ===================================================================
  -- INATIVIDADE
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


    raise exception
      'A conexão expirou por inatividade.'
      using errcode = '42501';

  end if;


  -- ===================================================================
  -- LOTE
  -- ===================================================================

  select
    pr.id,
    pr.referencia_lote,
    pr.numero_lote,
    pr.status,
    pr.business_id,
    pr.condominio_id

  into v_lote

  from public.encomendas_pre_recebimentos pr

  where pr.id =
        v_ponte.pre_recebimento_id;


  if not found then

    raise exception
      'Lote não encontrado.'
      using errcode = 'P0002';

  end if;


  -- ===================================================================
  -- VOLUMES
  --
  -- Somente dados operacionais necessários à captura.
  -- Nenhum dado cadastral de Morador é entregue ao Mobile.
  -- ===================================================================

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(

          'volume_id',
            x.volume_id,

          'numero_volume',
            x.numero_volume,

          'codigo_lido',
            x.codigo_lido,

          'status',
            x.status,

          'entrada_realizada',
            x.entrada_realizada
        )
        order by
          x.numero_volume
      ),
      '[]'::jsonb
    )

  into v_volumes

  from (

    select

      v.id
        as volume_id,

      v.numero_volume,

      v.codigo_lido,

      v.status,

      (
        v.encomenda_id is not null
        or v.status = 'PROMOVIDO'
      )
        as entrada_realizada

    from public.encomendas_volumes v

    where v.pre_recebimento_id =
          v_ponte.pre_recebimento_id

      and v.removido_em
          is null

    order by
      v.numero_volume

  ) x;


  -- ===================================================================
  -- CONTEXTO CONSULTADO = ATIVIDADE REAL
  -- ===================================================================

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

    'ponte_id',
      v_ponte.id,

    'status',
      'CONECTADA',

    'lote',
      jsonb_build_object(

        'id',
          v_lote.id,

        'referencia_lote',
          v_lote.referencia_lote,

        'numero_lote',
          v_lote.numero_lote,

        'status',
          v_lote.status
      ),

    'volumes',
      v_volumes,

    'server_now',
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
-- 3. ENVIAR RESULTADO DA CAPTURA
-- =====================================================================

create or replace function
  public.rpc_encomenda_entrada_ponte_mobile_resultado_enviar_v1(
    p_ponte_id uuid,
    p_sessao_token text,
    p_volume_id uuid,
    p_client_event_id uuid,
    p_tipo text,
    p_codigo text default null,
    p_nome text default null,
    p_torre_bloco text default null,
    p_unidade text default null,
    p_confianca numeric default null
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

  v_tipo text;

  v_resultado_id uuid;

begin

  -- ===================================================================
  -- TOKEN DE SESSÃO
  -- ===================================================================

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
     or v_ponte.sessao_mobile_hash is null
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
  -- TEMPO
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


    raise exception
      'A conexão expirou.'
      using errcode = '42501';

  end if;


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


    raise exception
      'A conexão expirou por inatividade.'
      using errcode = '42501';

  end if;


  -- ===================================================================
  -- VOLUME PRECISA PERTENCER À PONTE
  -- ===================================================================

  if not exists (

    select 1

    from public.encomendas_volumes v

    where v.id =
          p_volume_id

      and v.pre_recebimento_id =
          v_ponte.pre_recebimento_id

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
      'Este volume não está disponível nesta Ponte.'
      using errcode = '42501';

  end if;


  -- ===================================================================
  -- TIPO
  -- ===================================================================

  v_tipo :=
    upper(
      btrim(
        coalesce(
          p_tipo,
          ''
        )
      )
    );


  if v_tipo not in (
    'CODIGO',
    'ETIQUETA_OCR'
  ) then

    raise exception
      'Tipo de captura inválido.'
      using errcode = '22023';

  end if;


  -- ===================================================================
  -- CONTEÚDO MÍNIMO
  -- ===================================================================

  if v_tipo = 'CODIGO'
     and nullif(
           btrim(
             coalesce(
               p_codigo,
               ''
             )
           ),
           ''
         ) is null
  then

    raise exception
      'Código não informado.'
      using errcode = '22023';

  end if;


  if v_tipo = 'ETIQUETA_OCR'
     and nullif(
           btrim(
             coalesce(
               p_nome,
               ''
             ) ||
             coalesce(
               p_torre_bloco,
               ''
             ) ||
             coalesce(
               p_unidade,
               ''
             )
           ),
           ''
         ) is null
  then

    raise exception
      'Nenhuma informação foi identificada na etiqueta.'
      using errcode = '22023';

  end if;


  -- ===================================================================
  -- IDEMPOTÊNCIA
  -- ===================================================================

  select
    r.id

  into v_resultado_id

  from public.encomendas_entrada_ponte_mobile_resultados r

  where r.ponte_id =
        v_ponte.id

    and r.client_event_id =
        p_client_event_id;


  if found then

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

      'resultado_id',
        v_resultado_id,

      'status',
        'RECEBIDO',

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
  -- PERSISTÊNCIA DURÁVEL
  -- ===================================================================

  insert into
    public.encomendas_entrada_ponte_mobile_resultados
  (
    ponte_id,
    volume_id,
    client_event_id,
    tipo,

    codigo,

    nome,
    torre_bloco,
    unidade,
    confianca
  )
  values
  (
    v_ponte.id,
    p_volume_id,
    p_client_event_id,
    v_tipo,

    case
      when v_tipo =
           'CODIGO'
        then nullif(
               btrim(
                 p_codigo
               ),
               ''
             )
      else null
    end,

    case
      when v_tipo =
           'ETIQUETA_OCR'
        then nullif(
               btrim(
                 p_nome
               ),
               ''
             )
      else null
    end,

    case
      when v_tipo =
           'ETIQUETA_OCR'
        then nullif(
               btrim(
                 p_torre_bloco
               ),
               ''
             )
      else null
    end,

    case
      when v_tipo =
           'ETIQUETA_OCR'
        then nullif(
               btrim(
                 p_unidade
               ),
               ''
             )
      else null
    end,

    case
      when v_tipo =
           'ETIQUETA_OCR'
        then greatest(
               0,
               least(
                 100,
                 p_confianca
               )
             )
      else null
    end
  )

  returning id
  into v_resultado_id;


  -- ===================================================================
  -- TIMELINE
  --
  -- O evento não contém conteúdo da etiqueta.
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

    case
      when v_tipo =
           'CODIGO'
        then 'CODIGO_CAPTURADO'
      else 'OCR_CONCLUIDO'
    end,

    p_client_event_id,

    jsonb_build_object(
      'resultado_id',
        v_resultado_id,
      'tipo',
        v_tipo
    )
  );


  -- ===================================================================
  -- ATIVIDADE
  -- ===================================================================

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

    'resultado_id',
      v_resultado_id,

    'status',
      'RECEBIDO',

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
-- 4. DESKTOP — RESULTADOS PENDENTES
-- =====================================================================

create or replace function
  public.rpc_encomenda_entrada_ponte_mobile_resultados_listar_v1(
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

  v_resultados jsonb;

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
        p_ponte_id;


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


  if not public.fn_encomendas_pode_operar_condominio_v1(
    v_ponte.condominio_id
  ) then

    raise exception
      'Acesso negado.'
      using errcode = '42501';

  end if;


  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(

          'id',
            x.id,

          'volume_id',
            x.volume_id,

          'tipo',
            x.tipo,

          'codigo',
            x.codigo,

          'nome',
            x.nome,

          'torre_bloco',
            x.torre_bloco,

          'unidade',
            x.unidade,

          'confianca',
            x.confianca,

          'criado_em',
            x.criado_em,

          'consumido_em',
            x.consumido_em
        )
        order by
          x.criado_em asc
      ),
      '[]'::jsonb
    )

  into v_resultados

  from (

    select
      r.*

    from public.encomendas_entrada_ponte_mobile_resultados r

    where r.ponte_id =
          v_ponte.id

      and r.consumido_em
          is null

    order by
      r.criado_em asc

    limit 20

  ) x;


  return jsonb_build_object(

    'ok',
      true,

    'ponte_id',
      v_ponte.id,

    'resultados',
      v_resultados
  );

end;
$function$;


-- =====================================================================
-- 5. DESKTOP — MARCAR RESULTADO COMO RECEBIDO/CONSUMIDO
-- =====================================================================

create or replace function
  public.rpc_encomenda_entrada_ponte_mobile_resultado_consumir_v1(
    p_ponte_id uuid,
    p_resultado_id uuid
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
        p_ponte_id;


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
    public.encomendas_entrada_ponte_mobile_resultados

  set
    consumido_em =
      coalesce(
        consumido_em,
        now()
      )

  where id =
        p_resultado_id

    and ponte_id =
        v_ponte.id;


  if not found then

    raise exception
      'Resultado não encontrado.'
      using errcode = 'P0002';

  end if;


  return jsonb_build_object(

    'ok',
      true,

    'resultado_id',
      p_resultado_id,

    'consumido',
      true
  );

end;
$function$;


-- =====================================================================
-- 6. PERMISSÕES — MOBILE
-- =====================================================================

revoke all on function
  public.rpc_encomenda_entrada_ponte_mobile_contexto_v1(
    uuid,
    text
  )
from public;

grant execute on function
  public.rpc_encomenda_entrada_ponte_mobile_contexto_v1(
    uuid,
    text
  )
to anon, authenticated, service_role;


revoke all on function
  public.rpc_encomenda_entrada_ponte_mobile_resultado_enviar_v1(
    uuid,
    text,
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text,
    numeric
  )
from public;

grant execute on function
  public.rpc_encomenda_entrada_ponte_mobile_resultado_enviar_v1(
    uuid,
    text,
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text,
    numeric
  )
to anon, authenticated, service_role;


-- =====================================================================
-- 7. PERMISSÕES — DESKTOP
-- =====================================================================

revoke all on function
  public.rpc_encomenda_entrada_ponte_mobile_resultados_listar_v1(
    uuid
  )
from public, anon;

grant execute on function
  public.rpc_encomenda_entrada_ponte_mobile_resultados_listar_v1(
    uuid
  )
to authenticated, service_role;


revoke all on function
  public.rpc_encomenda_entrada_ponte_mobile_resultado_consumir_v1(
    uuid,
    uuid
  )
from public, anon;

grant execute on function
  public.rpc_encomenda_entrada_ponte_mobile_resultado_consumir_v1(
    uuid,
    uuid
  )
to authenticated, service_role;


comment on table
  public.encomendas_entrada_ponte_mobile_resultados
is
  'Sistema Chegou! — Entrada Oficial — resultados estruturados e temporários produzidos pela Ponte Mobile; não armazena fotografia.';