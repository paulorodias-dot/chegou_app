begin;

-- ============================================================================
-- GATE E3.3-E.7C.2B
--
-- 1. Hardening da autorização da fila de Armazenamento:
--    - níveis 4/5;
--    - vínculo canônico;
--    - sem helper amplo legado;
--    - sem bypass Master.
--
-- 2. Criação da fila oficial de Disponibilização:
--    - backend-driven;
--    - tenant autoritativo;
--    - cadeia Entrada ↔ Volume ↔ Encomenda;
--    - FIFO por armazenado_em;
--    - Torre/Bloco/Unidade a partir de condominio_unidades;
--    - destinatário nominal preservado;
--    - bloqueios calculados no backend;
--    - paginação e filtros;
--    - sem envio direto de notificação.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_encomenda_armazenamento_pendentes_listar_v1(p_condominio_id uuid, p_limite integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

declare

  v_ctx record;

  v_config
    public.configuracoes_encomendas_condominio%rowtype;

  v_limite integer;
  v_offset integer;

  v_total bigint;

  v_itens jsonb;

begin

  -- ===================================================================
  -- 1. AUTENTICAÇÃO
  -- ===================================================================

  if auth.uid() is null then
    raise exception
      'Usuário não autenticado.'
      using errcode = '42501';
  end if;


  -- ===================================================================
  -- 2. PARÂMETROS
  -- ===================================================================

  if p_condominio_id is null then
    raise exception
      'O condomínio é obrigatório.'
      using errcode = '22023';
  end if;


  -- ===================================================================
  -- 3. CONTEXTO OPERACIONAL ESTRITO
  --
  -- A fila deve possuir a mesma superfície operacional do Armazenamento
  -- V2: somente níveis 4/5 com vínculo canônico ao condomínio.
  -- Não utiliza o helper amplo legado e não possui bypass Master.
  -- ===================================================================

  if not public.fn_encomendas_pode_operar_fluxo_fisico_v1(
    p_condominio_id
  ) then
    raise exception
      'Acesso negado.'
      using errcode = '42501';
  end if;


  select
    c.business_id
  into
    v_ctx
  from public.condominios c
  where c.id = p_condominio_id;


  if not found
     or v_ctx.business_id is null
  then
    raise exception
      'Não foi possível determinar o tenant do condomínio.'
      using errcode = '42501';
  end if;


  -- ===================================================================
  -- 4. CONFIGURAÇÃO DO CONDOMÍNIO
  -- ===================================================================

  select *
  into v_config
  from public.configuracoes_encomendas_condominio
  where condominio_id =
        p_condominio_id;


  if not found then
    raise exception
      'As configurações de encomendas do condomínio não foram encontradas.'
      using errcode = '23514';
  end if;


  -- Não apresentar uma fila acionável quando o próprio domínio
  -- estiver desativado.

  if not v_config.ativo then

    return jsonb_build_object(

      'ok',
        true,

      'contrato',
        'rpc_encomenda_armazenamento_pendentes_listar_v1',

      'business_id',
        v_ctx.business_id,

      'condominio_id',
        p_condominio_id,

      'fluxo_encomendas_ativo',
        false,

      'armazenamento_habilitado',
        false,

      'itens',
        '[]'::jsonb,

      'total',
        0,

      'limite',
        0,

      'offset',
        0,

      'mensagem',
        'O fluxo de encomendas está desativado neste condomínio.'
    );

  end if;


  if not v_config.armazenamento_habilitado then

    return jsonb_build_object(

      'ok',
        true,

      'contrato',
        'rpc_encomenda_armazenamento_pendentes_listar_v1',

      'business_id',
        v_ctx.business_id,

      'condominio_id',
        p_condominio_id,

      'fluxo_encomendas_ativo',
        true,

      'armazenamento_habilitado',
        false,

      'itens',
        '[]'::jsonb,

      'total',
        0,

      'limite',
        0,

      'offset',
        0,

      'mensagem',
        'O armazenamento de encomendas não está habilitado neste condomínio.'
    );

  end if;


  -- ===================================================================
  -- 5. PAGINAÇÃO
  -- ===================================================================

  v_limite :=
    greatest(
      1,
      least(
        coalesce(
          p_limite,
          50
        ),
        200
      )
    );


  v_offset :=
    greatest(
      coalesce(
        p_offset,
        0
      ),
      0
    );


  -- ===================================================================
  -- 6. TOTAL
  --
  -- Predicado alinhado ao rpc_encomenda_armazenar_v2:
  --
  -- - Encomenda RECEBIDA;
  -- - ainda não armazenada;
  -- - sem localização atual;
  -- - Unidade identificada;
  -- - exatamente uma Entrada Oficial por integridade UNIQUE;
  -- - Volume canônico da Entrada;
  -- - mesma cadeia tenant/condomínio/correlation;
  -- - Volume aponta para a mesma Encomenda;
  -- - Volume pertence ao mesmo Pré-Recebimento da Entrada.
  --
  -- Adicionalmente:
  --
  -- - disponibilizado_em precisa continuar NULL, preservando a
  --   separação Armazenamento ≠ Disponibilização.
  -- ===================================================================

  select
    count(*)

  into
    v_total

  from public.encomendas e

  join public.encomendas_entradas ent
    on ent.encomenda_id =
       e.id

   and ent.business_id =
       e.business_id

   and ent.condominio_id =
       e.condominio_id

   and ent.correlation_id =
       e.correlation_id

  join public.encomendas_volumes v
    on v.id =
       ent.volume_id

   and v.encomenda_id =
       e.id

   and v.business_id =
       e.business_id

   and v.condominio_id =
       e.condominio_id

   and v.pre_recebimento_id
       is not distinct from
       ent.pre_recebimento_id

  where e.condominio_id =
        p_condominio_id

    and e.business_id =
        v_ctx.business_id

    and e.status =
        'RECEBIDA'

    and e.armazenado_em
        is null

    and e.localizacao_atual_id
        is null

    and e.disponibilizado_em
        is null

    and e.unidade_id
        is not null;


  -- ===================================================================
  -- 7. ITENS
  --
  -- FIFO:
  --
  -- A referência autoritativa é confirmada_em da Entrada Oficial,
  -- e não criado_em da Encomenda nem criado_em do Volume.
  -- ===================================================================

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(

          -- -----------------------------------------------------------
          -- Identidade da Encomenda
          -- -----------------------------------------------------------

          'encomenda_id',
            x.encomenda_id,

          'numero_encomenda',
            x.numero_encomenda,

          'status',
            x.status,

          'tipo_entrega',
            x.tipo_entrega,

          'prioridade',
            x.prioridade,


          -- -----------------------------------------------------------
          -- Tenant / contexto
          -- -----------------------------------------------------------

          'business_id',
            x.business_id,

          'condominio_id',
            x.condominio_id,

          'unidade_id',
            x.unidade_id,

          'unidade_oficial_id',
            x.unidade_oficial_id,


          -- -----------------------------------------------------------
          -- Destinatário oficial
          --
          -- Apenas exposição da identidade já persistida.
          -- Nenhuma decisão de autorização é feita aqui.
          -- -----------------------------------------------------------

          'destinatario_tipo',
            x.destinatario_tipo,

          'destinatario_nome',
            x.destinatario_nome_snapshot,

          'destinatario_dependente_id',
            x.destinatario_dependente_id,

          'destinatario_morador_vinculo_id',
            x.destinatario_morador_vinculo_id,

          'destinatario_responsavel_vinculo_id',
            x.destinatario_responsavel_vinculo_id,


          -- -----------------------------------------------------------
          -- Entrada Oficial / Volume
          -- -----------------------------------------------------------

          'entrada_id',
            x.entrada_id,

          'volume_id',
            x.volume_id,

          'pre_recebimento_id',
            x.pre_recebimento_id,

          'entrada_confirmada_em',
            x.entrada_confirmada_em,

          'entrada_confirmada_em_local',
            public.fn_encomendas_data_hora_local_v1(
              x.entrada_confirmada_em,
              x.condominio_id
            ),


          -- -----------------------------------------------------------
          -- Tempo de pendência
          --
          -- Informativo para UX/ordenação futura.
          -- A ordenação atual continua sendo pela Entrada.
          -- -----------------------------------------------------------

          'pendente_ha_segundos',
            greatest(
              0,
              floor(
                extract(
                  epoch from
                  (
                    now()
                    -
                    x.entrada_confirmada_em
                  )
                )
              )::bigint
            ),


          -- -----------------------------------------------------------
          -- Invariantes explícitas
          -- -----------------------------------------------------------

          'armazenado_em',
            x.armazenado_em,

          'localizacao_atual_id',
            x.localizacao_atual_id,

          'disponibilizado_em',
            x.disponibilizado_em

        )

        order by
          x.entrada_confirmada_em asc,
          x.numero_encomenda asc nulls last,
          x.encomenda_id asc
      ),

      '[]'::jsonb
    )

  into
    v_itens

  from (

    select

      e.id
        as encomenda_id,

      e.numero_encomenda,

      e.status,

      e.tipo_entrega,

      e.prioridade,

      e.business_id,

      e.condominio_id,

      e.unidade_id,

      e.unidade_oficial_id,

      e.destinatario_tipo,

      e.destinatario_nome_snapshot,

      e.destinatario_dependente_id,

      e.destinatario_morador_vinculo_id,

      e.destinatario_responsavel_vinculo_id,

      e.armazenado_em,

      e.localizacao_atual_id,

      e.disponibilizado_em,

      ent.id
        as entrada_id,

      ent.volume_id,

      ent.pre_recebimento_id,

      ent.confirmada_em
        as entrada_confirmada_em

    from public.encomendas e

    join public.encomendas_entradas ent
      on ent.encomenda_id =
         e.id

     and ent.business_id =
         e.business_id

     and ent.condominio_id =
         e.condominio_id

     and ent.correlation_id =
         e.correlation_id

    join public.encomendas_volumes v
      on v.id =
         ent.volume_id

     and v.encomenda_id =
         e.id

     and v.business_id =
         e.business_id

     and v.condominio_id =
         e.condominio_id

     and v.pre_recebimento_id
         is not distinct from
         ent.pre_recebimento_id

    where e.condominio_id =
          p_condominio_id

      and e.business_id =
          v_ctx.business_id

      and e.status =
          'RECEBIDA'

      and e.armazenado_em
          is null

      and e.localizacao_atual_id
          is null

      and e.disponibilizado_em
          is null

      and e.unidade_id
          is not null

    order by
      ent.confirmada_em asc,
      e.numero_encomenda asc nulls last,
      e.id asc

    limit v_limite
    offset v_offset

  ) x;


  -- ===================================================================
  -- 8. RETORNO OFICIAL
  -- ===================================================================

  return jsonb_build_object(

    'ok',
      true,

    'contrato',
      'rpc_encomenda_armazenamento_pendentes_listar_v1',

    'business_id',
      v_ctx.business_id,

    'condominio_id',
      p_condominio_id,

    'fluxo_encomendas_ativo',
      true,

    'armazenamento_habilitado',
      true,

    'ordenacao',
      'ENTRADA_OFICIAL_FIFO',

    'itens',
      v_itens,

    'total',
      v_total,

    'limite',
      v_limite,

    'offset',
      v_offset
  );

end;
$function$;

revoke all
on function public.rpc_encomenda_armazenamento_pendentes_listar_v1(
  uuid,
  integer,
  integer
)
from public;

revoke all
on function public.rpc_encomenda_armazenamento_pendentes_listar_v1(
  uuid,
  integer,
  integer
)
from anon;

grant execute
on function public.rpc_encomenda_armazenamento_pendentes_listar_v1(
  uuid,
  integer,
  integer
)
to authenticated;

grant execute
on function public.rpc_encomenda_armazenamento_pendentes_listar_v1(
  uuid,
  integer,
  integer
)
to service_role;

grant execute
on function public.rpc_encomenda_armazenamento_pendentes_listar_v1(
  uuid,
  integer,
  integer
)
to postgres;


create or replace function public.rpc_encomenda_disponibilizacao_pendentes_listar_v1(
  p_condominio_id uuid,
  p_busca text default null,
  p_localizacao_id uuid default null,
  p_apenas_elegiveis boolean default false,
  p_limite integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_business_id text;
  v_config public.configuracoes_encomendas_condominio%rowtype;

  v_busca text;
  v_limite integer;
  v_offset integer;

  v_total bigint;
  v_itens jsonb;
begin
  -- ========================================================================
  -- 1. AUTENTICAÇÃO
  -- ========================================================================
  if auth.uid() is null then
    raise exception
      'Usuário não autenticado.'
      using errcode = '42501';
  end if;

  if p_condominio_id is null then
    raise exception
      'O condomínio é obrigatório.'
      using errcode = '22023';
  end if;

  -- ========================================================================
  -- 2. AUTORIZAÇÃO OPERACIONAL ESTRITA
  --
  -- Mesma superfície das ações físicas oficiais:
  -- níveis 4/5, vínculo canônico, sem bypass Master.
  -- ========================================================================
  if not public.fn_encomendas_pode_operar_fluxo_fisico_v1(
    p_condominio_id
  ) then
    raise exception
      'Acesso negado.'
      using errcode = '42501';
  end if;

  select c.business_id
  into v_business_id
  from public.condominios c
  where c.id = p_condominio_id;

  if not found
     or v_business_id is null
  then
    raise exception
      'Não foi possível determinar o tenant do condomínio.'
      using errcode = '42501';
  end if;

  -- ========================================================================
  -- 3. CONFIGURAÇÃO
  -- ========================================================================
  select *
  into v_config
  from public.configuracoes_encomendas_condominio
  where condominio_id = p_condominio_id;

  if not found then
    raise exception
      'As configurações de encomendas do condomínio não foram encontradas.'
      using errcode = '23514';
  end if;

  if not v_config.ativo then
    return jsonb_build_object(
      'ok', true,
      'contrato', 'rpc_encomenda_disponibilizacao_pendentes_listar_v1',
      'business_id', v_business_id,
      'condominio_id', p_condominio_id,
      'fluxo_encomendas_ativo', false,
      'armazenamento_habilitado', false,
      'ordenacao', 'ARMAZENAMENTO_FIFO',
      'itens', '[]'::jsonb,
      'total', 0,
      'limite', 0,
      'offset', 0,
      'mensagem', 'O fluxo de encomendas está desativado neste condomínio.'
    );
  end if;

  if not v_config.armazenamento_habilitado then
    return jsonb_build_object(
      'ok', true,
      'contrato', 'rpc_encomenda_disponibilizacao_pendentes_listar_v1',
      'business_id', v_business_id,
      'condominio_id', p_condominio_id,
      'fluxo_encomendas_ativo', true,
      'armazenamento_habilitado', false,
      'ordenacao', 'ARMAZENAMENTO_FIFO',
      'itens', '[]'::jsonb,
      'total', 0,
      'limite', 0,
      'offset', 0,
      'mensagem', 'O armazenamento de encomendas não está habilitado neste condomínio.'
    );
  end if;

  -- ========================================================================
  -- 4. PARÂMETROS / PAGINAÇÃO
  -- ========================================================================
  v_busca :=
    nullif(
      upper(
        btrim(
          coalesce(p_busca, '')
        )
      ),
      ''
    );

  v_limite :=
    greatest(
      1,
      least(
        coalesce(p_limite, 50),
        200
      )
    );

  v_offset :=
    greatest(
      coalesce(p_offset, 0),
      0
    );

  -- ========================================================================
  -- 5. BASE CANÔNICA DA FILA
  --
  -- Uma linha entra na fila quando:
  -- - pertence ao tenant/condomínio autorizados;
  -- - está ARMAZENADA;
  -- - possui armazenado_em e localização atual;
  -- - ainda não foi disponibilizada;
  -- - possui Unidade identificada;
  -- - possui Entrada Oficial canônica;
  -- - o Volume da Entrada aponta para a mesma Encomenda e mesmo contexto.
  --
  -- Ocorrência crítica e indisponibilidade da localização NÃO escondem o
  -- item. Elas são retornadas como bloqueios backend-driven.
  -- ========================================================================
  with base as (
    select
      e.id as encomenda_id,
      e.numero_encomenda,
      e.status,
      e.tipo_entrega,
      e.prioridade,

      e.business_id,
      e.condominio_id,
      e.correlation_id,
      e.pre_recebimento_id,

      e.unidade_id,
      e.unidade_oficial_id,

      u.torre as unidade_torre,
      u.bloco as unidade_bloco,
      u.unidade as unidade_numero,

      e.destinatario_tipo,
      e.destinatario_nome_snapshot,
      e.destinatario_usuario_id,
      e.destinatario_pessoa_id,
      e.destinatario_morador_vinculo_id,
      e.destinatario_dependente_id,
      e.destinatario_responsavel_vinculo_id,

      e.transportadora_id,
      t.nome_fantasia as transportadora_nome,

      ent.id as entrada_id,
      ent.volume_id,
      ent.confirmada_em as entrada_confirmada_em,

      e.localizacao_atual_id,
      l.codigo as localizacao_codigo,
      l.nome as localizacao_nome,
      l.localizacao_pai_id,
      lp.nome as localizacao_pai_nome,
      l.ativo as localizacao_ativa,
      l.bloqueada as localizacao_bloqueada,

      e.armazenado_em,
      e.armazenado_por_usuario_id,
      e.disponibilizado_em,

      exists (
        select 1
        from public.encomendas_ocorrencias o
        where o.encomenda_id = e.id
          and o.business_id = e.business_id
          and o.condominio_id = e.condominio_id
          and o.gravidade = 'CRITICA'
          and o.status in ('ABERTA', 'EM_ANALISE')
      ) as possui_ocorrencia_critica,

      (
        select count(*)::integer
        from public.encomendas_ocorrencias o
        where o.encomenda_id = e.id
          and o.business_id = e.business_id
          and o.condominio_id = e.condominio_id
          and o.gravidade = 'CRITICA'
          and o.status in ('ABERTA', 'EM_ANALISE')
      ) as ocorrencias_criticas_abertas

    from public.encomendas e

    join public.encomendas_entradas ent
      on ent.encomenda_id = e.id
     and ent.business_id = e.business_id
     and ent.condominio_id = e.condominio_id
     and ent.correlation_id = e.correlation_id
     and ent.pre_recebimento_id is not distinct from e.pre_recebimento_id

    join public.encomendas_volumes v
      on v.id = ent.volume_id
     and v.encomenda_id = e.id
     and v.business_id = e.business_id
     and v.condominio_id = e.condominio_id
     and v.pre_recebimento_id is not distinct from ent.pre_recebimento_id

    left join public.condominio_unidades u
      on u.id = e.unidade_oficial_id
     and u.condominio_id = e.condominio_id

    left join public.transportadoras t
      on t.id = e.transportadora_id

    left join public.encomendas_localizacoes l
      on l.id = e.localizacao_atual_id
     and l.condominio_id = e.condominio_id

    left join public.encomendas_localizacoes lp
      on lp.id = l.localizacao_pai_id
     and lp.condominio_id = e.condominio_id

    where e.condominio_id = p_condominio_id
      and e.business_id = v_business_id
      and e.status = 'ARMAZENADA'
      and e.armazenado_em is not null
      and e.localizacao_atual_id is not null
      and e.disponibilizado_em is null
      and e.unidade_id is not null
  ),
  filtrada as (
    select
      b.*,

      (
        not b.possui_ocorrencia_critica
        and b.localizacao_codigo is not null
        and coalesce(b.localizacao_ativa, false) = true
        and coalesce(b.localizacao_bloqueada, true) = false
      ) as elegivel_disponibilizacao,

      (
        case
          when b.possui_ocorrencia_critica then
            jsonb_build_array(
              jsonb_build_object(
                'codigo', 'OCORRENCIA_CRITICA',
                'mensagem', 'Existe uma ocorrência crítica pendente.'
              )
            )
          else
            '[]'::jsonb
        end
        ||
        case
          when b.localizacao_codigo is null
               or coalesce(b.localizacao_ativa, false) = false
               or coalesce(b.localizacao_bloqueada, true) = true
          then
            jsonb_build_array(
              jsonb_build_object(
                'codigo', 'LOCALIZACAO_INDISPONIVEL',
                'mensagem', 'A localização atual da encomenda está indisponível ou inválida.'
              )
            )
          else
            '[]'::jsonb
        end
      ) as bloqueios

    from base b

    where (
      p_localizacao_id is null
      or b.localizacao_atual_id = p_localizacao_id
    )

    and (
      v_busca is null

      or upper(
        coalesce(
          b.numero_encomenda::text,
          ''
        )
      ) like '%' || v_busca || '%'

      or upper(
        coalesce(
          b.destinatario_nome_snapshot,
          ''
        )
      ) like '%' || v_busca || '%'

      or upper(
        coalesce(
          b.transportadora_nome,
          ''
        )
      ) like '%' || v_busca || '%'

      or upper(
        coalesce(
          b.unidade_torre,
          ''
        )
      ) like '%' || v_busca || '%'

      or upper(
        coalesce(
          b.unidade_bloco,
          ''
        )
      ) like '%' || v_busca || '%'

      or upper(
        coalesce(
          b.unidade_numero,
          ''
        )
      ) like '%' || v_busca || '%'

      or upper(
        coalesce(
          b.localizacao_codigo,
          ''
        )
      ) like '%' || v_busca || '%'

      or upper(
        coalesce(
          b.localizacao_nome,
          ''
        )
      ) like '%' || v_busca || '%'
    )
  )
  select count(*)
  into v_total
  from filtrada f
  where (
    not coalesce(p_apenas_elegiveis, false)
    or f.elegivel_disponibilizacao
  );

  with base as (
    select
      e.id as encomenda_id,
      e.numero_encomenda,
      e.status,
      e.tipo_entrega,
      e.prioridade,

      e.business_id,
      e.condominio_id,
      e.correlation_id,
      e.pre_recebimento_id,

      e.unidade_id,
      e.unidade_oficial_id,

      u.torre as unidade_torre,
      u.bloco as unidade_bloco,
      u.unidade as unidade_numero,

      e.destinatario_tipo,
      e.destinatario_nome_snapshot,
      e.destinatario_usuario_id,
      e.destinatario_pessoa_id,
      e.destinatario_morador_vinculo_id,
      e.destinatario_dependente_id,
      e.destinatario_responsavel_vinculo_id,

      e.transportadora_id,
      t.nome_fantasia as transportadora_nome,

      ent.id as entrada_id,
      ent.volume_id,
      ent.confirmada_em as entrada_confirmada_em,

      e.localizacao_atual_id,
      l.codigo as localizacao_codigo,
      l.nome as localizacao_nome,
      l.localizacao_pai_id,
      lp.nome as localizacao_pai_nome,
      l.ativo as localizacao_ativa,
      l.bloqueada as localizacao_bloqueada,

      e.armazenado_em,
      e.armazenado_por_usuario_id,
      e.disponibilizado_em,

      exists (
        select 1
        from public.encomendas_ocorrencias o
        where o.encomenda_id = e.id
          and o.business_id = e.business_id
          and o.condominio_id = e.condominio_id
          and o.gravidade = 'CRITICA'
          and o.status in ('ABERTA', 'EM_ANALISE')
      ) as possui_ocorrencia_critica,

      (
        select count(*)::integer
        from public.encomendas_ocorrencias o
        where o.encomenda_id = e.id
          and o.business_id = e.business_id
          and o.condominio_id = e.condominio_id
          and o.gravidade = 'CRITICA'
          and o.status in ('ABERTA', 'EM_ANALISE')
      ) as ocorrencias_criticas_abertas

    from public.encomendas e

    join public.encomendas_entradas ent
      on ent.encomenda_id = e.id
     and ent.business_id = e.business_id
     and ent.condominio_id = e.condominio_id
     and ent.correlation_id = e.correlation_id
     and ent.pre_recebimento_id is not distinct from e.pre_recebimento_id

    join public.encomendas_volumes v
      on v.id = ent.volume_id
     and v.encomenda_id = e.id
     and v.business_id = e.business_id
     and v.condominio_id = e.condominio_id
     and v.pre_recebimento_id is not distinct from ent.pre_recebimento_id

    left join public.condominio_unidades u
      on u.id = e.unidade_oficial_id
     and u.condominio_id = e.condominio_id

    left join public.transportadoras t
      on t.id = e.transportadora_id

    left join public.encomendas_localizacoes l
      on l.id = e.localizacao_atual_id
     and l.condominio_id = e.condominio_id

    left join public.encomendas_localizacoes lp
      on lp.id = l.localizacao_pai_id
     and lp.condominio_id = e.condominio_id

    where e.condominio_id = p_condominio_id
      and e.business_id = v_business_id
      and e.status = 'ARMAZENADA'
      and e.armazenado_em is not null
      and e.localizacao_atual_id is not null
      and e.disponibilizado_em is null
      and e.unidade_id is not null
  ),
  filtrada as (
    select
      b.*,

      (
        not b.possui_ocorrencia_critica
        and b.localizacao_codigo is not null
        and coalesce(b.localizacao_ativa, false) = true
        and coalesce(b.localizacao_bloqueada, true) = false
      ) as elegivel_disponibilizacao,

      (
        case
          when b.possui_ocorrencia_critica then
            jsonb_build_array(
              jsonb_build_object(
                'codigo', 'OCORRENCIA_CRITICA',
                'mensagem', 'Existe uma ocorrência crítica pendente.'
              )
            )
          else
            '[]'::jsonb
        end
        ||
        case
          when b.localizacao_codigo is null
               or coalesce(b.localizacao_ativa, false) = false
               or coalesce(b.localizacao_bloqueada, true) = true
          then
            jsonb_build_array(
              jsonb_build_object(
                'codigo', 'LOCALIZACAO_INDISPONIVEL',
                'mensagem', 'A localização atual da encomenda está indisponível ou inválida.'
              )
            )
          else
            '[]'::jsonb
        end
      ) as bloqueios

    from base b

    where (
      p_localizacao_id is null
      or b.localizacao_atual_id = p_localizacao_id
    )

    and (
      v_busca is null

      or upper(
        coalesce(
          b.numero_encomenda::text,
          ''
        )
      ) like '%' || v_busca || '%'

      or upper(
        coalesce(
          b.destinatario_nome_snapshot,
          ''
        )
      ) like '%' || v_busca || '%'

      or upper(
        coalesce(
          b.transportadora_nome,
          ''
        )
      ) like '%' || v_busca || '%'

      or upper(
        coalesce(
          b.unidade_torre,
          ''
        )
      ) like '%' || v_busca || '%'

      or upper(
        coalesce(
          b.unidade_bloco,
          ''
        )
      ) like '%' || v_busca || '%'

      or upper(
        coalesce(
          b.unidade_numero,
          ''
        )
      ) like '%' || v_busca || '%'

      or upper(
        coalesce(
          b.localizacao_codigo,
          ''
        )
      ) like '%' || v_busca || '%'

      or upper(
        coalesce(
          b.localizacao_nome,
          ''
        )
      ) like '%' || v_busca || '%'
    )
  ),
  paginada as (
    select *
    from filtrada f
    where (
      not coalesce(p_apenas_elegiveis, false)
      or f.elegivel_disponibilizacao
    )
    order by
      f.armazenado_em asc,
      f.numero_encomenda asc nulls last,
      f.encomenda_id asc
    limit v_limite
    offset v_offset
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'encomenda_id', p.encomenda_id,
          'numero_encomenda', p.numero_encomenda,
          'status', p.status,
          'tipo_entrega', p.tipo_entrega,
          'prioridade', p.prioridade,

          'business_id', p.business_id,
          'condominio_id', p.condominio_id,
          'correlation_id', p.correlation_id,
          'pre_recebimento_id', p.pre_recebimento_id,

          'entrada_id', p.entrada_id,
          'volume_id', p.volume_id,
          'entrada_confirmada_em', p.entrada_confirmada_em,

          'unidade_id', p.unidade_id,
          'unidade_oficial_id', p.unidade_oficial_id,
          'unidade_torre', p.unidade_torre,
          'unidade_bloco', p.unidade_bloco,
          'unidade_numero', p.unidade_numero,

          'destinatario_tipo', p.destinatario_tipo,
          'destinatario_nome', p.destinatario_nome_snapshot,
          'destinatario_usuario_id', p.destinatario_usuario_id,
          'destinatario_pessoa_id', p.destinatario_pessoa_id,
          'destinatario_morador_vinculo_id', p.destinatario_morador_vinculo_id,
          'destinatario_dependente_id', p.destinatario_dependente_id,
          'destinatario_responsavel_vinculo_id', p.destinatario_responsavel_vinculo_id,

          'transportadora_id', p.transportadora_id,
          'transportadora_nome', p.transportadora_nome,

          'localizacao_id', p.localizacao_atual_id,
          'localizacao_codigo', p.localizacao_codigo,
          'localizacao_nome', p.localizacao_nome,
          'localizacao_pai_id', p.localizacao_pai_id,
          'localizacao_pai_nome', p.localizacao_pai_nome,
          'localizacao_ativa', p.localizacao_ativa,
          'localizacao_bloqueada', p.localizacao_bloqueada,

          'armazenado_em', p.armazenado_em,
          'armazenado_em_local',
            public.fn_encomendas_data_hora_local_v1(
              p.armazenado_em,
              p.condominio_id
            ),

          'pendente_ha_segundos',
            greatest(
              0,
              floor(
                extract(
                  epoch from (
                    now() - p.armazenado_em
                  )
                )
              )::bigint
            ),

          'possui_ocorrencia_critica', p.possui_ocorrencia_critica,
          'ocorrencias_criticas_abertas', p.ocorrencias_criticas_abertas,

          'elegivel_disponibilizacao', p.elegivel_disponibilizacao,
          'bloqueios', p.bloqueios
        )
        order by
          p.armazenado_em asc,
          p.numero_encomenda asc nulls last,
          p.encomenda_id asc
      ),
      '[]'::jsonb
    )
  into v_itens
  from paginada p;

  -- ========================================================================
  -- 6. RETORNO
  -- ========================================================================
  return jsonb_build_object(
    'ok', true,
    'contrato', 'rpc_encomenda_disponibilizacao_pendentes_listar_v1',
    'business_id', v_business_id,
    'condominio_id', p_condominio_id,
    'fluxo_encomendas_ativo', true,
    'armazenamento_habilitado', true,
    'ordenacao', 'ARMAZENAMENTO_FIFO',
    'itens', v_itens,
    'total', v_total,
    'limite', v_limite,
    'offset', v_offset,
    'timezone_iana',
      public.fn_encomendas_timezone_condominio_v1(
        p_condominio_id
      )
  );
end;
$function$;

revoke all
on function public.rpc_encomenda_disponibilizacao_pendentes_listar_v1(
  uuid,
  text,
  uuid,
  boolean,
  integer,
  integer
)
from public;

revoke all
on function public.rpc_encomenda_disponibilizacao_pendentes_listar_v1(
  uuid,
  text,
  uuid,
  boolean,
  integer,
  integer
)
from anon;

grant execute
on function public.rpc_encomenda_disponibilizacao_pendentes_listar_v1(
  uuid,
  text,
  uuid,
  boolean,
  integer,
  integer
)
to authenticated;

grant execute
on function public.rpc_encomenda_disponibilizacao_pendentes_listar_v1(
  uuid,
  text,
  uuid,
  boolean,
  integer,
  integer
)
to service_role;

grant execute
on function public.rpc_encomenda_disponibilizacao_pendentes_listar_v1(
  uuid,
  text,
  uuid,
  boolean,
  integer,
  integer
)
to postgres;

commit;