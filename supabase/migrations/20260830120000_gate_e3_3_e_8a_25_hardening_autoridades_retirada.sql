-- ============================================================================
-- Sistema Chegou! — GATE E3.3-E.8A.25
-- Hardening de Autoridades de Retirada
-- Data: 2026-08-30
--
-- NPS NÃO é criado neste gate.
-- ============================================================================

begin;

-- 1) Token Administrativo habilitado por padrão; sem-token permanece desabilitado.
alter table public.configuracoes_encomendas_condominio
  alter column token_administrativo_habilitado set default true;

update public.configuracoes_encomendas_condominio
set token_administrativo_habilitado = true,
    atualizado_em = now()
where token_administrativo_habilitado is distinct from true;

alter table public.configuracoes_encomendas_condominio
  alter column retirada_sem_token_permitida set default false;

update public.configuracoes_encomendas_condominio
set retirada_sem_token_permitida = false,
    atualizado_em = now()
where retirada_sem_token_permitida is distinct from false;

-- 2) QR na mesma autoridade do Token Administrativo.
alter table public.encomendas_tokens_administrativos
  add column if not exists qr_hash text;

comment on column public.encomendas_tokens_administrativos.qr_hash is
  'Hash do payload QR da mesma autoridade do Token Administrativo. O payload nunca é persistido em claro.';

-- 3) Payload QR opaco, independente do Token humano.
create or replace function public.fn_encomendas_gerar_qr_payload_retirada_v1()
returns text
language plpgsql
security definer
set search_path = public
as $function$
begin
  return
    'CHG-R1-' ||
    replace(gen_random_uuid()::text, '-', '') ||
    replace(gen_random_uuid()::text, '-', '');
end;
$function$;

revoke all on function public.fn_encomendas_gerar_qr_payload_retirada_v1()
from public, anon, authenticated;
grant execute on function public.fn_encomendas_gerar_qr_payload_retirada_v1()
to service_role;

-- 4) Permissão estrita do Token Administrativo:
--    N4, N5, ou a exceção Global canônica paulodias.
create or replace function public.fn_encomendas_pode_operar_token_admin_v1(
  p_condominio_id uuid,
  p_business_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and u.ativo = true
      and (
        (
          u.nivel_id in (4, 5)
          and u.condominio_id = p_condominio_id
          and u.business_id = p_business_id
        )
        or
        (
          u.id = '6aaa66b6-200d-4b64-beb6-30f88105cd5c'::uuid
          and u.permissao_global = true
          and lower(btrim(coalesce(u.username, ''))) = 'paulodias'
        )
      )
  );
$function$;

revoke all on function public.fn_encomendas_pode_operar_token_admin_v1(uuid, text)
from public, anon, authenticated;
grant execute on function public.fn_encomendas_pode_operar_token_admin_v1(uuid, text)
to service_role;

-- 5) Guard global: nova autoridade/credencial só nasce em
--    DISPONIVEL_RETIRADA ou RETIRADA_AGENDADA.
create or replace function public.fn_encomendas_guard_credencial_retirada_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_status text;
  v_deve_validar boolean := false;
begin
  select e.status
  into v_status
  from public.encomendas e
  where e.id = new.encomenda_id
  for update;

  if not found then
    raise exception 'Encomenda não encontrada para a autoridade de retirada.';
  end if;

  if tg_op = 'INSERT' then
    v_deve_validar := true;
  elsif tg_table_name = 'encomendas_autorizacoes_retirada' then
    v_deve_validar :=
      old.token_hash is distinct from new.token_hash
      or old.qr_hash is distinct from new.qr_hash
      or (old.status is distinct from new.status and new.status = 'ATIVA');
  elsif tg_table_name = 'encomendas_tokens_administrativos' then
    v_deve_validar :=
      old.token_hash is distinct from new.token_hash
      or old.qr_hash is distinct from new.qr_hash;

    -- Única tolerância: completar, dentro da mesma transação, o QR de um
    -- Token Administrativo que acabou de colocar a Encomenda em EM_RETIRADA.
    if v_deve_validar
       and v_status = 'EM_RETIRADA'
       and old.token_hash is not null
       and old.qr_hash is null
       and new.token_hash = old.token_hash
       and new.qr_hash is not null
       and old.status = 'ATIVO'
       and new.status = 'ATIVO' then
      return new;
    end if;
  elsif tg_table_name = 'encomendas_convites_retirada' then
    v_deve_validar :=
      old.link_hash is distinct from new.link_hash
      or (
        old.status is distinct from new.status
        and new.status in (
          'PENDENTE_COMPARTILHAMENTO',
          'COMPARTILHADO',
          'ACESSADO',
          'TOKEN_GERADO'
        )
      );
  end if;

  if v_deve_validar
     and v_status not in ('DISPONIVEL_RETIRADA', 'RETIRADA_AGENDADA') then
    raise exception
      'A encomenda não está elegível para criação ou renovação de autoridade de retirada. Status atual: %.',
      v_status;
  end if;

  return new;
end;
$function$;

-- Só INSERT precisa ser guardado em convites; atualização de acesso/consumo
-- não deve ser bloqueada pelo estado posterior da Encomenda.
drop trigger if exists trg_encomendas_guard_autorizacao_retirada
on public.encomendas_autorizacoes_retirada;
create trigger trg_encomendas_guard_autorizacao_retirada
before insert or update
on public.encomendas_autorizacoes_retirada
for each row execute function public.fn_encomendas_guard_credencial_retirada_v1();

drop trigger if exists trg_encomendas_guard_token_admin
on public.encomendas_tokens_administrativos;
create trigger trg_encomendas_guard_token_admin
before insert or update
on public.encomendas_tokens_administrativos
for each row execute function public.fn_encomendas_guard_credencial_retirada_v1();

drop trigger if exists trg_encomendas_guard_convite_retirada
on public.encomendas_convites_retirada;
create trigger trg_encomendas_guard_convite_retirada
before insert
on public.encomendas_convites_retirada
for each row execute function public.fn_encomendas_guard_credencial_retirada_v1();

-- 6) Token + QR obrigatórios como par ao final da transação.
create or replace function public.fn_encomendas_validar_par_token_qr_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_token_hash text;
  v_qr_hash text;
  v_status text;
begin
  if tg_table_name = 'encomendas_autorizacoes_retirada' then
    select a.token_hash, a.qr_hash, a.status
    into v_token_hash, v_qr_hash, v_status
    from public.encomendas_autorizacoes_retirada a
    where a.id = new.id;

    if found
       and v_status = 'ATIVA'
       and ((v_token_hash is null) <> (v_qr_hash is null)) then
      raise exception
        'Credencial ativa inválida: Token e QR devem existir como um único par.';
    end if;
  elsif tg_table_name = 'encomendas_tokens_administrativos' then
    select ta.token_hash, ta.qr_hash, ta.status
    into v_token_hash, v_qr_hash, v_status
    from public.encomendas_tokens_administrativos ta
    where ta.id = new.id;

    if found
       and v_status in ('ATIVO', 'VALIDADO')
       and ((v_token_hash is null) <> (v_qr_hash is null)) then
      raise exception
        'Credencial administrativa ativa inválida: Token e QR devem existir como um único par.';
    end if;
  end if;

  return null;
end;
$function$;

drop trigger if exists trg_encomendas_par_token_qr_autorizacao
on public.encomendas_autorizacoes_retirada;
create constraint trigger trg_encomendas_par_token_qr_autorizacao
after insert or update
on public.encomendas_autorizacoes_retirada
deferrable initially deferred
for each row execute function public.fn_encomendas_validar_par_token_qr_v1();

drop trigger if exists trg_encomendas_par_token_qr_admin
on public.encomendas_tokens_administrativos;
create constraint trigger trg_encomendas_par_token_qr_admin
after insert or update
on public.encomendas_tokens_administrativos
deferrable initially deferred
for each row execute function public.fn_encomendas_validar_par_token_qr_v1();

-- Credenciais legadas incompletas abertas não podem sobreviver ao hardening.
update public.encomendas_autorizacoes_retirada
set status = 'CANCELADA',
    cancelada_em = coalesce(cancelada_em, now()),
    motivo_cancelamento = coalesce(
      nullif(btrim(motivo_cancelamento), ''),
      'Credencial legada invalidada no hardening Token + QR.'
    ),
    atualizado_em = now()
where status = 'ATIVA'
  and ((token_hash is null) <> (qr_hash is null));

update public.encomendas_tokens_administrativos
set status = 'CANCELADO',
    cancelado_em = coalesce(cancelado_em, now()),
    motivo_cancelamento = coalesce(
      nullif(btrim(motivo_cancelamento), ''),
      'Credencial administrativa legada invalidada no hardening Token + QR.'
    ),
    atualizado_em = now()
where status in ('ATIVO', 'VALIDADO')
  and token_hash is not null
  and qr_hash is null;

-- 7) Retirada concluída: convites operacionais viram CONSUMIDO, mas link_hash
--    permanece para a página pública POS_RETIRADA.
create or replace function public.fn_encomendas_consumir_convites_pos_retirada_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if new.status = 'FINALIZADA'
     and old.status is distinct from new.status then
    update public.encomendas_convites_retirada c
    set status = 'CONSUMIDO',
        consumido_em = coalesce(c.consumido_em, now()),
        atualizado_em = now(),
        metadata = coalesce(c.metadata, '{}'::jsonb)
          || jsonb_build_object(
            'consumido_automaticamente_pos_retirada', true,
            'encomenda_finalizada_em', new.finalizado_em
          )
    where c.encomenda_id = new.id
      and c.status in (
        'PENDENTE_COMPARTILHAMENTO',
        'COMPARTILHADO',
        'ACESSADO',
        'TOKEN_GERADO'
      );
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_encomendas_consumir_convites_pos_retirada
on public.encomendas;
create trigger trg_encomendas_consumir_convites_pos_retirada
after update of status
on public.encomendas
for each row execute function public.fn_encomendas_consumir_convites_pos_retirada_v1();

-- 8) Morador: mantém contrato V1, endurece status e acrescenta QR.
alter function public.rpc_morador_token_retirada_criar_v1(
  uuid, uuid, uuid, text, text, text, text, text
) rename to rpc_morador_token_retirada_criar_v1_legacy_e8a25;

revoke all on function public.rpc_morador_token_retirada_criar_v1_legacy_e8a25(
  uuid, uuid, uuid, text, text, text, text, text
) from public, anon, authenticated;

create function public.rpc_morador_token_retirada_criar_v1(
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
  v_encomenda public.encomendas%rowtype;
  v_result jsonb;
  v_autorizacao_id uuid;
  v_qr_payload text;
begin
  select * into v_encomenda
  from public.encomendas
  where id = p_encomenda_id
  for update;

  if not found
     or v_encomenda.condominio_id <> p_condominio_id
     or v_encomenda.unidade_id <> p_unidade_id then
    raise exception 'Encomenda inválida para a unidade informada.';
  end if;

  if v_encomenda.status not in ('DISPONIVEL_RETIRADA', 'RETIRADA_AGENDADA') then
    raise exception 'A encomenda não está disponível para geração de credencial.';
  end if;

  v_result := public.rpc_morador_token_retirada_criar_v1_legacy_e8a25(
    p_condominio_id, p_unidade_id, p_encomenda_id,
    p_ip, p_user_agent, p_navegador, p_sistema_operacional, p_tipo_dispositivo
  );

  v_autorizacao_id := coalesce(
    nullif(v_result->>'autorizacao_id', '')::uuid,
    nullif(v_result->>'autorizacao_retirada_id', '')::uuid
  );

  if v_autorizacao_id is null then
    raise exception 'A geração não retornou a autorização criada.';
  end if;

  v_qr_payload := public.fn_encomendas_gerar_qr_payload_retirada_v1();

  update public.encomendas_autorizacoes_retirada
  set qr_hash = public.fn_encomendas_hash_token_v1(v_qr_payload),
      metadata = coalesce(metadata, '{}'::jsonb)
        || jsonb_build_object(
          'credencial_par_token_qr', true,
          'qr_versao', 1,
          'qr_payload_exposto_em_log', false
        ),
      atualizado_em = now()
  where id = v_autorizacao_id
    and encomenda_id = p_encomenda_id
    and status = 'ATIVA';

  if not found then
    raise exception 'Não foi possível concluir o par Token + QR.';
  end if;

  return v_result || jsonb_build_object(
    'qr_payload', v_qr_payload,
    'qr_gerado', true,
    'credencial_par_token_qr', true
  );
end;
$function$;

revoke all on function public.rpc_morador_token_retirada_criar_v1(
  uuid, uuid, uuid, text, text, text, text, text
) from public, anon;
grant execute on function public.rpc_morador_token_retirada_criar_v1(
  uuid, uuid, uuid, text, text, text, text, text
) to authenticated, service_role;

-- 9) Terceiro legado: mantém contrato, endurece status e acrescenta QR.
alter function public.rpc_morador_token_terceiro_criar_v1(
  uuid, uuid, uuid, text, text, text, jsonb, text, text, text, text, text
) rename to rpc_morador_token_terceiro_criar_v1_legacy_e8a25;

revoke all on function public.rpc_morador_token_terceiro_criar_v1_legacy_e8a25(
  uuid, uuid, uuid, text, text, text, jsonb, text, text, text, text, text
) from public, anon, authenticated;

create function public.rpc_morador_token_terceiro_criar_v1(
  p_condominio_id uuid,
  p_unidade_id uuid,
  p_encomenda_id uuid,
  p_terceiro_nome text,
  p_terceiro_documento_mascarado text default null,
  p_terceiro_telefone_mascarado text default null,
  p_metadata jsonb default '{}'::jsonb,
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
  v_encomenda public.encomendas%rowtype;
  v_result jsonb;
  v_autorizacao_id uuid;
  v_qr_payload text;
begin
  select * into v_encomenda
  from public.encomendas
  where id = p_encomenda_id
  for update;

  if not found
     or v_encomenda.condominio_id <> p_condominio_id
     or v_encomenda.unidade_id <> p_unidade_id then
    raise exception 'Encomenda inválida para a unidade informada.';
  end if;

  if v_encomenda.status not in ('DISPONIVEL_RETIRADA', 'RETIRADA_AGENDADA') then
    raise exception 'A encomenda não está disponível para geração de credencial.';
  end if;

  v_result := public.rpc_morador_token_terceiro_criar_v1_legacy_e8a25(
    p_condominio_id, p_unidade_id, p_encomenda_id,
    p_terceiro_nome, p_terceiro_documento_mascarado,
    p_terceiro_telefone_mascarado, coalesce(p_metadata, '{}'::jsonb),
    p_ip, p_user_agent, p_navegador, p_sistema_operacional, p_tipo_dispositivo
  );

  v_autorizacao_id := coalesce(
    nullif(v_result->>'autorizacao_id', '')::uuid,
    nullif(v_result->>'autorizacao_retirada_id', '')::uuid
  );

  if v_autorizacao_id is null then
    raise exception 'A geração não retornou a autorização criada.';
  end if;

  v_qr_payload := public.fn_encomendas_gerar_qr_payload_retirada_v1();

  update public.encomendas_autorizacoes_retirada
  set qr_hash = public.fn_encomendas_hash_token_v1(v_qr_payload),
      metadata = coalesce(metadata, '{}'::jsonb)
        || jsonb_build_object(
          'credencial_par_token_qr', true,
          'qr_versao', 1,
          'qr_payload_exposto_em_log', false
        ),
      atualizado_em = now()
  where id = v_autorizacao_id
    and encomenda_id = p_encomenda_id
    and status = 'ATIVA';

  if not found then
    raise exception 'Não foi possível concluir o par Token + QR.';
  end if;

  return v_result || jsonb_build_object(
    'qr_payload', v_qr_payload,
    'qr_gerado', true,
    'credencial_par_token_qr', true
  );
end;
$function$;

revoke all on function public.rpc_morador_token_terceiro_criar_v1(
  uuid, uuid, uuid, text, text, text, jsonb, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.rpc_morador_token_terceiro_criar_v1(
  uuid, uuid, uuid, text, text, text, jsonb, text, text, text, text, text
) to service_role;

-- 10) Autorização de terceiro V2: não cria Auth; bloqueia ARMAZENADA;
--     anota somente contexto analítico para futuro Master/Insights.
alter function public.rpc_morador_autorizacao_terceiro_criar_v2(
  uuid, uuid, uuid, uuid, text, text, uuid, uuid, uuid, uuid,
  text, text, text, text, jsonb, text, text, text, text, text
) rename to rpc_morador_autorizacao_terceiro_criar_v2_legacy_e8a25;

revoke all on function public.rpc_morador_autorizacao_terceiro_criar_v2_legacy_e8a25(
  uuid, uuid, uuid, uuid, text, text, uuid, uuid, uuid, uuid,
  text, text, text, text, jsonb, text, text, text, text, text
) from public, anon, authenticated;

create function public.rpc_morador_autorizacao_terceiro_criar_v2(
  p_condominio_id uuid,
  p_unidade_id uuid,
  p_encomenda_id uuid,
  p_retirante_salvo_id uuid default null,
  p_origem_retirante text default 'EXTERNO',
  p_nome_completo text default null,
  p_pessoa_id uuid default null,
  p_usuario_id uuid default null,
  p_morador_unidade_vinculo_id uuid default null,
  p_funcionario_unidade_id uuid default null,
  p_documento_mascarado text default null,
  p_ddi_telefone text default '+55',
  p_telefone text default null,
  p_observacoes text default null,
  p_metadata jsonb default '{}'::jsonb,
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
  v_encomenda public.encomendas%rowtype;
  v_auth_contexto text := 'SEM_AUTH';
  v_usuario_condominio_id uuid;
  v_metadata jsonb;
begin
  select * into v_encomenda
  from public.encomendas
  where id = p_encomenda_id
  for update;

  if not found
     or v_encomenda.condominio_id <> p_condominio_id
     or v_encomenda.unidade_id <> p_unidade_id then
    raise exception 'Encomenda inválida para a unidade informada.';
  end if;

  if v_encomenda.status not in ('DISPONIVEL_RETIRADA', 'RETIRADA_AGENDADA') then
    raise exception 'A encomenda não está disponível para autorização de terceiro.';
  end if;

  if p_usuario_id is not null then
    select u.condominio_id
    into v_usuario_condominio_id
    from public.usuarios u
    where u.id = p_usuario_id
      and u.ativo = true;

    if found then
      v_auth_contexto := case
        when v_usuario_condominio_id = p_condominio_id
          then 'MESMO_CONDOMINIO'
        else 'OUTRO_CONDOMINIO'
      end;
    end if;
  end if;

  v_metadata := coalesce(p_metadata, '{}'::jsonb)
    || jsonb_build_object(
      'terceiro_possui_auth', p_usuario_id is not null,
      'terceiro_auth_contexto', v_auth_contexto,
      'insight_master_elegivel', v_auth_contexto = 'OUTRO_CONDOMINIO'
    );

  return public.rpc_morador_autorizacao_terceiro_criar_v2_legacy_e8a25(
    p_condominio_id, p_unidade_id, p_encomenda_id,
    p_retirante_salvo_id, p_origem_retirante, p_nome_completo,
    p_pessoa_id, p_usuario_id, p_morador_unidade_vinculo_id,
    p_funcionario_unidade_id, p_documento_mascarado,
    p_ddi_telefone, p_telefone, p_observacoes, v_metadata,
    p_ip, p_user_agent, p_navegador, p_sistema_operacional, p_tipo_dispositivo
  );
end;
$function$;

revoke all on function public.rpc_morador_autorizacao_terceiro_criar_v2(
  uuid, uuid, uuid, uuid, text, text, uuid, uuid, uuid, uuid,
  text, text, text, text, jsonb, text, text, text, text, text
) from public, anon;
grant execute on function public.rpc_morador_autorizacao_terceiro_criar_v2(
  uuid, uuid, uuid, uuid, text, text, uuid, uuid, uuid, uuid,
  text, text, text, text, jsonb, text, text, text, text, text
) to authenticated, service_role;

-- 11) Token Administrativo: status elegível + permissão estrita + QR.
alter function public.rpc_encomenda_retirada_administrativa_iniciar_v1(
  uuid, text, text, uuid, uuid, text, text, text, boolean, boolean,
  text, text, text, text, text, text
) rename to rpc_encomenda_retirada_administrativa_iniciar_v1_legacy_e8a25;

revoke all on function public.rpc_encomenda_retirada_administrativa_iniciar_v1_legacy_e8a25(
  uuid, text, text, uuid, uuid, text, text, text, boolean, boolean,
  text, text, text, text, text, text
) from public, anon, authenticated;

create function public.rpc_encomenda_retirada_administrativa_iniciar_v1(
  p_encomenda_id uuid,
  p_tipo_retirante text,
  p_retirante_nome text,
  p_retirante_usuario_id uuid default null,
  p_retirante_pessoa_id uuid default null,
  p_documento_mascarado text default null,
  p_motivo_codigo text default null,
  p_justificativa text default null,
  p_documento_validado boolean default false,
  p_identidade_confirmada boolean default false,
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
set search_path = public
as $function$
declare
  v_encomenda public.encomendas%rowtype;
  v_result jsonb;
  v_token_admin_id uuid;
  v_qr_payload text;
begin
  select * into v_encomenda
  from public.encomendas
  where id = p_encomenda_id
  for update;

  if not found then
    raise exception 'Encomenda não encontrada.';
  end if;

  if not public.fn_encomendas_pode_operar_token_admin_v1(
    v_encomenda.condominio_id,
    v_encomenda.business_id
  ) then
    raise exception 'Acesso negado para Token Administrativo.';
  end if;

  if v_encomenda.status not in ('DISPONIVEL_RETIRADA', 'RETIRADA_AGENDADA') then
    raise exception 'A encomenda não está disponível para retirada administrativa.';
  end if;

  v_result := public.rpc_encomenda_retirada_administrativa_iniciar_v1_legacy_e8a25(
    p_encomenda_id, p_tipo_retirante, p_retirante_nome,
    p_retirante_usuario_id, p_retirante_pessoa_id, p_documento_mascarado,
    p_motivo_codigo, p_justificativa, p_documento_validado,
    p_identidade_confirmada, p_ip, p_user_agent, p_navegador,
    p_sistema_operacional, p_tipo_dispositivo, p_identificador_dispositivo
  );

  v_token_admin_id := nullif(v_result->>'token_administrativo_id', '')::uuid;
  if v_token_admin_id is null then
    raise exception 'A criação administrativa não retornou a autoridade criada.';
  end if;

  v_qr_payload := public.fn_encomendas_gerar_qr_payload_retirada_v1();

  update public.encomendas_tokens_administrativos
  set qr_hash = public.fn_encomendas_hash_token_v1(v_qr_payload),
      metadata = coalesce(metadata, '{}'::jsonb)
        || jsonb_build_object(
          'credencial_par_token_qr', true,
          'qr_versao', 1,
          'qr_payload_exposto_em_log', false
        ),
      atualizado_em = now()
  where id = v_token_admin_id
    and encomenda_id = p_encomenda_id
    and status in ('ATIVO', 'VALIDADO');

  if not found then
    raise exception 'Não foi possível concluir o par Token Administrativo + QR.';
  end if;

  return v_result || jsonb_build_object(
    'qr_payload', v_qr_payload,
    'qr_gerado', true,
    'credencial_par_token_qr', true
  );
end;
$function$;

revoke all on function public.rpc_encomenda_retirada_administrativa_iniciar_v1(
  uuid, text, text, uuid, uuid, text, text, text, boolean, boolean,
  text, text, text, text, text, text
) from public, anon;
grant execute on function public.rpc_encomenda_retirada_administrativa_iniciar_v1(
  uuid, text, text, uuid, uuid, text, text, text, boolean, boolean,
  text, text, text, text, text, text
) to authenticated, service_role;

-- 12) Consulta pública: CONSUMIDO + retirada finalizada = POS_RETIRADA read-only.
alter function public.rpc_publico_convite_retirada_consultar_v1(
  text, text, text, text, text, text
) rename to rpc_publico_convite_retirada_consultar_v1_legacy_e8a25;

revoke all on function public.rpc_publico_convite_retirada_consultar_v1_legacy_e8a25(
  text, text, text, text, text, text
) from public, anon, authenticated;

create function public.rpc_publico_convite_retirada_consultar_v1(
  p_segredo_link text,
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
  v_hash text;
  v_convite public.encomendas_convites_retirada%rowtype;
  v_encomenda public.encomendas%rowtype;
  v_autorizacao public.encomendas_autorizacoes_retirada%rowtype;
begin
  if nullif(btrim(p_segredo_link), '') is null then
    raise exception 'Convite inválido ou indisponível.';
  end if;

  v_hash := public.fn_encomendas_hash_token_v1(btrim(p_segredo_link));

  select * into v_convite
  from public.encomendas_convites_retirada
  where link_hash = v_hash
  for update;

  if not found then
    raise exception 'Convite inválido ou indisponível.';
  end if;

  select * into v_encomenda
  from public.encomendas
  where id = v_convite.encomenda_id;

  if not found then
    raise exception 'Convite inválido ou indisponível.';
  end if;

  if v_convite.status = 'CONSUMIDO'
     and v_encomenda.status in ('RETIRADA', 'FINALIZADA') then
    select * into v_autorizacao
    from public.encomendas_autorizacoes_retirada
    where id = v_convite.autorizacao_retirada_id;

    update public.encomendas_convites_retirada
    set ultimo_acesso_em = now(),
        quantidade_acessos = quantidade_acessos + 1,
        atualizado_em = now()
    where id = v_convite.id;

    return jsonb_build_object(
      'ok', true,
      'convite_valido', false,
      'modo', 'POS_RETIRADA',
      'status', 'CONSUMIDO',
      'encomenda_retirada', true,
      'pode_gerar_token', false,
      'pode_gerar_qr', false,
      'pode_regenerar', false,
      'terceiro_nome', v_autorizacao.terceiro_nome,
      'retirado_em', v_encomenda.retirado_em,
      'finalizado_em', v_encomenda.finalizado_em,
      'mensagem',
        'Esta encomenda já foi retirada e nenhuma nova credencial pode ser gerada.'
    );
  end if;

  return public.rpc_publico_convite_retirada_consultar_v1_legacy_e8a25(
    p_segredo_link, p_ip, p_user_agent, p_navegador,
    p_sistema_operacional, p_tipo_dispositivo
  );
end;
$function$;

revoke all on function public.rpc_publico_convite_retirada_consultar_v1(
  text, text, text, text, text, text
) from public;
grant execute on function public.rpc_publico_convite_retirada_consultar_v1(
  text, text, text, text, text, text
) to anon, authenticated, service_role;

-- 13) Link público: geração/regeneração sempre produz o par Token + QR.
alter function public.rpc_publico_convite_retirada_gerar_token_v1(
  text, boolean, text, text, text, text, text, text
) rename to rpc_publico_convite_retirada_gerar_token_v1_legacy_e8a25;

revoke all on function public.rpc_publico_convite_retirada_gerar_token_v1_legacy_e8a25(
  text, boolean, text, text, text, text, text, text
) from public, anon, authenticated;

create function public.rpc_publico_convite_retirada_gerar_token_v1(
  p_segredo_link text,
  p_regenerar boolean default false,
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
set search_path = public
as $function$
declare
  v_hash text;
  v_convite public.encomendas_convites_retirada%rowtype;
  v_autorizacao public.encomendas_autorizacoes_retirada%rowtype;
  v_encomenda public.encomendas%rowtype;
  v_result jsonb;
  v_force_regenerar boolean;
  v_autorizacao_id uuid;
  v_qr_payload text;
begin
  if nullif(btrim(p_segredo_link), '') is null then
    raise exception 'Convite inválido ou indisponível.';
  end if;

  v_hash := public.fn_encomendas_hash_token_v1(btrim(p_segredo_link));

  select * into v_convite
  from public.encomendas_convites_retirada
  where link_hash = v_hash
  for update;

  if not found
     or v_convite.status in ('REVOGADO', 'BLOQUEADO', 'CONSUMIDO') then
    raise exception 'Convite inválido ou indisponível.';
  end if;

  select * into v_autorizacao
  from public.encomendas_autorizacoes_retirada
  where id = v_convite.autorizacao_retirada_id
  for update;

  if not found or v_autorizacao.status <> 'ATIVA' then
    raise exception 'Convite inválido ou indisponível.';
  end if;

  select * into v_encomenda
  from public.encomendas
  where id = v_convite.encomenda_id
  for update;

  if not found
     or v_encomenda.status not in ('DISPONIVEL_RETIRADA', 'RETIRADA_AGENDADA') then
    raise exception 'A encomenda não está disponível para geração de credencial.';
  end if;

  v_force_regenerar :=
    coalesce(p_regenerar, false)
    or (v_autorizacao.token_hash is not null and v_autorizacao.qr_hash is null);

  v_result := public.rpc_publico_convite_retirada_gerar_token_v1_legacy_e8a25(
    p_segredo_link, v_force_regenerar, p_ip, p_user_agent,
    p_navegador, p_sistema_operacional, p_tipo_dispositivo,
    p_identificador_dispositivo
  );

  v_autorizacao_id := coalesce(
    nullif(v_result->>'autorizacao_retirada_id', '')::uuid,
    v_convite.autorizacao_retirada_id
  );

  -- Sem segredo novo, não se reexibe QR antigo: somente informa existência.
  if not (v_result ? 'token') then
    return v_result || jsonb_build_object(
      'qr_ja_gerado', exists (
        select 1
        from public.encomendas_autorizacoes_retirada a
        where a.id = v_autorizacao_id
          and a.qr_hash is not null
      ),
      'qr_exibido', false,
      'credencial_par_token_qr', true
    );
  end if;

  v_qr_payload := public.fn_encomendas_gerar_qr_payload_retirada_v1();

  update public.encomendas_autorizacoes_retirada
  set qr_hash = public.fn_encomendas_hash_token_v1(v_qr_payload),
      metadata = coalesce(metadata, '{}'::jsonb)
        || jsonb_build_object(
          'credencial_par_token_qr', true,
          'qr_versao', 1,
          'qr_regenerado', v_force_regenerar,
          'qr_payload_exposto_em_log', false
        ),
      atualizado_em = now()
  where id = v_autorizacao_id
    and encomenda_id = v_encomenda.id
    and status = 'ATIVA';

  if not found then
    raise exception 'Não foi possível concluir o par Token + QR do convite.';
  end if;

  return v_result || jsonb_build_object(
    'qr_payload', v_qr_payload,
    'qr_gerado', true,
    'qr_regenerado', v_force_regenerar,
    'credencial_par_token_qr', true
  );
end;
$function$;

revoke all on function public.rpc_publico_convite_retirada_gerar_token_v1(
  text, boolean, text, text, text, text, text, text
) from public;
grant execute on function public.rpc_publico_convite_retirada_gerar_token_v1(
  text, boolean, text, text, text, text, text, text
) to anon, authenticated, service_role;

-- 14) Validação canônica V2.
--     Persistência de tentativa inválida sem RAISE após UPDATE.
create or replace function public.rpc_encomenda_retirada_validar_credencial_v2(
  p_retirada_id uuid,
  p_token text default null,
  p_qr_payload text default null,
  p_documento_validado boolean default false,
  p_identidade_confirmada boolean default false,
  p_justificativa text default null,
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
set search_path = public
as $function$
declare
  v_retirada public.encomendas_retiradas%rowtype;
  v_encomenda public.encomendas%rowtype;
  v_autorizacao public.encomendas_autorizacoes_retirada%rowtype;
  v_token_admin public.encomendas_tokens_administrativos%rowtype;
  v_config public.configuracoes_encomendas_condominio%rowtype;
  v_token_normalizado text;
  v_credencial_ok boolean := false;
  v_usou_token boolean := false;
  v_usou_qr boolean := false;
  v_identidade_ok boolean := false;
  v_documento_ok boolean := false;
  v_justificativa_ok boolean := false;
  v_max_tentativas integer := 5;
  v_total_tentativas integer := 0;
  v_bloquear boolean := false;
  v_event_id uuid;
begin
  if nullif(btrim(p_token), '') is not null
     and nullif(btrim(p_qr_payload), '') is not null then
    raise exception 'Informe apenas uma credencial: Token ou QR Code.';
  end if;

  if nullif(btrim(p_token), '') is null
     and nullif(btrim(p_qr_payload), '') is null then
    raise exception 'Informe o Token ou escaneie o QR Code.';
  end if;

  select * into v_retirada
  from public.encomendas_retiradas
  where id = p_retirada_id
  for update;

  if not found then
    raise exception 'Retirada não encontrada.';
  end if;

  if not public.fn_encomendas_pode_operar_condominio_v1(v_retirada.condominio_id) then
    raise exception 'Acesso negado.';
  end if;

  if v_retirada.resultado = 'VALIDADA' then
    return jsonb_build_object(
      'ok', true,
      'idempotente', true,
      'retirada_id', v_retirada.id,
      'resultado', v_retirada.resultado,
      'token_administrativo_id', v_retirada.token_administrativo_id,
      'token_validado', v_retirada.token_validado,
      'qr_validado', v_retirada.qr_validado,
      'validada_em', v_retirada.validada_em
    );
  end if;

  if v_retirada.resultado <> 'INICIADA' then
    raise exception 'A retirada não está aguardando validação.';
  end if;

  select * into v_encomenda
  from public.encomendas
  where id = v_retirada.encomenda_id
  for update;

  if not found or v_encomenda.status <> 'EM_RETIRADA' then
    raise exception 'A encomenda não está no fluxo de retirada.';
  end if;

  if v_retirada.token_administrativo_id is not null then
    if not public.fn_encomendas_pode_operar_token_admin_v1(
      v_retirada.condominio_id,
      v_retirada.business_id
    ) then
      raise exception 'Acesso negado para validação administrativa.';
    end if;

    select * into v_config
    from public.configuracoes_encomendas_condominio c
    where c.condominio_id = v_retirada.condominio_id
    limit 1;

    if not found
       or coalesce(v_config.token_administrativo_habilitado, false) is not true then
      return jsonb_build_object(
        'ok', false,
        'codigo', 'TOKEN_ADMINISTRATIVO_DESABILITADO',
        'mensagem', 'O Token Administrativo não está habilitado para este condomínio.'
      );
    end if;

    select * into v_token_admin
    from public.encomendas_tokens_administrativos ta
    where ta.id = v_retirada.token_administrativo_id
    for update;

    if not found
       or v_token_admin.encomenda_id <> v_retirada.encomenda_id
       or v_token_admin.retirada_id is distinct from v_retirada.id
       or v_token_admin.condominio_id <> v_retirada.condominio_id then
      raise exception 'Token Administrativo não pertence a esta retirada.';
    end if;

    if v_token_admin.status not in ('ATIVO', 'VALIDADO') then
      return jsonb_build_object(
        'ok', false,
        'codigo', 'TOKEN_ADMINISTRATIVO_INDISPONIVEL',
        'status_token', v_token_admin.status
      );
    end if;

    if nullif(btrim(p_token), '') is not null then
      v_usou_token := true;
      v_token_normalizado :=
        public.fn_encomendas_normalizar_token_administrativo_v1(p_token);
      v_credencial_ok :=
        v_token_normalizado is not null
        and length(v_token_normalizado) = 6
        and v_token_normalizado ~ '^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$'
        and v_token_normalizado ~ '[23456789]'
        and v_token_normalizado ~ '[ABCDEFGHJKMNPQRSTUVWXYZ]'
        and public.fn_encomendas_hash_token_v1(v_token_normalizado)
            = v_token_admin.token_hash;
    else
      v_usou_qr := true;
      v_credencial_ok :=
        v_token_admin.qr_hash is not null
        and public.fn_encomendas_hash_token_v1(btrim(p_qr_payload))
            = v_token_admin.qr_hash;
    end if;

    v_identidade_ok :=
      coalesce(p_identidade_confirmada, false)
      or coalesce(v_token_admin.identidade_confirmada, false);
    v_documento_ok :=
      coalesce(p_documento_validado, false)
      or coalesce(v_token_admin.documento_validado, false);
    v_justificativa_ok := nullif(
      btrim(coalesce(p_justificativa, v_retirada.justificativa, '')),
      ''
    ) is not null;

    if coalesce(v_config.token_administrativo_exigir_identidade, true)
       and not v_identidade_ok then
      v_credencial_ok := false;
    end if;
    if coalesce(v_config.token_administrativo_exigir_documento, true)
       and not v_documento_ok then
      v_credencial_ok := false;
    end if;
    if coalesce(v_config.token_administrativo_exigir_justificativa, true)
       and not v_justificativa_ok then
      v_credencial_ok := false;
    end if;

    v_max_tentativas := greatest(
      1,
      least(coalesce(v_config.token_administrativo_max_tentativas, 5), 10)
    );

    if not v_credencial_ok then
      v_total_tentativas := coalesce(v_token_admin.tentativas_invalidas, 0) + 1;
      v_bloquear := v_total_tentativas >= v_max_tentativas;

      update public.encomendas_tokens_administrativos
      set tentativas_invalidas = v_total_tentativas,
          ultima_tentativa_em = now(),
          status = case when v_bloquear then 'BLOQUEADO' else status end,
          bloqueado_em = case
            when v_bloquear then coalesce(bloqueado_em, now())
            else bloqueado_em
          end,
          motivo_bloqueio = case
            when v_bloquear then 'Limite de tentativas inválidas atingido.'
            else motivo_bloqueio
          end,
          atualizado_em = now(),
          metadata = coalesce(metadata, '{}'::jsonb)
            || jsonb_build_object(
              'ultima_tentativa_resultado', 'INVALIDA',
              'ultima_tentativa_meio', case when v_usou_qr then 'QR_CODE' else 'TOKEN' end,
              'token_exposto_em_log', false,
              'qr_payload_exposto_em_log', false
            )
      where id = v_token_admin.id;

      v_event_id := public.fn_encomendas_publicar_evento_v1(
        p_event_type := case
          when v_bloquear then 'ENCOMENDA_TOKEN_ADMINISTRATIVO_BLOQUEADO'
          else 'ENCOMENDA_TOKEN_ADMINISTRATIVO_TENTATIVA_INVALIDA'
        end,
        p_correlation_id := v_retirada.correlation_id,
        p_business_id := v_retirada.business_id,
        p_condominio_id := v_retirada.condominio_id,
        p_origem := 'MODULO_PORTARIA',
        p_modulo := 'CENTRAL_ENCOMENDAS',
        p_payload := jsonb_build_object(
          'retirada_id', v_retirada.id,
          'encomenda_id', v_retirada.encomenda_id,
          'token_administrativo_id', v_token_admin.id,
          'meio_apresentado', case when v_usou_qr then 'QR_CODE' else 'TOKEN' end,
          'tentativas_invalidas', v_total_tentativas,
          'limite_tentativas', v_max_tentativas,
          'bloqueado', v_bloquear,
          'token_exposto', false,
          'qr_payload_exposto', false
        ),
        p_encomenda_id := v_encomenda.id,
        p_transportadora_id := v_encomenda.transportadora_id,
        p_unidade_id := v_encomenda.unidade_id
      );

      perform public.fn_encomendas_registrar_log_v1(
        p_correlation_id := v_retirada.correlation_id,
        p_business_id := v_retirada.business_id,
        p_condominio_id := v_retirada.condominio_id,
        p_acao := case
          when v_bloquear then 'ENCOMENDA_TOKEN_ADMINISTRATIVO_BLOQUEADO'
          else 'ENCOMENDA_TOKEN_ADMINISTRATIVO_TENTATIVA_INVALIDA'
        end,
        p_origem := 'MODULO_PORTARIA',
        p_modulo := 'CENTRAL_ENCOMENDAS',
        p_resultado := 'NEGADO',
        p_encomenda_id := v_encomenda.id,
        p_retirada_id := v_retirada.id,
        p_transportadora_id := v_encomenda.transportadora_id,
        p_unidade_id := v_encomenda.unidade_id,
        p_metadata := jsonb_build_object(
          'token_administrativo_id', v_token_admin.id,
          'meio_apresentado', case when v_usou_qr then 'QR_CODE' else 'TOKEN' end,
          'tentativas_invalidas', v_total_tentativas,
          'limite_tentativas', v_max_tentativas,
          'token_exposto_em_log', false,
          'qr_payload_exposto_em_log', false
        ),
        p_ip := p_ip,
        p_user_agent := p_user_agent,
        p_navegador := p_navegador,
        p_sistema_operacional := p_sistema_operacional,
        p_tipo_dispositivo := p_tipo_dispositivo,
        p_identificador_dispositivo := p_identificador_dispositivo,
        p_event_id := v_event_id
      );

      return jsonb_build_object(
        'ok', false,
        'codigo', case
          when v_bloquear then 'TOKEN_ADMINISTRATIVO_BLOQUEADO'
          else 'TOKEN_ADMINISTRATIVO_INVALIDO'
        end,
        'retirada_id', v_retirada.id,
        'token_administrativo_id', v_token_admin.id,
        'tentativas_invalidas', v_total_tentativas,
        'limite_tentativas', v_max_tentativas,
        'tentativas_restantes', greatest(v_max_tentativas - v_total_tentativas, 0)
      );
    end if;

    update public.encomendas_tokens_administrativos
    set status = 'VALIDADO',
        validado_por_usuario_id = auth.uid(),
        validado_em = coalesce(validado_em, now()),
        ultima_tentativa_em = now(),
        identidade_confirmada = v_identidade_ok,
        documento_validado = v_documento_ok,
        atualizado_em = now(),
        metadata = coalesce(metadata, '{}'::jsonb)
          || jsonb_build_object(
            'ultima_tentativa_resultado', 'VALIDA',
            'meio_validado', case when v_usou_qr then 'QR_CODE' else 'TOKEN' end,
            'token_exposto_em_log', false,
            'qr_payload_exposto_em_log', false
          )
    where id = v_token_admin.id;
  else
    if v_retirada.autorizacao_retirada_id is null then
      raise exception 'A retirada não possui autorização vinculada.';
    end if;

    select * into v_autorizacao
    from public.encomendas_autorizacoes_retirada a
    where a.id = v_retirada.autorizacao_retirada_id
    for update;

    if not found
       or v_autorizacao.encomenda_id <> v_encomenda.id
       or v_autorizacao.status <> 'ATIVA'
       or v_autorizacao.bloqueada_em is not null
       or not public.fn_encomendas_autorizacao_valida_v1(
         v_autorizacao.id, v_encomenda.id, now()
       ) then
      raise exception 'A autorização está inválida, revogada, bloqueada ou indisponível.';
    end if;

    if nullif(btrim(p_token), '') is not null then
      v_usou_token := true;
      v_token_normalizado := public.fn_encomendas_normalizar_token_retirada_v1(p_token);
      v_credencial_ok :=
        nullif(btrim(v_token_normalizado), '') is not null
        and v_autorizacao.token_hash is not null
        and public.fn_encomendas_hash_token_v1(v_token_normalizado)
            = v_autorizacao.token_hash;
    else
      v_usou_qr := true;
      v_credencial_ok :=
        v_autorizacao.qr_hash is not null
        and public.fn_encomendas_hash_token_v1(btrim(p_qr_payload))
            = v_autorizacao.qr_hash;
    end if;

    v_identidade_ok := coalesce(p_identidade_confirmada, false);
    v_credencial_ok := v_credencial_ok and v_identidade_ok;

    select coalesce(c.retirada_token_max_tentativas, 5)
    into v_max_tentativas
    from public.configuracoes_encomendas_condominio c
    where c.condominio_id = v_retirada.condominio_id
    limit 1;

    v_max_tentativas := greatest(1, least(coalesce(v_max_tentativas, 5), 10));

    if not v_credencial_ok then
      v_total_tentativas := coalesce(v_autorizacao.tentativas_invalidas, 0) + 1;
      v_bloquear := v_total_tentativas >= v_max_tentativas;

      update public.encomendas_autorizacoes_retirada
      set tentativas_invalidas = v_total_tentativas,
          ultima_tentativa_em = now(),
          bloqueada_em = case
            when v_bloquear then coalesce(bloqueada_em, now())
            else bloqueada_em
          end,
          motivo_bloqueio = case
            when v_bloquear then 'Limite de tentativas inválidas atingido.'
            else motivo_bloqueio
          end,
          atualizado_em = now(),
          metadata = coalesce(metadata, '{}'::jsonb)
            || jsonb_build_object(
              'ultima_tentativa_resultado', 'INVALIDA',
              'ultima_tentativa_meio', case when v_usou_qr then 'QR_CODE' else 'TOKEN' end,
              'token_exposto_em_log', false,
              'qr_payload_exposto_em_log', false
            )
      where id = v_autorizacao.id;

      v_event_id := public.fn_encomendas_publicar_evento_v1(
        p_event_type := case
          when v_bloquear then 'ENCOMENDA_CREDENCIAL_RETIRADA_BLOQUEADA'
          else 'ENCOMENDA_CREDENCIAL_RETIRADA_TENTATIVA_INVALIDA'
        end,
        p_correlation_id := v_retirada.correlation_id,
        p_business_id := v_retirada.business_id,
        p_condominio_id := v_retirada.condominio_id,
        p_origem := 'MODULO_PORTARIA',
        p_modulo := 'CENTRAL_ENCOMENDAS',
        p_payload := jsonb_build_object(
          'retirada_id', v_retirada.id,
          'encomenda_id', v_retirada.encomenda_id,
          'autorizacao_retirada_id', v_autorizacao.id,
          'meio_apresentado', case when v_usou_qr then 'QR_CODE' else 'TOKEN' end,
          'tentativas_invalidas', v_total_tentativas,
          'limite_tentativas', v_max_tentativas,
          'bloqueado', v_bloquear,
          'token_exposto', false,
          'qr_payload_exposto', false
        ),
        p_encomenda_id := v_encomenda.id,
        p_transportadora_id := v_encomenda.transportadora_id,
        p_unidade_id := v_encomenda.unidade_id
      );

      perform public.fn_encomendas_registrar_log_v1(
        p_correlation_id := v_retirada.correlation_id,
        p_business_id := v_retirada.business_id,
        p_condominio_id := v_retirada.condominio_id,
        p_acao := case
          when v_bloquear then 'ENCOMENDA_CREDENCIAL_RETIRADA_BLOQUEADA'
          else 'ENCOMENDA_CREDENCIAL_RETIRADA_TENTATIVA_INVALIDA'
        end,
        p_origem := 'MODULO_PORTARIA',
        p_modulo := 'CENTRAL_ENCOMENDAS',
        p_resultado := 'NEGADO',
        p_encomenda_id := v_encomenda.id,
        p_retirada_id := v_retirada.id,
        p_autorizacao_retirada_id := v_autorizacao.id,
        p_transportadora_id := v_encomenda.transportadora_id,
        p_unidade_id := v_encomenda.unidade_id,
        p_metadata := jsonb_build_object(
          'meio_apresentado', case when v_usou_qr then 'QR_CODE' else 'TOKEN' end,
          'tentativas_invalidas', v_total_tentativas,
          'limite_tentativas', v_max_tentativas,
          'token_exposto_em_log', false,
          'qr_payload_exposto_em_log', false
        ),
        p_ip := p_ip,
        p_user_agent := p_user_agent,
        p_navegador := p_navegador,
        p_sistema_operacional := p_sistema_operacional,
        p_tipo_dispositivo := p_tipo_dispositivo,
        p_identificador_dispositivo := p_identificador_dispositivo,
        p_event_id := v_event_id
      );

      return jsonb_build_object(
        'ok', false,
        'codigo', case
          when v_bloquear then 'CREDENCIAL_RETIRADA_BLOQUEADA'
          else 'CREDENCIAL_RETIRADA_INVALIDA'
        end,
        'retirada_id', v_retirada.id,
        'autorizacao_retirada_id', v_autorizacao.id,
        'tentativas_invalidas', v_total_tentativas,
        'limite_tentativas', v_max_tentativas,
        'tentativas_restantes', greatest(v_max_tentativas - v_total_tentativas, 0)
      );
    end if;

    v_documento_ok := coalesce(p_documento_validado, false);
  end if;

  update public.encomendas_retiradas
  set resultado = 'VALIDADA',
      validada_por_usuario_id = auth.uid(),
      validada_em = now(),
      token_validado = v_usou_token,
      qr_validado = v_usou_qr,
      documento_validado = case
        when token_administrativo_id is not null then v_documento_ok
        else coalesce(p_documento_validado, false)
      end,
      identidade_confirmada = case
        when token_administrativo_id is not null then v_identidade_ok
        else coalesce(p_identidade_confirmada, false)
      end,
      justificativa = coalesce(nullif(btrim(p_justificativa), ''), justificativa),
      ip = coalesce(p_ip, ip),
      user_agent = coalesce(p_user_agent, user_agent),
      navegador = coalesce(p_navegador, navegador),
      sistema_operacional = coalesce(p_sistema_operacional, sistema_operacional),
      tipo_dispositivo = coalesce(p_tipo_dispositivo, tipo_dispositivo),
      identificador_dispositivo = coalesce(p_identificador_dispositivo, identificador_dispositivo),
      atualizado_em = now()
  where id = v_retirada.id
  returning * into v_retirada;

  v_event_id := public.fn_encomendas_publicar_evento_v1(
    p_event_type := 'ENCOMENDA_RETIRADA_VALIDADA',
    p_correlation_id := v_retirada.correlation_id,
    p_business_id := v_retirada.business_id,
    p_condominio_id := v_retirada.condominio_id,
    p_origem := 'MODULO_PORTARIA',
    p_modulo := 'CENTRAL_ENCOMENDAS',
    p_payload := jsonb_build_object(
      'retirada_id', v_retirada.id,
      'encomenda_id', v_retirada.encomenda_id,
      'autorizacao_retirada_id', v_retirada.autorizacao_retirada_id,
      'token_administrativo_id', v_retirada.token_administrativo_id,
      'meio_validado', case when v_retirada.qr_validado then 'QR_CODE' else 'TOKEN' end,
      'token_validado', v_retirada.token_validado,
      'qr_validado', v_retirada.qr_validado,
      'identidade_confirmada', v_retirada.identidade_confirmada,
      'documento_validado', v_retirada.documento_validado,
      'token_exposto', false,
      'qr_payload_exposto', false
    ),
    p_encomenda_id := v_encomenda.id,
    p_transportadora_id := v_encomenda.transportadora_id,
    p_unidade_id := v_encomenda.unidade_id
  );

  perform public.fn_encomendas_registrar_log_v1(
    p_correlation_id := v_retirada.correlation_id,
    p_business_id := v_retirada.business_id,
    p_condominio_id := v_retirada.condominio_id,
    p_acao := 'ENCOMENDA_RETIRADA_VALIDADA',
    p_origem := 'MODULO_PORTARIA',
    p_modulo := 'CENTRAL_ENCOMENDAS',
    p_resultado := 'SUCESSO',
    p_encomenda_id := v_encomenda.id,
    p_retirada_id := v_retirada.id,
    p_autorizacao_retirada_id := v_retirada.autorizacao_retirada_id,
    p_transportadora_id := v_encomenda.transportadora_id,
    p_unidade_id := v_encomenda.unidade_id,
    p_metadata := jsonb_build_object(
      'token_administrativo_id', v_retirada.token_administrativo_id,
      'meio_validado', case when v_retirada.qr_validado then 'QR_CODE' else 'TOKEN' end,
      'token_exposto_em_log', false,
      'qr_payload_exposto_em_log', false
    ),
    p_ip := p_ip,
    p_user_agent := p_user_agent,
    p_navegador := p_navegador,
    p_sistema_operacional := p_sistema_operacional,
    p_tipo_dispositivo := p_tipo_dispositivo,
    p_identificador_dispositivo := p_identificador_dispositivo,
    p_event_id := v_event_id
  );

  return jsonb_build_object(
    'ok', true,
    'retirada_id', v_retirada.id,
    'encomenda_id', v_retirada.encomenda_id,
    'resultado', v_retirada.resultado,
    'autorizacao_retirada_id', v_retirada.autorizacao_retirada_id,
    'token_administrativo_id', v_retirada.token_administrativo_id,
    'token_validado', v_retirada.token_validado,
    'qr_validado', v_retirada.qr_validado,
    'metodo_apresentado', case when v_retirada.qr_validado then 'QR_CODE' else 'TOKEN' end,
    'validada_em', v_retirada.validada_em
  );
end;
$function$;

revoke all on function public.rpc_encomenda_retirada_validar_credencial_v2(
  uuid, text, text, boolean, boolean, text,
  text, text, text, text, text, text
) from public, anon;
grant execute on function public.rpc_encomenda_retirada_validar_credencial_v2(
  uuid, text, text, boolean, boolean, text,
  text, text, text, text, text, text
) to authenticated, service_role;

-- V1 antigo deixa de ser contrato direto do frontend.
revoke execute on function public.rpc_encomenda_retirada_validar_v1(
  uuid, text, text, boolean, boolean, text,
  text, text, text, text, text, text
) from authenticated;

-- 15) Resolução de QR para futura Tela de Retirada da Portaria.
create or replace function public.rpc_encomenda_retirada_qr_resolver_v1(
  p_qr_payload text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_hash text;
  v_autorizacao public.encomendas_autorizacoes_retirada%rowtype;
  v_token_admin public.encomendas_tokens_administrativos%rowtype;
  v_encomenda public.encomendas%rowtype;
begin
  if nullif(btrim(p_qr_payload), '') is null then
    raise exception 'Informe um QR Code válido.';
  end if;

  v_hash := public.fn_encomendas_hash_token_v1(btrim(p_qr_payload));

  select a.* into v_autorizacao
  from public.encomendas_autorizacoes_retirada a
  join public.encomendas e on e.id = a.encomenda_id
  where a.qr_hash = v_hash
    and a.status = 'ATIVA'
    and a.bloqueada_em is null
    and e.status in ('DISPONIVEL_RETIRADA', 'RETIRADA_AGENDADA')
  limit 1;

  if found then
    select * into v_encomenda
    from public.encomendas
    where id = v_autorizacao.encomenda_id;

    if not public.fn_encomendas_pode_operar_condominio_v1(v_encomenda.condominio_id) then
      raise exception 'Acesso negado.';
    end if;

    return jsonb_build_object(
      'ok', true,
      'tipo_autoridade', 'AUTORIZACAO',
      'encomenda_id', v_encomenda.id,
      'autorizacao_retirada_id', v_autorizacao.id,
      'tipo_autorizacao', v_autorizacao.tipo_autorizacao,
      'token_administrativo_id', null
    );
  end if;

  select ta.* into v_token_admin
  from public.encomendas_tokens_administrativos ta
  where ta.qr_hash = v_hash
    and ta.status in ('ATIVO', 'VALIDADO')
  limit 1;

  if found then
    if not public.fn_encomendas_pode_operar_token_admin_v1(
      v_token_admin.condominio_id,
      v_token_admin.business_id
    ) then
      raise exception 'Acesso negado.';
    end if;

    return jsonb_build_object(
      'ok', true,
      'tipo_autoridade', 'ADMINISTRATIVA',
      'encomenda_id', v_token_admin.encomenda_id,
      'retirada_id', v_token_admin.retirada_id,
      'autorizacao_retirada_id', null,
      'token_administrativo_id', v_token_admin.id
    );
  end if;

  return jsonb_build_object(
    'ok', false,
    'codigo', 'QR_INVALIDO_OU_INDISPONIVEL',
    'mensagem', 'QR Code inválido ou não disponível para retirada.'
  );
end;
$function$;

revoke all on function public.rpc_encomenda_retirada_qr_resolver_v1(text)
from public, anon;
grant execute on function public.rpc_encomenda_retirada_qr_resolver_v1(text)
to authenticated, service_role;

-- 16) RPC genérica legada: sem acesso de authenticated/anon em qualquer overload.
do $do$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as regproc
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rpc_encomenda_autorizacao_retirada_criar_v1'
  loop
    execute format('revoke execute on function %s from authenticated', r.regproc);
    execute format('revoke execute on function %s from anon', r.regproc);
  end loop;
end;
$do$;

-- 17) SEM_TOKEN_JUSTIFICADO fica apenas como valor histórico.
create or replace function public.fn_encomendas_bloquear_sem_token_novo_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if new.metodo_validacao = 'SEM_TOKEN_JUSTIFICADO' then
    raise exception
      'Retirada sem credencial não é permitida. Utilize Token/QR ou Token Administrativo.';
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_encomendas_bloquear_sem_token_novo
on public.encomendas_retiradas;
create trigger trg_encomendas_bloquear_sem_token_novo
before insert
on public.encomendas_retiradas
for each row execute function public.fn_encomendas_bloquear_sem_token_novo_v1();

-- 18) Invariante terminal: FINALIZADA nunca pode commitar autoridade aberta.
create or replace function public.fn_encomendas_assert_terminal_sem_autoridade_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if new.status = 'FINALIZADA' then
    if exists (
      select 1
      from public.encomendas_autorizacoes_retirada a
      where a.encomenda_id = new.id
        and a.status = 'ATIVA'
    ) then
      raise exception 'Invariante violada: FINALIZADA possui autorização ATIVA.';
    end if;

    if exists (
      select 1
      from public.encomendas_tokens_administrativos ta
      where ta.encomenda_id = new.id
        and ta.status in ('ATIVO', 'VALIDADO')
    ) then
      raise exception 'Invariante violada: FINALIZADA possui Token Administrativo aberto.';
    end if;

    if exists (
      select 1
      from public.encomendas_convites_retirada c
      where c.encomenda_id = new.id
        and c.status in (
          'PENDENTE_COMPARTILHAMENTO',
          'COMPARTILHADO',
          'ACESSADO',
          'TOKEN_GERADO'
        )
    ) then
      raise exception 'Invariante violada: FINALIZADA possui convite operacional.';
    end if;
  end if;

  return null;
end;
$function$;

drop trigger if exists trg_encomendas_assert_terminal_sem_autoridade
on public.encomendas;
create constraint trigger trg_encomendas_assert_terminal_sem_autoridade
after update of status
on public.encomendas
deferrable initially deferred
for each row execute function public.fn_encomendas_assert_terminal_sem_autoridade_v1();

-- 19) Helpers internos.
revoke all on function public.fn_encomendas_guard_credencial_retirada_v1()
from public, anon, authenticated;
revoke all on function public.fn_encomendas_validar_par_token_qr_v1()
from public, anon, authenticated;
revoke all on function public.fn_encomendas_consumir_convites_pos_retirada_v1()
from public, anon, authenticated;
revoke all on function public.fn_encomendas_bloquear_sem_token_novo_v1()
from public, anon, authenticated;
revoke all on function public.fn_encomendas_assert_terminal_sem_autoridade_v1()
from public, anon, authenticated;

grant execute on function public.fn_encomendas_guard_credencial_retirada_v1() to service_role;
grant execute on function public.fn_encomendas_validar_par_token_qr_v1() to service_role;
grant execute on function public.fn_encomendas_consumir_convites_pos_retirada_v1() to service_role;
grant execute on function public.fn_encomendas_bloquear_sem_token_novo_v1() to service_role;
grant execute on function public.fn_encomendas_assert_terminal_sem_autoridade_v1() to service_role;

commit;