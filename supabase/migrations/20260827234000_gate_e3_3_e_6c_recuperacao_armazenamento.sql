-- =====================================================================
-- SISTEMA CHEGOU!
-- GATE E3.3-E.6C
--
-- Recuperação canônica de Encomendas com:
--
--   Entrada Oficial concluída
--   +
--   Armazenamento ainda pendente
--
-- IMPORTANTE:
--
-- - NÃO refaz Entrada;
-- - NÃO altera Encomenda;
-- - NÃO altera Volume;
-- - NÃO armazena;
-- - NÃO disponibiliza;
-- - NÃO envia notificação;
-- - NÃO reconstrói destinatário no frontend;
-- - NÃO depende da sessão/Drawer que confirmou a Entrada.
--
-- A fila pertence ao contexto operacional do condomínio.
-- =====================================================================

begin;


-- =====================================================================
-- RPC
-- =====================================================================

create or replace function public.rpc_encomenda_armazenamento_pendentes_listar_v1(
  p_condominio_id uuid,
  p_limite integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$

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
  -- 3. CONTEXTO SEGURO DO OPERADOR
  --
  -- Mesmo contrato de contexto utilizado pela listagem V2 de
  -- localizações.
  -- ===================================================================

  select *
  into v_ctx
  from public.fn_encomendas_contexto_operador_v1(
    p_condominio_id
  );


  if v_ctx.business_id is null then
    raise exception
      'Não foi possível determinar o tenant do condomínio.'
      using errcode = '42501';
  end if;


  -- Defesa complementar:
  -- o mesmo operador precisa poder executar o Armazenamento V2.

  if not public.fn_encomendas_pode_operar_condominio_v1(
    p_condominio_id
  ) then
    raise exception
      'Acesso negado.'
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


-- =====================================================================
-- SEGURANÇA DE EXECUÇÃO
-- =====================================================================

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


-- =====================================================================
-- DOCUMENTAÇÃO
-- =====================================================================

comment on function public.rpc_encomenda_armazenamento_pendentes_listar_v1(
  uuid,
  integer,
  integer
)
is
'Lista, em FIFO pela confirmação da Entrada Oficial, Encomendas elegíveis para retomada do Armazenamento. Contrato somente leitura. Não refaz Entrada, não armazena, não disponibiliza e não envia notificações.';


commit;