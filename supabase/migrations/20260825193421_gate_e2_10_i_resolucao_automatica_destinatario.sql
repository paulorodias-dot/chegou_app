-- =====================================================================
-- SISTEMA CHEGOU!
-- GATE E2.10-I
--
-- ENTRADA OFICIAL
-- RESOLUÇÃO AUTOMÁTICA DO DESTINATÁRIO A PARTIR DO RASTREIO AGUARDADO
--
-- Regras:
--
-- 1. Volume SEM rastreio_aguardado_id:
--      preserva fluxo manual atual.
--
-- 2. Volume COM rastreio_aguardado_id:
--      Rastreio Aguardado fornece a intenção residencial;
--      backend revalida pelo resolvedor oficial;
--      frontend não pode trocar silenciosamente o destinatário.
--
-- 3. solicitante_usuario_id NÃO é tratado como destinatario_usuario_id.
--
-- 4. payload idempotente passa a representar a identidade EFETIVA
--    utilizada pela operação.
--
-- 5. Migration fail-closed:
--      se a RPC existente não corresponder à versão auditada,
--      nada é alterado.
--
-- NÃO altera migrations homologadas anteriores.
-- =====================================================================

do $migration$
declare
  v_sql text;
  v_original text;

  v_old text;
  v_new text;

  v_count integer;
begin

  -- ===================================================================
  -- 1. CAPTURAR EXATAMENTE A RPC EXISTENTE
  -- ===================================================================

  select pg_get_functiondef(p.oid)
    into v_sql
  from pg_proc p
  join pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'rpc_encomenda_entrada_confirmar_v1'
    and pg_get_function_identity_arguments(p.oid) =
      'p_volume_id uuid, p_unidade_id uuid, p_destinatario_tipo text, p_destinatario_morador_vinculo_id uuid, p_destinatario_dependente_id uuid, p_destinatario_usuario_id uuid, p_destinatario_pessoa_id uuid, p_destinatario_nome_informado text, p_tipo_entrega text, p_prioridade text, p_observacoes text, p_chave_idempotencia text, p_ip text, p_user_agent text, p_navegador text, p_sistema_operacional text, p_tipo_dispositivo text, p_identificador_dispositivo text';

  if v_sql is null then
    raise exception
      'E2.10-I: RPC oficial esperada não foi localizada.';
  end if;

  v_original := v_sql;


  -- ===================================================================
  -- 2. ADICIONAR CONTEXTO DO RASTREIO AGUARDADO
  -- ===================================================================

  v_old :=
'  v_torre_id uuid;

  -- ===================================================================
  -- IDEMPOTÊNCIA';

  v_new :=
'  v_torre_id uuid;

  -- ===================================================================
  -- E2.10-I — INTENÇÃO RESIDENCIAL DO RASTREIO AGUARDADO
  -- ===================================================================

  v_rastreio_aguardado
    public.encomendas_rastreios_aguardados%rowtype;

  v_possui_matching boolean := false;

  v_unidade_efetiva_id uuid;

  v_destinatario_tipo_efetivo text;

  v_destinatario_morador_vinculo_efetivo uuid;

  v_destinatario_dependente_efetivo uuid;

  v_destinatario_usuario_efetivo uuid;

  v_destinatario_pessoa_efetivo uuid;

  v_destinatario_nome_efetivo text;

  -- ===================================================================
  -- IDEMPOTÊNCIA';

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
      'E2.10-I: ponto de declaração divergente. Esperado=1 Encontrado=%',
      v_count;
  end if;

  v_sql :=
    replace(
      v_sql,
      v_old,
      v_new
    );


  -- ===================================================================
  -- 3. RESOLVER A INTENÇÃO EFETIVA ANTES DO PAYLOAD IDEMPOTENTE
  --
  -- Este bloco entra depois da autorização/contexto do operador e antes
  -- da criação da chave/payload idempotente.
  -- ===================================================================

  v_old :=
'  -- ===================================================================
  -- 5. CHAVE IDEMPOTENTE
  -- ===================================================================';

  v_new :=
'  -- ===================================================================
  -- E2.10-I
  -- RESOLVER A INTENÇÃO RESIDENCIAL EFETIVA
  --
  -- O Rastreio Aguardado NÃO substitui o resolvedor oficial.
  -- Ele apenas fornece a intenção residencial previamente declarada.
  -- ===================================================================

  v_unidade_efetiva_id :=
    p_unidade_id;

  v_destinatario_tipo_efetivo :=
    nullif(
      upper(
        btrim(
          coalesce(
            p_destinatario_tipo,
            ''''
          )
        )
      ),
      ''''
    );

  v_destinatario_morador_vinculo_efetivo :=
    p_destinatario_morador_vinculo_id;

  v_destinatario_dependente_efetivo :=
    p_destinatario_dependente_id;

  v_destinatario_usuario_efetivo :=
    p_destinatario_usuario_id;

  v_destinatario_pessoa_efetivo :=
    p_destinatario_pessoa_id;

  v_destinatario_nome_efetivo :=
    nullif(
      btrim(
        coalesce(
          p_destinatario_nome_informado,
          ''''
        )
      ),
      ''''
    );


  if v_volume_inicial.rastreio_aguardado_id is not null then

    select ra.*
      into v_rastreio_aguardado
    from public.encomendas_rastreios_aguardados ra
    where ra.id =
          v_volume_inicial.rastreio_aguardado_id;

    if not found then
      raise exception
        ''E2.10-I: o Volume referencia um Rastreio Aguardado inexistente.''
        using errcode = ''23514'';
    end if;


    -- ---------------------------------------------------------------
    -- Integridade bilateral
    -- ---------------------------------------------------------------

    if v_rastreio_aguardado.volume_id
         is distinct from
         v_volume_inicial.id
    then
      raise exception
        ''E2.10-I: vínculo Volume/Rastreio Aguardado divergente.''
        using errcode = ''23514'';
    end if;


    -- ---------------------------------------------------------------
    -- Isolamento multi-tenant
    -- ---------------------------------------------------------------

    if v_rastreio_aguardado.business_id
         is distinct from
         v_volume_inicial.business_id

       or

       v_rastreio_aguardado.condominio_id
         is distinct from
         v_volume_inicial.condominio_id
    then
      raise exception
        ''E2.10-I: Rastreio Aguardado pertence a outro contexto.''
        using errcode = ''42501'';
    end if;


    -- ---------------------------------------------------------------
    -- Somente matching operacional válido participa da automação.
    -- ---------------------------------------------------------------

    if v_rastreio_aguardado.status =
       ''AGUARDANDO_ENTRADA''
    then

      v_possui_matching :=
        true;


      -- -------------------------------------------------------------
      -- A unidade do Rastreio é a intenção autoritativa.
      --
      -- Se o frontend já enviou uma unidade, ela deve ser exatamente
      -- a mesma. Não corrigir silenciosamente uma divergência.
      -- -------------------------------------------------------------

      if p_unidade_id is not null
         and p_unidade_id
               is distinct from
               v_rastreio_aguardado.unidade_id
      then
        raise exception
          ''E2.10-I: unidade informada diverge do Rastreio Aguardado.''
          using errcode = ''23514'';
      end if;

      v_unidade_efetiva_id :=
        v_rastreio_aguardado.unidade_id;


      -- -------------------------------------------------------------
      -- Determinar tipo pela identidade do beneficiário.
      -- -------------------------------------------------------------

      if v_rastreio_aguardado.beneficiario_dependente_id
           is not null
      then

        v_destinatario_tipo_efetivo :=
          ''DEPENDENTE'';

        v_destinatario_morador_vinculo_efetivo :=
          null;

        v_destinatario_dependente_efetivo :=
          v_rastreio_aguardado.beneficiario_dependente_id;

      else

        v_destinatario_tipo_efetivo :=
          ''MORADOR'';

        v_destinatario_morador_vinculo_efetivo :=
          v_rastreio_aguardado.morador_unidade_vinculo_id;

        v_destinatario_dependente_efetivo :=
          null;

      end if;


      v_destinatario_pessoa_efetivo :=
        v_rastreio_aguardado.beneficiario_pessoa_id;


      -- -------------------------------------------------------------
      -- IMPORTANTE:
      --
      -- solicitante_usuario_id NÃO é destinatario_usuario_id.
      --
      -- O usuário canônico será novamente descoberto pelo resolvedor.
      -- -------------------------------------------------------------

      v_destinatario_usuario_efetivo :=
        null;

      v_destinatario_nome_efetivo :=
        null;


      -- -------------------------------------------------------------
      -- Divergência explícita do tipo.
      -- -------------------------------------------------------------

      if nullif(
           upper(
             btrim(
               coalesce(
                 p_destinatario_tipo,
                 ''''
               )
             )
           ),
           ''''
         ) is not null

         and

         nullif(
           upper(
             btrim(
               coalesce(
                 p_destinatario_tipo,
                 ''''
               )
             )
           ),
           ''''
         ) is distinct from
             v_destinatario_tipo_efetivo
      then

        raise exception
          ''E2.10-I: tipo de destinatário informado diverge do Rastreio Aguardado.''
          using errcode = ''23514'';

      end if;


      -- -------------------------------------------------------------
      -- Divergência explícita do vínculo de Morador.
      -- -------------------------------------------------------------

      if p_destinatario_morador_vinculo_id is not null
         and
         p_destinatario_morador_vinculo_id
           is distinct from
           v_destinatario_morador_vinculo_efetivo
      then

        raise exception
          ''E2.10-I: vínculo do Morador informado diverge do Rastreio Aguardado.''
          using errcode = ''23514'';

      end if;


      -- -------------------------------------------------------------
      -- Divergência explícita do Dependente.
      -- -------------------------------------------------------------

      if p_destinatario_dependente_id is not null
         and
         p_destinatario_dependente_id
           is distinct from
           v_destinatario_dependente_efetivo
      then

        raise exception
          ''E2.10-I: Dependente informado diverge do Rastreio Aguardado.''
          using errcode = ''23514'';

      end if;


      -- -------------------------------------------------------------
      -- Divergência explícita da Pessoa.
      -- -------------------------------------------------------------

      if p_destinatario_pessoa_id is not null
         and
         p_destinatario_pessoa_id
           is distinct from
           v_destinatario_pessoa_efetivo
      then

        raise exception
          ''E2.10-I: Pessoa informada diverge do Rastreio Aguardado.''
          using errcode = ''23514'';

      end if;

    end if;

  end if;


  if v_unidade_efetiva_id is null then
    raise exception
      ''A unidade é obrigatória para confirmar a Entrada Oficial.''
      using errcode = ''22004'';
  end if;


  -- ===================================================================
  -- 5. CHAVE IDEMPOTENTE
  -- ===================================================================';

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
      'E2.10-I: ponto pré-idempotência divergente. Esperado=1 Encontrado=%',
      v_count;
  end if;

  v_sql :=
    replace(
      v_sql,
      v_old,
      v_new
    );


  -- ===================================================================
  -- 4. PAYLOAD:
  -- trocar identidade declarada pelo frontend pela identidade EFETIVA.
  --
  -- Também registrar a origem da identidade e o Rastreio Aguardado.
  -- ===================================================================

  v_old :=
'''unidade_id'',
          p_unidade_id,

        ''destinatario_tipo'',
          nullif(
            upper(
              btrim(
                coalesce(
                  p_destinatario_tipo,
                  ''''
                )
              )
            ),
            ''''
          ),

        ''destinatario_morador_vinculo_id'',
          p_destinatario_morador_vinculo_id,

        ''destinatario_dependente_id'',
          p_destinatario_dependente_id,

        ''destinatario_usuario_id'',
          p_destinatario_usuario_id,

        ''destinatario_pessoa_id'',
          p_destinatario_pessoa_id,

        ''destinatario_nome_informado'',
          nullif(
            btrim(
              coalesce(
                p_destinatario_nome_informado,
                ''''
              )
            ),
            ''''
          ),';

  v_new :=
'''unidade_id'',
          v_unidade_efetiva_id,

        ''destinatario_tipo'',
          v_destinatario_tipo_efetivo,

        ''destinatario_morador_vinculo_id'',
          v_destinatario_morador_vinculo_efetivo,

        ''destinatario_dependente_id'',
          v_destinatario_dependente_efetivo,

        ''destinatario_usuario_id'',
          v_destinatario_usuario_efetivo,

        ''destinatario_pessoa_id'',
          v_destinatario_pessoa_efetivo,

        ''destinatario_nome_informado'',
          v_destinatario_nome_efetivo,

        ''origem_identidade_destinatario'',
          case
            when v_possui_matching
              then ''RASTREIO_AGUARDADO''
            else ''OPERADOR''
          end,

        ''rastreio_aguardado_id'',
          case
            when v_possui_matching
              then v_rastreio_aguardado.id
            else null
          end,';

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
      'E2.10-I: bloco do payload divergente. Esperado=1 Encontrado=%',
      v_count;
  end if;

  v_sql :=
    replace(
      v_sql,
      v_old,
      v_new
    );


  -- ===================================================================
  -- 5. RESOLVEDOR:
  -- usar identidade EFETIVA.
  -- ===================================================================

  v_old :=
'      p_unidade_id :=
        p_unidade_id,

      p_destinatario_tipo :=
        nullif(
          upper(
            btrim(
              coalesce(
                p_destinatario_tipo,
                ''''
              )
            )
          ),
          ''''
        ),

      p_destinatario_morador_vinculo_id :=
        p_destinatario_morador_vinculo_id,

      p_destinatario_dependente_id :=
        p_destinatario_dependente_id,

      p_destinatario_usuario_id :=
        p_destinatario_usuario_id,

      p_destinatario_pessoa_id :=
        p_destinatario_pessoa_id,

      p_destinatario_nome_informado :=
        nullif(
          btrim(
            coalesce(
              p_destinatario_nome_informado,
              ''''
            )
          ),
          ''''
        )';

  v_new :=
'      p_unidade_id :=
        v_unidade_efetiva_id,

      p_destinatario_tipo :=
        v_destinatario_tipo_efetivo,

      p_destinatario_morador_vinculo_id :=
        v_destinatario_morador_vinculo_efetivo,

      p_destinatario_dependente_id :=
        v_destinatario_dependente_efetivo,

      p_destinatario_usuario_id :=
        v_destinatario_usuario_efetivo,

      p_destinatario_pessoa_id :=
        v_destinatario_pessoa_efetivo,

      p_destinatario_nome_informado :=
        v_destinatario_nome_efetivo';

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
      'E2.10-I: bloco do resolvedor divergente. Esperado=1 Encontrado=%',
      v_count;
  end if;

  v_sql :=
    replace(
      v_sql,
      v_old,
      v_new
    );


  -- ===================================================================
  -- 6. VALIDAÇÃO DA UNIDADE RESOLVIDA:
  -- comparar com a unidade EFETIVA, não com declaração original.
  -- ===================================================================

  v_old :=
'    if v_dest.unidade_id
         is distinct from
         p_unidade_id
    then';

  v_new :=
'    if v_dest.unidade_id
         is distinct from
         v_unidade_efetiva_id
    then';

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
      'E2.10-I: validação da unidade divergente. Esperado=1 Encontrado=%',
      v_count;
  end if;

  v_sql :=
    replace(
      v_sql,
      v_old,
      v_new
    );


  -- ===================================================================
  -- 7. VALIDAR eventual usuario_id fornecido pelo frontend
  --    SOMENTE depois que o resolvedor encontrou o usuário canônico.
  --
  -- Não utilizamos solicitante_usuario_id para isso.
  -- ===================================================================

  v_old :=
'    -- Entrada normal deve possuir destinatário residencial oficial.';

  v_new :=
'    -- ===============================================================
    -- E2.10-I — CONFERÊNCIA DO USUÁRIO DECLARADO
    --
    -- Se o frontend enviou usuario_id durante um matching automático,
    -- ele precisa coincidir com o usuário canônico encontrado pelo
    -- resolvedor. Nunca converter solicitante_usuario_id em destinatário.
    -- ===============================================================

    if v_possui_matching
       and p_destinatario_usuario_id is not null
       and p_destinatario_usuario_id
             is distinct from
             v_dest.destinatario_usuario_id
    then

      raise exception
        ''E2.10-I: usuário informado diverge do destinatário canônico do Rastreio Aguardado.''
        using errcode = ''23514'';

    end if;


    -- Entrada normal deve possuir destinatário residencial oficial.';

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
      'E2.10-I: ponto de validação pós-resolvedor divergente. Esperado=1 Encontrado=%',
      v_count;
  end if;

  v_sql :=
    replace(
      v_sql,
      v_old,
      v_new
    );


  -- ===================================================================
  -- 8. DEFESA FINAL DA MIGRATION
  -- ===================================================================

  if v_sql = v_original then
    raise exception
      'E2.10-I: nenhuma alteração foi produzida.';
  end if;

  if position(
       'v_possui_matching boolean := false'
       in v_sql
     ) = 0
  then
    raise exception
      'E2.10-I: defesa estrutural de matching ausente.';
  end if;

  if position(
       '''origem_identidade_destinatario'''
       in v_sql
     ) = 0
  then
    raise exception
      'E2.10-I: payload não recebeu origem da identidade.';
  end if;

  if position(
       'v_unidade_efetiva_id'
       in v_sql
     ) = 0
  then
    raise exception
      'E2.10-I: unidade efetiva não foi incorporada.';
  end if;


  -- ===================================================================
  -- 9. APLICAR A NOVA DEFINIÇÃO
  -- ===================================================================

  execute v_sql;

end;
$migration$;


-- =====================================================================
-- 10. PRESERVAR FRONTEIRA DE EXECUÇÃO
-- =====================================================================

revoke all on function public.rpc_encomenda_entrada_confirmar_v1(
  uuid,
  uuid,
  text,
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public;

revoke all on function public.rpc_encomenda_entrada_confirmar_v1(
  uuid,
  uuid,
  text,
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from anon;

grant execute on function public.rpc_encomenda_entrada_confirmar_v1(
  uuid,
  uuid,
  text,
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to authenticated;