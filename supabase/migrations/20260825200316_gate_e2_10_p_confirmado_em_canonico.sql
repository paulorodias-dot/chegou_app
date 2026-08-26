-- =====================================================================
-- SISTEMA CHEGOU!
-- GATE E2.10-P
--
-- RASTREIO AGUARDADO
-- TIMESTAMP CANÔNICO DE CONFIRMAÇÃO
--
-- Objetivos:
--   1. preservar a finalização canônica E2.10-F;
--   2. preencher confirmado_em na vinculação à Encomenda;
--   3. usar o timestamp autoritativo da própria transação;
--   4. reparar somente gaps históricos com fonte inequívoca.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. FUNÇÃO CANÔNICA
-- ---------------------------------------------------------------------

create or replace function public.fn_encomendas_finalizar_rastreio_aguardado_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_volume_id uuid;
  v_volume public.encomendas_volumes%rowtype;
  v_ra public.encomendas_rastreios_aguardados%rowtype;
begin

  -- ---------------------------------------------------------------
  -- 1. O Rastreio Oficial precisa declarar o Volume de origem.
  -- ---------------------------------------------------------------

  begin
    v_volume_id :=
      nullif(
        new.metadata ->> 'volume_id',
        ''
      )::uuid;
  exception
    when invalid_text_representation then
      v_volume_id := null;
  end;

  if v_volume_id is null then
    return new;
  end if;


  -- ---------------------------------------------------------------
  -- 2. Resolver e bloquear o Volume canônico.
  -- ---------------------------------------------------------------

  select v.*
    into v_volume
  from public.encomendas_volumes v
  where v.id = v_volume_id
  for update;

  if not found then
    raise exception
      'INTEGRIDADE_RASTREIO_OFICIAL_VOLUME_INEXISTENTE';
  end if;


  -- ---------------------------------------------------------------
  -- 3. Defesa multi-tenant e de promoção.
  -- ---------------------------------------------------------------

  if v_volume.condominio_id is distinct from new.condominio_id then
    raise exception
      'INTEGRIDADE_RASTREIO_OFICIAL_VOLUME_CONDOMINIO_DIVERGENTE';
  end if;

  if v_volume.business_id is distinct from new.business_id then
    raise exception
      'INTEGRIDADE_RASTREIO_OFICIAL_VOLUME_BUSINESS_DIVERGENTE';
  end if;

  if v_volume.encomenda_id is distinct from new.encomenda_id then
    raise exception
      'INTEGRIDADE_RASTREIO_OFICIAL_VOLUME_ENCOMENDA_DIVERGENTE';
  end if;


  -- ---------------------------------------------------------------
  -- 4. Volume sem Rastreio Aguardado.
  -- ---------------------------------------------------------------

  if v_volume.rastreio_aguardado_id is null then
    return new;
  end if;


  -- ---------------------------------------------------------------
  -- 5. Resolver exclusivamente o Rastreio Aguardado explicitamente
  --    vinculado ao Volume.
  -- ---------------------------------------------------------------

  select ra.*
    into v_ra
  from public.encomendas_rastreios_aguardados ra
  where ra.id = v_volume.rastreio_aguardado_id
  for update;

  if not found then
    raise exception
      'INTEGRIDADE_VOLUME_RASTREIO_AGUARDADO_INEXISTENTE';
  end if;


  -- ---------------------------------------------------------------
  -- 6. Vínculo bilateral.
  -- ---------------------------------------------------------------

  if v_ra.volume_id is distinct from v_volume.id then
    raise exception
      'INTEGRIDADE_RASTREIO_AGUARDADO_VOLUME_DIVERGENTE';
  end if;


  -- ---------------------------------------------------------------
  -- 7. Defesa multi-tenant.
  -- ---------------------------------------------------------------

  if v_ra.condominio_id is distinct from new.condominio_id then
    raise exception
      'INTEGRIDADE_RASTREIO_AGUARDADO_CONDOMINIO_DIVERGENTE';
  end if;

  if v_ra.business_id is distinct from new.business_id then
    raise exception
      'INTEGRIDADE_RASTREIO_AGUARDADO_BUSINESS_DIVERGENTE';
  end if;


  -- ---------------------------------------------------------------
  -- 8. Idempotência.
  -- ---------------------------------------------------------------

  if v_ra.status = 'VINCULADO_ENCOMENDA' then

    if v_ra.encomenda_id is distinct from new.encomenda_id then
      raise exception
        'INTEGRIDADE_RASTREIO_AGUARDADO_ENCOMENDA_DIVERGENTE';
    end if;

    return new;

  end if;


  -- ---------------------------------------------------------------
  -- 9. Estado permitido.
  -- ---------------------------------------------------------------

  if v_ra.status <> 'AGUARDANDO_ENTRADA' then
    raise exception
      'RASTREIO_AGUARDADO_STATUS_INVALIDO_PARA_FINALIZACAO: %',
      v_ra.status;
  end if;


  -- ---------------------------------------------------------------
  -- 10. Finalização canônica.
  --
  -- confirmado_em representa o instante em que o Rastreio
  -- Aguardado foi efetivamente vinculado à Encomenda Oficial.
  --
  -- O Rastreio Oficial é criado dentro da mesma transação da
  -- Entrada. new.criado_em é, portanto, evidência temporal
  -- transacional da vinculação.
  -- ---------------------------------------------------------------

  update public.encomendas_rastreios_aguardados
  set
    status = 'VINCULADO_ENCOMENDA',
    encomenda_id = new.encomenda_id,
    confirmado_em = new.criado_em,
    atualizado_em = now()
  where id = v_ra.id;


  return new;

end;
$function$;


-- ---------------------------------------------------------------------
-- 2. BACKFILL SEGURO
--
-- Somente registros:
--   - já vinculados;
--   - sem confirmado_em;
--   - com Volume;
--   - com Entrada correspondente;
--   - mesma Encomenda;
--   - mesmo tenant;
--   - com timestamp autoritativo disponível.
--
-- Nenhum now() é usado como reconstrução histórica.
-- ---------------------------------------------------------------------

update public.encomendas_rastreios_aguardados ra
set
  confirmado_em = e.confirmada_em
from public.encomendas_volumes v,
     public.encomendas_entradas e
where ra.status = 'VINCULADO_ENCOMENDA'
  and ra.confirmado_em is null

  and v.id = ra.volume_id
  and v.rastreio_aguardado_id = ra.id

  and e.volume_id = v.id
  and e.encomenda_id = ra.encomenda_id

  and e.business_id = ra.business_id
  and e.condominio_id = ra.condominio_id

  and v.business_id = ra.business_id
  and v.condominio_id = ra.condominio_id

  and e.confirmada_em is not null;