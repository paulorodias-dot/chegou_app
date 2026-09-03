-- =====================================================================
-- SISTEMA CHEGOU!
-- CENTRAL DE ENCOMENDAS
--
-- GATE E3.3-D
-- ARMAZENAMENTO V2 INTEGRADO À ENTRADA OFICIAL
--
-- OBJETIVOS
-- ---------------------------------------------------------------------
-- - preservar rpc_encomenda_armazenar_v1 para legado;
-- - V2 aceita somente Encomenda da Entrada Oficial;
-- - backend resolve entrada_id canônico;
-- - exigir status RECEBIDA;
-- - registrar movimentação própria de ARMAZENAMENTO;
-- - publicar ENCOMENDA_ARMAZENADA via evento V2;
-- - registrar auditoria via log V2;
-- - NÃO disponibilizar;
-- - NÃO notificar diretamente.
-- =====================================================================


create or replace function
  public.rpc_encomenda_armazenar_v2(
    p_encomenda_id uuid,
    p_localizacao_id uuid,
    p_observacoes text default null,
    p_ip text default null,
    p_user_agent text default null,
    p_navegador text default null,
    p_sistema_operacional text default null,
    p_tipo_dispositivo text default null,
    p_identificador_dispositivo text default null
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$

declare

  v_anterior
    public.encomendas%rowtype;

  v_nova
    public.encomendas%rowtype;

  v_entrada
    public.encomendas_entradas%rowtype;

  v_volume
    public.encomendas_volumes%rowtype;

  v_localizacao
    public.encomendas_localizacoes%rowtype;

  v_movimentacao
    public.encomendas_movimentacoes%rowtype;

  v_config
    public.configuracoes_encomendas_condominio%rowtype;


  v_localizacao_pai_nome text;

  v_ocupacao integer;

  v_total_entradas integer;

  v_event_id uuid;

  v_log_id uuid;

  v_agora timestamptz :=
    now();

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
  -- 2. ENCOMENDA
  --
  -- Lock autoritativo do objeto que será armazenado.
  -- ===================================================================

  select *

  into v_anterior

  from public.encomendas

  where id =
        p_encomenda_id

  for update;


  if not found then

    raise exception
      'Encomenda não encontrada.'
      using errcode = 'P0002';

  end if;


  -- ===================================================================
  -- 3. TENANT / OPERADOR
  -- ===================================================================

  if not public.fn_encomendas_pode_operar_condominio_v1(
    v_anterior.condominio_id
  ) then

    raise exception
      'Acesso negado.'
      using errcode = '42501';

  end if;


  -- ===================================================================
  -- 4. SOMENTE CADEIA OFICIAL NOVA
  --
  -- V2 não aceita Encomenda legada sem Entrada Oficial.
  -- ===================================================================

  select
    count(*)

  into v_total_entradas

  from public.encomendas_entradas ee

  where ee.encomenda_id =
        v_anterior.id;


  if v_total_entradas = 0 then

    raise exception
      'Esta encomenda não possui Entrada Oficial e não pode usar o armazenamento V2.'
      using errcode = '23514';

  end if;


  if v_total_entradas > 1 then

    raise exception
      'A encomenda possui mais de uma Entrada Oficial. Operação interrompida para conferência.'
      using errcode = '23514';

  end if;


  select *

  into v_entrada

  from public.encomendas_entradas ee

  where ee.encomenda_id =
        v_anterior.id;


  -- ===================================================================
  -- 5. INTEGRIDADE ENTRADA ↔ ENCOMENDA
  -- ===================================================================

  if v_entrada.business_id
       is distinct from
       v_anterior.business_id

     or v_entrada.condominio_id
       is distinct from
       v_anterior.condominio_id

     or v_entrada.correlation_id
       is distinct from
       v_anterior.correlation_id

     or v_entrada.encomenda_id
       is distinct from
       v_anterior.id
  then

    raise exception
      'A Entrada Oficial não corresponde integralmente à encomenda.'
      using errcode = '23514';

  end if;


  -- ===================================================================
  -- 6. VOLUME CANÔNICO DA ENTRADA
  -- ===================================================================

  if v_entrada.volume_id is null then

    raise exception
      'A Entrada Oficial não possui Volume canônico.'
      using errcode = '23514';

  end if;


  select *

  into v_volume

  from public.encomendas_volumes v

  where v.id =
        v_entrada.volume_id;


  if not found then

    raise exception
      'O Volume da Entrada Oficial não foi encontrado.'
      using errcode = '23514';

  end if;


  if v_volume.encomenda_id
       is distinct from
       v_anterior.id

     or v_volume.pre_recebimento_id
       is distinct from
       v_entrada.pre_recebimento_id
  then

    raise exception
      'O Volume não corresponde à cadeia oficial desta Entrada.'
      using errcode = '23514';

  end if;


  -- ===================================================================
  -- 7. ESTADO CANÔNICO
  --
  -- Armazenar é o passo imediatamente posterior à Entrada.
  --
  -- V2 não é contrato de relocalização.
  -- ===================================================================

  if v_anterior.status <>
     'RECEBIDA'
  then

    raise exception
      'Somente encomendas recebidas pela Entrada Oficial podem ser armazenadas por este fluxo.'
      using errcode = '23514';

  end if;


  if v_anterior.armazenado_em is not null
     or v_anterior.localizacao_atual_id is not null
  then

    raise exception
      'Esta encomenda já possui armazenamento registrado.'
      using errcode = '23514';

  end if;


  -- ===================================================================
  -- 8. DESTINO PRECISA ESTAR IDENTIFICADO
  --
  -- Diferentemente do legado V1, a cadeia nova não transforma uma
  -- Entrada incompleta em PENDENTE_IDENTIFICACAO durante armazenamento.
  -- Entrada Oficial já deve chegar identificada.
  -- ===================================================================

  if v_anterior.unidade_id is null then

    raise exception
      'A encomenda não possui Unidade identificada.'
      using errcode = '23514';

  end if;


  -- ===================================================================
  -- 9. CONFIGURAÇÃO DO CONDOMÍNIO
  -- ===================================================================

  select *

  into v_config

  from public.configuracoes_encomendas_condominio

  where condominio_id =
        v_anterior.condominio_id;


  if not found then

    raise exception
      'As configurações de encomendas do condomínio não foram encontradas.'
      using errcode = '23514';

  end if;


  if not v_config.ativo then

    raise exception
      'O fluxo de encomendas está desativado para este condomínio.'
      using errcode = '23514';

  end if;


  if not v_config.armazenamento_habilitado then

    raise exception
      'O armazenamento de encomendas não está habilitado neste condomínio.'
      using errcode = '23514';

  end if;


  -- ===================================================================
  -- 10. LOCALIZAÇÃO
  --
  -- Sempre do mesmo condomínio da Encomenda.
  -- ===================================================================

  select *

  into v_localizacao

  from public.encomendas_localizacoes

  where id =
        p_localizacao_id

    and condominio_id =
        v_anterior.condominio_id

    and ativo =
        true

    and bloqueada =
        false

  for update;


  if not found then

    raise exception
      'O local selecionado está indisponível.'
      using errcode = '23514';

  end if;


  -- ===================================================================
  -- 11. COMPATIBILIDADE DA LOCALIZAÇÃO
  -- ===================================================================

  if not public.fn_encomendas_localizacao_compativel_v1(
    v_localizacao.id,
    v_anterior.condominio_id,
    v_anterior.tipo_entrega
  ) then

    raise exception
      'O local selecionado não aceita este tipo de encomenda.'
      using errcode = '23514';

  end if;


  -- ===================================================================
  -- 12. CAPACIDADE
  -- ===================================================================

  if v_localizacao.capacidade_maxima
     is not null
  then

    select
      count(*)::integer

    into v_ocupacao

    from public.encomendas e

    where e.localizacao_atual_id =
          v_localizacao.id

      and e.id <>
          v_anterior.id

      and e.status not in (
        'RETIRADA',
        'FINALIZADA',
        'DEVOLVIDA',
        'CANCELADA',
        'RECUSADA'
      );


    if v_ocupacao >=
       v_localizacao.capacidade_maxima
    then

      raise exception
        'O local selecionado atingiu sua capacidade máxima.'
        using errcode = '23514';

    end if;

  end if;


  -- ===================================================================
  -- 13. LOCALIZAÇÃO PAI
  -- ===================================================================

  if v_localizacao.localizacao_pai_id
     is not null
  then

    select
      nome

    into v_localizacao_pai_nome

    from public.encomendas_localizacoes

    where id =
          v_localizacao.localizacao_pai_id

      and condominio_id =
          v_anterior.condominio_id;

  end if;


  -- ===================================================================
  -- 14. TRANSIÇÃO DE DOMÍNIO
  -- ===================================================================

  if not public.fn_encomendas_transicao_status_valida_v1(
    v_anterior.status,
    'ARMAZENADA'
  ) then

    raise exception
      'A encomenda não pode ser armazenada a partir do status atual.'
      using errcode = '23514';

  end if;


  -- ===================================================================
  -- 15. MOVIMENTAÇÃO FÍSICA
  --
  -- Fato separado da Entrada.
  -- ===================================================================

  insert into public.encomendas_movimentacoes (

    correlation_id,

    business_id,

    condominio_id,

    encomenda_id,

    tipo_movimentacao,

    localizacao_origem_id,

    localizacao_destino_id,

    status_anterior,

    status_novo,

    justificativa,

    operador_usuario_id,

    ip,

    user_agent,

    navegador,

    sistema_operacional,

    tipo_dispositivo,

    metadata

  )
  values (

    v_anterior.correlation_id,

    v_anterior.business_id,

    v_anterior.condominio_id,

    v_anterior.id,

    'ARMAZENAMENTO',

    null,

    v_localizacao.id,

    v_anterior.status,

    'ARMAZENADA',

    nullif(
      btrim(
        p_observacoes
      ),
      ''
    ),

    auth.uid(),

    p_ip,

    p_user_agent,

    p_navegador,

    p_sistema_operacional,

    p_tipo_dispositivo,

    jsonb_build_object(

      'contrato_rpc',
        'rpc_encomenda_armazenar_v2',

      'entrada_id',
        v_entrada.id,

      'volume_id',
        v_volume.id,

      'localizacao_codigo',
        v_localizacao.codigo,

      'localizacao_nome',
        v_localizacao.nome,

      'localizacao_pai_nome',
        v_localizacao_pai_nome
    )
  )

  returning *

  into v_movimentacao;


  -- ===================================================================
  -- 16. ATUALIZAR ENCOMENDA
  -- ===================================================================

  update public.encomendas

  set
    localizacao_atual_id =
      v_localizacao.id,

    armazenado_por_usuario_id =
      auth.uid(),

    armazenado_em =
      v_agora,

    ultima_movimentacao_em =
      v_agora,

    ultima_movimentacao_por_usuario_id =
      auth.uid(),

    status =
      'ARMAZENADA',

    observacoes =
      concat_ws(
        E'\n',
        nullif(
          observacoes,
          ''
        ),
        nullif(
          btrim(
            p_observacoes
          ),
          ''
        )
      )

  where id =
        v_anterior.id

  returning *

  into v_nova;


  -- ===================================================================
  -- 17. EVENTO V2
  --
  -- ENTRADA continua identificável na cadeia.
  --
  -- Este evento NÃO representa:
  -- - disponibilização;
  -- - notificação;
  -- - retirada.
  -- ===================================================================

  v_event_id :=
    public.fn_encomendas_publicar_evento_v2(

      p_event_type :=
        'ENCOMENDA_ARMAZENADA',

      p_correlation_id :=
        v_nova.correlation_id,

      p_business_id :=
        v_nova.business_id,

      p_condominio_id :=
        v_nova.condominio_id,

      p_origem :=
        'MODULO_PORTARIA',

      p_modulo :=
        'CENTRAL_ENCOMENDAS',

      p_payload :=
        jsonb_build_object(

          'entrada_id',
            v_entrada.id,

          'encomenda_id',
            v_nova.id,

          'numero_encomenda',
            v_nova.numero_encomenda,

          'volume_id',
            v_volume.id,

          'pre_recebimento_id',
            v_entrada.pre_recebimento_id,

          'movimentacao_id',
            v_movimentacao.id,

          'localizacao_id',
            v_localizacao.id,

          'localizacao_codigo',
            v_localizacao.codigo,

          'localizacao_nome',
            v_localizacao.nome,

          'localizacao_pai_nome',
            v_localizacao_pai_nome,

          'status_anterior',
            v_anterior.status,

          'status_novo',
            v_nova.status,

          'armazenado_em',
            v_nova.armazenado_em,

          /*
           * Informação para futura orquestração.
           *
           * NÃO executa disponibilização dentro desta RPC.
           */
          'disponibilizacao_automatica_configurada',
            v_config.disponibilizacao_automatica_apos_armazenamento,

          'disponibilizacao_executada',
            false,

          'notificacao_enviada_diretamente',
            false
        ),

      p_pre_recebimento_id :=
        v_entrada.pre_recebimento_id,

      p_entrada_id :=
        v_entrada.id,

      p_encomenda_id :=
        v_nova.id,

      p_transportadora_id :=
        v_nova.transportadora_id,

      p_unidade_id :=
        v_nova.unidade_id
    );


  -- ===================================================================
  -- 18. LOG V2
  -- ===================================================================

  v_log_id :=
    public.fn_encomendas_registrar_log_v2(

      p_correlation_id :=
        v_nova.correlation_id,

      p_business_id :=
        v_nova.business_id,

      p_condominio_id :=
        v_nova.condominio_id,

      p_acao :=
        'ENCOMENDA_ARMAZENADA',

      p_origem :=
        'MODULO_PORTARIA',

      p_modulo :=
        'CENTRAL_ENCOMENDAS',

      p_resultado :=
        'SUCESSO',

      p_pre_recebimento_id :=
        v_entrada.pre_recebimento_id,

      p_entrada_id :=
        v_entrada.id,

      p_encomenda_id :=
        v_nova.id,

      p_volume_id :=
        v_volume.id,

      p_transportadora_id :=
        v_nova.transportadora_id,

      p_unidade_id :=
        v_nova.unidade_id,

      p_status_anterior :=
        v_anterior.status,

      p_status_novo :=
        v_nova.status,

      p_dados_anteriores :=
        jsonb_build_object(

          'status',
            v_anterior.status,

          'localizacao_atual_id',
            v_anterior.localizacao_atual_id,

          'armazenado_em',
            v_anterior.armazenado_em
        ),

      p_dados_novos :=
        jsonb_build_object(

          'status',
            v_nova.status,

          'localizacao_atual_id',
            v_nova.localizacao_atual_id,

          'armazenado_em',
            v_nova.armazenado_em
        ),

      p_metadata :=
        jsonb_build_object(

          'contrato_rpc',
            'rpc_encomenda_armazenar_v2',

          'movimentacao_id',
            v_movimentacao.id,

          'entrada_id',
            v_entrada.id,

          'volume_id',
            v_volume.id,

          'localizacao_id',
            v_localizacao.id,

          'localizacao_codigo',
            v_localizacao.codigo,

          'localizacao_nome',
            v_localizacao.nome,

          'localizacao_pai_nome',
            v_localizacao_pai_nome,

          'disponibilizacao_automatica_configurada',
            v_config.disponibilizacao_automatica_apos_armazenamento,

          'disponibilizacao_executada',
            false,

          'notificacao_enviada_diretamente',
            false
        ),

      p_ip :=
        p_ip,

      p_user_agent :=
        p_user_agent,

      p_navegador :=
        p_navegador,

      p_sistema_operacional :=
        p_sistema_operacional,

      p_tipo_dispositivo :=
        p_tipo_dispositivo,

      p_identificador_dispositivo :=
        p_identificador_dispositivo,

      p_event_id :=
        v_event_id
    );


  -- ===================================================================
  -- 19. RESPOSTA
  -- ===================================================================

  return jsonb_build_object(

    'ok',
      true,

    'contrato',
      'rpc_encomenda_armazenar_v2',

    'entrada_id',
      v_entrada.id,

    'volume_id',
      v_volume.id,

    'encomenda_id',
      v_nova.id,

    'numero_encomenda',
      v_nova.numero_encomenda,

    'movimentacao_id',
      v_movimentacao.id,

    'event_id',
      v_event_id,

    'log_id',
      v_log_id,

    'status_anterior',
      v_anterior.status,

    'status',
      v_nova.status,

    'localizacao_id',
      v_localizacao.id,

    'localizacao_codigo',
      v_localizacao.codigo,

    'localizacao_nome',
      v_localizacao.nome,

    'localizacao_pai_nome',
      v_localizacao_pai_nome,

    'localizacao_nome_completo',
      case

        when v_localizacao_pai_nome
             is null
          then
            v_localizacao.nome

        else
          v_localizacao_pai_nome
          || ' — '
          || v_localizacao.nome

      end,

    'armazenado_em',
      v_nova.armazenado_em,

    'armazenado_em_local',
      public.fn_encomendas_data_hora_local_v1(
        v_nova.armazenado_em,
        v_nova.condominio_id
      ),

    /*
     * Flag informativa.
     *
     * E3.4 decidirá a orquestração real.
     */
    'disponibilizacao_automatica_configurada',
      v_config.disponibilizacao_automatica_apos_armazenamento,

    'disponibilizacao_executada',
      false,

    'notificacao_enviada_diretamente',
      false
  );

end;
$function$;


-- =====================================================================
-- 20. PERMISSÕES
--
-- V2 é contrato público operacional da Portaria.
-- =====================================================================

revoke all on function
  public.rpc_encomenda_armazenar_v2(
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    text
  )
from public;


revoke all on function
  public.rpc_encomenda_armazenar_v2(
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    text
  )
from anon;


grant execute on function
  public.rpc_encomenda_armazenar_v2(
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    text
  )
to authenticated;


grant execute on function
  public.rpc_encomenda_armazenar_v2(
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    text
  )
to service_role;


comment on function
  public.rpc_encomenda_armazenar_v2(
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    text
  )
is
  'Sistema Chegou! — Armazenamento V2 da cadeia oficial: exige Entrada Oficial canônica, registra movimentação física e evento/log V2 com entrada_id; não disponibiliza nem notifica diretamente.';