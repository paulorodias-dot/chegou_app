-- =====================================================================
-- SISTEMA CHEGOU!
-- CENTRAL DE ENCOMENDAS — ENTRADA OFICIAL
--
-- GATE E3.3-E.5A.2I
-- DEPENDENTE COMO DESTINATÁRIO NOMINAL
--
-- CORREÇÃO R1:
-- A primeira versão abortou com segurança porque pg_get_functiondef()
-- não reproduziu exatamente a quebra/indentação usada no replace textual.
-- Esta versão usa regexp_replace() tolerante a whitespace.
--
-- Objetivo:
-- 1. Separar identidade nominal do destinatário de capacidade operacional.
-- 2. Permitir Dependente ATIVO da unidade como destinatário nominal,
--    mesmo com recebe_encomenda = false.
-- 3. Preservar o Morador Responsável oficial no vínculo da Encomenda.
-- 4. Corrigir busca manual e OCR da Entrada.
-- 5. Não implementar notificações nesta migration.
--
-- NÃO ALTERA:
-- - conta_autorizada;
-- - retira_encomenda;
-- - autorizações/tokens de retirada;
-- - disponibilização;
-- - Central de Notificações.
-- =====================================================================

begin;


-- =====================================================================
-- 1. RESOLVEDOR CANÔNICO
-- =====================================================================

do $migration$
declare
  v_oid oid;
  v_def text;
  v_nova text;
begin
  v_oid :=
    to_regprocedure(
      'public.fn_encomendas_resolver_destinatario_v1(uuid,uuid,text,uuid,uuid,uuid,uuid,text)'
    );

  if v_oid is null then
    raise exception
      'E3.3-E.5A.2I: fn_encomendas_resolver_destinatario_v1 não encontrada.';
  end if;

  v_def := pg_get_functiondef(v_oid);

  if v_def !~*
     'coalesce[[:space:]]*\([[:space:]]*du\.recebe_encomenda[[:space:]]*,[[:space:]]*false[[:space:]]*\)[[:space:]]*=[[:space:]]*true'
  then
    raise exception
      'E3.3-E.5A.2I: predicado de recebe_encomenda não localizado no resolvedor.';
  end if;

  v_nova :=
    regexp_replace(
      v_def,
      '[[:space:]]+and[[:space:]]+coalesce[[:space:]]*\([[:space:]]*du\.recebe_encomenda[[:space:]]*,[[:space:]]*false[[:space:]]*\)[[:space:]]*=[[:space:]]*true',
      '',
      'gi'
    );

  if v_nova = v_def
     or v_nova ~*
       'coalesce[[:space:]]*\([[:space:]]*du\.recebe_encomenda[[:space:]]*,[[:space:]]*false[[:space:]]*\)[[:space:]]*=[[:space:]]*true'
  then
    raise exception
      'E3.3-E.5A.2I: não foi possível remover a trava de recebe_encomenda do resolvedor.';
  end if;

  v_nova :=
    replace(
      v_nova,
      'Dependente não encontrado, inativo ou sem autorização para receber encomendas.',
      'Dependente não encontrado, inativo ou fora do contexto da unidade.'
    );

  execute v_nova;
end
$migration$;


-- =====================================================================
-- 2. TRIGGER DE INTEGRIDADE RESIDENCIAL
-- =====================================================================

do $migration$
declare
  v_oid oid;
  v_def text;
  v_nova text;
begin
  v_oid :=
    to_regprocedure(
      'public.fn_encomendas_validar_unidade_destinatario_v1()'
    );

  if v_oid is null then
    raise exception
      'E3.3-E.5A.2I: fn_encomendas_validar_unidade_destinatario_v1 não encontrada.';
  end if;

  v_def := pg_get_functiondef(v_oid);

  if v_def !~*
     'if[[:space:]]+v_dependente\.recebe_encomenda[[:space:]]+is[[:space:]]+not[[:space:]]+true[[:space:]]+then'
  then
    raise exception
      'E3.3-E.5A.2I: bloco de recebe_encomenda não localizado no trigger.';
  end if;

  v_nova :=
    regexp_replace(
      v_def,
      '[[:space:]]+if[[:space:]]+v_dependente\.recebe_encomenda[[:space:]]+is[[:space:]]+not[[:space:]]+true[[:space:]]+then[[:space:]]+raise[[:space:]]+exception[[:space:]]+''O dependente não está autorizado a receber encomendas como destinatário\.''[[:space:]]+using[[:space:]]+errcode[[:space:]]*=[[:space:]]*''23514'';[[:space:]]+end[[:space:]]+if;',
      '',
      'gi'
    );

  if v_nova = v_def
     or v_nova ~*
       'if[[:space:]]+v_dependente\.recebe_encomenda[[:space:]]+is[[:space:]]+not[[:space:]]+true[[:space:]]+then'
  then
    raise exception
      'E3.3-E.5A.2I: não foi possível remover a trava de recebe_encomenda do trigger.';
  end if;

  execute v_nova;
end
$migration$;


-- =====================================================================
-- 3. BUSCA MANUAL DA ENTRADA
-- =====================================================================

do $migration$
declare
  v_oid oid;
  v_def text;
  v_nova text;
begin
  v_oid :=
    to_regprocedure(
      'public.rpc_encomenda_entrada_destinatarios_buscar_v1(uuid,text,uuid,integer)'
    );

  if v_oid is null then
    raise exception
      'E3.3-E.5A.2I: rpc_encomenda_entrada_destinatarios_buscar_v1 não encontrada.';
  end if;

  v_def := pg_get_functiondef(v_oid);

  if v_def !~*
     'and[[:space:]]+du\.recebe_encomenda[[:space:]]*=[[:space:]]*true'
  then
    raise exception
      'E3.3-E.5A.2I: predicado de recebe_encomenda não localizado na busca manual.';
  end if;

  v_nova :=
    regexp_replace(
      v_def,
      '[[:space:]]+and[[:space:]]+du\.recebe_encomenda[[:space:]]*=[[:space:]]*true',
      '',
      'gi'
    );

  if v_nova = v_def
     or v_nova ~*
       'and[[:space:]]+du\.recebe_encomenda[[:space:]]*=[[:space:]]*true'
  then
    raise exception
      'E3.3-E.5A.2I: não foi possível remover a trava da busca manual.';
  end if;

  execute v_nova;
end
$migration$;


-- =====================================================================
-- 4. MATCHING OCR DA ENTRADA
-- =====================================================================

do $migration$
declare
  v_oid oid;
  v_def text;
  v_nova text;
begin
  v_oid :=
    to_regprocedure(
      'public.rpc_encomenda_entrada_destinatarios_ocr_buscar_v1(uuid,text,text,text,integer)'
    );

  if v_oid is null then
    raise exception
      'E3.3-E.5A.2I: rpc_encomenda_entrada_destinatarios_ocr_buscar_v1 não encontrada.';
  end if;

  v_def := pg_get_functiondef(v_oid);

  if v_def !~*
     'and[[:space:]]+du\.recebe_encomenda[[:space:]]*=[[:space:]]*true'
  then
    raise exception
      'E3.3-E.5A.2I: predicado de recebe_encomenda não localizado no matching OCR.';
  end if;

  v_nova :=
    regexp_replace(
      v_def,
      '[[:space:]]+and[[:space:]]+du\.recebe_encomenda[[:space:]]*=[[:space:]]*true',
      '',
      'gi'
    );

  if v_nova = v_def
     or v_nova ~*
       'and[[:space:]]+du\.recebe_encomenda[[:space:]]*=[[:space:]]*true'
  then
    raise exception
      'E3.3-E.5A.2I: não foi possível remover a trava do matching OCR.';
  end if;

  v_nova :=
    replace(
      v_nova,
      '-- 8. CANDIDATOS AUTORIZADOS',
      '-- 8. CANDIDATOS RESIDENCIAIS VÁLIDOS'
    );

  execute v_nova;
end
$migration$;


-- =====================================================================
-- 5. GOVERNANÇA
-- =====================================================================

comment on function public.fn_encomendas_resolver_destinatario_v1(
  uuid,
  uuid,
  text,
  uuid,
  uuid,
  uuid,
  uuid,
  text
) is
'Resolve a identidade canônica do destinatário. Para DEPENDENTE, valida vínculo residencial ativo, unidade, condomínio, responsável oficial e coerência Pessoa/Auth. recebe_encomenda, conta_autorizada e retira_encomenda são capacidades operacionais e não eliminam o Dependente como destinatário nominal.';

comment on function public.fn_encomendas_validar_unidade_destinatario_v1() is
'Invariante estrutural de identidade residencial para encomendas e pré-recebimentos. Valida unidade, condomínio, vínculos, responsável e Pessoa, sem usar recebe_encomenda como requisito para a identidade nominal do Dependente.';

comment on function public.rpc_encomenda_entrada_destinatarios_buscar_v1(
  uuid,
  text,
  uuid,
  integer
) is
'Busca operacional de destinatários da Entrada. Dependentes ATIVOS da unidade com responsável ativo podem ser candidatos nominais independentemente de recebe_encomenda.';

comment on function public.rpc_encomenda_entrada_destinatarios_ocr_buscar_v1(
  uuid,
  text,
  text,
  text,
  integer
) is
'Matching OCR assistido da Entrada. Dependentes ATIVOS da unidade com responsável ativo podem ser candidatos nominais independentemente de recebe_encomenda. OCR não concede autorização operacional.';


commit;


-- =====================================================================
-- AUDITORIA PÓS-MIGRATION — EXECUTAR SEPARADAMENTE
-- =====================================================================
--
-- select
--   p.proname,
--   p.prosecdef as security_definer,
--   pg_get_function_identity_arguments(p.oid) as argumentos,
--   (
--     pg_get_functiondef(p.oid) ~*
--       'coalesce[[:space:]]*\([[:space:]]*du\.recebe_encomenda[[:space:]]*,[[:space:]]*false[[:space:]]*\)[[:space:]]*=[[:space:]]*true'
--     or
--     pg_get_functiondef(p.oid) ~*
--       'and[[:space:]]+du\.recebe_encomenda[[:space:]]*=[[:space:]]*true'
--     or
--     pg_get_functiondef(p.oid) ~*
--       'v_dependente\.recebe_encomenda[[:space:]]+is[[:space:]]+not[[:space:]]+true'
--   ) as ainda_bloqueia_por_recebe_encomenda
-- from pg_proc p
-- join pg_namespace n
--   on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in (
--     'fn_encomendas_resolver_destinatario_v1',
--     'fn_encomendas_validar_unidade_destinatario_v1',
--     'rpc_encomenda_entrada_destinatarios_buscar_v1',
--     'rpc_encomenda_entrada_destinatarios_ocr_buscar_v1'
--   )
-- order by p.proname;
--
-- select
--   c.relname as tabela,
--   t.tgname as trigger_name,
--   pg_get_triggerdef(t.oid, true) as trigger_definition
-- from pg_trigger t
-- join pg_class c on c.oid = t.tgrelid
-- join pg_namespace n on n.oid = c.relnamespace
-- where not t.tgisinternal
--   and n.nspname = 'public'
--   and t.tgfoid =
--       'public.fn_encomendas_validar_unidade_destinatario_v1()'::regprocedure
-- order by c.relname, t.tgname;
-- =====================================================================
