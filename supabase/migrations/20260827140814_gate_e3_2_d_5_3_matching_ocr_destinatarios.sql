-- =====================================================================
-- SISTEMA CHEGOU!
-- CENTRAL DE ENCOMENDAS — ENTRADA OFICIAL
--
-- GATE E3.2-D.5.3-B
-- MATCHING ASSISTIDO POR OCR DA ETIQUETA
--
-- PRINCÍPIOS:
-- - OCR produz somente pistas.
-- - identidade continua backend-driven.
-- - auth.uid() obrigatório.
-- - multi-tenant obrigatório.
-- - Volume determina o condomínio.
-- - somente vínculos elegíveis.
-- - operador continua escolhendo o destinatário.
-- - nenhuma Entrada é confirmada por esta RPC.
-- =====================================================================

create or replace function public.rpc_encomenda_entrada_destinatarios_ocr_buscar_v1(
  p_volume_id uuid,
  p_nome text default null,
  p_torre_bloco text default null,
  p_unidade text default null,
  p_limite integer default 8
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$

declare

  v_usuario_auth_id uuid :=
    auth.uid();

  v_volume record;

  v_nome text;
  v_torre_bloco text;
  v_unidade text;

  v_nome_norm text;
  v_torre_bloco_norm text;
  v_unidade_norm text;

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
  -- 4. ELEGIBILIDADE DO VOLUME
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
  -- 5. NORMALIZAÇÃO DAS PISTAS
  -- ===================================================================

  v_nome :=
    nullif(
      btrim(
        coalesce(
          p_nome,
          ''
        )
      ),
      ''
    );


  v_torre_bloco :=
    nullif(
      btrim(
        coalesce(
          p_torre_bloco,
          ''
        )
      ),
      ''
    );


  v_unidade :=
    nullif(
      btrim(
        coalesce(
          p_unidade,
          ''
        )
      ),
      ''
    );


  /*
   * A normalização remove ruído comum do OCR.
   *
   * Não fazemos inferência de identidade.
   */

  v_nome_norm :=
    nullif(
      regexp_replace(
        upper(
          coalesce(
            v_nome,
            ''
          )
        ),
        '[^A-ZÀ-Ý0-9]',
        '',
        'g'
      ),
      ''
    );


  v_torre_bloco_norm :=
    nullif(
      regexp_replace(
        upper(
          coalesce(
            v_torre_bloco,
            ''
          )
        ),
        '[^A-ZÀ-Ý0-9]',
        '',
        'g'
      ),
      ''
    );


  v_unidade_norm :=
    nullif(
      regexp_replace(
        upper(
          coalesce(
            v_unidade,
            ''
          )
        ),
        '[^A-Z0-9]',
        '',
        'g'
      ),
      ''
    );


  -- ===================================================================
  -- 6. PRECISA EXISTIR PELO MENOS UMA PISTA
  -- ===================================================================

  if v_nome_norm is null
     and v_torre_bloco_norm is null
     and v_unidade_norm is null
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
        'SEM_PISTAS_OCR',

      'resultados',
        '[]'::jsonb
    );

  end if;


  -- ===================================================================
  -- 7. LIMITE
  -- ===================================================================

  v_limite :=
    greatest(
      1,
      least(
        coalesce(
          p_limite,
          8
        ),
        12
      )
    );


  -- ===================================================================
  -- 8. CANDIDATOS AUTORIZADOS
  -- ===================================================================

  with candidatos_base as (

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
        select
          ucv.usuario_id

        from public.usuario_condominio_vinculos ucv

        join public.usuarios usr
          on usr.id =
             ucv.usuario_id

        where ucv.pessoa_id =
              p.id

          and ucv.condominio_id =
              v_volume.condominio_id

          and ucv.ativo =
              true

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

      and muv.ativo =
          true

      and cu.ativo =
          true

      and coalesce(
            p.ativo,
            true
          ) = true


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

          select
            ucv.usuario_id

          from public.usuario_condominio_vinculos ucv

          join public.usuarios usr
            on usr.id =
               ucv.usuario_id

          where ucv.pessoa_id =
                du.pessoa_id

            and ucv.condominio_id =
                v_volume.condominio_id

            and ucv.ativo =
                true

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

     and responsavel.ativo =
         true

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
  ),


  normalizados as (

    select

      c.*,


      nullif(
        regexp_replace(
          upper(
            coalesce(
              c.nome,
              ''
            )
          ),
          '[^A-ZÀ-Ý0-9]',
          '',
          'g'
        ),
        ''
      )
        as nome_norm,


      nullif(
        regexp_replace(
          upper(
            coalesce(
              c.torre,
              ''
            ) ||
            coalesce(
              c.torre_identificador,
              ''
            ) ||
            coalesce(
              c.bloco,
              ''
            )
          ),
          '[^A-ZÀ-Ý0-9]',
          '',
          'g'
        ),
        ''
      )
        as destino_norm,


      nullif(
        regexp_replace(
          upper(
            coalesce(
              c.unidade,
              ''
            )
          ),
          '[^A-Z0-9]',
          '',
          'g'
        ),
        ''
      )
        as unidade_norm


    from candidatos_base c

    where c.nome is not null
  ),


  pontuados as (

    select

      n.*,


      -- ===============================================================
      -- NOME
      --
      -- Exato...................... 60
      -- OCR contém nome candidato. 48
      -- Candidato contém OCR....... 42
      -- ===============================================================

      case

        when v_nome_norm is null
          then 0

        when n.nome_norm =
             v_nome_norm
          then 60

        when char_length(
               v_nome_norm
             ) >= 5

         and v_nome_norm like
             '%' ||
             n.nome_norm ||
             '%'
          then 48

        when char_length(
               n.nome_norm
             ) >= 5

         and n.nome_norm like
             '%' ||
             v_nome_norm ||
             '%'
          then 42

        else 0

      end
        as score_nome,


      -- ===============================================================
      -- TORRE / BLOCO
      -- ===============================================================

      case

        when v_torre_bloco_norm is null
          then 0

        when n.destino_norm =
             v_torre_bloco_norm
          then 30

        when n.destino_norm like
             '%' ||
             v_torre_bloco_norm ||
             '%'
          then 24

        when v_torre_bloco_norm like
             '%' ||
             n.destino_norm ||
             '%'
          then 20

        else 0

      end
        as score_destino,


      -- ===============================================================
      -- UNIDADE
      -- Unidade exata tem peso operacional alto.
      -- ===============================================================

      case

        when v_unidade_norm is null
          then 0

        when n.unidade_norm =
             v_unidade_norm
          then 50

        else 0

      end
        as score_unidade


    from normalizados n
  ),


  classificados as (

    select

      p.*,

      (
        p.score_nome +
        p.score_destino +
        p.score_unidade
      )
        as score_total,


      (
        p.score_nome > 0
      )
        as nome_compativel,


      (
        p.score_destino > 0
      )
        as destino_compativel,


      (
        p.score_unidade > 0
      )
        as unidade_compativel


    from pontuados p
  ),


  elegiveis as (

    select

      c.*,


      /*
       * Não retornar toda a base do condomínio.
       *
       * O candidato precisa possuir ao menos
       * uma correspondência real com as pistas.
       */

      case

        when c.score_total >= 115
          then 'MUITO_ALTA'

        when c.score_total >= 70
          then 'ALTA'

        when c.score_total >= 40
          then 'POSSIVEL'

        else 'BAIXA'

      end
        as correspondencia


    from classificados c

    where c.score_total > 0


    /*
     * Proteção adicional:
     *
     * Se OCR encontrou Unidade, candidatos
     * de outra unidade só permanecem se o
     * Nome tiver correspondência forte.
     *
     * Assim evitamos "Unidade 05" gerar dezenas
     * de candidatos irrelevantes.
     */

      and (

        v_unidade_norm is null

        or c.unidade_compativel = true

        or c.score_nome >= 42

      )
  ),


  ordenados as (

    select *

    from elegiveis

    order by

      score_total desc,

      unidade_compativel desc,

      destino_compativel desc,

      nome_compativel desc,

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
            o.nome,


          /*
           * score_total fica disponível para
           * auditoria/debug do contrato.
           *
           * A interface não deve mostrá-lo.
           */

          'score_total',
            o.score_total,


          'correspondencia',
            o.correspondencia,


          'criterios',
            jsonb_build_object(

              'nome',
                o.nome_compativel,

              'torre_bloco',
                o.destino_compativel,

              'unidade',
                o.unidade_compativel
            )
        )

        order by
          o.score_total desc,
          o.nome
      ),

      '[]'::jsonb
    )

  into v_resultados

  from ordenados o;


  -- ===================================================================
  -- 9. RESPOSTA
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

    'consulta_executada',
      true,

    'origem',
      'OCR_ETIQUETA',

    'pistas',
      jsonb_build_object(

        'nome',
          v_nome,

        'torre_bloco',
          v_torre_bloco,

        'unidade',
          v_unidade
      ),

    'limite',
      v_limite,

    'resultados',
      v_resultados
  );

end;
$function$;


-- =====================================================================
-- PERMISSÕES
-- =====================================================================

revoke all on function
  public.rpc_encomenda_entrada_destinatarios_ocr_buscar_v1(
    uuid,
    text,
    text,
    text,
    integer
  )
from public;


revoke all on function
  public.rpc_encomenda_entrada_destinatarios_ocr_buscar_v1(
    uuid,
    text,
    text,
    text,
    integer
  )
from anon;


grant execute on function
  public.rpc_encomenda_entrada_destinatarios_ocr_buscar_v1(
    uuid,
    text,
    text,
    text,
    integer
  )
to authenticated;


grant execute on function
  public.rpc_encomenda_entrada_destinatarios_ocr_buscar_v1(
    uuid,
    text,
    text,
    text,
    integer
  )
to service_role;


comment on function
  public.rpc_encomenda_entrada_destinatarios_ocr_buscar_v1(
    uuid,
    text,
    text,
    text,
    integer
  )
is
  'Sistema Chegou! — Entrada Oficial — matching assistido de destinatários a partir de pistas OCR. OCR não define identidade; retorna somente candidatos canônicos autorizados do tenant do Volume.';