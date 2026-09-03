-- ============================================================================
-- SISTEMA CHEGOU!
-- GATE E3.3-E.7E.2C
-- CENTRAL DE NOTIFICAÇÕES — FUNDAÇÃO ESTRUTURAL PARA ENCOMENDAS
--
-- Escopo:
--   - itens/eventos de origem
--   - destinatários efetivos
--   - Inbox
--   - preferências configuráveis
--   - deliveries por canal
--   - attempts/retries
--
-- IMPORTANTE:
--   - NÃO implementa worker/projetor.
--   - NÃO consome encomendas_eventos_outbox.
--   - NÃO ativa Push, WhatsApp ou E-mail.
--   - NÃO altera a tabela legada public.notificacoes.
--   - NÃO altera estado operacional de Encomendas.
--   - React NÃO acessa estas tabelas diretamente.
-- ============================================================================

begin;

-- ============================================================================
-- 1. ITENS / EVENTOS QUE COMPÕEM UMA NOTIFICAÇÃO LÓGICA
-- ============================================================================

create table public.central_notificacoes_itens (
  id uuid primary key default gen_random_uuid(),

  central_notificacao_id uuid not null
    references public.central_notificacoes(id)
    on update restrict
    on delete cascade,

  business_id text not null,
  condominio_id uuid not null
    references public.condominios(id)
    on update restrict
    on delete restrict,

  event_id uuid not null,
  event_type text not null,
  event_version integer not null default 1,
  correlation_id uuid,
  causation_id uuid,

  pre_recebimento_id uuid
    references public.encomendas_pre_recebimentos(id)
    on update restrict
    on delete restrict,

  encomenda_id uuid
    references public.encomendas(id)
    on update restrict
    on delete restrict,

  entrada_id uuid,

  unidade_id uuid,

  -- Snapshot relacional do destinatário nominal do item.
  -- A identidade nominal da Encomenda não deve ser alterada quando
  -- a comunicação precisar ser roteada ao responsável.
  destinatario_tipo_nominal text,

  destinatario_usuario_id_nominal uuid
    references public.usuarios(id)
    on update restrict
    on delete restrict,

  destinatario_pessoa_id_nominal uuid
    references public.pessoas(id)
    on update restrict
    on delete restrict,

  destinatario_morador_vinculo_id_nominal uuid
    references public.morador_unidade_vinculos(id)
    on update restrict
    on delete restrict,

  destinatario_dependente_id_nominal uuid
    references public.dependentes_unidade(id)
    on update restrict
    on delete restrict,

  destinatario_responsavel_vinculo_id_nominal uuid
    references public.morador_unidade_vinculos(id)
    on update restrict
    on delete restrict,

  metadata jsonb not null default '{}'::jsonb,

  criado_em timestamptz not null default now(),

  constraint central_notificacoes_itens_event_version_check
    check (event_version >= 1),

  constraint central_notificacoes_itens_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'::text)
);

comment on table public.central_notificacoes_itens is
'Eventos e entidades de origem que compõem uma notificação lógica da Central. Permite agregação sem perder a granularidade e a idempotência por event_id.';

comment on column public.central_notificacoes_itens.event_id is
'Identificador imutável do evento de negócio de origem. Deve existir no máximo uma projeção deste evento na Central.';

comment on column public.central_notificacoes_itens.pre_recebimento_id is
'Identidade relacional do lote/pré-recebimento quando o evento pertence à Central de Encomendas.';

comment on column public.central_notificacoes_itens.destinatario_tipo_nominal is
'Tipo nominal do destinatário registrado na Encomenda. Não representa necessariamente o destinatário efetivo da comunicação.';

create unique index uq_central_notificacoes_itens_event_id
  on public.central_notificacoes_itens (event_id);

create index idx_central_notificacoes_itens_notificacao
  on public.central_notificacoes_itens (central_notificacao_id);

create index idx_central_notificacoes_itens_tenant
  on public.central_notificacoes_itens (business_id, condominio_id);

create index idx_central_notificacoes_itens_encomenda
  on public.central_notificacoes_itens (encomenda_id)
  where encomenda_id is not null;

create index idx_central_notificacoes_itens_pre_recebimento
  on public.central_notificacoes_itens (pre_recebimento_id)
  where pre_recebimento_id is not null;

create index idx_central_notificacoes_itens_correlation
  on public.central_notificacoes_itens (correlation_id)
  where correlation_id is not null;


-- ============================================================================
-- 2. DESTINATÁRIOS EFETIVOS
-- ============================================================================

create table public.central_notificacoes_destinatarios (
  id uuid primary key default gen_random_uuid(),

  central_notificacao_id uuid not null
    references public.central_notificacoes(id)
    on update restrict
    on delete cascade,

  business_id text not null,
  condominio_id uuid not null
    references public.condominios(id)
    on update restrict
    on delete restrict,

  unidade_id uuid,

  tipo_destinatario text not null,

  usuario_id uuid
    references public.usuarios(id)
    on update restrict
    on delete restrict,

  pessoa_id uuid
    references public.pessoas(id)
    on update restrict
    on delete restrict,

  morador_vinculo_id uuid
    references public.morador_unidade_vinculos(id)
    on update restrict
    on delete restrict,

  dependente_id uuid
    references public.dependentes_unidade(id)
    on update restrict
    on delete restrict,

  responsavel_vinculo_id uuid
    references public.morador_unidade_vinculos(id)
    on update restrict
    on delete restrict,

  origem_resolucao text not null,

  status text not null default 'ATIVO',

  metadata jsonb not null default '{}'::jsonb,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint central_notificacoes_destinatarios_tipo_check
    check (
      tipo_destinatario = any (
        array[
          'MORADOR'::text,
          'DEPENDENTE'::text,
          'MORADOR_RESPONSAVEL'::text,
          'OUTRO_AUTORIZADO'::text
        ]
      )
    ),

  constraint central_notificacoes_destinatarios_status_check
    check (
      status = any (
        array[
          'ATIVO'::text,
          'SUPRIMIDO'::text,
          'CANCELADO'::text
        ]
      )
    ),

  constraint central_notificacoes_destinatarios_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'::text)
);

comment on table public.central_notificacoes_destinatarios is
'Destinatários efetivamente resolvidos pela Central de Notificações. Não altera a identidade nominal da entidade de origem.';

comment on column public.central_notificacoes_destinatarios.origem_resolucao is
'Motivo/regra que produziu o destinatário efetivo, por exemplo MORADOR_DIRETO, DEPENDENTE_AUTORIZADO ou DEPENDENTE_ROTEADO_RESPONSAVEL.';

create index idx_central_notificacoes_destinatarios_notificacao
  on public.central_notificacoes_destinatarios (central_notificacao_id);

create index idx_central_notificacoes_destinatarios_tenant
  on public.central_notificacoes_destinatarios (business_id, condominio_id);

create index idx_central_notificacoes_destinatarios_usuario
  on public.central_notificacoes_destinatarios (usuario_id)
  where usuario_id is not null;

create unique index uq_central_notificacoes_destinatario_usuario
  on public.central_notificacoes_destinatarios (
    central_notificacao_id,
    usuario_id
  )
  where usuario_id is not null;


-- ============================================================================
-- 3. PREFERÊNCIAS NORMALIZADAS DA NOVA CENTRAL
-- ============================================================================

create table public.central_notificacoes_preferencias (
  id uuid primary key default gen_random_uuid(),

  business_id text not null,

  condominio_id uuid not null
    references public.condominios(id)
    on update restrict
    on delete restrict,

  usuario_id uuid not null
    references public.usuarios(id)
    on update restrict
    on delete restrict,

  dominio_codigo text not null,

  -- TODAS = preferência padrão daquele domínio/canal.
  -- Uma categoria específica poderá sobrescrever o padrão.
  categoria_codigo text not null default 'TODAS',

  canal text not null,

  habilitado boolean not null default true,

  origem text not null default 'USUARIO',

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint central_notificacoes_preferencias_canal_check
    check (
      canal = any (
        array[
          'IN_APP'::text,
          'PUSH'::text,
          'WHATSAPP'::text,
          'EMAIL'::text
        ]
      )
    ),

  constraint central_notificacoes_preferencias_origem_check
    check (
      origem = any (
        array[
          'USUARIO'::text,
          'PADRAO_SISTEMA'::text,
          'MIGRACAO'::text,
          'ADMINISTRATIVO'::text
        ]
      )
    )
);

comment on table public.central_notificacoes_preferencias is
'Preferências normalizadas da nova Central. O contrato de cada evento decide se a preferência é aplicável. Para Encomendas, In-App e WhatsApp não consultam preferência; Push e E-mail consultam.';

create unique index uq_central_notificacoes_preferencias_contexto
  on public.central_notificacoes_preferencias (
    business_id,
    condominio_id,
    usuario_id,
    dominio_codigo,
    categoria_codigo,
    canal
  );

create index idx_central_notificacoes_preferencias_usuario
  on public.central_notificacoes_preferencias (
    usuario_id,
    condominio_id,
    dominio_codigo,
    canal
  );


-- ============================================================================
-- 4. INBOX
-- ============================================================================

create table public.central_notificacoes_inbox (
  id uuid primary key default gen_random_uuid(),

  central_notificacao_id uuid not null
    references public.central_notificacoes(id)
    on update restrict
    on delete cascade,

  central_destinatario_id uuid not null
    references public.central_notificacoes_destinatarios(id)
    on update restrict
    on delete cascade,

  business_id text not null,

  condominio_id uuid not null
    references public.condominios(id)
    on update restrict
    on delete restrict,

  usuario_id uuid not null
    references public.usuarios(id)
    on update restrict
    on delete restrict,

  status text not null default 'ATIVA',

  visualizada_em timestamptz,
  lida_em timestamptz,
  arquivada_em timestamptz,
  lixeira_em timestamptz,
  restaurada_em timestamptz,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint central_notificacoes_inbox_status_check
    check (
      status = any (
        array[
          'ATIVA'::text,
          'ARQUIVADA'::text,
          'LIXEIRA'::text
        ]
      )
    ),

  constraint central_notificacoes_inbox_lida_check
    check (
      lida_em is null
      or lida_em >= criado_em
    )
);

comment on table public.central_notificacoes_inbox is
'Estado individual da experiência In-App por destinatário. Leitura, arquivamento e Lixeira pertencem à Central, nunca ao domínio de Encomendas.';

create unique index uq_central_notificacoes_inbox_destinatario
  on public.central_notificacoes_inbox (central_destinatario_id);

create index idx_central_notificacoes_inbox_usuario_status
  on public.central_notificacoes_inbox (
    usuario_id,
    condominio_id,
    status,
    criado_em desc
  );

create index idx_central_notificacoes_inbox_nao_lidas
  on public.central_notificacoes_inbox (
    usuario_id,
    condominio_id,
    criado_em desc
  )
  where lida_em is null
    and status = 'ATIVA';


-- ============================================================================
-- 5. DELIVERIES
-- ============================================================================

create table public.central_notificacoes_entregas (
  id uuid primary key default gen_random_uuid(),

  central_notificacao_id uuid not null
    references public.central_notificacoes(id)
    on update restrict
    on delete cascade,

  central_destinatario_id uuid not null
    references public.central_notificacoes_destinatarios(id)
    on update restrict
    on delete cascade,

  business_id text not null,

  condominio_id uuid not null
    references public.condominios(id)
    on update restrict
    on delete restrict,

  canal text not null,

  subcanal text,

  status text not null default 'PENDENTE',

  -- Para Encomendas:
  -- IN_APP / WHATSAPP = NAO_APLICAVEL
  -- PUSH / EMAIL      = RESPEITAR
  regra_preferencia text not null default 'NAO_APLICAVEL',

  preferencia_resultado text not null default 'NAO_APLICAVEL',

  provider_codigo text,

  dispositivo_id uuid
    references public.dispositivos_confiaveis(id)
    on update restrict
    on delete set null,

  template_codigo text not null,
  template_versao integer not null default 1,

  destino_mascarado text,

  chave_idempotencia text not null,

  enfileirada_em timestamptz,
  processando_em timestamptz,
  aceita_provider_em timestamptz,
  enviada_em timestamptz,
  entregue_em timestamptz,
  falha_em timestamptz,
  cancelada_em timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint central_notificacoes_entregas_canal_check
    check (
      canal = any (
        array[
          'IN_APP'::text,
          'PUSH'::text,
          'WHATSAPP'::text,
          'EMAIL'::text
        ]
      )
    ),

  constraint central_notificacoes_entregas_subcanal_check
    check (
      subcanal is null
      or subcanal = any (
        array[
          'WEB'::text,
          'APP_DESKTOP'::text,
          'APP_MOBILE'::text,
          'API'::text
        ]
      )
    ),

  constraint central_notificacoes_entregas_status_check
    check (
      status = any (
        array[
          'PENDENTE'::text,
          'ENFILEIRADA'::text,
          'PROCESSANDO'::text,
          'ACEITA_PROVIDER'::text,
          'ENVIADA'::text,
          'ENTREGUE'::text,
          'FALHA_TEMPORARIA'::text,
          'FALHA_DEFINITIVA'::text,
          'INDISPONIVEL'::text,
          'SUPRIMIDA'::text,
          'CANCELADA'::text
        ]
      )
    ),

  constraint central_notificacoes_entregas_regra_preferencia_check
    check (
      regra_preferencia = any (
        array[
          'NAO_APLICAVEL'::text,
          'RESPEITAR'::text
        ]
      )
    ),

  constraint central_notificacoes_entregas_preferencia_resultado_check
    check (
      preferencia_resultado = any (
        array[
          'NAO_APLICAVEL'::text,
          'HABILITADA'::text,
          'DESABILITADA'::text,
          'NAO_CONFIGURADA'::text
        ]
      )
    ),

  constraint central_notificacoes_entregas_template_versao_check
    check (template_versao >= 1),

  constraint central_notificacoes_entregas_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'::text)
);

comment on table public.central_notificacoes_entregas is
'Intenção e estado técnico de entrega de uma notificação a um destinatário por um canal. Uma entrega pode possuir múltiplas tentativas.';

comment on column public.central_notificacoes_entregas.regra_preferencia is
'Define se o contrato desta entrega consulta preferência. Para Encomendas, In-App e WhatsApp usam NAO_APLICAVEL; Push e E-mail usam RESPEITAR.';

create unique index uq_central_notificacoes_entregas_idempotencia
  on public.central_notificacoes_entregas (chave_idempotencia);

create index idx_central_notificacoes_entregas_destinatario
  on public.central_notificacoes_entregas (central_destinatario_id);

create index idx_central_notificacoes_entregas_processamento
  on public.central_notificacoes_entregas (
    status,
    criado_em
  );

create index idx_central_notificacoes_entregas_tenant_canal
  on public.central_notificacoes_entregas (
    business_id,
    condominio_id,
    canal,
    status
  );


-- ============================================================================
-- 6. ATTEMPTS
-- ============================================================================

create table public.central_notificacoes_tentativas (
  id uuid primary key default gen_random_uuid(),

  central_entrega_id uuid not null
    references public.central_notificacoes_entregas(id)
    on update restrict
    on delete cascade,

  numero_tentativa integer not null,

  provider_codigo text,

  provider_message_id text,

  status text not null,

  iniciado_em timestamptz not null default now(),
  finalizado_em timestamptz,

  proxima_tentativa_em timestamptz,

  erro_codigo text,
  erro_resumo text,
  erro_temporario boolean,

  latencia_ms integer,

  metadata jsonb not null default '{}'::jsonb,

  criado_em timestamptz not null default now(),

  constraint central_notificacoes_tentativas_numero_check
    check (numero_tentativa >= 1),

  constraint central_notificacoes_tentativas_status_check
    check (
      status = any (
        array[
          'INICIADA'::text,
          'ACEITA_PROVIDER'::text,
          'ENVIADA'::text,
          'ENTREGUE'::text,
          'FALHA_TEMPORARIA'::text,
          'FALHA_DEFINITIVA'::text,
          'CANCELADA'::text
        ]
      )
    ),

  constraint central_notificacoes_tentativas_latencia_check
    check (
      latencia_ms is null
      or latencia_ms >= 0
    ),

  constraint central_notificacoes_tentativas_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'::text)
);

comment on table public.central_notificacoes_tentativas is
'Tentativas concretas de execução de uma Delivery. Preserva provider, resultado, erro sanitizado, retry e observabilidade sem repetir o evento operacional.';

create unique index uq_central_notificacoes_tentativas_numero
  on public.central_notificacoes_tentativas (
    central_entrega_id,
    numero_tentativa
  );

create index idx_central_notificacoes_tentativas_retry
  on public.central_notificacoes_tentativas (
    proxima_tentativa_em
  )
  where status = 'FALHA_TEMPORARIA'
    and proxima_tentativa_em is not null;


-- ============================================================================
-- 7. TIMESTAMPS
-- ============================================================================

create or replace function public.fn_central_notificacoes_touch_atualizado_em_v1()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

revoke all on function public.fn_central_notificacoes_touch_atualizado_em_v1()
  from public;

drop trigger if exists trg_central_notificacoes_destinatarios_touch
  on public.central_notificacoes_destinatarios;

create trigger trg_central_notificacoes_destinatarios_touch
before update on public.central_notificacoes_destinatarios
for each row
execute function public.fn_central_notificacoes_touch_atualizado_em_v1();


drop trigger if exists trg_central_notificacoes_preferencias_touch
  on public.central_notificacoes_preferencias;

create trigger trg_central_notificacoes_preferencias_touch
before update on public.central_notificacoes_preferencias
for each row
execute function public.fn_central_notificacoes_touch_atualizado_em_v1();


drop trigger if exists trg_central_notificacoes_inbox_touch
  on public.central_notificacoes_inbox;

create trigger trg_central_notificacoes_inbox_touch
before update on public.central_notificacoes_inbox
for each row
execute function public.fn_central_notificacoes_touch_atualizado_em_v1();


drop trigger if exists trg_central_notificacoes_entregas_touch
  on public.central_notificacoes_entregas;

create trigger trg_central_notificacoes_entregas_touch
before update on public.central_notificacoes_entregas
for each row
execute function public.fn_central_notificacoes_touch_atualizado_em_v1();


-- ============================================================================
-- 8. RLS / GRANTS
--
-- Mesmo padrão server-side da nova central_notificacoes:
-- RLS habilitado + FORCE RLS + sem policy direta para anon/authenticated.
-- O acesso frontend deverá ocorrer por RPC/contrato autorizado da Central.
-- ============================================================================

alter table public.central_notificacoes_itens
  enable row level security;
alter table public.central_notificacoes_itens
  force row level security;

alter table public.central_notificacoes_destinatarios
  enable row level security;
alter table public.central_notificacoes_destinatarios
  force row level security;

alter table public.central_notificacoes_preferencias
  enable row level security;
alter table public.central_notificacoes_preferencias
  force row level security;

alter table public.central_notificacoes_inbox
  enable row level security;
alter table public.central_notificacoes_inbox
  force row level security;

alter table public.central_notificacoes_entregas
  enable row level security;
alter table public.central_notificacoes_entregas
  force row level security;

alter table public.central_notificacoes_tentativas
  enable row level security;
alter table public.central_notificacoes_tentativas
  force row level security;


revoke all on table public.central_notificacoes_itens
  from public, anon, authenticated;

revoke all on table public.central_notificacoes_destinatarios
  from public, anon, authenticated;

revoke all on table public.central_notificacoes_preferencias
  from public, anon, authenticated;

revoke all on table public.central_notificacoes_inbox
  from public, anon, authenticated;

revoke all on table public.central_notificacoes_entregas
  from public, anon, authenticated;

revoke all on table public.central_notificacoes_tentativas
  from public, anon, authenticated;


grant select, insert, update, delete
  on table public.central_notificacoes_itens
  to service_role;

grant select, insert, update, delete
  on table public.central_notificacoes_destinatarios
  to service_role;

grant select, insert, update, delete
  on table public.central_notificacoes_preferencias
  to service_role;

grant select, insert, update, delete
  on table public.central_notificacoes_inbox
  to service_role;

grant select, insert, update, delete
  on table public.central_notificacoes_entregas
  to service_role;

grant select, insert, update, delete
  on table public.central_notificacoes_tentativas
  to service_role;


-- ============================================================================
-- 9. COMENTÁRIOS DE POLÍTICA DE CANAL — ENCOMENDAS
-- ============================================================================

comment on table public.central_notificacoes_preferencias is
'Preferências individuais da nova Central. No contrato de Encomendas: IN_APP e WHATSAPP são obrigatórios e não consultam esta tabela; PUSH e EMAIL consultam preferência quando seus canais estiverem homologados.';

comment on column public.central_notificacoes_entregas.subcanal is
'Subcanal técnico. Para WhatsApp poderá distinguir WEB, APP_DESKTOP, APP_MOBILE e API.';

comment on column public.central_notificacoes_entregas.template_codigo is
'Código imutável do contrato/template lógico utilizado pela entrega.';

comment on column public.central_notificacoes_entregas.template_versao is
'Versão do template/contrato utilizada na criação da entrega.';


commit;