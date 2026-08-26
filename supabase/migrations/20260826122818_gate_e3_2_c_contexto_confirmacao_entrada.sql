-- =====================================================================
-- SISTEMA CHEGOU!
-- CENTRAL DE ENCOMENDAS — ENTRADA OFICIAL
--
-- GATE E3.2-C.1
-- CONTEXTO CANÔNICO PARA CONFIRMAÇÃO PRODUTIVA
--
-- Objetivo:
-- enriquecer rpc_encomenda_volume_contexto_entrada_v1 com os
-- identificadores necessários à confirmação, sem delegar resolução
-- de identidade ao React.
--
-- Somente leitura.
-- Multi-tenant backend-driven.
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
  v_usuario_auth_id uuid := auth.uid();

  v_resultado record;

  v_destinatario_tipo text;
  v_destinatario_usuario_id uuid;
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
  -- 2. VOLUME + RASTREIO + ESTRUTURA OFICIAL
  -- ===================================================================

  select
    v.id
      as volume_id,

    v.pre_recebimento_id,

    v.codigo_lido,
    v.codigo_normalizado,

    v.status
      as volume_status,

    v.encomenda_id,


    pr.condominio_id,
    pr.business_id,

    pr.status
      as lote_status,

    pr.transportadora_id,
    pr.transportadora_nome_informado,


    ra.id
      as rastreio_aguardado_id,

    ra.status
      as rastreio_status,

    ra.unidade_id,

    ra.beneficiario_pessoa_id,
    ra.beneficiario_dependente_id,

    ra.morador_unidade_vinculo_id,

    ra.solicitante_usuario_id,


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


  -- ===================================================================
  -- 3. AUTORIZAÇÃO
  -- ===================================================================

  if not public.fn_encomendas_pode_operar_condominio_v1(
    v_resultado.condominio_id
  ) then
    raise exception
      'Acesso negado.'
      using errcode = '42501';
  end if;


  -- ===================================================================
  -- 4. TIPO DO DESTINATÁRIO
  -- ===================================================================

  if v_resultado.beneficiario_dependente_id is not null then

    v_destinatario_tipo :=
      'DEPENDENTE';

  elsif v_resultado.beneficiario_pessoa_id is not null then

    v_destinatario_tipo :=
      'MORADOR';

  else

    v_destinatario_tipo :=
      null;

  end if;


  -- ===================================================================
  -- 5. AUTH/USUÁRIO DO BENEFICIÁRIO, QUANDO EXISTIR
  --
  -- Não usamos cegamente solicitante_usuario_id, pois no caso de
  -- Dependente o solicitante pode ser o Morador Responsável.
  -- ===================================================================

  if v_resultado.beneficiario_pessoa_id is not null then

    select
      ucv.usuario_id

    into
      v_destinatario_usuario_id

    from public.usuario_condominio_vinculos ucv

    join public.usuarios usr
      on usr.id =
         ucv.usuario_id

    where ucv.pessoa_id =
          v_resultado.beneficiario_pessoa_id

      and ucv.condominio_id =
          v_resultado.condominio_id

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

    limit 1;

  else

    v_destinatario_usuario_id :=
      null;

  end if;


  -- ===================================================================
  -- 6. RETORNO
  -- ===================================================================

  return jsonb_build_object(

    'ok',
      true,


    'volume_id',
      v_resultado.volume_id,

    'pre_recebimento_id',
      v_resultado.pre_recebimento_id,

    'volume_status',
      v_resultado.volume_status,

    'encomenda_id',
      v_resultado.encomenda_id,


    'codigo_lido',
      v_resultado.codigo_lido,

    'codigo_normalizado',
      v_resultado.codigo_normalizado,


    'condominio_id',
      v_resultado.condominio_id,

    'business_id',
      v_resultado.business_id,


    'transportadora_id',
      v_resultado.transportadora_id,

    'transportadora',
      v_resultado.transportadora_nome_informado,


    'rastreio_encontrado',
      v_resultado.rastreio_aguardado_id
        is not null,

    'rastreio_aguardado_id',
      v_resultado.rastreio_aguardado_id,

    'rastreio_status',
      v_resultado.rastreio_status,


    'destinatario_tipo',
      v_destinatario_tipo,

    'destinatario_morador_vinculo_id',
      v_resultado.morador_unidade_vinculo_id,

    'destinatario_dependente_id',
      v_resultado.beneficiario_dependente_id,

    'destinatario_pessoa_id',
      v_resultado.beneficiario_pessoa_id,

    'destinatario_usuario_id',
      v_destinatario_usuario_id,


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


    'beneficiario_nome',
      v_resultado.beneficiario_nome,


    'preenchimento_automatico_disponivel',
      (
        v_resultado.rastreio_aguardado_id is not null
        and v_resultado.unidade_id is not null
        and v_resultado.beneficiario_pessoa_id is not null
      )
  );

end;
$function$;


revoke all on function
  public.rpc_encomenda_volume_contexto_entrada_v1(
    uuid
  )
from public;


revoke all on function
  public.rpc_encomenda_volume_contexto_entrada_v1(
    uuid
  )
from anon;


grant execute on function
  public.rpc_encomenda_volume_contexto_entrada_v1(
    uuid
  )
to authenticated;