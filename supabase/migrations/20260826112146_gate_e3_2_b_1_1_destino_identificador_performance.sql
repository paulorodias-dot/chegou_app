-- =====================================================================
-- SISTEMA CHEGOU!
-- CENTRAL DE ENCOMENDAS — ENTRADA
--
-- GATE E3.2-B.1.1
--
-- 1. Acrescenta identificação oficial da Torre ao contexto do Volume.
-- 2. Enriquece candidatos da identificação manual.
-- 3. Impede busca ampla sem termo/unidade.
-- 4. Limita resposta operacional para proteger frontend/Supabase.
--
-- Nenhuma gravação de domínio.
-- Nenhuma promoção.
-- Nenhuma criação de Encomenda.
-- =====================================================================


-- =====================================================================
-- A. CONTEXTO DO VOLUME
-- =====================================================================

create or replace function public.rpc_encomenda_volume_contexto_entrada_v1(
  p_volume_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_usuario_id uuid := auth.uid();
  v_resultado record;
begin

  if v_usuario_id is null then
    raise exception
      'Usuário não autenticado.'
      using errcode = '42501';
  end if;


  select
    v.id
      as volume_id,

    v.pre_recebimento_id,

    v.codigo_lido,
    v.codigo_normalizado,

    v.status
      as volume_status,


    pr.condominio_id,
    pr.business_id,

    pr.transportadora_id,
    pr.transportadora_nome_informado,


    ra.id
      as rastreio_aguardado_id,

    ra.status
      as rastreio_status,

    ra.unidade_id,

    ra.beneficiario_pessoa_id,
    ra.beneficiario_dependente_id,


    cu.torre,
    cu.bloco,
    cu.unidade,

    cu.unidade_oficial_id,


    t.id
      as torre_oficial_id,

    t.nome
      as torre_nome_oficial,

    t.identificador
      as torre_identificador,


    coalesce(
      nullif(
        btrim(
          p.nome_completo
        ),
        ''
      ),
      nullif(
        btrim(
          du.nome
        ),
        ''
      )
    )
      as beneficiario_nome

  into v_resultado

  from public.encomendas_volumes v

  join public.encomendas_pre_recebimentos pr
    on pr.id =
       v.pre_recebimento_id


  left join public.encomendas_rastreios_aguardados ra
    on ra.id =
       v.rastreio_aguardado_id


  left join public.condominio_unidades cu
    on cu.id =
       ra.unidade_id
   and cu.condominio_id =
       pr.condominio_id


  /*
   * Cadeia estrutural oficial:
   *
   * condominio_unidades
   *   -> unidade_oficial_id
   * unidades
   *   -> torre_id
   * torres
   *   -> nome + identificador
   */
  left join public.unidades u
    on u.id =
       cu.unidade_oficial_id
   and u.condominio_id =
       pr.condominio_id


  left join public.torres t
    on t.id =
       u.torre_id
   and t.condominio_id =
       pr.condominio_id


  left join public.pessoas p
    on p.id =
       ra.beneficiario_pessoa_id


  left join public.dependentes_unidade du
    on du.id =
       ra.beneficiario_dependente_id


  where v.id =
        p_volume_id

    and v.removido_em
        is null;


  if not found then
    raise exception
      'Volume não encontrado.'
      using errcode = 'P0002';
  end if;


  if not public.fn_encomendas_pode_operar_condominio_v1(
    v_resultado.condominio_id
  ) then
    raise exception
      'Acesso negado.'
      using errcode = '42501';
  end if;


  return jsonb_build_object(

    'ok',
      true,


    'volume_id',
      v_resultado.volume_id,

    'pre_recebimento_id',
      v_resultado.pre_recebimento_id,

    'codigo_lido',
      v_resultado.codigo_lido,

    'volume_status',
      v_resultado.volume_status,


    'rastreio_encontrado',
      v_resultado.rastreio_aguardado_id
        is not null,

    'rastreio_aguardado_id',
      v_resultado.rastreio_aguardado_id,

    'rastreio_status',
      v_resultado.rastreio_status,


    'transportadora_id',
      v_resultado.transportadora_id,

    'transportadora',
      v_resultado.transportadora_nome_informado,


    'unidade_id',
      v_resultado.unidade_id,

    'unidade_oficial_id',
      v_resultado.unidade_oficial_id,


    'torre',
      coalesce(
        nullif(
          btrim(
            v_resultado.torre_nome_oficial
          ),
          ''
        ),
        nullif(
          btrim(
            v_resultado.torre
          ),
          ''
        )
      ),

    'torre_identificador',
      v_resultado.torre_identificador,

    'torre_oficial_id',
      v_resultado.torre_oficial_id,


    'bloco',
      v_resultado.bloco,

    'unidade',
      v_resultado.unidade,


    'beneficiario_pessoa_id',
      v_resultado.beneficiario_pessoa_id,

    'beneficiario_dependente_id',
      v_resultado.beneficiario_dependente_id,

    'beneficiario_nome',
      v_resultado.beneficiario_nome,


    'preenchimento_automatico_disponivel',
      v_resultado.rastreio_aguardado_id
        is not null
  );

end;
$function$;


revoke all on function
  public.rpc_encomenda_volume_contexto_entrada_v1(
    uuid
  )
from public;


grant execute on function
  public.rpc_encomenda_volume_contexto_entrada_v1(
    uuid
  )
to authenticated;



-- =====================================================================
-- B. BUSCA DE DESTINATÁRIOS — VERSÃO PROTEGIDA
-- =====================================================================

create or replace function public.rpc_encomenda_entrada_destinatarios_buscar_v1(
  p_volume_id uuid,
  p_busca text default null,
  p_unidade_id uuid default null,
  p_limite integer default 12
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_usuario_auth_id uuid := auth.uid();

  v_volume record;

  v_busca text;
  v_limite integer;

  v_resultados jsonb;
begin

  -- ===================================================================
  -- 1. AUTENTICAÇÃO
  -- ===================================================================

  if v_usuario_auth_id is null then
    raise exception
      'Usuário não autenticado.'
      using errcode = '42501';
  end if;


  -- ===================================================================
  -- 2. VOLUME / TENANT
  -- ===================================================================

  select
    v.id
      as volume_id,

    v.pre_recebimento_id,

    v.status
      as volume_status,

    v.encomenda_id,

    pr.condominio_id,
    pr.business_id,

    pr.status
      as lote_status

  into v_volume

  from public.encomendas_volumes v

  join public.encomendas_pre_recebimentos pr
    on pr.id =
       v.pre_recebimento_id

  where v.id =
        p_volume_id

    and v.removido_em
        is null;


  if not found then
    raise exception
      'Volume não encontrado.'
      using errcode = 'P0002';
  end if;


  -- ===================================================================
  -- 3. AUTORIZAÇÃO MULTI-TENANT
  -- ===================================================================

  if not public.fn_encomendas_pode_operar_condominio_v1(
    v_volume.condominio_id
  ) then
    raise exception
      'Acesso negado.'
      using errcode = '42501';
  end if;


  -- ===================================================================
  -- 4. ELEGIBILIDADE
  -- ===================================================================

  if v_volume.encomenda_id is not null
     or v_volume.volume_status = 'PROMOVIDO'
  then
    raise exception
      'Este volume já possui Entrada concluída.'
      using errcode = '23514';
  end if;


  if v_volume.lote_status not in (
    'LOTE_CONCLUIDO',
    'PARCIALMENTE_PROCESSADO'
  ) then
    raise exception
      'O lote não está disponível para Entrada.'
      using errcode = '23514';
  end if;


  -- ===================================================================
  -- 5. NORMALIZAÇÃO
  -- ===================================================================

  v_busca :=
    nullif(
      upper(
        btrim(
          coalesce(
            p_busca,
            ''
          )
        )
      ),
      ''
    );


  /*
   * Proteção operacional:
   *
   * Sem unidade selecionada:
   * exige pelo menos 3 caracteres.
   *
   * Com unidade:
   * consulta pode ocorrer sem termo,
   * pois o universo já está fortemente restringido.
   */
  if p_unidade_id is null
     and (
       v_busca is null
       or char_length(v_busca) < 3
     )
  then
    return jsonb_build_object(
      'ok',
        true,

      'volume_id',
        v_volume.volume_id,

      'condominio_id',
        v_volume.condominio_id,

      'business_id',
        v_volume.business_id,

      'consulta_executada',
        false,

      'motivo',
        'BUSCA_MINIMA_3_CARACTERES',

      'resultados',
        '[]'::jsonb
    );
  end if;


  v_limite :=
    greatest(
      1,
      least(
        coalesce(
          p_limite,
          12
        ),
        20
      )
    );


  -- ===================================================================
  -- 6. VALIDAR UNIDADE
  -- ===================================================================

  if p_unidade_id is not null then

    if not exists (
      select 1

      from public.condominio_unidades cu

      where cu.id =
            p_unidade_id

        and cu.condominio_id =
            v_volume.condominio_id

        and cu.ativo = true
    ) then
      raise exception
        'A unidade informada não pertence ao condomínio.'
        using errcode = '42501';
    end if;

  end if;


  -- ===================================================================
  -- 7. CANDIDATOS
  -- ===================================================================

  with candidatos as (

    -- =================================================================
    -- MORADOR
    -- =================================================================

    select
      'MORADOR'::text
        as destinatario_tipo,

      muv.id
        as morador_unidade_vinculo_id,

      null::uuid
        as dependente_id,

      null::uuid
        as responsavel_morador_vinculo_id,

      p.id
        as pessoa_id,


      (
        select ucv.usuario_id

        from public.usuario_condominio_vinculos ucv

        join public.usuarios usr
          on usr.id =
             ucv.usuario_id

        where ucv.pessoa_id =
              p.id

          and ucv.condominio_id =
              v_volume.condominio_id

          and ucv.ativo = true

          and coalesce(
                usr.ativo,
                true
              ) = true

          and coalesce(
                usr.token_revogado,
                false
              ) = false

        order by
          ucv.criado_em

        limit 1
      )
        as usuario_id,


      cu.id
        as unidade_id,

      cu.unidade_oficial_id,


      coalesce(
        nullif(
          btrim(
            t.nome
          ),
          ''
        ),
        nullif(
          btrim(
            cu.torre
          ),
          ''
        )
      )
        as torre,

      t.identificador
        as torre_identificador,

      cu.bloco,
      cu.unidade,


      p.nome_completo
        as nome


    from public.morador_unidade_vinculos muv


    join public.pessoas p
      on p.id =
         muv.pessoa_id


    join public.condominio_unidades cu
      on cu.id =
         muv.unidade_id

     and cu.condominio_id =
         v_volume.condominio_id


    left join public.unidades u
      on u.id =
         cu.unidade_oficial_id

     and u.condominio_id =
         v_volume.condominio_id


    left join public.torres t
      on t.id =
         u.torre_id

     and t.condominio_id =
         v_volume.condominio_id


    where muv.condominio_id =
          v_volume.condominio_id

      and muv.ativo = true

      and cu.ativo = true

      and coalesce(
            p.ativo,
            true
          ) = true


      and (
        p_unidade_id is null
        or cu.id =
           p_unidade_id
      )


      and (
        v_busca is null

        or upper(
          coalesce(
            p.nome_completo,
            ''
          )
        ) like
          '%' || v_busca || '%'

        or upper(
          coalesce(
            t.nome,
            cu.torre,
            ''
          )
        ) like
          '%' || v_busca || '%'

        or upper(
          coalesce(
            t.identificador,
            ''
          )
        ) like
          '%' || v_busca || '%'

        or upper(
          coalesce(
            cu.bloco,
            ''
          )
        ) like
          '%' || v_busca || '%'

        or upper(
          coalesce(
            cu.unidade,
            ''
          )
        ) like
          '%' || v_busca || '%'
      )


    union all


    -- =================================================================
    -- DEPENDENTE
    -- =================================================================

    select
      'DEPENDENTE'::text
        as destinatario_tipo,

      null::uuid
        as morador_unidade_vinculo_id,

      du.id
        as dependente_id,

      du.morador_responsavel_id
        as responsavel_morador_vinculo_id,

      du.pessoa_id
        as pessoa_id,


      case
        when du.pessoa_id is null
          then null::uuid

        else (
          select ucv.usuario_id

          from public.usuario_condominio_vinculos ucv

          join public.usuarios usr
            on usr.id =
               ucv.usuario_id

          where ucv.pessoa_id =
                du.pessoa_id

            and ucv.condominio_id =
                v_volume.condominio_id

            and ucv.ativo = true

            and coalesce(
                  usr.ativo,
                  true
                ) = true

            and coalesce(
                  usr.token_revogado,
                  false
                ) = false

          order by
            ucv.criado_em

          limit 1
        )
      end
        as usuario_id,


      cu.id
        as unidade_id,

      cu.unidade_oficial_id,


      coalesce(
        nullif(
          btrim(
            t.nome
          ),
          ''
        ),
        nullif(
          btrim(
            cu.torre
          ),
          ''
        )
      )
        as torre,

      t.identificador
        as torre_identificador,

      cu.bloco,
      cu.unidade,


      coalesce(
        nullif(
          btrim(
            p_dep.nome_completo
          ),
          ''
        ),
        nullif(
          btrim(
            du.nome
          ),
          ''
        )
      )
        as nome


    from public.dependentes_unidade du


    join public.condominio_unidades cu
      on cu.id =
         du.unidade_id

     and cu.condominio_id =
         v_volume.condominio_id


    join public.morador_unidade_vinculos responsavel
      on responsavel.id =
         du.morador_responsavel_id

     and responsavel.condominio_id =
         v_volume.condominio_id

     and responsavel.unidade_id =
         du.unidade_id

     and responsavel.ativo = true


    left join public.pessoas p_dep
      on p_dep.id =
         du.pessoa_id


    left join public.unidades u
      on u.id =
         cu.unidade_oficial_id

     and u.condominio_id =
         v_volume.condominio_id


    left join public.torres t
      on t.id =
         u.torre_id

     and t.condominio_id =
         v_volume.condominio_id


    where du.condominio_id =
          v_volume.condominio_id

      and du.status =
          'ATIVO'

      and du.recebe_encomenda =
          true

      and cu.ativo =
          true


      and (
        p_unidade_id is null
        or cu.id =
           p_unidade_id
      )


      and (
        v_busca is null

        or upper(
          coalesce(
            p_dep.nome_completo,
            du.nome,
            ''
          )
        ) like
          '%' || v_busca || '%'

        or upper(
          coalesce(
            t.nome,
            cu.torre,
            ''
          )
        ) like
          '%' || v_busca || '%'

        or upper(
          coalesce(
            t.identificador,
            ''
          )
        ) like
          '%' || v_busca || '%'

        or upper(
          coalesce(
            cu.bloco,
            ''
          )
        ) like
          '%' || v_busca || '%'

        or upper(
          coalesce(
            cu.unidade,
            ''
          )
        ) like
          '%' || v_busca || '%'
      )
  ),


  ordenados as (

    select *
    from candidatos

    where nome is not null

    order by
      coalesce(
        torre,
        bloco,
        ''
      ),

      torre_identificador
        nulls last,

      unidade,

      nome,

      destinatario_tipo

    limit
      v_limite
  )


  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(

          'destinatario_tipo',
            o.destinatario_tipo,

          'morador_unidade_vinculo_id',
            o.morador_unidade_vinculo_id,

          'dependente_id',
            o.dependente_id,

          'responsavel_morador_vinculo_id',
            o.responsavel_morador_vinculo_id,

          'pessoa_id',
            o.pessoa_id,

          'usuario_id',
            o.usuario_id,


          'unidade_id',
            o.unidade_id,

          'unidade_oficial_id',
            o.unidade_oficial_id,


          'torre',
            o.torre,

          'torre_identificador',
            o.torre_identificador,

          'bloco',
            o.bloco,

          'unidade',
            o.unidade,


          'nome',
            o.nome
        )
      ),
      '[]'::jsonb
    )

  into v_resultados

  from ordenados o;


  return jsonb_build_object(

    'ok',
      true,

    'volume_id',
      v_volume.volume_id,

    'condominio_id',
      v_volume.condominio_id,

    'business_id',
      v_volume.business_id,

    'consulta_executada',
      true,

    'limite',
      v_limite,

    'resultados',
      v_resultados
  );

end;
$function$;


revoke all on function
  public.rpc_encomenda_entrada_destinatarios_buscar_v1(
    uuid,
    text,
    uuid,
    integer
  )
from public;


grant execute on function
  public.rpc_encomenda_entrada_destinatarios_buscar_v1(
    uuid,
    text,
    uuid,
    integer
  )
to authenticated;