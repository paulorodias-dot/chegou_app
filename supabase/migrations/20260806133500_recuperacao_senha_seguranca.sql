-- ============================================================================
-- SISTEMA CHEGOU!
-- Migration: Recuperação de Senha — Segurança, Auditoria e Rate Limit
-- Objetivo:
--   1. Registrar solicitações de recuperação sem expor a existência da conta.
--   2. Aplicar cooldown e limites de forma atômica.
--   3. Preservar a identidade canônica (um Auth principal por pessoa).
--   4. Integrar com fila_emails e preparar publicação na Central de Notificações.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Tabela transacional e de auditoria
-- ----------------------------------------------------------------------------

create table if not exists public.solicitacoes_recuperacao_senha (
  id uuid primary key default gen_random_uuid(),
  correlation_id uuid not null default gen_random_uuid(),

  -- Identidade canônica. Preenchida somente depois da resolução segura da conta.
  auth_user_id uuid null,
  usuario_canonico_id uuid null
    references public.usuarios(id)
    on update cascade
    on delete set null,

  -- Dados pseudonimizados. O hash deverá ser HMAC-SHA-256 calculado na Edge.
  email_hash text not null,
  email_mascarado text null,
  ip_hash text null,

  -- Contexto técnico resumido, sem token, OTP, senha ou link completo.
  user_agent_resumido text null,
  sistema_operacional text null,
  navegador text null,

  -- Controle interno. Nunca devolver estes campos ao frontend público.
  status text not null default 'RECEBIDA',
  resultado_interno text null,
  prioridade text not null default 'ALTA',

  -- Integração com o pipeline de e-mail.
  fila_email_id uuid null
    references public.fila_emails(id)
    on update cascade
    on delete set null,
  brevo_message_id text null,

  -- Integração obrigatória com a Central de Notificações.
  notificacao_central_pendente boolean not null default false,
  notificacao_central_event_type text null,
  notificacao_central_event_id uuid null,
  notificacao_central_publicada_em timestamptz null,

  -- Prazos operacionais.
  prazo_estimado_entrega_minutos integer not null default 3,
  validade_link_minutos integer not null default 30,

  solicitado_em timestamptz not null default now(),
  link_gerado_em timestamptz null,
  enfileirado_em timestamptz null,
  enviado_em timestamptz null,
  expira_em timestamptz null,
  concluido_em timestamptz null,

  quantidade_tentativas integer not null default 1,
  ultima_tentativa_em timestamptz not null default now(),

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint solicitacoes_recuperacao_senha_correlation_id_key
    unique (correlation_id),

  constraint solicitacoes_recuperacao_senha_status_check
    check (
      status in (
        'RECEBIDA',
        'IGNORADA_COOLDOWN',
        'IGNORADA_LIMITE_30_MIN',
        'IGNORADA_LIMITE_24_H',
        'CONTA_NAO_LOCALIZADA',
        'CONTA_INATIVA',
        'AUTH_CANONICO_NAO_RESOLVIDO',
        'LINK_GERADO',
        'AGUARDANDO_ENVIO_PRIORITARIO',
        'AGUARDANDO_CAPACIDADE_SEGURANCA',
        'ENFILEIRADA',
        'PROCESSANDO_ENVIO',
        'ENVIADA',
        'ERRO_GERACAO_LINK',
        'ERRO_FILA',
        'ERRO_ENVIO',
        'EXPIRADA',
        'CONCLUIDA'
      )
    ),

  constraint solicitacoes_recuperacao_senha_resultado_check
    check (
      resultado_interno is null
      or resultado_interno in (
        'PENDENTE',
        'EMAIL_ENCONTRADO',
        'EMAIL_NAO_ENCONTRADO',
        'USUARIO_CANONICO_RESOLVIDO',
        'USUARIO_CANONICO_NAO_RESOLVIDO',
        'CONTA_INATIVA',
        'COOLDOWN_ATIVO',
        'LIMITE_30_MIN_ATINGIDO',
        'LIMITE_24_H_ATINGIDO',
        'LINK_GERADO',
        'EMAIL_ENFILEIRADO',
        'EMAIL_ENVIADO',
        'CAPACIDADE_SEGURANCA_INDISPONIVEL',
        'FALHA_PROVEDOR',
        'ERRO_INTERNO'
      )
    ),

  constraint solicitacoes_recuperacao_senha_prioridade_check
    check (prioridade = 'ALTA'),

  constraint solicitacoes_recuperacao_senha_prazo_check
    check (prazo_estimado_entrega_minutos between 1 and 30),

  constraint solicitacoes_recuperacao_senha_validade_check
    check (validade_link_minutos between 5 and 120),

  constraint solicitacoes_recuperacao_senha_tentativas_check
    check (quantidade_tentativas >= 1)
);

comment on table public.solicitacoes_recuperacao_senha is
  'Auditoria e controle de segurança das solicitações públicas de recuperação de senha. Não armazena senha, token, OTP ou link completo.';

comment on column public.solicitacoes_recuperacao_senha.auth_user_id is
  'ID do Auth principal/canônico resolvido no backend. Não representa vínculo por condomínio.';

comment on column public.solicitacoes_recuperacao_senha.usuario_canonico_id is
  'Registro public.usuarios correspondente ao Auth principal/canônico, quando localizado.';

comment on column public.solicitacoes_recuperacao_senha.email_hash is
  'HMAC-SHA-256 do e-mail normalizado, calculado na Edge com segredo próprio.';

comment on column public.solicitacoes_recuperacao_senha.ip_hash is
  'HMAC-SHA-256 do IP normalizado, calculado na Edge com segredo próprio.';

comment on column public.solicitacoes_recuperacao_senha.resultado_interno is
  'Resultado exclusivo de auditoria. Nunca deve ser retornado na resposta pública.';

-- ----------------------------------------------------------------------------
-- 2. Índices operacionais
-- ----------------------------------------------------------------------------

create index if not exists idx_recuperacao_senha_email_solicitado
  on public.solicitacoes_recuperacao_senha (
    email_hash,
    solicitado_em desc
  );

create index if not exists idx_recuperacao_senha_ip_solicitado
  on public.solicitacoes_recuperacao_senha (
    ip_hash,
    solicitado_em desc
  )
  where ip_hash is not null;

create index if not exists idx_recuperacao_senha_status_solicitado
  on public.solicitacoes_recuperacao_senha (
    status,
    solicitado_em desc
  );

create index if not exists idx_recuperacao_senha_auth_user
  on public.solicitacoes_recuperacao_senha (
    auth_user_id,
    solicitado_em desc
  )
  where auth_user_id is not null;

create index if not exists idx_recuperacao_senha_usuario_canonico
  on public.solicitacoes_recuperacao_senha (
    usuario_canonico_id,
    solicitado_em desc
  )
  where usuario_canonico_id is not null;

create index if not exists idx_recuperacao_senha_fila_email
  on public.solicitacoes_recuperacao_senha (fila_email_id)
  where fila_email_id is not null;

create index if not exists idx_recuperacao_senha_notificacao_pendente
  on public.solicitacoes_recuperacao_senha (
    notificacao_central_pendente,
    solicitado_em
  )
  where notificacao_central_pendente = true;

-- ----------------------------------------------------------------------------
-- 3. Atualização automática de atualizado_em
-- ----------------------------------------------------------------------------

create or replace function public.set_atualizado_em_recuperacao_senha()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_recuperacao_senha_atualizado_em
  on public.solicitacoes_recuperacao_senha;

create trigger trg_recuperacao_senha_atualizado_em
before update on public.solicitacoes_recuperacao_senha
for each row
execute function public.set_atualizado_em_recuperacao_senha();

-- ----------------------------------------------------------------------------
-- 4. RPC atômica de entrada e rate limit
--
-- Regras iniciais:
--   - cooldown efetivo: 2 minutos por e-mail;
--   - máximo: 5 solicitações em 30 minutos por e-mail;
--   - máximo: 10 solicitações em 24 horas por e-mail;
--   - máximo: 30 solicitações em 30 minutos por IP;
--
-- A função sempre cria um registro auditável, inclusive quando bloqueia.
-- ----------------------------------------------------------------------------

create or replace function public.iniciar_solicitacao_recuperacao_senha(
  p_email_hash text,
  p_email_mascarado text default null,
  p_ip_hash text default null,
  p_user_agent_resumido text default null,
  p_sistema_operacional text default null,
  p_navegador text default null
)
returns table (
  solicitacao_id uuid,
  correlation_id uuid,
  permitida boolean,
  motivo_interno text,
  status_inicial text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agora timestamptz := now();
  v_ultima_solicitacao timestamptz;
  v_total_30_min integer := 0;
  v_total_24_h integer := 0;
  v_total_ip_30_min integer := 0;
  v_status text := 'RECEBIDA';
  v_motivo text := 'PENDENTE';
  v_permitida boolean := true;
  v_id uuid;
  v_correlation_id uuid;
begin
  if p_email_hash is null or length(trim(p_email_hash)) < 32 then
    raise exception 'email_hash inválido';
  end if;

  -- Evita corrida entre duas solicitações simultâneas do mesmo e-mail.
  perform pg_advisory_xact_lock(
    hashtextextended('recuperacao_senha:' || p_email_hash, 0)
  );

  select max(solicitado_em)
    into v_ultima_solicitacao
  from public.solicitacoes_recuperacao_senha
  where email_hash = p_email_hash;

  select count(*)
    into v_total_30_min
  from public.solicitacoes_recuperacao_senha
  where email_hash = p_email_hash
    and solicitado_em >= v_agora - interval '30 minutes';

  select count(*)
    into v_total_24_h
  from public.solicitacoes_recuperacao_senha
  where email_hash = p_email_hash
    and solicitado_em >= v_agora - interval '24 hours';

  if p_ip_hash is not null then
    select count(*)
      into v_total_ip_30_min
    from public.solicitacoes_recuperacao_senha
    where ip_hash = p_ip_hash
      and solicitado_em >= v_agora - interval '30 minutes';
  end if;

  if v_ultima_solicitacao is not null
     and v_ultima_solicitacao > v_agora - interval '2 minutes' then
    v_permitida := false;
    v_status := 'IGNORADA_COOLDOWN';
    v_motivo := 'COOLDOWN_ATIVO';

  elsif v_total_30_min >= 5 then
    v_permitida := false;
    v_status := 'IGNORADA_LIMITE_30_MIN';
    v_motivo := 'LIMITE_30_MIN_ATINGIDO';

  elsif v_total_24_h >= 10 then
    v_permitida := false;
    v_status := 'IGNORADA_LIMITE_24_H';
    v_motivo := 'LIMITE_24_H_ATINGIDO';

  elsif p_ip_hash is not null and v_total_ip_30_min >= 30 then
    v_permitida := false;
    v_status := 'IGNORADA_LIMITE_30_MIN';
    v_motivo := 'LIMITE_30_MIN_ATINGIDO';
  end if;

  insert into public.solicitacoes_recuperacao_senha (
    email_hash,
    email_mascarado,
    ip_hash,
    user_agent_resumido,
    sistema_operacional,
    navegador,
    status,
    resultado_interno,
    prioridade,
    prazo_estimado_entrega_minutos,
    validade_link_minutos,
    solicitado_em,
    quantidade_tentativas,
    ultima_tentativa_em
  )
  values (
    p_email_hash,
    p_email_mascarado,
    p_ip_hash,
    left(p_user_agent_resumido, 500),
    left(p_sistema_operacional, 80),
    left(p_navegador, 80),
    v_status,
    v_motivo,
    'ALTA',
    3,
    30,
    v_agora,
    1,
    v_agora
  )
  returning
    id,
    solicitacoes_recuperacao_senha.correlation_id
  into
    v_id,
    v_correlation_id;

  return query
  select
    v_id,
    v_correlation_id,
    v_permitida,
    v_motivo,
    v_status;
end;
$$;

comment on function public.iniciar_solicitacao_recuperacao_senha(
  text,
  text,
  text,
  text,
  text,
  text
) is
  'Registra solicitação pública e aplica rate limit atômico. Uso exclusivo de backend/service_role.';

-- ----------------------------------------------------------------------------
-- 5. Segurança: RLS e grants
-- ----------------------------------------------------------------------------

alter table public.solicitacoes_recuperacao_senha
  enable row level security;

-- Nenhuma policy pública é criada intencionalmente.
-- A Edge Function usará cliente administrativo com service_role.

revoke all on table public.solicitacoes_recuperacao_senha
  from anon, authenticated;

revoke all on function public.iniciar_solicitacao_recuperacao_senha(
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon, authenticated;

grant all on table public.solicitacoes_recuperacao_senha
  to service_role;

grant execute on function public.iniciar_solicitacao_recuperacao_senha(
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;

-- ----------------------------------------------------------------------------
-- 6. Validações finais da migration
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'solicitacoes_recuperacao_senha'
  ) then
    raise exception
      'Falha: tabela solicitacoes_recuperacao_senha não foi criada.';
  end if;
end;
$$;

commit;

-- ============================================================================
-- ROLLBACK MANUAL, SOMENTE SE NECESSÁRIO E ANTES DE USO EM PRODUÇÃO:
--
-- begin;
-- drop function if exists public.iniciar_solicitacao_recuperacao_senha(
--   text, text, text, text, text, text
-- );
-- drop trigger if exists trg_recuperacao_senha_atualizado_em
--   on public.solicitacoes_recuperacao_senha;
-- drop function if exists public.set_atualizado_em_recuperacao_senha();
-- drop table if exists public.solicitacoes_recuperacao_senha;
-- commit;
-- ============================================================================