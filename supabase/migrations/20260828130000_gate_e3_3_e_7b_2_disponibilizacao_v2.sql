begin;

-- ============================================================================
-- GATE E3.3-E.7B.2
-- Helper operacional estrito da Central de Encomendas
-- Somente níveis 4 (ADMIN_LOGISTICA) e 5 (FUNCIONARIO), com vínculo ativo.
-- Sem bypass de MASTER/SÍNDICO/SUBSÍNDICO.
-- ============================================================================

create or replace function public.fn_encomendas_pode_operar_fluxo_fisico_v1(
  p_condominio_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_usuario_id uuid := auth.uid();
  v_nivel_id integer;
begin
  if v_usuario_id is null
     or p_condominio_id is null
  then
    return false;
  end if;

  select
    u.nivel_id
  into
    v_nivel_id
  from public.usuarios u
  where u.id = v_usuario_id
    and u.ativo = true;

  if not found then
    return false;
  end if;

  if v_nivel_id not in (4, 5) then
    return false;
  end if;

  return public.fn_encomendas_usuario_vinculado_condominio_v2(
    v_usuario_id,
    p_condominio_id
  );
end;
$function$;

revoke all
on function public.fn_encomendas_pode_operar_fluxo_fisico_v1(uuid)
from public;

revoke all
on function public.fn_encomendas_pode_operar_fluxo_fisico_v1(uuid)
from anon;

revoke all
on function public.fn_encomendas_pode_operar_fluxo_fisico_v1(uuid)
from authenticated;

grant execute
on function public.fn_encomendas_pode_operar_fluxo_fisico_v1(uuid)
to service_role;

grant execute
on function public.fn_encomendas_pode_operar_fluxo_fisico_v1(uuid)
to postgres;

-- ============================================================================
-- HARDENING CIRÚRGICO DO ARMAZENAMENTO V2
-- Única alteração funcional intencional: helper de autorização 4/5.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_encomenda_armazenar_v2(p_encomenda_id uuid, p_localizacao_id uuid, p_observacoes text DEFAULT NULL::text, p_ip text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text, p_navegador text DEFAULT NULL::text, p_sistema_operacional text DEFAULT NULL::text, p_tipo_dispositivo text DEFAULT NULL::text, p_identificador_dispositivo text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

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

  if not public.fn_encomendas_pode_operar_fluxo_fisico_v1(
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

-- Explicitar novamente os grants do Armazenamento V2 após o hardening.
revoke all
on function public.rpc_encomenda_armazenar_v2(
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

revoke all
on function public.rpc_encomenda_armazenar_v2(
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

grant execute
on function public.rpc_encomenda_armazenar_v2(
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

grant execute
on function public.rpc_encomenda_armazenar_v2(
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

grant execute
on function public.rpc_encomenda_armazenar_v2(
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
to postgres;

-- ============================================================================
-- Disponibilização V2
--
-- Contrato:
--   Entrada Oficial válida
--   + Volume canônico válido
--   + status ARMAZENADA
--   + armazenamento habilitado
--   + localização válida
--   + armazenado_em
--   + nenhuma ocorrência crítica pendente
--     -> DISPONIVEL_RETIRADA
--
-- Não envia notificação diretamente.
-- Publica ENCOMENDA_DISPONIVEL_RETIRADA no Outbox para a futura
-- Central de Notificações.
-- ============================================================================

create or replace function public.rpc_encomenda_disponibilizar_retirada_v2(
  p_encomenda_id uuid,
  p_observacoes text default null::text,
  p_ip text default null::text,
  p_user_agent text default null::text,
  p_navegador text default null::text,
  p_sistema_operacional text default null::text,
  p_tipo_dispositivo text default null::text,
  p_identificador_dispositivo text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_anterior public.encomendas%rowtype;
  v_nova public.encomendas%rowtype;
  v_entrada public.encomendas_entradas%rowtype;
  v_volume public.encomendas_volumes%rowtype;
  v_localizacao public.encomendas_localizacoes%rowtype;
  v_config public.configuracoes_encomendas_condominio%rowtype;

  v_localizacao_pai_nome text;

  v_total_entradas integer;
  v_event_id uuid;
  v_log_id uuid;
  v_agora timestamptz := now();
begin
  -- ========================================================================
  -- 1. AUTENTICAÇÃO
  -- ========================================================================
  if auth.uid() is null then
    raise exception
      'Usuário não autenticado.'
      using errcode = '42501';
  end if;

  -- ========================================================================
  -- 2. ENCOMENDA / LOCK AUTORITATIVO
  -- ========================================================================
  select *
  into v_anterior
  from public.encomendas
  where id = p_encomenda_id
  for update;

  if not found then
    raise exception
      'Encomenda não encontrada.'
      using errcode = 'P0002';
  end if;

  -- ========================================================================
  -- 3. AUTORIZAÇÃO OPERACIONAL ESTRITA
  -- ========================================================================
  if not public.fn_encomendas_pode_operar_fluxo_fisico_v1(
    v_anterior.condominio_id
  ) then
    raise exception
      'Acesso negado.'
      using errcode = '42501';
  end if;

  -- ========================================================================
  -- 4. CADEIA OFICIAL: EXATAMENTE UMA ENTRADA
  -- ========================================================================
  select count(*)
  into v_total_entradas
  from public.encomendas_entradas ee
  where ee.encomenda_id = v_anterior.id;

  if v_total_entradas = 0 then
    raise exception
      'Esta encomenda não possui Entrada Oficial e não pode usar a disponibilização V2.'
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
  where ee.encomenda_id = v_anterior.id;

  -- ========================================================================
  -- 5. INTEGRIDADE ENTRADA ↔ ENCOMENDA
  -- ========================================================================
  if v_entrada.business_id
       is distinct from v_anterior.business_id

     or v_entrada.condominio_id
       is distinct from v_anterior.condominio_id

     or v_entrada.correlation_id
       is distinct from v_anterior.correlation_id

     or v_entrada.encomenda_id
       is distinct from v_anterior.id

     or v_entrada.pre_recebimento_id
       is distinct from v_anterior.pre_recebimento_id
  then
    raise exception
      'A Entrada Oficial não corresponde integralmente à encomenda.'
      using errcode = '23514';
  end if;

  -- ========================================================================
  -- 6. VOLUME CANÔNICO
  -- ========================================================================
  if v_entrada.volume_id is null then
    raise exception
      'A Entrada Oficial não possui Volume canônico.'
      using errcode = '23514';
  end if;

  select *
  into v_volume
  from public.encomendas_volumes v
  where v.id = v_entrada.volume_id;

  if not found then
    raise exception
      'O Volume da Entrada Oficial não foi encontrado.'
      using errcode = '23514';
  end if;

  if v_volume.encomenda_id
       is distinct from v_anterior.id

     or v_volume.business_id
       is distinct from v_anterior.business_id

     or v_volume.condominio_id
       is distinct from v_anterior.condominio_id

     or v_volume.pre_recebimento_id
       is distinct from v_entrada.pre_recebimento_id
  then
    raise exception
      'O Volume não corresponde à cadeia oficial desta Entrada.'
      using errcode = '23514';
  end if;

  -- ========================================================================
  -- 7. CONFIGURAÇÃO
  -- ========================================================================
  select *
  into v_config
  from public.configuracoes_encomendas_condominio
  where condominio_id = v_anterior.condominio_id;

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

  -- A V2 homologada não utiliza disponibilização direta:
  -- disponibilização para retirada ocorre somente após armazenamento.
  if not v_config.armazenamento_habilitado then
    raise exception
      'O armazenamento de encomendas não está habilitado neste condomínio.'
      using errcode = '23514';
  end if;

  -- ========================================================================
  -- 8. IDENTIFICAÇÃO / ARMAZENAMENTO OBRIGATÓRIOS
  -- ========================================================================
  if v_anterior.unidade_id is null then
    raise exception
      'A encomenda não possui Unidade identificada.'
      using errcode = '23514';
  end if;

  if v_anterior.armazenado_em is null
     or v_anterior.localizacao_atual_id is null
  then
    raise exception
      'Armazene a encomenda antes de disponibilizá-la para retirada.'
      using errcode = '23514';
  end if;

  -- ========================================================================
  -- 9. LOCALIZAÇÃO ATUAL VÁLIDA
  -- ========================================================================
  select *
  into v_localizacao
  from public.encomendas_localizacoes l
  where l.id = v_anterior.localizacao_atual_id
    and l.condominio_id = v_anterior.condominio_id
    and l.ativo = true
    and l.bloqueada = false;

  if not found then
    raise exception
      'A localização atual da encomenda está indisponível ou inválida.'
      using errcode = '23514';
  end if;

  if v_localizacao.localizacao_pai_id is not null then
    select nome
    into v_localizacao_pai_nome
    from public.encomendas_localizacoes
    where id = v_localizacao.localizacao_pai_id
      and condominio_id = v_anterior.condominio_id;
  end if;

  -- ========================================================================
  -- 10. IDEMPOTÊNCIA
  --
  -- Retry de uma operação já concluída não publica novo evento nem novo log.
  -- ========================================================================
  if v_anterior.status = 'DISPONIVEL_RETIRADA' then
    return jsonb_build_object(
      'ok', true,
      'contrato', 'rpc_encomenda_disponibilizar_retirada_v2',
      'idempotente', true,

      'entrada_id', v_entrada.id,
      'volume_id', v_volume.id,
      'encomenda_id', v_anterior.id,
      'numero_encomenda', v_anterior.numero_encomenda,

      'event_id', null,
      'log_id', null,

      'status_anterior', v_anterior.status,
      'status', v_anterior.status,

      'localizacao_id', v_localizacao.id,
      'localizacao_codigo', v_localizacao.codigo,
      'localizacao_nome', v_localizacao.nome,
      'localizacao_pai_nome', v_localizacao_pai_nome,
      'localizacao_nome_completo',
        case
          when v_localizacao_pai_nome is null
            then v_localizacao.nome
          else
            v_localizacao_pai_nome
            || ' — '
            || v_localizacao.nome
        end,

      'armazenado_em', v_anterior.armazenado_em,
      'disponibilizado_em', v_anterior.disponibilizado_em,
      'disponibilizado_em_local',
        public.fn_encomendas_data_hora_local_v1(
          v_anterior.disponibilizado_em,
          v_anterior.condominio_id
        ),

      'notificacao_enviada_diretamente', false
    );
  end if;

  -- ========================================================================
  -- 11. ESTADO CANÔNICO
  -- ========================================================================
  if v_anterior.status <> 'ARMAZENADA' then
    raise exception
      'Somente encomendas armazenadas podem ser disponibilizadas por este fluxo.'
      using errcode = '23514';
  end if;

  if not public.fn_encomendas_transicao_status_valida_v1(
    v_anterior.status,
    'DISPONIVEL_RETIRADA'
  ) then
    raise exception
      'A encomenda não pode ser disponibilizada a partir do status atual.'
      using errcode = '23514';
  end if;

  -- ========================================================================
  -- 12. BLOQUEIO POR OCORRÊNCIA CRÍTICA
  -- ========================================================================
  if exists (
    select 1
    from public.encomendas_ocorrencias o
    where o.encomenda_id = v_anterior.id
      and o.business_id = v_anterior.business_id
      and o.condominio_id = v_anterior.condominio_id
      and o.gravidade = 'CRITICA'
      and o.status in (
        'ABERTA',
        'EM_ANALISE'
      )
  ) then
    raise exception
      'Existe uma ocorrência crítica pendente.'
      using errcode = '23514';
  end if;

  -- ========================================================================
  -- 13. DISPONIBILIZAÇÃO
  --
  -- Não altera a localização física.
  -- ========================================================================
  update public.encomendas
  set
    status = 'DISPONIVEL_RETIRADA',

    disponibilizado_em = coalesce(
      disponibilizado_em,
      v_agora
    ),

    disponibilizado_por_usuario_id = coalesce(
      disponibilizado_por_usuario_id,
      auth.uid()
    ),

    ultima_movimentacao_em = v_agora,

    ultima_movimentacao_por_usuario_id = auth.uid(),

    observacoes = concat_ws(
      E'\n',
      nullif(observacoes, ''),
      nullif(btrim(p_observacoes), '')
    ),

    metadata =
      coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'contrato_rpc',
          'rpc_encomenda_disponibilizar_retirada_v2',

        'armazenamento_habilitado',
          true,

        'disponibilizacao_direta',
          false,

        'notificacao_enviada_diretamente',
          false
      )

  where id = v_anterior.id

  returning *
  into v_nova;

  -- ========================================================================
  -- 14. EVENTO DE DOMÍNIO
  --
  -- A Central de Encomendas publica somente o fato.
  -- Agrupamento, roteamento, filas, canais, retry e providers pertencem
  -- à Central de Notificações.
  -- ========================================================================
  v_event_id :=
    public.fn_encomendas_publicar_evento_v2(
      p_event_type :=
        'ENCOMENDA_DISPONIVEL_RETIRADA',

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
          'correlation_id',
            v_nova.correlation_id,

          'entrada_id',
            v_entrada.id,

          'volume_id',
            v_volume.id,

          'pre_recebimento_id',
            v_entrada.pre_recebimento_id,

          'encomenda_id',
            v_nova.id,

          'numero_encomenda',
            v_nova.numero_encomenda,

          'transportadora_id',
            v_nova.transportadora_id,

          'unidade_id',
            v_nova.unidade_id,

          'unidade_oficial_id',
            v_nova.unidade_oficial_id,

          'tipo_entrega',
            v_nova.tipo_entrega,

          -- Identidade nominal da Encomenda.
          -- Não resolve destinatário efetivo da notificação nesta RPC.
          'destinatario_tipo',
            v_nova.destinatario_tipo,

          'destinatario_usuario_id',
            v_nova.destinatario_usuario_id,

          'destinatario_pessoa_id',
            v_nova.destinatario_pessoa_id,

          'destinatario_morador_vinculo_id',
            v_nova.destinatario_morador_vinculo_id,

          'destinatario_dependente_id',
            v_nova.destinatario_dependente_id,

          'destinatario_responsavel_vinculo_id',
            v_nova.destinatario_responsavel_vinculo_id,

          'status_anterior',
            v_anterior.status,

          'status_novo',
            v_nova.status,

          'armazenado_em',
            v_nova.armazenado_em,

          'localizacao_id',
            v_localizacao.id,

          'localizacao_codigo',
            v_localizacao.codigo,

          'localizacao_nome',
            v_localizacao.nome,

          'localizacao_pai_nome',
            v_localizacao_pai_nome,

          'disponibilizado_em',
            v_nova.disponibilizado_em,

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

  -- ========================================================================
  -- 15. LOG V2
  -- ========================================================================
  v_log_id :=
    public.fn_encomendas_registrar_log_v2(
      p_correlation_id :=
        v_nova.correlation_id,

      p_business_id :=
        v_nova.business_id,

      p_condominio_id :=
        v_nova.condominio_id,

      p_acao :=
        'ENCOMENDA_DISPONIVEL_RETIRADA',

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
            v_anterior.armazenado_em,

          'disponibilizado_em',
            v_anterior.disponibilizado_em
        ),

      p_dados_novos :=
        jsonb_build_object(
          'status',
            v_nova.status,

          'localizacao_atual_id',
            v_nova.localizacao_atual_id,

          'armazenado_em',
            v_nova.armazenado_em,

          'disponibilizado_em',
            v_nova.disponibilizado_em
        ),

      p_metadata :=
        jsonb_build_object(
          'contrato_rpc',
            'rpc_encomenda_disponibilizar_retirada_v2',

          'entrada_id',
            v_entrada.id,

          'volume_id',
            v_volume.id,

          'numero_encomenda',
            v_nova.numero_encomenda,

          'localizacao_id',
            v_localizacao.id,

          'localizacao_codigo',
            v_localizacao.codigo,

          'localizacao_nome',
            v_localizacao.nome,

          'localizacao_pai_nome',
            v_localizacao_pai_nome,

          'disponibilizacao_direta',
            false,

          'notificacao_enviada_diretamente',
            false,

          'observacoes_informadas',
            nullif(
              btrim(p_observacoes),
              ''
            ) is not null
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

  -- ========================================================================
  -- 16. RESPOSTA
  -- ========================================================================
  return jsonb_build_object(
    'ok',
      true,

    'contrato',
      'rpc_encomenda_disponibilizar_retirada_v2',

    'idempotente',
      false,

    'entrada_id',
      v_entrada.id,

    'volume_id',
      v_volume.id,

    'encomenda_id',
      v_nova.id,

    'numero_encomenda',
      v_nova.numero_encomenda,

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
        when v_localizacao_pai_nome is null
          then v_localizacao.nome
        else
          v_localizacao_pai_nome
          || ' — '
          || v_localizacao.nome
      end,

    'armazenado_em',
      v_nova.armazenado_em,

    'disponibilizado_em',
      v_nova.disponibilizado_em,

    'disponibilizado_em_local',
      public.fn_encomendas_data_hora_local_v1(
        v_nova.disponibilizado_em,
        v_nova.condominio_id
      ),

    'notificacao_enviada_diretamente',
      false
  );
end;
$function$;

revoke all
on function public.rpc_encomenda_disponibilizar_retirada_v2(
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

revoke all
on function public.rpc_encomenda_disponibilizar_retirada_v2(
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

grant execute
on function public.rpc_encomenda_disponibilizar_retirada_v2(
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

grant execute
on function public.rpc_encomenda_disponibilizar_retirada_v2(
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

grant execute
on function public.rpc_encomenda_disponibilizar_retirada_v2(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text
)
to postgres;

commit;