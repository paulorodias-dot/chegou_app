begin;

-- ============================================================================
-- GATE E3.3-E.7C.3H
-- Hardening estrutural da fila de Disponibilização
--
-- 1. Corrige o vínculo de condominio_unidades:
--      condominio_unidades.unidade_oficial_id = encomendas.unidade_oficial_id
--
-- 2. Expõe a estrutura residencial oficial:
--      torres.nome
--      torres.identificador
--      condominio_unidades.unidade
--
-- 3. Valida convergência:
--      encomendas.torre_id = unidades.torre_id = torres.id
--
-- 4. Mantém snapshots textuais apenas como dados auxiliares.
-- ============================================================================

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

      e.torre_id,

      e.unidade_id,
      e.unidade_oficial_id,

      cu.torre as unidade_torre_snapshot,
      cu.bloco as unidade_bloco_snapshot,
      cu.unidade as unidade_numero,

      t_estrutura.id as torre_id_oficial,
      t_estrutura.nome as torre_nome,
      t_estrutura.identificador as torre_identificador,

      u_oficial.torre_id as unidade_torre_id_oficial,

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

    left join public.condominio_unidades cu
      on cu.unidade_oficial_id = e.unidade_oficial_id
     and cu.condominio_id = e.condominio_id

    left join public.unidades u_oficial
      on u_oficial.id = e.unidade_oficial_id

    left join public.torres t_estrutura
      on t_estrutura.id = e.torre_id
     and t_estrutura.condominio_id = e.condominio_id

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
        and b.torre_id is not null
        and b.torre_id_oficial is not null
        and b.unidade_torre_id_oficial is not null
        and b.unidade_torre_id_oficial = b.torre_id
        and b.unidade_numero is not null
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
        ||
        case
          when b.torre_id is null
               or b.torre_id_oficial is null
               or b.unidade_torre_id_oficial is null
               or b.unidade_torre_id_oficial is distinct from b.torre_id
               or b.unidade_numero is null
          then
            jsonb_build_array(
              jsonb_build_object(
                'codigo', 'ESTRUTURA_RESIDENCIAL_INCONSISTENTE',
                'mensagem', 'A Torre/Bloco ou Unidade oficial da encomenda está inconsistente.'
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
          b.torre_nome,
          ''
        )
      ) like '%' || v_busca || '%'

      or upper(
        coalesce(
          b.torre_identificador,
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

      e.torre_id,

      e.unidade_id,
      e.unidade_oficial_id,

      cu.torre as unidade_torre_snapshot,
      cu.bloco as unidade_bloco_snapshot,
      cu.unidade as unidade_numero,

      t_estrutura.id as torre_id_oficial,
      t_estrutura.nome as torre_nome,
      t_estrutura.identificador as torre_identificador,

      u_oficial.torre_id as unidade_torre_id_oficial,

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

    left join public.condominio_unidades cu
      on cu.unidade_oficial_id = e.unidade_oficial_id
     and cu.condominio_id = e.condominio_id

    left join public.unidades u_oficial
      on u_oficial.id = e.unidade_oficial_id

    left join public.torres t_estrutura
      on t_estrutura.id = e.torre_id
     and t_estrutura.condominio_id = e.condominio_id

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
        and b.torre_id is not null
        and b.torre_id_oficial is not null
        and b.unidade_torre_id_oficial is not null
        and b.unidade_torre_id_oficial = b.torre_id
        and b.unidade_numero is not null
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
        ||
        case
          when b.torre_id is null
               or b.torre_id_oficial is null
               or b.unidade_torre_id_oficial is null
               or b.unidade_torre_id_oficial is distinct from b.torre_id
               or b.unidade_numero is null
          then
            jsonb_build_array(
              jsonb_build_object(
                'codigo', 'ESTRUTURA_RESIDENCIAL_INCONSISTENTE',
                'mensagem', 'A Torre/Bloco ou Unidade oficial da encomenda está inconsistente.'
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
          b.torre_nome,
          ''
        )
      ) like '%' || v_busca || '%'

      or upper(
        coalesce(
          b.torre_identificador,
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

          'torre_id', p.torre_id,
          'torre_nome', p.torre_nome,
          'torre_identificador', p.torre_identificador,

          'unidade_id', p.unidade_id,
          'unidade_oficial_id', p.unidade_oficial_id,
          'unidade_numero', p.unidade_numero,

          'unidade_torre_snapshot', p.unidade_torre_snapshot,
          'unidade_bloco_snapshot', p.unidade_bloco_snapshot,
          'unidade_torre_id_oficial', p.unidade_torre_id_oficial,

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
