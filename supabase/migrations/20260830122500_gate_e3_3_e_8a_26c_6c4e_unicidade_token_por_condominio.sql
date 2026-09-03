-- ============================================================================
-- SISTEMA CHEGOU!
-- GATE E3.3-E.8A.26C.6C.4E
--
-- Correção da unicidade do Token de retirada para arquitetura multi-tenant.
--
-- Regra oficial:
--   - Token padrão possui 6 dígitos;
--   - deve ser único somente entre autoridades ATIVAS
--     do MESMO condomínio;
--   - condomínios distintos podem possuir o mesmo Token simultaneamente;
--   - histórico/inativos não reservam indefinidamente a combinação;
--   - Token Administrativo permanece em domínio de formato separado.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Defesa: o índice global não pode estar associado a uma constraint formal.
-- ----------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from pg_constraint c
    join pg_class i
      on i.oid = c.conindid
    join pg_namespace n
      on n.oid = i.relnamespace
    where n.nspname = 'public'
      and i.relname =
        'uq_encomendas_autorizacoes_token_hash'
  ) then
    raise exception
      'O índice global de token está associado a uma constraint. Migração abortada para revisão manual.';
  end if;
end;
$$;


-- ----------------------------------------------------------------------------
-- 2. Remove a unicidade GLOBAL incorreta.
-- ----------------------------------------------------------------------------

drop index if exists
  public.uq_encomendas_autorizacoes_token_hash;


-- ----------------------------------------------------------------------------
-- 3. Garante a invariante oficial:
--
--    um token_hash não pode existir em duas autoridades ATIVAS
--    do mesmo condomínio.
--
-- O índice já existe no ambiente atual, mas CREATE IF NOT EXISTS deixa
-- a migration defensiva para ambientes novos/reconstruídos.
-- ----------------------------------------------------------------------------

create unique index if not exists
  uq_encomendas_token_ativo_condominio

on public.encomendas_autorizacoes_retirada (
  condominio_id,
  token_hash
)

where
  token_hash is not null
  and status = 'ATIVA';


-- ----------------------------------------------------------------------------
-- 4. Mantém índice de consulta tenant-scoped.
-- ----------------------------------------------------------------------------

create index if not exists
  idx_encomendas_token_consulta_ativa

on public.encomendas_autorizacoes_retirada (
  condominio_id,
  token_hash,
  status
)

where
  token_hash is not null
  and status = 'ATIVA';

commit;