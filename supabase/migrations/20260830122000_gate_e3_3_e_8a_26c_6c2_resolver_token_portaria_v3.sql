-- ============================================================================
-- SISTEMA CHEGOU!
-- GATE E3.3-E.8A.26C.6C.2
--
-- Hardening do resolver de Token digitado pela Portaria.
--
-- Contrato oficial:
--   - Token operacional atual = 6 dígitos;
--   - somente autoridade ATIVA e não bloqueada;
--   - validação completa via fn_encomendas_autorizacao_valida_v1;
--   - Encomenda precisa estar DISPONIVEL_RETIRADA ou RETIRADA_AGENDADA;
--   - resolver é consulta: não inicia retirada e não trava registros;
--   - preparação posterior continua sendo autoridade transacional.
-- ============================================================================

begin;

create or replace function public.rpc_encomenda_token_retirada_consultar_v1(
  p_condominio_id uuid,
  p_token text,
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
  v_config
    public.configuracoes_encomendas_condominio%rowtype;

  v_autorizacao
    public.encomendas_autorizacoes_retirada%rowtype;

  v_encomenda
    public.encomendas%rowtype;

  v_token_normalizado text;
  v_token_hash text;

  v_torre text;
  v_bloco text;
  v_unidade text;

  v_retirantes jsonb := '[]'::jsonb;
  v_retirante_principal_nome text;
begin
  -- --------------------------------------------------------------------------
  -- 1. Auth / tenant
  -- --------------------------------------------------------------------------

  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if p_condominio_id is null then
    raise exception 'Condomínio inválido.';
  end if;

  if not public.fn_encomendas_pode_operar_condominio_v1(
    p_condominio_id
  ) then
    raise exception 'Acesso negado.';
  end if;


  -- --------------------------------------------------------------------------
  -- 2. Normalização e formato oficial atual
  -- --------------------------------------------------------------------------

  v_token_normalizado :=
    public.fn_encomendas_normalizar_token_retirada_v1(
      p_token
    );

  if v_token_normalizado is null
     or length(v_token_normalizado) <> 6
     or v_token_normalizado !~ '^[0-9]{6}$' then
    raise exception 'Token inválido.';
  end if;

  v_token_hash :=
    public.fn_encomendas_hash_token_v1(
      v_token_normalizado
    );


  -- --------------------------------------------------------------------------
  -- 3. Configuração do condomínio
  -- --------------------------------------------------------------------------

  select *
  into v_config
  from public.configuracoes_encomendas_condominio c
  where c.condominio_id = p_condominio_id;

  if not found then
    raise exception
      'As configurações de encomendas não foram encontradas.';
  end if;


  -- --------------------------------------------------------------------------
  -- 4. Resolve autoridade.
  --
  -- Sem FOR UPDATE:
  -- este RPC apenas resolve contexto.
  -- O preparar posterior revalida tudo sob lock.
  -- --------------------------------------------------------------------------

  select *
  into v_autorizacao
  from public.encomendas_autorizacoes_retirada a
  where a.condominio_id = p_condominio_id
    and a.token_hash = v_token_hash
    and a.status = 'ATIVA'
    and a.bloqueada_em is null
  order by a.criado_em desc
  limit 1;

  if not found then
    raise exception
      'Token inválido ou não disponível para retirada.';
  end if;


  -- --------------------------------------------------------------------------
  -- 5. Defesa em profundidade da autoridade
  -- --------------------------------------------------------------------------

  if v_autorizacao.encomenda_id is null then
    raise exception
      'O token não está vinculado a uma encomenda.';
  end if;

  if v_autorizacao.token_hash is null
     or v_autorizacao.qr_hash is null then
    raise exception
      'A credencial de retirada está incompleta ou indisponível.';
  end if;

  if not public.fn_encomendas_autorizacao_valida_v1(
    v_autorizacao.id,
    v_autorizacao.encomenda_id,
    now()
  ) then
    raise exception
      'O token foi utilizado, revogado, cancelado ou está indisponível.';
  end if;


  -- --------------------------------------------------------------------------
  -- 6. Resolve Encomenda
  -- --------------------------------------------------------------------------

  select *
  into v_encomenda
  from public.encomendas e
  where e.id = v_autorizacao.encomenda_id
    and e.condominio_id = p_condominio_id;

  if not found then
    raise exception 'Encomenda não encontrada.';
  end if;

  if v_encomenda.business_id
     is distinct from v_autorizacao.business_id
     or v_encomenda.unidade_id
        is distinct from v_autorizacao.unidade_id then
    raise exception
      'A credencial não corresponde ao contexto atual da encomenda.';
  end if;

  if v_encomenda.status not in (
    'DISPONIVEL_RETIRADA',
    'RETIRADA_AGENDADA'
  ) then
    raise exception
      'A encomenda não está disponível para retirada.';
  end if;


  -- --------------------------------------------------------------------------
  -- 7. Contexto da unidade
  -- --------------------------------------------------------------------------

  select
    cu.torre,
    cu.bloco,
    cu.unidade
  into
    v_torre,
    v_bloco,
    v_unidade
  from public.condominio_unidades cu
  where cu.id = v_autorizacao.unidade_id;


  -- --------------------------------------------------------------------------
  -- 8. Retirantes autorizados
  -- --------------------------------------------------------------------------

  if v_autorizacao.tipo_autorizacao =
     'TERCEIRO_PONTUAL' then

    v_retirante_principal_nome :=
      v_autorizacao.terceiro_nome;

    v_retirantes :=
      jsonb_build_array(
        jsonb_build_object(
          'tipo_retirante',
            'TERCEIRO_AUTORIZADO',

          'nome',
            v_autorizacao.terceiro_nome,

          'usuario_id',
            null,

          'pessoa_id',
            null,

          'dependente_unidade_id',
            null,

          'documento_mascarado',
            v_autorizacao
              .terceiro_documento_mascarado,

          'telefone_mascarado',
            v_autorizacao
              .terceiro_telefone_mascarado,

          'selecionavel',
            true
        )
      );

  else

    -- ------------------------------------------------------------------------
    -- Token padrão:
    -- Morador + Dependentes oficialmente autorizados.
    -- ------------------------------------------------------------------------

    select
      coalesce(
        u.nome,
        p.nome_completo,
        e.destinatario_nome_snapshot,
        'Morador responsável'
      )
    into v_retirante_principal_nome
    from public.encomendas e

    left join public.encomendas_autorizacoes_retirada a
      on a.id = v_autorizacao.id

    left join public.usuarios u
      on u.id = a.autorizado_usuario_id

    left join public.usuario_condominio_vinculos ucv
      on ucv.usuario_id = a.autorizado_usuario_id
     and ucv.condominio_id = a.condominio_id
     and ucv.ativo = true

    left join public.pessoas p
      on p.id = ucv.pessoa_id

    where e.id = v_encomenda.id;


    select coalesce(
      jsonb_agg(
        q.item
        order by
          q.ordem,
          q.nome
      ),
      '[]'::jsonb
    )
    into v_retirantes
    from (

      -- ----------------------------------------------------------------------
      -- Morador
      -- ----------------------------------------------------------------------

      select
        1 as ordem,

        coalesce(
          u.nome,
          p.nome_completo,
          v_encomenda.destinatario_nome_snapshot,
          'Morador responsável'
        ) as nome,

        jsonb_build_object(
          'tipo_retirante',
            'MORADOR',

          'nome',
            coalesce(
              u.nome,
              p.nome_completo,
              v_encomenda.destinatario_nome_snapshot,
              'Morador responsável'
            ),

          'usuario_id',
            v_autorizacao.autorizado_usuario_id,

          'pessoa_id',
            ucv.pessoa_id,

          'dependente_unidade_id',
            null,

          'selecionavel',
            true
        ) as item

      from public.encomendas_autorizacoes_retirada a

      left join public.usuarios u
        on u.id = a.autorizado_usuario_id

      left join public.usuario_condominio_vinculos ucv
        on ucv.usuario_id = a.autorizado_usuario_id
       and ucv.condominio_id = a.condominio_id
       and ucv.ativo = true

      left join public.pessoas p
        on p.id = ucv.pessoa_id

      where a.id = v_autorizacao.id


      union all


      -- ----------------------------------------------------------------------
      -- Dependentes autorizados
      -- ----------------------------------------------------------------------

      select
        2 as ordem,

        d.nome,

        jsonb_build_object(
          'tipo_retirante',
            'DEPENDENTE',

          'nome',
            d.nome,

          'usuario_id',
            case
              when d.possui_login = true then
                (
                  select ucv2.usuario_id
                  from public.usuario_condominio_vinculos ucv2
                  where ucv2.pessoa_id = d.pessoa_id
                    and ucv2.condominio_id =
                      d.condominio_id
                    and ucv2.ativo = true
                  order by ucv2.criado_em desc
                  limit 1
                )
              else null
            end,

          'pessoa_id',
            d.pessoa_id,

          'dependente_unidade_id',
            d.id,

          'selecionavel',
            true
        ) as item

      from public.dependentes_unidade d

      where d.condominio_id =
              v_autorizacao.condominio_id

        and d.unidade_id =
              v_autorizacao.unidade_id

        and coalesce(
              d.retira_encomenda,
              false
            ) = true

        and upper(
              coalesce(
                d.status,
                'ATIVO'
              )
            ) not in (
              'INATIVO',
              'BLOQUEADO',
              'CANCELADO',
              'ENCERRADO',
              'REVOGADO'
            )

    ) q;

  end if;


  -- --------------------------------------------------------------------------
  -- 9. Retorno autorizado
  --
  -- Nunca retorna Token, QR, token_hash ou qr_hash.
  -- --------------------------------------------------------------------------

  return jsonb_build_object(
    'ok',
      true,

    'token_valido',
      true,

    'autorizacao_id',
      v_autorizacao.id,

    'codigo_amigavel',
      v_autorizacao.codigo_amigavel,

    'tipo_autorizacao',
      v_autorizacao.tipo_autorizacao,

    'encomenda_id',
      v_encomenda.id,

    'retirante_nome',
      v_retirante_principal_nome,

    'retirantes_disponiveis',
      v_retirantes,

    'unidade_id',
      v_autorizacao.unidade_id,

    'torre',
      v_torre,

    'bloco',
      v_bloco,

    'unidade',
      v_unidade,

    'transportadora_id',
      v_encomenda.transportadora_id,

    'transportadora',
      v_encomenda.transportadora_nome_snapshot,

    'status_encomenda',
      v_encomenda.status,

    'localizacao_id',
      v_encomenda.localizacao_atual_id,

    'valida_ate',
      null,

    'validade_modelo',
      coalesce(
        v_autorizacao.metadata->>'validade_modelo',
        'CICLO_VIDA_ENCOMENDA'
      ),

    'credencial_par_token_qr',
      v_autorizacao.token_hash is not null
      and v_autorizacao.qr_hash is not null,

    'assinatura_retirada_habilitada',
      v_config.assinatura_retirada_habilitada,

    'assinatura_retirada_obrigatoria',
      v_config.assinatura_retirada_obrigatoria
  );
end;
$function$;


-- ============================================================================
-- 10. GRANTS
-- ============================================================================

revoke all on function public.rpc_encomenda_token_retirada_consultar_v1(
  uuid, text, text, text, text, text, text
) from public, anon;

grant execute on function public.rpc_encomenda_token_retirada_consultar_v1(
  uuid, text, text, text, text, text, text
) to authenticated, service_role;

commit;