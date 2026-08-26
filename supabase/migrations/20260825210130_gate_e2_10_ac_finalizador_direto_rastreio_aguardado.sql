-- =====================================================================
-- SISTEMA CHEGOU!
-- GATE E2.10-AC
--
-- FINALIZADOR DIRETO DO RASTREIO AGUARDADO
--
-- Objetivo:
-- desacoplar a finalização do Rastreio Aguardado da existência
-- opcional de public.encomendas_rastreios.
--
-- NÃO remove o trigger legado nesta etapa.
-- NÃO altera rpc_encomenda_entrada_confirmar_v1 nesta etapa.
-- =====================================================================


create or replace function
public.fn_encomendas_vincular_rastreio_aguardado_entrada_v1(
  p_volume_id uuid,
  p_encomenda_id uuid,
  p_confirmado_em timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $function$

declare

  v_volume
    public.encomendas_volumes%rowtype;

  v_ra
    public.encomendas_rastreios_aguardados%rowtype;

  v_encomenda
    public.encomendas%rowtype;

begin

  -- ===================================================================
  -- 1. PARÂMETROS
  -- ===================================================================

  if p_volume_id is null then
    raise exception
      'Informe o Volume para vincular o Rastreio Aguardado.'
      using errcode = '22004';
  end if;


  if p_encomenda_id is null then
    raise exception
      'Informe a Encomenda para vincular o Rastreio Aguardado.'
      using errcode = '22004';
  end if;


  if p_confirmado_em is null then
    raise exception
      'Informe o instante canônico da Entrada.'
      using errcode = '22004';
  end if;


  -- ===================================================================
  -- 2. VOLUME CANÔNICO
  -- ===================================================================

  select v.*
    into v_volume
  from public.encomendas_volumes v
  where v.id = p_volume_id
  for update;


  if not found then
    raise exception
      'INTEGRIDADE_ENTRADA_RASTREIO_VOLUME_INEXISTENTE'
      using errcode = '23514';
  end if;


  -- Volume sem Rastreio Aguardado não possui trabalho a executar.

  if v_volume.rastreio_aguardado_id is null then
    return null;
  end if;


  -- ===================================================================
  -- 3. ENCOMENDA CANÔNICA
  -- ===================================================================

  select e.*
    into v_encomenda
  from public.encomendas e
  where e.id = p_encomenda_id
  for update;


  if not found then
    raise exception
      'INTEGRIDADE_ENTRADA_RASTREIO_ENCOMENDA_INEXISTENTE'
      using errcode = '23514';
  end if;


  -- ===================================================================
  -- 4. VOLUME ↔ ENCOMENDA
  -- ===================================================================

  if v_volume.encomenda_id
       is distinct from
       v_encomenda.id
  then
    raise exception
      'INTEGRIDADE_ENTRADA_RASTREIO_VOLUME_ENCOMENDA_DIVERGENTE'
      using errcode = '23514';
  end if;


  -- ===================================================================
  -- 5. MULTI-TENANT VOLUME ↔ ENCOMENDA
  -- ===================================================================

  if v_volume.business_id
       is distinct from
       v_encomenda.business_id

     or

     v_volume.condominio_id
       is distinct from
       v_encomenda.condominio_id
  then
    raise exception
      'INTEGRIDADE_ENTRADA_RASTREIO_TENANT_DIVERGENTE'
      using errcode = '42501';
  end if;


  -- ===================================================================
  -- 6. RASTREIO AGUARDADO EXPLICITAMENTE VINCULADO AO VOLUME
  -- ===================================================================

  select ra.*
    into v_ra
  from public.encomendas_rastreios_aguardados ra
  where ra.id = v_volume.rastreio_aguardado_id
  for update;


  if not found then
    raise exception
      'INTEGRIDADE_VOLUME_RASTREIO_AGUARDADO_INEXISTENTE'
      using errcode = '23514';
  end if;


  -- ===================================================================
  -- 7. VÍNCULO BILATERAL
  -- ===================================================================

  if v_ra.volume_id
       is distinct from
       v_volume.id
  then
    raise exception
      'INTEGRIDADE_RASTREIO_AGUARDADO_VOLUME_DIVERGENTE'
      using errcode = '23514';
  end if;


  -- ===================================================================
  -- 8. MULTI-TENANT RASTREIO ↔ VOLUME ↔ ENCOMENDA
  -- ===================================================================

  if v_ra.business_id
       is distinct from
       v_volume.business_id

     or

     v_ra.condominio_id
       is distinct from
       v_volume.condominio_id
  then
    raise exception
      'INTEGRIDADE_RASTREIO_AGUARDADO_TENANT_DIVERGENTE'
      using errcode = '42501';
  end if;


  -- ===================================================================
  -- 9. IDEMPOTÊNCIA DE DOMÍNIO
  -- ===================================================================

  if v_ra.status = 'VINCULADO_ENCOMENDA' then

    if v_ra.encomenda_id
         is distinct from
         v_encomenda.id
    then
      raise exception
        'INTEGRIDADE_RASTREIO_AGUARDADO_ENCOMENDA_DIVERGENTE'
        using errcode = '23514';
    end if;


    if v_ra.confirmado_em is null then
      raise exception
        'INTEGRIDADE_RASTREIO_AGUARDADO_CONFIRMADO_EM_AUSENTE'
        using errcode = '23514';
    end if;


    return v_ra.id;

  end if;


  -- ===================================================================
  -- 10. ESTADO PERMITIDO
  -- ===================================================================

  if v_ra.status <> 'AGUARDANDO_ENTRADA' then
    raise exception
      'RASTREIO_AGUARDADO_STATUS_INVALIDO_PARA_FINALIZACAO: %',
      v_ra.status
      using errcode = '23514';
  end if;


  -- ===================================================================
  -- 11. FINALIZAÇÃO CANÔNICA
  --
  -- p_confirmado_em deverá vir de:
  -- public.encomendas_entradas.confirmada_em
  --
  -- Portanto o relógio autoritativo pertence à Entrada Oficial.
  -- ===================================================================

  update public.encomendas_rastreios_aguardados
  set
    status =
      'VINCULADO_ENCOMENDA',

    encomenda_id =
      v_encomenda.id,

    confirmado_em =
      p_confirmado_em,

    atualizado_em =
      now()

  where id =
        v_ra.id

  returning *
  into v_ra;


  return v_ra.id;

end;

$function$;


-- =====================================================================
-- SEGURANÇA
--
-- Helper interno.
-- Não deve ser chamado diretamente pelo frontend.
-- =====================================================================

revoke all on function
public.fn_encomendas_vincular_rastreio_aguardado_entrada_v1(
  uuid,
  uuid,
  timestamptz
)
from public;

revoke all on function
public.fn_encomendas_vincular_rastreio_aguardado_entrada_v1(
  uuid,
  uuid,
  timestamptz
)
from anon;

revoke all on function
public.fn_encomendas_vincular_rastreio_aguardado_entrada_v1(
  uuid,
  uuid,
  timestamptz
)
from authenticated;