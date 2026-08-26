-- =====================================================================
-- SISTEMA CHEGOU!
-- CENTRAL DE ENCOMENDAS — ENTRADA OFICIAL
--
-- GATE E3.2-B
-- BUSCA AUTORIZADA DE DESTINATÁRIOS PARA IDENTIFICAÇÃO MANUAL
--
-- FINALIDADE:
-- - apoiar volumes sem Rastreio Aguardado;
-- - pesquisar somente residentes elegíveis do condomínio do Volume;
-- - preservar isolamento multi-tenant;
-- - não gravar nenhuma informação;
-- - não concluir matching;
-- - não promover Volume;
-- - não criar Encomenda.
--
-- AUTORIDADE:
-- Volume -> Lote -> condomínio
-- auth.uid() -> permissão operacional
--
-- O frontend NÃO informa condominio_id.
-- =====================================================================

create or replace function public.rpc_encomenda_entrada_destinatarios_buscar_v1(
  p_volume_id uuid,
  p_busca text default null,
  p_unidade_id uuid default null,
  p_limite integer default 30
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
  -- 2. RESOLVER O VOLUME E O TENANT PELO BACKEND
  --
  -- O frontend não escolhe o condomínio desta consulta.
  -- ===================================================================

  select
    v.id as volume_id,
    v.pre_recebimento_id,
    v.status as volume_status,
    v.encomenda_id,

    pr.condominio_id,
    pr.business_id,
    pr.status as lote_status

  into v_volume

  from public.encomendas_volumes v

  join public.encomendas_pre_recebimentos pr
    on pr.id = v.pre_recebimento_id

  where v.id = p_volume_id
    and v.removido_em is null;

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
  -- 4. ELEGIBILIDADE OPERACIONAL
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

  v_limite :=
    greatest(
      1,
      least(
        coalesce(
          p_limite,
          30
        ),
        50
      )
    );


  -- ===================================================================
  -- 6. UNIDADE INFORMADA, QUANDO HOUVER
  -- ===================================================================

  if p_unidade_id is not null then

    if not exists (
      select 1
      from public.condominio_unidades cu
      where cu.id = p_unidade_id
        and cu.condominio_id =
            v_volume.condominio_id
    ) then
      raise exception
        'A unidade informada não pertence ao condomínio.'
        using errcode = '42501';
    end if;

  end if;


  -- ===================================================================
  -- 7. CANDIDATOS
  --
  -- MORADOR:
  -- - vínculo ativo;
  -- - pessoa ativa;
  -- - mesmo condomínio.
  --
  -- DEPENDENTE:
  -- - status ATIVO;
  -- - recebe_encomenda = true;
  -- - mesmo condomínio;
  -- - responsável ativo na mesma unidade.
  -- ===================================================================

  with candidatos as (

    -- -----------------------------------------------------------------
    -- MORADORES
    -- -----------------------------------------------------------------

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
        join public.usuarios u
          on u.id = ucv.usuario_id
        where ucv.pessoa_id = p.id
          and ucv.condominio_id =
              v_volume.condominio_id
          and ucv.ativo = true
          and coalesce(u.ativo, true) = true
          and coalesce(u.token_revogado, false) = false
        order by ucv.criado_em
        limit 1
      )
        as usuario_id,

      cu.id
        as unidade_id,

      cu.unidade_oficial_id,

      cu.torre,
      cu.bloco,
      cu.unidade,

      p.nome_completo
        as nome,

      case
        when coalesce(
          nullif(btrim(cu.torre), ''),
          ''
        ) <> ''
        then
          'Torre ' || btrim(cu.torre)

        when coalesce(
          nullif(btrim(cu.bloco), ''),
          ''
        ) <> ''
        then
          'Bloco ' || btrim(cu.bloco)

        else
          'Sem bloco/torre'
      end
        as estrutura_label

    from public.morador_unidade_vinculos muv

    join public.pessoas p
      on p.id = muv.pessoa_id

    join public.condominio_unidades cu
      on cu.id = muv.unidade_id
     and cu.condominio_id =
         v_volume.condominio_id

    where muv.condominio_id =
          v_volume.condominio_id

      and muv.ativo = true

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
            cu.torre,
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


    -- -----------------------------------------------------------------
    -- DEPENDENTES
    -- -----------------------------------------------------------------

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
          join public.usuarios u
            on u.id = ucv.usuario_id
          where ucv.pessoa_id =
                du.pessoa_id
            and ucv.condominio_id =
                v_volume.condominio_id
            and ucv.ativo = true
            and coalesce(
                  u.ativo,
                  true
                ) = true
            and coalesce(
                  u.token_revogado,
                  false
                ) = false
          order by ucv.criado_em
          limit 1
        )
      end
        as usuario_id,

      cu.id
        as unidade_id,

      cu.unidade_oficial_id,

      cu.torre,
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
        as nome,

      case
        when coalesce(
          nullif(btrim(cu.torre), ''),
          ''
        ) <> ''
        then
          'Torre ' || btrim(cu.torre)

        when coalesce(
          nullif(btrim(cu.bloco), ''),
          ''
        ) <> ''
        then
          'Bloco ' || btrim(cu.bloco)

        else
          'Sem bloco/torre'
      end
        as estrutura_label

    from public.dependentes_unidade du

    join public.condominio_unidades cu
      on cu.id = du.unidade_id
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
      on p_dep.id = du.pessoa_id

    where du.condominio_id =
          v_volume.condominio_id

      and du.status = 'ATIVO'

      and du.recebe_encomenda = true

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
            cu.torre,
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
      estrutura_label,
      unidade,
      nome,
      destinatario_tipo
    limit v_limite
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

          'estrutura_label',
            o.estrutura_label,

          'torre',
            o.torre,

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


  -- ===================================================================
  -- 8. RETORNO
  -- ===================================================================

  return jsonb_build_object(
    'ok',
      true,

    'volume_id',
      v_volume.volume_id,

    'condominio_id',
      v_volume.condominio_id,

    'business_id',
      v_volume.business_id,

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


comment on function
  public.rpc_encomenda_entrada_destinatarios_buscar_v1(
    uuid,
    text,
    uuid,
    integer
  )
is
'Entrada Oficial: busca somente leitura de Moradores e Dependentes elegíveis para identificação manual de um Volume. O tenant é resolvido pelo Volume no backend; não aceita condominio_id do frontend.';