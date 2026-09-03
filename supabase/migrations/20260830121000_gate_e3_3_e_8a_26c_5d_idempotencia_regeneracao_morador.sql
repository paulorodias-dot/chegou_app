-- ============================================================================
-- SISTEMA CHEGOU!
-- GATE E3.3-E.8A.26C.5D
-- Idempotência + regeneração explícita Token/QR do Morador
-- ============================================================================

begin;

-- ============================================================================
-- 1. INVARIANTE: no máximo uma MORADOR_TITULAR ATIVA por encomenda
-- ============================================================================

do $$
begin
  if exists (
    select 1
    from public.encomendas_autorizacoes_retirada ar
    where ar.tipo_autorizacao = 'MORADOR_TITULAR'
      and ar.status = 'ATIVA'
    group by ar.encomenda_id
    having count(*) > 1
  ) then
    raise exception
      'Hardening abortado: existem múltiplas autorizações MORADOR_TITULAR ATIVAS para a mesma encomenda.';
  end if;
end;
$$;

create unique index if not exists
  uq_encomendas_morador_titular_ativa
on public.encomendas_autorizacoes_retirada (encomenda_id)
where tipo_autorizacao = 'MORADOR_TITULAR'
  and status = 'ATIVA';


-- ============================================================================
-- 2. REVOGAÇÃO — impedir replicação de token_hash/qr_hash em logs
-- ============================================================================

create or replace function public.rpc_encomenda_autorizacao_retirada_revogar_v1(
  p_autorizacao_id uuid,
  p_motivo text,
  p_ip text default null,
  p_user_agent text default null,
  p_navegador text default null,
  p_sistema_operacional text default null,
  p_tipo_dispositivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_anterior
    public.encomendas_autorizacoes_retirada%rowtype;
  v_nova
    public.encomendas_autorizacoes_retirada%rowtype;

  v_encomenda public.encomendas%rowtype;
  v_event_id uuid;
begin
  if nullif(btrim(p_motivo), '') is null then
    raise exception
      'Informe o motivo da revogação.';
  end if;

  select *
  into v_anterior
  from public.encomendas_autorizacoes_retirada
  where id = p_autorizacao_id
  for update;

  if not found then
    raise exception 'Autorização não encontrada.';
  end if;

  if not public.fn_encomendas_pode_autorizar_unidade_v1(
    v_anterior.condominio_id,
    v_anterior.unidade_id
  ) then
    raise exception 'Acesso negado.';
  end if;

  if v_anterior.status = 'REVOGADA' then
    return jsonb_build_object(
      'ok', true,
      'idempotente', true,
      'autorizacao_id', v_anterior.id,
      'status', v_anterior.status
    );
  end if;

  if v_anterior.status = 'UTILIZADA' then
    raise exception
      'Uma autorização já utilizada não pode ser revogada.';
  end if;

  update public.encomendas_autorizacoes_retirada
  set
    status = 'REVOGADA',
    revogada_em = now(),
    revogada_por = auth.uid(),
    motivo_revogacao = btrim(p_motivo),
    atualizado_em = now()
  where id = v_anterior.id
  returning *
  into v_nova;

  if v_nova.encomenda_id is not null then
    select *
    into v_encomenda
    from public.encomendas
    where id = v_nova.encomenda_id;
  end if;

  v_event_id :=
    public.fn_encomendas_publicar_evento_v1(
      p_event_type :=
        'ENCOMENDA_AUTORIZACAO_RETIRADA_REVOGADA',

      p_correlation_id :=
        v_nova.correlation_id,

      p_business_id :=
        v_nova.business_id,

      p_condominio_id :=
        v_nova.condominio_id,

      p_origem :=
        case
          when public.fn_encomendas_pode_operar_condominio_v1(
            v_nova.condominio_id
          )
            then 'MODULO_PORTARIA'
          else 'MODULO_MORADOR'
        end,

      p_modulo :=
        'CENTRAL_ENCOMENDAS',

      p_payload :=
        jsonb_build_object(
          'autorizacao_id',
            v_nova.id,
          'codigo_amigavel',
            v_nova.codigo_amigavel,
          'motivo',
            btrim(p_motivo),
          'segredo_exposto',
            false
        ),

      p_encomenda_id :=
        v_nova.encomenda_id,

      p_transportadora_id :=
        v_encomenda.transportadora_id,

      p_unidade_id :=
        v_nova.unidade_id
    );

  perform public.fn_encomendas_registrar_log_v1(
    p_correlation_id :=
      v_nova.correlation_id,

    p_business_id :=
      v_nova.business_id,

    p_condominio_id :=
      v_nova.condominio_id,

    p_acao :=
      'ENCOMENDA_AUTORIZACAO_RETIRADA_REVOGADA',

    p_origem :=
      case
        when public.fn_encomendas_pode_operar_condominio_v1(
          v_nova.condominio_id
        )
          then 'MODULO_PORTARIA'
        else 'MODULO_MORADOR'
      end,

    p_modulo :=
      'CENTRAL_ENCOMENDAS',

    p_encomenda_id :=
      v_nova.encomenda_id,

    p_autorizacao_retirada_id :=
      v_nova.id,

    p_transportadora_id :=
      v_encomenda.transportadora_id,

    p_unidade_id :=
      v_nova.unidade_id,

    p_status_anterior :=
      v_anterior.status,

    p_status_novo :=
      v_nova.status,

    -- Segurança: hashes permanecem somente na autoridade.
    p_dados_anteriores :=
      to_jsonb(v_anterior)
        - 'token_hash'
        - 'qr_hash',

    p_dados_novos :=
      to_jsonb(v_nova)
        - 'token_hash'
        - 'qr_hash',

    p_metadata :=
      jsonb_build_object(
        'motivo',
          btrim(p_motivo),
        'token_hash_exposto_em_log',
          false,
        'qr_hash_exposto_em_log',
          false,
        'segredo_bruto_exposto_em_log',
          false
      ),

    p_ip := p_ip,
    p_user_agent := p_user_agent,
    p_navegador := p_navegador,
    p_sistema_operacional := p_sistema_operacional,
    p_tipo_dispositivo := p_tipo_dispositivo,

    p_event_id := v_event_id
  );

  return jsonb_build_object(
    'ok', true,
    'autorizacao_id', v_nova.id,
    'status', v_nova.status,
    'revogada_em', v_nova.revogada_em
  );
end;
$function$;


-- ============================================================================
-- 3. GERAR — idempotente por estado
-- ============================================================================

create or replace function public.rpc_morador_token_retirada_criar_v1(
  p_condominio_id uuid,
  p_unidade_id uuid,
  p_encomenda_id uuid,
  p_ip text default null,
  p_user_agent text default null,
  p_navegador text default null,
  p_sistema_operacional text default null,
  p_tipo_dispositivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_usuario_id uuid := auth.uid();

  v_encomenda
    public.encomendas%rowtype;

  v_existente
    public.encomendas_autorizacoes_retirada%rowtype;

  v_result jsonb;
  v_autorizacao_id uuid;
  v_qr_payload text;
begin
  if v_usuario_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not public.fn_encomendas_usuario_acessa_unidade_v1(
    v_usuario_id,
    p_condominio_id,
    p_unidade_id
  ) then
    raise exception
      'Você não possui acesso a esta unidade.';
  end if;

  select *
  into v_encomenda
  from public.encomendas
  where id = p_encomenda_id
    and condominio_id = p_condominio_id
    and unidade_id = p_unidade_id
  for update;

  if not found then
    raise exception
      'A encomenda não pertence à unidade informada.';
  end if;

  if v_encomenda.status not in (
    'DISPONIVEL_RETIRADA',
    'RETIRADA_AGENDADA'
  ) then
    raise exception
      'A encomenda não está disponível para geração de credencial.';
  end if;

  select *
  into v_existente
  from public.encomendas_autorizacoes_retirada ar
  where ar.encomenda_id = p_encomenda_id
    and ar.tipo_autorizacao = 'MORADOR_TITULAR'
    and ar.status = 'ATIVA'
  order by ar.criado_em desc, ar.id desc
  limit 1
  for update;

  if found then
    if v_existente.token_hash is null
       or v_existente.qr_hash is null then
      raise exception
        'A credencial ativa existente está incompleta. Acione o fluxo de correção antes de prosseguir.';
    end if;

    return jsonb_build_object(
      'ok', true,
      'idempotente', true,
      'credencial_ja_existente', true,

      'autorizacao_id',
        v_existente.id,

      'codigo_amigavel',
        v_existente.codigo_amigavel,

      'encomenda_id',
        v_existente.encomenda_id,

      'status',
        v_existente.status,

      'uso_unico',
        v_existente.uso_unico,

      'validade_modelo',
        coalesce(
          v_existente.metadata->>'validade_modelo',
          'CICLO_VIDA_ENCOMENDA'
        ),

      'credencial_par_token_qr',
        true,

      -- Nunca reconstruir/reexpor segredo em retry.
      'token',
        null,

      'qr_payload',
        null,

      'segredo_reexposto',
        false,

      'acao_recomendada',
        'USAR_CREDENCIAL_JA_EXIBIDA_OU_REGENERAR_EXPLICITAMENTE'
    );
  end if;

  v_result :=
    public.rpc_morador_token_retirada_criar_v1_legacy_e8a25(
      p_condominio_id,
      p_unidade_id,
      p_encomenda_id,
      p_ip,
      p_user_agent,
      p_navegador,
      p_sistema_operacional,
      p_tipo_dispositivo
    );

  v_autorizacao_id := coalesce(
    nullif(v_result->>'autorizacao_id', '')::uuid,
    nullif(v_result->>'autorizacao_retirada_id', '')::uuid
  );

  if v_autorizacao_id is null then
    raise exception
      'A geração não retornou a autorização criada.';
  end if;

  v_qr_payload :=
    public.fn_encomendas_gerar_qr_payload_retirada_v1();

  update public.encomendas_autorizacoes_retirada
  set
    qr_hash =
      public.fn_encomendas_hash_token_v1(
        v_qr_payload
      ),

    metadata =
      coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'credencial_par_token_qr',
          true,
        'qr_versao',
          1,
        'qr_payload_exposto_em_log',
          false,
        'geracao_idempotente_v1',
          true
      ),

    atualizado_em = now()

  where id = v_autorizacao_id
    and encomenda_id = p_encomenda_id
    and tipo_autorizacao = 'MORADOR_TITULAR'
    and status = 'ATIVA';

  if not found then
    raise exception
      'Não foi possível concluir o par Token + QR.';
  end if;

  return
    v_result
    || jsonb_build_object(
      'idempotente',
        false,
      'credencial_ja_existente',
        false,
      'qr_payload',
        v_qr_payload,
      'qr_gerado',
        true,
      'credencial_par_token_qr',
        true,
      'segredo_reexposto',
        false
    );
end;
$function$;


-- ============================================================================
-- 4. REGENERAR — somente ação explícita
-- ============================================================================

create or replace function public.rpc_morador_token_retirada_regenerar_v1(
  p_condominio_id uuid,
  p_unidade_id uuid,
  p_encomenda_id uuid,
  p_ip text default null,
  p_user_agent text default null,
  p_navegador text default null,
  p_sistema_operacional text default null,
  p_tipo_dispositivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_usuario_id uuid := auth.uid();

  v_encomenda
    public.encomendas%rowtype;

  v_anterior
    public.encomendas_autorizacoes_retirada%rowtype;

  v_nova
    public.encomendas_autorizacoes_retirada%rowtype;

  v_result jsonb;
  v_nova_autorizacao_id uuid;
  v_qr_payload text;
  v_event_id uuid;
begin
  if v_usuario_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not public.fn_encomendas_usuario_acessa_unidade_v1(
    v_usuario_id,
    p_condominio_id,
    p_unidade_id
  ) then
    raise exception
      'Você não possui acesso a esta unidade.';
  end if;

  select *
  into v_encomenda
  from public.encomendas
  where id = p_encomenda_id
    and condominio_id = p_condominio_id
    and unidade_id = p_unidade_id
  for update;

  if not found then
    raise exception
      'A encomenda não pertence à unidade informada.';
  end if;

  if v_encomenda.status not in (
    'DISPONIVEL_RETIRADA',
    'RETIRADA_AGENDADA'
  ) then
    raise exception
      'A encomenda não está disponível para regeneração de credencial.';
  end if;

  select *
  into v_anterior
  from public.encomendas_autorizacoes_retirada ar
  where ar.encomenda_id = p_encomenda_id
    and ar.tipo_autorizacao = 'MORADOR_TITULAR'
    and ar.status = 'ATIVA'
  order by ar.criado_em desc, ar.id desc
  limit 1
  for update;

  if not found then
    raise exception
      'Não existe credencial ativa para regenerar. Utilize primeiro a geração normal.';
  end if;

  if v_anterior.token_hash is null
     or v_anterior.qr_hash is null then
    raise exception
      'A credencial ativa existente está incompleta. Acione o fluxo de correção antes de regenerar.';
  end if;

  /*
   * O legado permanece interno.
   *
   * Ele:
   *   1. revalida Auth/acesso;
   *   2. trava novamente a mesma Encomenda;
   *   3. revoga MORADOR_TITULAR ATIVA;
   *   4. cria nova autoridade + token_hash;
   *   5. registra o evento normal de emissão.
   *
   * O QR é concluído aqui na MESMA transação.
   */
  v_result :=
    public.rpc_morador_token_retirada_criar_v1_legacy_e8a25(
      p_condominio_id,
      p_unidade_id,
      p_encomenda_id,
      p_ip,
      p_user_agent,
      p_navegador,
      p_sistema_operacional,
      p_tipo_dispositivo
    );

  v_nova_autorizacao_id := coalesce(
    nullif(v_result->>'autorizacao_id', '')::uuid,
    nullif(v_result->>'autorizacao_retirada_id', '')::uuid
  );

  if v_nova_autorizacao_id is null then
    raise exception
      'A regeneração não retornou a nova autorização.';
  end if;

  if v_nova_autorizacao_id = v_anterior.id then
    raise exception
      'A regeneração não substituiu a autoridade anterior.';
  end if;

  v_qr_payload :=
    public.fn_encomendas_gerar_qr_payload_retirada_v1();

  update public.encomendas_autorizacoes_retirada
  set
    qr_hash =
      public.fn_encomendas_hash_token_v1(
        v_qr_payload
      ),

    metadata =
      coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'credencial_par_token_qr',
          true,
        'qr_versao',
          1,
        'qr_payload_exposto_em_log',
          false,
        'regeneracao_explicita',
          true,
        'regenerada_de_autorizacao_id',
          v_anterior.id
      ),

    atualizado_em = now()

  where id = v_nova_autorizacao_id
    and encomenda_id = p_encomenda_id
    and tipo_autorizacao = 'MORADOR_TITULAR'
    and status = 'ATIVA'

  returning *
  into v_nova;

  if not found then
    raise exception
      'Não foi possível concluir o novo par Token + QR.';
  end if;

  /*
   * Preservamos os hashes antigos como evidência histórica na autoridade
   * REVOGADA; o status é o que invalida Token e QR atomicamente.
   */
  update public.encomendas_autorizacoes_retirada
  set
    motivo_revogacao =
      'Credencial substituída por regeneração explícita do Morador.',

    metadata =
      coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'regeneracao_explicita',
          true,
        'regenerada_para_autorizacao_id',
          v_nova.id
      ),

    atualizado_em = now()

  where id = v_anterior.id
    and status = 'REVOGADA';

  v_event_id :=
    public.fn_encomendas_publicar_evento_v1(
      p_event_type :=
        'ENCOMENDA_TOKEN_RETIRADA_REGENERADO',

      p_correlation_id :=
        v_encomenda.correlation_id,

      p_business_id :=
        v_encomenda.business_id,

      p_condominio_id :=
        v_encomenda.condominio_id,

      p_origem :=
        'MODULO_MORADOR',

      p_modulo :=
        'CENTRAL_ENCOMENDAS',

      p_payload :=
        jsonb_build_object(
          'encomenda_id',
            v_encomenda.id,

          'autorizacao_anterior_id',
            v_anterior.id,

          'autorizacao_nova_id',
            v_nova.id,

          'motivo_codigo',
            'REGENERACAO_EXPLICITA_MORADOR',

          'credencial_par_token_qr',
            true,

          'segredo_exposto',
            false
        ),

      p_encomenda_id :=
        v_encomenda.id,

      p_transportadora_id :=
        v_encomenda.transportadora_id,

      p_unidade_id :=
        v_encomenda.unidade_id
    );

  perform public.fn_encomendas_registrar_log_v1(
    p_correlation_id :=
      v_encomenda.correlation_id,

    p_business_id :=
      v_encomenda.business_id,

    p_condominio_id :=
      v_encomenda.condominio_id,

    p_acao :=
      'ENCOMENDA_TOKEN_RETIRADA_REGENERADO',

    p_origem :=
      'MODULO_MORADOR',

    p_modulo :=
      'CENTRAL_ENCOMENDAS',

    p_encomenda_id :=
      v_encomenda.id,

    p_autorizacao_retirada_id :=
      v_nova.id,

    p_transportadora_id :=
      v_encomenda.transportadora_id,

    p_unidade_id :=
      v_encomenda.unidade_id,

    -- Estado operacional da substituição; sem hashes.
    p_status_anterior :=
      'ATIVA',

    p_status_novo :=
      v_nova.status,

    p_dados_anteriores :=
      jsonb_build_object(
        'autorizacao_id',
          v_anterior.id,
        'status',
          'ATIVA'
      ),

    p_dados_novos :=
      jsonb_build_object(
        'autorizacao_id',
          v_nova.id,
        'status',
          v_nova.status,
        'credencial_par_token_qr',
          true
      ),

    p_metadata :=
      jsonb_build_object(
        'motivo_codigo',
          'REGENERACAO_EXPLICITA_MORADOR',

        'token_bruto_exposto_em_log',
          false,

        'qr_bruto_exposto_em_log',
          false,

        'token_hash_exposto_em_log',
          false,

        'qr_hash_exposto_em_log',
          false
      ),

    p_ip := p_ip,
    p_user_agent := p_user_agent,
    p_navegador := p_navegador,
    p_sistema_operacional := p_sistema_operacional,
    p_tipo_dispositivo := p_tipo_dispositivo,

    p_event_id := v_event_id
  );

  return
    v_result
    || jsonb_build_object(
      'idempotente',
        false,

      'regeneracao_explicita',
        true,

      'autorizacao_anterior_id',
        v_anterior.id,

      'autorizacao_id',
        v_nova.id,

      'qr_payload',
        v_qr_payload,

      'qr_gerado',
        true,

      'credencial_par_token_qr',
        true,

      'segredo_reexposto',
        false
    );
end;
$function$;


-- ============================================================================
-- 5. GRANTS
-- ============================================================================

revoke all on function public.rpc_morador_token_retirada_criar_v1(
  uuid, uuid, uuid, text, text, text, text, text
) from public, anon;

grant execute on function public.rpc_morador_token_retirada_criar_v1(
  uuid, uuid, uuid, text, text, text, text, text
) to authenticated, service_role;


revoke all on function public.rpc_morador_token_retirada_regenerar_v1(
  uuid, uuid, uuid, text, text, text, text, text
) from public, anon;

grant execute on function public.rpc_morador_token_retirada_regenerar_v1(
  uuid, uuid, uuid, text, text, text, text, text
) to authenticated, service_role;


-- Legado continua sem acesso direto do frontend.
revoke all on function public.rpc_morador_token_retirada_criar_v1_legacy_e8a25(
  uuid, uuid, uuid, text, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.rpc_morador_token_retirada_criar_v1_legacy_e8a25(
  uuid, uuid, uuid, text, text, text, text, text
) to service_role;

commit;