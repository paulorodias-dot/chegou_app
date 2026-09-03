begin;

-- ============================================================================
-- GATE E3.3-E.7B.3A
-- Hardening semântico da Disponibilização V2
--
-- 1. Antecipar a idempotência após autenticação/autorização e integridade
--    canônica Entrada ↔ Volume ↔ Encomenda.
-- 2. Não alterar ultima_movimentacao_* durante Disponibilização, pois não há
--    movimentação física.
-- 3. Manter event_id/log_id = null no retry idempotente; não há chave lógica
--    única segura para recuperar os registros originais sem heurística.
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
  -- 7. IDEMPOTÊNCIA CANÔNICA
  --
  -- Autenticação, autorização e integridade da cadeia oficial já foram
  -- comprovadas acima.
  --
  -- Se a disponibilização já foi concluída, o retry não deve depender de
  -- condições mutáveis posteriores (configuração ativa, bloqueio/atividade
  -- da localização, novas ocorrências etc.).
  --
  -- Esta execução não cria novo evento nem novo log; por isso event_id/log_id
  -- são retornados como null, sem tentativa heurística de recuperar registros
  -- históricos.
  -- ========================================================================
  if v_anterior.status = 'DISPONIVEL_RETIRADA' then

    -- Carrega somente dados descritivos da localização já registrada.
    -- Não exige que a localização continue ativa/desbloqueada para reconhecer
    -- uma transição que já ocorreu com sucesso.
    if v_anterior.localizacao_atual_id is not null then
      select *
      into v_localizacao
      from public.encomendas_localizacoes l
      where l.id = v_anterior.localizacao_atual_id
        and l.condominio_id = v_anterior.condominio_id;

      if found
         and v_localizacao.localizacao_pai_id is not null
      then
        select nome
        into v_localizacao_pai_nome
        from public.encomendas_localizacoes
        where id = v_localizacao.localizacao_pai_id
          and condominio_id = v_anterior.condominio_id;
      end if;
    end if;

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

      'localizacao_id', v_anterior.localizacao_atual_id,
      'localizacao_codigo', v_localizacao.codigo,
      'localizacao_nome', v_localizacao.nome,
      'localizacao_pai_nome', v_localizacao_pai_nome,
      'localizacao_nome_completo',
        case
          when v_localizacao.nome is null then
            null

          when v_localizacao_pai_nome is null then
            v_localizacao.nome

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
  -- 8. CONFIGURAÇÃO
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
  -- 9. IDENTIFICAÇÃO / ARMAZENAMENTO OBRIGATÓRIOS
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
  -- 10. LOCALIZAÇÃO ATUAL VÁLIDA
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

-- Reafirmação explícita da superfície de execução.
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
