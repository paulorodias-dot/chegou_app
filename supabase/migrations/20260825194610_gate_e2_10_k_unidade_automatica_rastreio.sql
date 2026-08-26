-- =====================================================================
-- SISTEMA CHEGOU!
-- GATE E2.10-K
--
-- Permitir que a Unidade da Entrada seja derivada autoritativamente
-- do Rastreio Aguardado quando existir matching válido.
--
-- Fluxo sem matching continua exigindo Unidade.
-- =====================================================================

do $migration$
declare
  v_sql text;
  v_old text;
  v_count integer;
begin

  select pg_get_functiondef(p.oid)
    into v_sql
  from pg_proc p
  join pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname =
      'rpc_encomenda_entrada_confirmar_v1'
    and pg_get_function_identity_arguments(p.oid) =
      'p_volume_id uuid, p_unidade_id uuid, p_destinatario_tipo text, p_destinatario_morador_vinculo_id uuid, p_destinatario_dependente_id uuid, p_destinatario_usuario_id uuid, p_destinatario_pessoa_id uuid, p_destinatario_nome_informado text, p_tipo_entrega text, p_prioridade text, p_observacoes text, p_chave_idempotencia text, p_ip text, p_user_agent text, p_navegador text, p_sistema_operacional text, p_tipo_dispositivo text, p_identificador_dispositivo text';

  if v_sql is null then
    raise exception
      'E2.10-K: RPC oficial não localizada.';
  end if;


  -- Esta validação antiga ocorre antes de conhecermos o Rastreio
  -- Aguardado e impede a derivação automática da Unidade.

  v_old :=
'  if p_unidade_id is null then

    raise exception
      ''A unidade é obrigatória para confirmar a Entrada Oficial.''
      using errcode = ''22004'';

  end if;


';

  v_count :=
    (
      length(v_sql)
      -
      length(replace(v_sql, v_old, ''))
    )
    /
    nullif(length(v_old), 0);

  if v_count <> 1 then
    raise exception
      'E2.10-K: validação precoce da unidade divergente. Esperado=1 Encontrado=%',
      v_count;
  end if;

  v_sql :=
    replace(
      v_sql,
      v_old,
      ''
    );


  -- Defesa: a validação da unidade EFETIVA criada na E2.10-I
  -- obrigatoriamente deve permanecer.

  if position(
       'if v_unidade_efetiva_id is null then'
       in v_sql
     ) = 0
  then
    raise exception
      'E2.10-K: validação posterior da unidade efetiva não encontrada.';
  end if;

  if position(
       'v_rastreio_aguardado.unidade_id'
       in v_sql
     ) = 0
  then
    raise exception
      'E2.10-K: derivação da unidade pelo Rastreio Aguardado não encontrada.';
  end if;


  execute v_sql;

end;
$migration$;