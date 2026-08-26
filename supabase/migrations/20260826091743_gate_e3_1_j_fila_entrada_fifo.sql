-- =====================================================================
-- SISTEMA CHEGOU!
-- GATE E3.1-J
-- FILA DE ENTRADA — FIFO AUTORITATIVO
--
-- Regra:
-- o lote elegível mais antigo deve aparecer primeiro.
--
-- MULTI-TENANT:
-- nenhuma regra de autorização ou isolamento é alterada.
-- =====================================================================

create or replace function public.rpc_encomenda_pre_recebimentos_listar_v2(
  p_condominio_id uuid,
  p_busca text default null::text,
  p_status text default null::text,
  p_transportadora_id uuid default null::uuid,
  p_apenas_meus_processos boolean default false,
  p_data_inicio timestamp with time zone default null::timestamp with time zone,
  p_data_fim timestamp with time zone default null::timestamp with time zone,
  p_limite integer default 30,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_usuario_id uuid := auth.uid();

  v_busca text;
  v_busca_numero bigint;

  v_total bigint;
  v_itens jsonb;

  v_limite integer;
  v_offset integer;

  v_timezone text;
begin
  -- ==========================================================
  -- 1. AUTENTICAÇÃO / AUTORIZAÇÃO
  -- ==========================================================

  if v_usuario_id is null then
    raise exception
      'Usuário não autenticado.';
  end if;

  if not public.fn_encomendas_pode_operar_condominio_v1(
    p_condominio_id
  ) then
    raise exception
      'Acesso negado.';
  end if;

  v_timezone :=
    public.fn_encomendas_timezone_condominio_v1(
      p_condominio_id
    );

  -- ==========================================================
  -- 2. NORMALIZAÇÃO
  -- ==========================================================

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

  v_busca_numero :=
    case
      when v_busca is null then
        null

      when regexp_replace(
        v_busca,
        '^LOTE-',
        ''
      ) ~ '^[0-9]+$'
      then
        regexp_replace(
          v_busca,
          '^LOTE-',
          ''
        )::bigint

      else
        null
    end;

  v_limite :=
    greatest(
      1,
      least(
        coalesce(
          p_limite,
          30
        ),
        100
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

  -- ==========================================================
  -- 3. TOTAL DA FILA
  -- ==========================================================

  select
    count(*)::bigint
  into
    v_total

  from public.encomendas_pre_recebimentos pr

  left join public.transportadoras t
    on t.id =
       pr.transportadora_id

  where pr.condominio_id =
        p_condominio_id

    and pr.status in (
      'LOTE_CONCLUIDO',
      'PARCIALMENTE_PROCESSADO'
    )

    and exists (
      select 1
      from public.encomendas_volumes v
      where v.pre_recebimento_id =
            pr.id
        and v.condominio_id =
            p_condominio_id
        and v.removido_em is null
        and v.encomenda_id is null
        and v.status in (
          'AGUARDANDO_ENTRADA',
          'EM_IDENTIFICACAO',
          'PENDENTE_IDENTIFICACAO'
        )
    )

    and (
      p_status is null

      or (
        p_status =
          'AGUARDANDO_ENTRADA'

        and exists (
          select 1
          from public.encomendas_volumes vs
          where vs.pre_recebimento_id =
                pr.id
            and vs.removido_em is null
            and vs.encomenda_id is null
            and vs.status in (
              'AGUARDANDO_ENTRADA',
              'EM_IDENTIFICACAO',
              'PENDENTE_IDENTIFICACAO'
            )
        )
      )

      or (
        p_status =
          'COM_DIVERGENCIA'

        and pr.possui_divergencia_quantidade =
            true
      )

      or (
        p_status =
          'COM_AVARIA'

        and exists (
          select 1
          from public.encomendas_volumes vs
          where vs.pre_recebimento_id =
                pr.id
            and vs.removido_em is null
            and exists (
              select 1
              from public.encomendas_ocorrencias os
              where os.pre_recebimento_id =
                    pr.id
                and os.volume_id =
                    vs.id
                and os.status in (
                  'ABERTA',
                  'EM_ANALISE',
                  'RESOLVIDA'
                )
                and os.tipo_ocorrencia in (
                  'AVARIA_LEVE',
                  'AVARIA_MODERADA',
                  'AVARIA_GRAVE',
                  'EMBALAGEM_ABERTA',
                  'EMBALAGEM_VIOLADA',
                  'EMBALAGEM_MOLHADA',
                  'EMBALAGEM_AMASSADA'
                )
            )
        )
      )

      or (
        p_status =
          'ENTRADA_PARCIAL'

        and exists (
          select 1
          from public.encomendas_volumes vp
          where vp.pre_recebimento_id =
                pr.id
            and vp.removido_em is null
            and vp.encomenda_id is not null
        )

        and exists (
          select 1
          from public.encomendas_volumes va
          where va.pre_recebimento_id =
                pr.id
            and va.removido_em is null
            and va.encomenda_id is null
            and va.status in (
              'AGUARDANDO_ENTRADA',
              'EM_IDENTIFICACAO',
              'PENDENTE_IDENTIFICACAO'
            )
        )
      )

      or (
        p_status not in (
          'AGUARDANDO_ENTRADA',
          'COM_DIVERGENCIA',
          'COM_AVARIA',
          'ENTRADA_PARCIAL'
        )

        and pr.status =
            p_status
      )
    )

    and (
      p_transportadora_id is null
      or pr.transportadora_id =
         p_transportadora_id
    )

    and (
      not coalesce(
        p_apenas_meus_processos,
        false
      )
      or pr.operador_usuario_id =
         v_usuario_id
    )

    and (
      p_data_inicio is null
      or pr.criado_em >=
         p_data_inicio
    )

    and (
      p_data_fim is null
      or pr.criado_em <=
         p_data_fim
    )

    and (
      v_busca is null

      or upper(
        coalesce(
          pr.referencia_lote,
          ''
        )
      ) like
        '%' || v_busca || '%'

      or (
        v_busca_numero is not null
        and pr.numero_lote =
            v_busca_numero
      )

      or upper(
        coalesce(
          pr.destinatario_nome_informado,
          ''
        )
      ) like
        '%' || v_busca || '%'

      or upper(
        coalesce(
          pr.codigo_rastreio_informado,
          ''
        )
      ) like
        '%' || v_busca || '%'

      or upper(
        coalesce(
          pr.transportadora_nome_informado,
          t.nome_fantasia,
          ''
        )
      ) like
        '%' || v_busca || '%'

      or upper(
        coalesce(
          pr.entregador_nome,
          ''
        )
      ) like
        '%' || v_busca || '%'

      or exists (
        select 1
        from public.encomendas_volumes vb
        where vb.pre_recebimento_id =
              pr.id
          and (
            upper(
              coalesce(
                vb.codigo_lido,
                ''
              )
            ) like
              '%' || v_busca || '%'

            or upper(
              coalesce(
                vb.codigo_normalizado,
                ''
              )
            ) like
              '%' || v_busca || '%'
          )
      )
    );

  -- ==========================================================
  -- 4. LOTES PAGINADOS — FIFO
  -- ==========================================================

  select
    coalesce(
      jsonb_agg(
        to_jsonb(x)
        order by
          x.finalizado_em asc nulls last,
          x.criado_em asc,
          x.numero_lote asc
      ),
      '[]'::jsonb
    )
  into
    v_itens

  from (
    select
      pr.id
        as pre_recebimento_id,

      pr.numero_lote,
      pr.referencia_lote,
      pr.correlation_id,
      pr.business_id,
      pr.condominio_id,

      pr.transportadora_id,

      coalesce(
        nullif(
          btrim(
            pr.transportadora_nome_informado
          ),
          ''
        ),
        t.nome_fantasia
      )
        as transportadora_nome,

      pr.entregador_nome,
      pr.entregador_empresa,
      pr.operador_usuario_id,

      op.username
        as operador_username,

      pr.status,
      pr.decisao_recebimento,

      pr.quantidade_informada,
      pr.quantidade_bipada,
      pr.quantidade_conferida,

      pr.possui_divergencia_quantidade,
      pr.justificativa_divergencia,

      pr.finalizado_em,
      pr.criado_em,
      pr.atualizado_em,

      public.fn_encomendas_data_hora_local_v1(
        pr.criado_em,
        pr.condominio_id
      )
        as criado_em_local,

      case
        when pr.finalizado_em is null
          then null

        else
          public.fn_encomendas_data_hora_local_v1(
            pr.finalizado_em,
            pr.condominio_id
          )
      end
        as finalizado_em_local,

      (
        select count(*)::integer
        from public.encomendas_volumes v
        where v.pre_recebimento_id =
              pr.id
          and v.removido_em is null
          and v.status <>
              'REMOVIDO'
      )
        as volumes_total,

      (
        select count(*)::integer
        from public.encomendas_volumes v
        where v.pre_recebimento_id =
              pr.id
          and v.removido_em is null
          and v.encomenda_id is null
          and v.status in (
            'AGUARDANDO_ENTRADA',
            'EM_IDENTIFICACAO',
            'PENDENTE_IDENTIFICACAO'
          )
      )
        as volumes_aguardando_entrada,

      (
        select count(*)::integer
        from public.encomendas_volumes v
        where v.pre_recebimento_id =
              pr.id
          and v.encomenda_id is not null
      )
        as volumes_com_entrada_oficial,

      (
        select
          count(
            distinct v.id
          )::integer
        from public.encomendas_volumes v
        where v.pre_recebimento_id =
              pr.id
          and v.removido_em is null
          and exists (
            select 1
            from public.encomendas_ocorrencias o
            where o.pre_recebimento_id =
                  pr.id
              and o.volume_id =
                  v.id
              and o.status in (
                'ABERTA',
                'EM_ANALISE',
                'RESOLVIDA'
              )
              and o.tipo_ocorrencia in (
                'AVARIA_LEVE',
                'AVARIA_MODERADA',
                'AVARIA_GRAVE',
                'EMBALAGEM_ABERTA',
                'EMBALAGEM_VIOLADA',
                'EMBALAGEM_MOLHADA',
                'EMBALAGEM_AMASSADA'
              )
          )
      )
        as volumes_com_avaria,

      (
        select count(*)::integer
        from public.encomendas_ocorrencias o
        where o.pre_recebimento_id =
              pr.id
          and o.status in (
            'ABERTA',
            'EM_ANALISE'
          )
      )
        as ocorrencias_abertas,

      coalesce(
        (
          select
            jsonb_agg(
              jsonb_build_object(
                'volume_id',
                  v.id,

                'numero_volume',
                  v.numero_volume,

                'codigo_lido',
                  v.codigo_lido,

                'codigo_normalizado',
                  v.codigo_normalizado,

                'status',
                  v.status,

                'entrada_oficial',
                  jsonb_build_object(
                    'realizada',
                      v.encomenda_id is not null,

                    'encomenda_id',
                      v.encomenda_id,

                    'promovido_em',
                      v.promovido_em,

                    'promovido_em_local',
                      case
                        when v.promovido_em is null
                          then null
                        else
                          public.fn_encomendas_data_hora_local_v1(
                            v.promovido_em,
                            v.condominio_id
                          )
                      end
                  ),

                'rastreio_aguardado',
                  ra.id is not null,

                'rastreio_aguardado_id',
                  ra.id,

                'rastreio_status',
                  ra.status,

                'identificacao_status',
                  case
                    when ra.id is not null
                         and (
                           ra.unidade_id is not null
                           or ra.beneficiario_pessoa_id is not null
                           or ra.beneficiario_dependente_id is not null
                         )
                      then 'RASTREIO_RECONHECIDO'

                    when v.status =
                         'PENDENTE_IDENTIFICACAO'
                      then 'AGUARDANDO_IDENTIFICACAO'

                    when v.status =
                         'EM_IDENTIFICACAO'
                      then 'EM_IDENTIFICACAO'

                    else 'NAO_IDENTIFICADO'
                  end,

                'identificacao',
                  jsonb_build_object(
                    'unidade_id',
                      ra.unidade_id,

                    'torre',
                      cu.torre,

                    'bloco',
                      cu.bloco,

                    'unidade',
                      cu.unidade,

                    'beneficiario_pessoa_id',
                      ra.beneficiario_pessoa_id,

                    'beneficiario_dependente_id',
                      ra.beneficiario_dependente_id,

                    'beneficiario_nome',
                      coalesce(
                        p.nome_completo,
                        du.nome
                      )
                  ),

                'possui_avaria',
                  exists (
                    select 1
                    from public.encomendas_ocorrencias o
                    where o.pre_recebimento_id =
                          pr.id
                      and o.volume_id =
                          v.id
                      and o.status in (
                        'ABERTA',
                        'EM_ANALISE',
                        'RESOLVIDA'
                      )
                      and o.tipo_ocorrencia in (
                        'AVARIA_LEVE',
                        'AVARIA_MODERADA',
                        'AVARIA_GRAVE',
                        'EMBALAGEM_ABERTA',
                        'EMBALAGEM_VIOLADA',
                        'EMBALAGEM_MOLHADA',
                        'EMBALAGEM_AMASSADA'
                      )
                  ),

                'avarias',
                  coalesce(
                    (
                      select
                        jsonb_agg(
                          jsonb_build_object(
                            'ocorrencia_id',
                              o.id,

                            'tipo_ocorrencia',
                              o.tipo_ocorrencia,

                            'gravidade',
                              o.gravidade,

                            'status',
                              o.status,

                            'descricao',
                              o.descricao,

                            'decisao_operacional',
                              o.decisao_operacional,

                            'requer_foto',
                              o.requer_foto,

                            'requer_revisao',
                              o.requer_revisao
                          )
                          order by o.criado_em
                        )
                      from public.encomendas_ocorrencias o
                      where o.pre_recebimento_id =
                            pr.id
                        and o.volume_id =
                            v.id
                        and o.status in (
                          'ABERTA',
                          'EM_ANALISE',
                          'RESOLVIDA'
                        )
                        and o.tipo_ocorrencia in (
                          'AVARIA_LEVE',
                          'AVARIA_MODERADA',
                          'AVARIA_GRAVE',
                          'EMBALAGEM_ABERTA',
                          'EMBALAGEM_VIOLADA',
                          'EMBALAGEM_MOLHADA',
                          'EMBALAGEM_AMASSADA'
                        )
                    ),
                    '[]'::jsonb
                  ),

                'foto_avaria_pendente',
                  (
                    exists (
                      select 1
                      from public.encomendas_ocorrencias o
                      where o.pre_recebimento_id =
                            pr.id
                        and o.volume_id =
                            v.id
                        and o.status in (
                          'ABERTA',
                          'EM_ANALISE',
                          'RESOLVIDA'
                        )
                        and o.tipo_ocorrencia in (
                          'AVARIA_LEVE',
                          'AVARIA_MODERADA',
                          'AVARIA_GRAVE',
                          'EMBALAGEM_ABERTA',
                          'EMBALAGEM_VIOLADA',
                          'EMBALAGEM_MOLHADA',
                          'EMBALAGEM_AMASSADA'
                        )
                    )

                    and not exists (
                      select 1
                      from public.encomendas_evidencias ev
                      where ev.condominio_id =
                            pr.condominio_id
                        and ev.pre_recebimento_id =
                            pr.id
                        and ev.volume_id =
                            v.id
                        and ev.excluido_em is null
                        and ev.tipo_evidencia =
                            'FOTO_AVARIA'
                    )
                  )
              )

              order by
                v.numero_volume nulls last,
                v.criado_em
            )

          from public.encomendas_volumes v

          left join
            public.encomendas_rastreios_aguardados ra
            on ra.id =
               v.rastreio_aguardado_id

          left join public.condominio_unidades cu
            on cu.id =
               ra.unidade_id

          left join public.pessoas p
            on p.id =
               ra.beneficiario_pessoa_id

          left join public.dependentes_unidade du
            on du.id =
               ra.beneficiario_dependente_id

          where v.pre_recebimento_id =
                pr.id

            and v.removido_em is null

            and v.status <>
                'REMOVIDO'
        ),
        '[]'::jsonb
      )
        as volumes

    from public.encomendas_pre_recebimentos pr

    left join public.transportadoras t
      on t.id =
         pr.transportadora_id

    left join public.usuarios op
      on op.id =
         pr.operador_usuario_id

    where pr.condominio_id =
          p_condominio_id

      and pr.status in (
        'LOTE_CONCLUIDO',
        'PARCIALMENTE_PROCESSADO'
      )

      and exists (
        select 1
        from public.encomendas_volumes ve
        where ve.pre_recebimento_id =
              pr.id
          and ve.condominio_id =
              p_condominio_id
          and ve.removido_em is null
          and ve.encomenda_id is null
          and ve.status in (
            'AGUARDANDO_ENTRADA',
            'EM_IDENTIFICACAO',
            'PENDENTE_IDENTIFICACAO'
          )
      )

      and (
        p_status is null

        or (
          p_status =
            'AGUARDANDO_ENTRADA'

          and exists (
            select 1
            from public.encomendas_volumes vs
            where vs.pre_recebimento_id =
                  pr.id
              and vs.removido_em is null
              and vs.encomenda_id is null
              and vs.status in (
                'AGUARDANDO_ENTRADA',
                'EM_IDENTIFICACAO',
                'PENDENTE_IDENTIFICACAO'
              )
          )
        )

        or (
          p_status =
            'COM_DIVERGENCIA'

          and pr.possui_divergencia_quantidade =
              true
        )

        or (
          p_status =
            'COM_AVARIA'

          and exists (
            select 1
            from public.encomendas_volumes vs
            where vs.pre_recebimento_id =
                  pr.id
              and vs.removido_em is null
              and exists (
                select 1
                from public.encomendas_ocorrencias os
                where os.pre_recebimento_id =
                      pr.id
                  and os.volume_id =
                      vs.id
                  and os.status in (
                    'ABERTA',
                    'EM_ANALISE',
                    'RESOLVIDA'
                  )
                  and os.tipo_ocorrencia in (
                    'AVARIA_LEVE',
                    'AVARIA_MODERADA',
                    'AVARIA_GRAVE',
                    'EMBALAGEM_ABERTA',
                    'EMBALAGEM_VIOLADA',
                    'EMBALAGEM_MOLHADA',
                    'EMBALAGEM_AMASSADA'
                  )
              )
          )
        )

        or (
          p_status =
            'ENTRADA_PARCIAL'

          and exists (
            select 1
            from public.encomendas_volumes vp
            where vp.pre_recebimento_id =
                  pr.id
              and vp.removido_em is null
              and vp.encomenda_id is not null
          )

          and exists (
            select 1
            from public.encomendas_volumes va
            where va.pre_recebimento_id =
                  pr.id
              and va.removido_em is null
              and va.encomenda_id is null
              and va.status in (
                'AGUARDANDO_ENTRADA',
                'EM_IDENTIFICACAO',
                'PENDENTE_IDENTIFICACAO'
              )
          )
        )

        or (
          p_status not in (
            'AGUARDANDO_ENTRADA',
            'COM_DIVERGENCIA',
            'COM_AVARIA',
            'ENTRADA_PARCIAL'
          )

          and pr.status =
              p_status
        )
      )

      and (
        p_transportadora_id is null
        or pr.transportadora_id =
           p_transportadora_id
      )

      and (
        not coalesce(
          p_apenas_meus_processos,
          false
        )
        or pr.operador_usuario_id =
           v_usuario_id
      )

      and (
        p_data_inicio is null
        or pr.criado_em >=
           p_data_inicio
      )

      and (
        p_data_fim is null
        or pr.criado_em <=
           p_data_fim
      )

      and (
        v_busca is null

        or upper(
          coalesce(
            pr.referencia_lote,
            ''
          )
        ) like
          '%' || v_busca || '%'

        or (
          v_busca_numero is not null
          and pr.numero_lote =
              v_busca_numero
        )

        or upper(
          coalesce(
            pr.destinatario_nome_informado,
            ''
          )
        ) like
          '%' || v_busca || '%'

        or upper(
          coalesce(
            pr.codigo_rastreio_informado,
            ''
          )
        ) like
          '%' || v_busca || '%'

        or upper(
          coalesce(
            pr.transportadora_nome_informado,
            t.nome_fantasia,
            ''
          )
        ) like
          '%' || v_busca || '%'

        or upper(
          coalesce(
            pr.entregador_nome,
            ''
          )
        ) like
          '%' || v_busca || '%'

        or exists (
          select 1
          from public.encomendas_volumes vb
          where vb.pre_recebimento_id =
                pr.id
            and (
              upper(
                coalesce(
                  vb.codigo_lido,
                  ''
                )
              ) like
                '%' || v_busca || '%'

              or upper(
                coalesce(
                  vb.codigo_normalizado,
                  ''
                )
              ) like
                '%' || v_busca || '%'
            )
        )
      )

    order by
      pr.finalizado_em asc nulls last,
      pr.criado_em asc,
      pr.numero_lote asc

    limit
      v_limite

    offset
      v_offset
  ) x;

  return jsonb_build_object(
    'ok',
      true,

    'condominio_id',
      p_condominio_id,

    'timezone_iana',
      v_timezone,

    'total',
      v_total,

    'limite',
      v_limite,

    'offset',
      v_offset,

    'itens',
      v_itens
  );
end;
$function$;

revoke all on function public.rpc_encomenda_pre_recebimentos_listar_v2(
  uuid,
  text,
  text,
  uuid,
  boolean,
  timestamp with time zone,
  timestamp with time zone,
  integer,
  integer
) from public;

grant execute on function public.rpc_encomenda_pre_recebimentos_listar_v2(
  uuid,
  text,
  text,
  uuid,
  boolean,
  timestamp with time zone,
  timestamp with time zone,
  integer,
  integer
) to authenticated;