-- ============================================================================
-- Sistema Chegou! — GATE E2.10-AE
-- Integração transacional do finalizador do Rastreio Aguardado
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_encomenda_entrada_confirmar_v1(p_volume_id uuid, p_unidade_id uuid, p_destinatario_tipo text DEFAULT NULL::text, p_destinatario_morador_vinculo_id uuid DEFAULT NULL::uuid, p_destinatario_dependente_id uuid DEFAULT NULL::uuid, p_destinatario_usuario_id uuid DEFAULT NULL::uuid, p_destinatario_pessoa_id uuid DEFAULT NULL::uuid, p_destinatario_nome_informado text DEFAULT NULL::text, p_tipo_entrega text DEFAULT NULL::text, p_prioridade text DEFAULT 'NORMAL'::text, p_observacoes text DEFAULT NULL::text, p_chave_idempotencia text DEFAULT NULL::text, p_ip text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text, p_navegador text DEFAULT NULL::text, p_sistema_operacional text DEFAULT NULL::text, p_tipo_dispositivo text DEFAULT NULL::text, p_identificador_dispositivo text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare

  -- ===================================================================
  -- IDENTIDADE / CONTEXTO
  -- ===================================================================

  v_usuario_id uuid :=
    auth.uid();

  v_volume_inicial
    public.encomendas_volumes%rowtype;

  v_volume
    public.encomendas_volumes%rowtype;

  v_pre
    public.encomendas_pre_recebimentos%rowtype;

  v_ctx record;

  -- ===================================================================
  -- DESTINATÁRIO AUTORITATIVO
  -- ===================================================================

  v_dest record;

  v_torre_id uuid;

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
  -- IDEMPOTÊNCIA
  -- ===================================================================

  v_chave text;

  v_payload jsonb;

  v_payload_hash text;

  v_operacao
    public.encomendas_operacoes_idempotentes%rowtype;

  -- ===================================================================
  -- RESULTADOS
  -- ===================================================================

  v_promocao jsonb;

  v_encomenda
    public.encomendas%rowtype;

  v_entrada
    public.encomendas_entradas%rowtype;

  v_entrada_existente
    public.encomendas_entradas%rowtype;

  v_numero_encomenda bigint;

  v_restantes integer;

  v_status_lote text;

  v_status_lote_anterior text;

  v_lote_concluido boolean := false;

  v_resultado jsonb;

  -- ===================================================================
  -- EVENTOS
  -- ===================================================================

  v_event_id_entrada uuid;

  v_event_id_lote uuid;

  -- ===================================================================
  -- ERRO
  -- ===================================================================

  v_sqlstate text;

  v_mensagem text;

  v_detalhe text;

  v_hint text;

  v_contexto text;

begin

  -- ===================================================================
  -- 1. AUTENTICAÇÃO
  -- ===================================================================

  if v_usuario_id is null then

    raise exception
      'Usuário não autenticado.'
      using errcode = '42501';

  end if;


  -- ===================================================================
  -- 2. PARÂMETROS MÍNIMOS
  -- ===================================================================

  if p_volume_id is null then

    raise exception
      'Informe o volume.'
      using errcode = '22004';

  end if;


  -- ===================================================================
  -- 3. CARREGAR CONTEXTO INICIAL DO VOLUME
  --
  -- Ainda sem promover nada.
  -- Serve para descobrir o tenant autoritativo.
  -- ===================================================================

  select v.*
  into v_volume_inicial

  from public.encomendas_volumes v

  where v.id =
        p_volume_id;


  if not found then

    raise exception
      'Volume não encontrado.'
      using errcode = 'P0002';

  end if;


  -- ===================================================================
  -- 4. AUTORIZAÇÃO ESPECÍFICA DA ENTRADA OFICIAL
  --
  -- Nesta versão:
  --   nível 4 = Responsável de Logística
  --   nível 5 = Porteiro / Funcionário operacional
  --
  -- Não existe bypass de Master nesta ação.
  -- ===================================================================

  if not public.fn_encomendas_pode_confirmar_entrada_v1(
    v_volume_inicial.condominio_id
  ) then

    raise exception
      'Usuário não autorizado a confirmar Entrada Oficial neste condomínio.'
      using errcode = '42501';

  end if;


  select *
  into v_ctx

  from public.fn_encomendas_contexto_operador_v1(
    v_volume_inicial.condominio_id
  );


  -- Defesa em profundidade:
  -- mesmo que o helper genérico de contexto evolua futuramente,
  -- esta RPC continua restrita aos níveis operacionais 4 e 5.

  if v_ctx.nivel_id not in (4, 5) then

    raise exception
      'Perfil não autorizado a confirmar Entrada Oficial.'
      using errcode = '42501';

  end if;


  -- ===================================================================
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
            ''
          )
        )
      ),
      ''
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
          ''
        )
      ),
      ''
    );


  if v_volume_inicial.rastreio_aguardado_id is not null then

    select ra.*
      into v_rastreio_aguardado
    from public.encomendas_rastreios_aguardados ra
    where ra.id =
          v_volume_inicial.rastreio_aguardado_id;

    if not found then
      raise exception
        'E2.10-I: o Volume referencia um Rastreio Aguardado inexistente.'
        using errcode = '23514';
    end if;


    -- ---------------------------------------------------------------
    -- Integridade bilateral
    -- ---------------------------------------------------------------

    if v_rastreio_aguardado.volume_id
         is distinct from
         v_volume_inicial.id
    then
      raise exception
        'E2.10-I: vínculo Volume/Rastreio Aguardado divergente.'
        using errcode = '23514';
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
        'E2.10-I: Rastreio Aguardado pertence a outro contexto.'
        using errcode = '42501';
    end if;


    -- ---------------------------------------------------------------
    -- Somente matching operacional válido participa da automação.
    -- ---------------------------------------------------------------

    if v_rastreio_aguardado.status =
       'AGUARDANDO_ENTRADA'
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
          'E2.10-I: unidade informada diverge do Rastreio Aguardado.'
          using errcode = '23514';
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
          'DEPENDENTE';

        v_destinatario_morador_vinculo_efetivo :=
          null;

        v_destinatario_dependente_efetivo :=
          v_rastreio_aguardado.beneficiario_dependente_id;

      else

        v_destinatario_tipo_efetivo :=
          'MORADOR';

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
                 ''
               )
             )
           ),
           ''
         ) is not null

         and

         nullif(
           upper(
             btrim(
               coalesce(
                 p_destinatario_tipo,
                 ''
               )
             )
           ),
           ''
         ) is distinct from
             v_destinatario_tipo_efetivo
      then

        raise exception
          'E2.10-I: tipo de destinatário informado diverge do Rastreio Aguardado.'
          using errcode = '23514';

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
          'E2.10-I: vínculo do Morador informado diverge do Rastreio Aguardado.'
          using errcode = '23514';

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
          'E2.10-I: Dependente informado diverge do Rastreio Aguardado.'
          using errcode = '23514';

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
          'E2.10-I: Pessoa informada diverge do Rastreio Aguardado.'
          using errcode = '23514';

      end if;

    end if;

  end if;


  if v_unidade_efetiva_id is null then
    raise exception
      'A unidade é obrigatória para confirmar a Entrada Oficial.'
      using errcode = '22004';
  end if;


  -- ===================================================================
  -- 5. CHAVE IDEMPOTENTE
  -- ===================================================================

  v_chave :=
    public.fn_encomendas_normalizar_chave_idempotencia_v1(
      p_chave_idempotencia
    );


  if v_chave is null
     or length(v_chave) < 16
  then

    raise exception
      'Informe uma chave de idempotência com pelo menos 16 caracteres.'
      using errcode = '22023';

  end if;


  -- ===================================================================
  -- 6. PAYLOAD SEMÂNTICO DA OPERAÇÃO
  --
  -- Não inclui:
  -- business_id
  -- condominio_id
  -- entrada_id
  -- encomenda_id
  -- numero_encomenda
  -- operador_usuario_id
  --
  -- Esses campos são autoridade do backend.
  -- ===================================================================

  v_payload :=
    jsonb_strip_nulls(
      jsonb_build_object(

        'contrato',
          'ENTRADA_OFICIAL_CONFIRMAR',

        'versao',
          1,

        'volume_id',
          p_volume_id,

        'unidade_id',
          v_unidade_efetiva_id,

        'destinatario_tipo',
          v_destinatario_tipo_efetivo,

        'destinatario_morador_vinculo_id',
          v_destinatario_morador_vinculo_efetivo,

        'destinatario_dependente_id',
          v_destinatario_dependente_efetivo,

        'destinatario_usuario_id',
          v_destinatario_usuario_efetivo,

        'destinatario_pessoa_id',
          v_destinatario_pessoa_efetivo,

        'destinatario_nome_informado',
          v_destinatario_nome_efetivo,

        'origem_identidade_destinatario',
          case
            when v_possui_matching
              then 'RASTREIO_AGUARDADO'
            else 'OPERADOR'
          end,

        'rastreio_aguardado_id',
          case
            when v_possui_matching
              then v_rastreio_aguardado.id
            else null
          end,

        'tipo_entrega',
          nullif(
            upper(
              btrim(
                coalesce(
                  p_tipo_entrega,
                  ''
                )
              )
            ),
            ''
          ),

        'prioridade',
          coalesce(
            nullif(
              upper(
                btrim(
                  coalesce(
                    p_prioridade,
                    ''
                  )
                )
              ),
              ''
            ),
            'NORMAL'
          ),

        'observacoes',
          nullif(
            btrim(
              coalesce(
                p_observacoes,
                ''
              )
            ),
            ''
          )
      )
    );


  v_payload_hash :=
    public.fn_encomendas_payload_hash_v1(
      v_payload
    );


  -- ===================================================================
  -- 7. RESERVA IDEMPOTENTE
  -- ===================================================================

  insert into
    public.encomendas_operacoes_idempotentes (

      business_id,

      condominio_id,

      usuario_id,

      chave_idempotencia,

      tipo_operacao,

      payload_hash,

      status,

      pre_recebimento_id,

      volume_id,

      ip,

      user_agent,

      navegador,

      sistema_operacional,

      tipo_dispositivo,

      identificador_dispositivo

    )

  values (

    v_volume_inicial.business_id,

    v_volume_inicial.condominio_id,

    v_usuario_id,

    v_chave,

    'ENTRADA_OFICIAL_CONFIRMAR',

    v_payload_hash,

    'PROCESSANDO',

    v_volume_inicial.pre_recebimento_id,

    v_volume_inicial.id,

    p_ip,

    p_user_agent,

    p_navegador,

    p_sistema_operacional,

    p_tipo_dispositivo,

    p_identificador_dispositivo

  )

  on conflict (
    condominio_id,
    chave_idempotencia
  )

  do nothing;


  -- ===================================================================
  -- 8. SERIALIZAR A OPERAÇÃO IDEMPOTENTE
  -- ===================================================================

  select *
  into v_operacao

  from public.encomendas_operacoes_idempotentes

  where condominio_id =
        v_volume_inicial.condominio_id

    and chave_idempotencia =
        v_chave

  for update;


  if not found then

    raise exception
      'Não foi possível reservar a operação de Entrada Oficial.'
      using errcode = '40001';

  end if;


  -- Mesmo hash não é suficiente:
  -- a chave não pode trocar de tipo de operação.

  if v_operacao.tipo_operacao
       is distinct from
       'ENTRADA_OFICIAL_CONFIRMAR'
  then

    raise exception
      'A chave de idempotência já foi utilizada por outra operação.'
      using errcode = '23505';

  end if;


  if v_operacao.payload_hash
       is distinct from
       v_payload_hash
  then

    raise exception
      'A chave de idempotência já foi utilizada com outro conteúdo.'
      using errcode = '23505';

  end if;


  if v_operacao.volume_id is not null
     and v_operacao.volume_id
           is distinct from
           p_volume_id
  then

    raise exception
      'A chave de idempotência pertence a outro volume.'
      using errcode = '23505';

  end if;


  -- ===================================================================
  -- 9. RESULTADO IDEMPOTENTE JÁ CONCLUÍDO
  -- ===================================================================

  if v_operacao.status =
     'CONCLUIDA'
  then

    return
      coalesce(
        v_operacao.resultado,
        jsonb_build_object(
          'ok', true,
          'idempotente', true,
          'operacao_id', v_operacao.id,
          'entrada_id', v_operacao.entrada_id,
          'encomenda_id', v_operacao.encomenda_id,
          'volume_id', v_operacao.volume_id,
          'status_operacao', 'CONCLUIDA'
        )
      )
      ||
      jsonb_build_object(
        'idempotente',
          true
      );

  end if;


  -- ===================================================================
  -- 10. CONCORRÊNCIA ENTRE OPERADORES
  -- ===================================================================

  if v_operacao.status =
       'PROCESSANDO'

     and v_operacao.usuario_id
           is distinct from
           v_usuario_id
  then

    return jsonb_build_object(

      'ok',
        false,

      'processando',
        true,

      'operacao_id',
        v_operacao.id,

      'volume_id',
        p_volume_id,

      'status_operacao',
        'PROCESSANDO',

      'mensagem',
        'Este volume já está sendo processado por outro operador.'

    );

  end if;


  -- ===================================================================
  -- 11. PREPARAR RETRY
  -- ===================================================================

  update
    public.encomendas_operacoes_idempotentes

  set

    status =
      'PROCESSANDO',

    tentativas =
      tentativas
      +
      case
        when falhou_em is null
          then 0
        else 1
      end,

    falhou_em =
      null,

    erro_codigo =
      null,

    erro_mensagem =
      null,

    erro_detalhes =
      null,

    usuario_id =
      v_usuario_id,

    pre_recebimento_id =
      coalesce(
        pre_recebimento_id,
        v_volume_inicial.pre_recebimento_id
      ),

    volume_id =
      p_volume_id,

    ip =
      coalesce(
        p_ip,
        ip
      ),

    user_agent =
      coalesce(
        p_user_agent,
        user_agent
      ),

    navegador =
      coalesce(
        p_navegador,
        navegador
      ),

    sistema_operacional =
      coalesce(
        p_sistema_operacional,
        sistema_operacional
      ),

    tipo_dispositivo =
      coalesce(
        p_tipo_dispositivo,
        tipo_dispositivo
      ),

    identificador_dispositivo =
      coalesce(
        p_identificador_dispositivo,
        identificador_dispositivo
      )

  where id =
        v_operacao.id

  returning *
  into v_operacao;


  -- ===================================================================
  -- SUBTRANSAÇÃO OPERACIONAL
  --
  -- Se qualquer etapa falhar:
  --   promoção
  --   numeração
  --   Entrada
  --   evento
  --   auditoria
  --
  -- tudo abaixo sofre rollback.
  --
  -- A linha de idempotência permanece disponível para marcar FALHA.
  -- ===================================================================

  begin

    -- =================================================================
    -- 12. LOCK AUTORITATIVO DO VOLUME
    -- =================================================================

    select v.*
    into v_volume

    from public.encomendas_volumes v

    where v.id =
          p_volume_id

    for update;


    if not found then

      raise exception
        'Volume não encontrado.'
        using errcode = 'P0002';

    end if;


    if v_volume.condominio_id
         is distinct from
         v_volume_inicial.condominio_id

       or v_volume.business_id
         is distinct from
         v_volume_inicial.business_id
    then

      raise exception
        'O contexto do Volume foi alterado.'
        using errcode = '40001';

    end if;


    if v_volume.removido_em is not null
       or v_volume.status =
          'REMOVIDO'
    then

      raise exception
        'Este volume foi removido do lote.'
        using errcode = '23514';

    end if;


    -- =================================================================
    -- 13. ENTRADA JÁ EXISTENTE PARA O VOLUME
    --
    -- Idempotência de domínio, inclusive se o usuário utilizou
    -- outra chave depois de a Entrada já ter sido confirmada.
    -- =================================================================

    select e.*
    into v_entrada_existente

    from public.encomendas_entradas e

    where e.volume_id =
          v_volume.id;


    if found then

      select enc.*
      into v_encomenda

      from public.encomendas enc

      where enc.id =
            v_entrada_existente.encomenda_id;


      
      -- ===============================================================
      -- E2.10-AE — SELF-HEALING DO RASTREIO AGUARDADO
      --
      -- Se a Entrada já existe, não cria novo fato.
      -- Apenas garante que o Rastreio Aguardado vinculado ao Volume
      -- convergiu para a mesma Encomenda, usando o timestamp canônico
      -- da Entrada já persistida.
      -- ===============================================================

      perform
        public.fn_encomendas_vincular_rastreio_aguardado_entrada_v1(

          p_volume_id :=
            v_volume.id,

          p_encomenda_id :=
            v_entrada_existente.encomenda_id,

          p_confirmado_em :=
            v_entrada_existente.confirmada_em

        );


      v_resultado :=
        jsonb_build_object(

          'ok',
            true,

          'idempotente',
            true,

          'idempotencia_origem',
            'VOLUME_JA_POSSUI_ENTRADA',

          'operacao_id',
            v_operacao.id,

          'entrada_id',
            v_entrada_existente.id,

          'volume_id',
            v_entrada_existente.volume_id,

          'encomenda_id',
            v_entrada_existente.encomenda_id,

          'numero_encomenda',
            v_encomenda.numero_encomenda,

          'pre_recebimento_id',
            v_entrada_existente.pre_recebimento_id,

          'correlation_id_encomenda',
            v_entrada_existente.correlation_id

        );


      update
        public.encomendas_operacoes_idempotentes

      set

        status =
          'CONCLUIDA',

        pre_recebimento_id =
          v_entrada_existente.pre_recebimento_id,

        volume_id =
          v_entrada_existente.volume_id,

        entrada_id =
          v_entrada_existente.id,

        encomenda_id =
          v_entrada_existente.encomenda_id,

        resultado =
          v_resultado,

        concluida_em =
          now(),

        falhou_em =
          null,

        erro_codigo =
          null,

        erro_mensagem =
          null,

        erro_detalhes =
          null

      where id =
            v_operacao.id;


      return
        v_resultado;

    end if;


    -- =================================================================
    -- 14. LEGADO JÁ PROMOVIDO SEM entrada_id
    --
    -- Não fabricar Entrada retroativa.
    -- =================================================================

    if v_volume.encomenda_id is not null
       or v_volume.status =
          'PROMOVIDO'
    then

      raise exception
        'Este volume pertence ao fluxo legado e já foi promovido sem identidade oficial de Entrada.'
        using errcode = '23514';

    end if;


    if v_volume.pre_recebimento_id is null then

      raise exception
        'O volume não possui lote de origem.'
        using errcode = '23514';

    end if;


    -- =================================================================
    -- 15. LOCK DO LOTE
    -- =================================================================

    select p.*
    into v_pre

    from public.encomendas_pre_recebimentos p

    where p.id =
          v_volume.pre_recebimento_id

    for update;


    if not found then

      raise exception
        'Lote de origem não encontrado.'
        using errcode = 'P0002';

    end if;


    if v_pre.business_id
         is distinct from
         v_volume.business_id

       or v_pre.condominio_id
         is distinct from
         v_volume.condominio_id
    then

      raise exception
        'O Volume e o lote pertencem a contextos diferentes.'
        using errcode = '23514';

    end if;


    if v_pre.status not in (
      'LOTE_CONCLUIDO',
      'PARCIALMENTE_PROCESSADO'
    ) then

      raise exception
        'O lote não está disponível para Entrada Oficial.'
        using errcode = '23514';

    end if;


    -- Snapshot do estado do lote antes da promoção.
    -- Usado na auditoria para não registrar um estado anterior fictício.

    v_status_lote_anterior :=
      v_pre.status;


    -- =================================================================
    -- 16. RESOLVER DESTINATÁRIO
    --
    -- Esse contrato revalida:
    --   condomínio
    --   unidade
    --   Morador/Dependente
    --   vínculos ativos
    --   autorização de Dependente
    -- =================================================================

    select *
    into v_dest

    from public.fn_encomendas_resolver_destinatario_v1(

      p_condominio_id :=
        v_pre.condominio_id,

      p_unidade_id :=
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
        v_destinatario_nome_efetivo

    );


    if not found then

      raise exception
        'Não foi possível resolver o destinatário da Encomenda.'
        using errcode = '23514';

    end if;


    if v_dest.condominio_id
         is distinct from
         v_pre.condominio_id
    then

      raise exception
        'O destinatário pertence a outro condomínio.'
        using errcode = '42501';

    end if;


    if v_dest.unidade_id
         is distinct from
         v_unidade_efetiva_id
    then

      raise exception
        'A unidade resolvida é divergente da unidade confirmada.'
        using errcode = '23514';

    end if;


    -- ===============================================================
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
        'E2.10-I: usuário informado diverge do destinatário canônico do Rastreio Aguardado.'
        using errcode = '23514';

    end if;


    -- Entrada normal deve possuir destinatário residencial oficial.

    if v_dest.destinatario_tipo not in (
      'MORADOR',
      'DEPENDENTE'
    ) then

      raise exception
        'Selecione um Morador ou Dependente válido para concluir a Entrada.'
        using errcode = '23514';

    end if;


    -- =================================================================
    -- 17. RESOLVER TORRE/BLOCO CANÔNICO PELA UNIDADE OFICIAL
    --
    -- Cadeia autoritativa:
    --
    -- condominio_unidades.unidade_oficial_id
    --   -> unidades.id
    --   -> unidades.torre_id
    --   -> torres.id
    --
    -- Os campos textuais torre/bloco servem para apresentação.
    -- Nunca são autoridade estrutural da Entrada.
    -- =================================================================

    select t.id
    into v_torre_id

    from public.condominio_unidades cu

    join public.unidades u
      on u.id =
         cu.unidade_oficial_id

     and u.condominio_id =
         cu.condominio_id

    join public.torres t
      on t.id =
         u.torre_id

     and t.condominio_id =
         u.condominio_id

    where cu.id =
          v_dest.unidade_id

      and cu.condominio_id =
          v_pre.condominio_id

      and cu.ativo = true;


    if not found then

      raise exception
        'A estrutura oficial de Torre/Bloco da unidade não foi localizada no condomínio.'
        using errcode = '23514';

    end if;


    if v_torre_id is null then

      raise exception
        'A unidade não possui Torre/Bloco oficial associado.'
        using errcode = '23514';

    end if;


    -- =================================================================
    -- 18. PROMOVER O VOLUME PELO CONTRATO MADURO EXISTENTE
    --
    -- A V2 continua intacta.
    -- =================================================================

    v_promocao :=
      public.rpc_encomenda_volume_promover_v2(

        p_volume_id :=
          v_volume.id,

        p_unidade_id :=
          v_dest.unidade_id,

        p_torre_id :=
          v_torre_id,

        p_destinatario_usuario_id :=
          v_dest.destinatario_usuario_id,

        p_destinatario_pessoa_id :=
          v_dest.destinatario_pessoa_id,

        p_destinatario_nome :=
          v_dest.destinatario_nome_snapshot,

        p_tipo_entrega :=
          p_tipo_entrega,

        p_prioridade :=
          coalesce(
            nullif(
              upper(
                btrim(
                  coalesce(
                    p_prioridade,
                    ''
                  )
                )
              ),
              ''
            ),
            'NORMAL'
          ),

        p_observacoes :=
          p_observacoes,

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
          p_identificador_dispositivo

      );


    if coalesce(
         (v_promocao ->> 'ok')::boolean,
         false
       ) is not true
    then

      raise exception
        'Não foi possível promover o Volume para Encomenda Oficial.'
        using errcode = '23514';

    end if;


    -- =================================================================
    -- 19. CARREGAR ENCOMENDA CRIADA
    -- =================================================================

    select enc.*
    into v_encomenda

    from public.encomendas enc

    where enc.id =
      nullif(
        v_promocao
          ->> 'encomenda_id',
        ''
      )::uuid

    for update;


    if not found then

      raise exception
        'A promoção não retornou uma Encomenda Oficial válida.'
        using errcode = '23514';

    end if;


    -- =================================================================
    -- 20. NÚMERO HUMANO
    -- =================================================================

    v_numero_encomenda :=
      public.fn_encomendas_proximo_numero_encomenda_v1(
        v_encomenda.condominio_id
      );


    if v_numero_encomenda is null
       or v_numero_encomenda < 1
    then

      raise exception
        'Não foi possível gerar o número da Encomenda.'
        using errcode = '23514';

    end if;


    -- =================================================================
    -- 21. COMPLETAR CONTRATO RESIDENCIAL MODERNO
    --
    -- A Encomenda passa a carregar a identidade completa resolvida.
    -- =================================================================

    update public.encomendas

    set

      numero_encomenda =
        v_numero_encomenda,

      unidade_id =
        v_dest.unidade_id,

      unidade_oficial_id =
        v_dest.unidade_oficial_id,

      torre_id =
        v_torre_id,

      destinatario_tipo =
        v_dest.destinatario_tipo,

      destinatario_usuario_id =
        v_dest.destinatario_usuario_id,

      destinatario_pessoa_id =
        v_dest.destinatario_pessoa_id,

      destinatario_morador_vinculo_id =
        v_dest.destinatario_morador_vinculo_id,

      destinatario_dependente_id =
        v_dest.destinatario_dependente_id,

      destinatario_responsavel_vinculo_id =
        v_dest.destinatario_responsavel_vinculo_id,

      destinatario_nome_snapshot =
        v_dest.destinatario_nome_snapshot,

      metadata =
        coalesce(
          metadata,
          '{}'::jsonb
        )
        ||
        jsonb_build_object(

          'contrato_entrada',
            'rpc_encomenda_entrada_confirmar_v1',

          'contrato_entrada_versao',
            1,

          'entrada_oficial',
            true,

          'operador_nivel_id_snapshot',
            v_ctx.nivel_id,

          'operador_contexto',
            case
              when v_ctx.nivel_id = 4
                then 'RESPONSAVEL_LOGISTICA'
              when v_ctx.nivel_id = 5
                then 'PORTARIA'
              else 'NAO_CLASSIFICADO'
            end

        )

    where id =
          v_encomenda.id

    returning *
    into v_encomenda;


    -- =================================================================
    -- 22. CRIAR O FATO CANÔNICO DE ENTRADA
    -- =================================================================

    insert into public.encomendas_entradas (

      business_id,

      condominio_id,

      correlation_id,

      pre_recebimento_id,

      volume_id,

      encomenda_id,

      operador_usuario_id,

      confirmada_em

    )

    values (

      v_encomenda.business_id,

      v_encomenda.condominio_id,

      v_encomenda.correlation_id,

      v_pre.id,

      v_volume.id,

      v_encomenda.id,

      v_usuario_id,

      now()

    )

    returning *
    into v_entrada;


    
    -- =================================================================
    -- E2.10-AE — FINALIZAÇÃO CANÔNICA DO RASTREIO AGUARDADO
    --
    -- A existência de public.encomendas_rastreios é opcional.
    -- A transição é governada pelo vínculo explícito do Volume com o
    -- Rastreio Aguardado, pela Encomenda criada e pelo instante
    -- canônico da Entrada Oficial.
    -- =================================================================

    perform
      public.fn_encomendas_vincular_rastreio_aguardado_entrada_v1(

        p_volume_id :=
          v_volume.id,

        p_encomenda_id :=
          v_encomenda.id,

        p_confirmado_em :=
          v_entrada.confirmada_em

      );


    -- =================================================================
    -- 23. RECARREGAR VOLUME E LOTE
    --
    -- A promoção V2 já atualizou a cardinalidade parcial/final.
    -- =================================================================

    select *
    into v_volume

    from public.encomendas_volumes

    where id =
          p_volume_id;


    select *
    into v_pre

    from public.encomendas_pre_recebimentos

    where id =
          v_pre.id;


    select count(*)
    into v_restantes

    from public.encomendas_volumes v

    where v.pre_recebimento_id =
          v_pre.id

      and v.removido_em is null

      and v.encomenda_id is null;


    v_status_lote :=
      v_pre.status;


    v_lote_concluido :=
      (
        v_restantes = 0
        and
        v_pre.status =
          'PROCESSADO'
      );


    -- =================================================================
    -- 24. EVENTO DA ENTRADA INDIVIDUAL
    --
    -- Ainda NÃO significa "Disponível para retirada".
    -- =================================================================

    v_event_id_entrada :=
      public.fn_encomendas_publicar_evento_v2(

        p_event_type :=
          'ENTRADA_OFICIAL_CONFIRMADA',

        p_correlation_id :=
          v_encomenda.correlation_id,

        p_business_id :=
          v_encomenda.business_id,

        p_condominio_id :=
          v_encomenda.condominio_id,

        p_origem :=
          'MODULO_PORTARIA',

        p_modulo :=
          'CENTRAL_ENCOMENDAS',

        p_payload :=
          jsonb_build_object(

            'entrada_id',
              v_entrada.id,

            'encomenda_id',
              v_encomenda.id,

            'numero_encomenda',
              v_encomenda.numero_encomenda,

            'volume_id',
              v_volume.id,

            'pre_recebimento_id',
              v_pre.id,

            'referencia_lote',
              v_pre.referencia_lote,

            'lote_correlation_id',
              v_pre.correlation_id,

            'destinatario_tipo',
              v_encomenda.destinatario_tipo,

            'destinatario_morador_vinculo_id',
              v_encomenda.destinatario_morador_vinculo_id,

            'destinatario_dependente_id',
              v_encomenda.destinatario_dependente_id,

            'destinatario_responsavel_vinculo_id',
              v_encomenda.destinatario_responsavel_vinculo_id,

            'unidade_id',
              v_encomenda.unidade_id,

            'unidade_oficial_id',
              v_encomenda.unidade_oficial_id,

            'status_encomenda',
              v_encomenda.status,

            'status_lote',
              v_status_lote,

            'volumes_restantes_lote',
              v_restantes,

            'lote_concluido',
              v_lote_concluido,

            'notificacao_disponibilidade',
              false

          ),

        p_pre_recebimento_id :=
          v_pre.id,

        p_entrada_id :=
          v_entrada.id,

        p_encomenda_id :=
          v_encomenda.id,

        p_transportadora_id :=
          v_encomenda.transportadora_id,

        p_unidade_id :=
          v_encomenda.unidade_id

      );


    -- =================================================================
    -- 25. AUDITORIA DA ENTRADA INDIVIDUAL
    -- =================================================================

    perform public.fn_encomendas_registrar_log_v2(

      p_correlation_id :=
        v_encomenda.correlation_id,

      p_business_id :=
        v_encomenda.business_id,

      p_condominio_id :=
        v_encomenda.condominio_id,

      p_acao :=
        'ENTRADA_OFICIAL_CONFIRMADA',

      p_origem :=
        'MODULO_PORTARIA',

      p_modulo :=
        'CENTRAL_ENCOMENDAS',

      p_resultado :=
        'SUCESSO',

      p_pre_recebimento_id :=
        v_pre.id,

      p_entrada_id :=
        v_entrada.id,

      p_encomenda_id :=
        v_encomenda.id,

      p_volume_id :=
        v_volume.id,

      p_transportadora_id :=
        v_encomenda.transportadora_id,

      p_unidade_id :=
        v_encomenda.unidade_id,

      p_status_anterior :=
        'AGUARDANDO_ENTRADA',

      p_status_novo :=
        v_encomenda.status,

      p_dados_novos :=
        jsonb_build_object(

          'entrada_id',
            v_entrada.id,

          'encomenda_id',
            v_encomenda.id,

          'numero_encomenda',
            v_encomenda.numero_encomenda,

          'status_encomenda',
            v_encomenda.status,

          'status_lote',
            v_status_lote

        ),

      p_metadata :=
        jsonb_build_object(

          'contrato_rpc',
            'rpc_encomenda_entrada_confirmar_v1',

          'motivo_operacional',
            'CONFIRMACAO_ENTRADA_OFICIAL',

          'operador_usuario_id',
            v_usuario_id,

          'operador_nivel_id_snapshot',
            v_ctx.nivel_id,

          'operador_contexto',
            case
              when v_ctx.nivel_id = 4
                then 'RESPONSAVEL_LOGISTICA'
              when v_ctx.nivel_id = 5
                then 'PORTARIA'
              else 'NAO_CLASSIFICADO'
            end,

          'lote_correlation_id',
            v_pre.correlation_id,

          'volumes_restantes_lote',
            v_restantes,

          'lote_concluido',
            v_lote_concluido

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
        v_event_id_entrada

    );


    -- =================================================================
    -- 26. EVENTO DE CONCLUSÃO DO LOTE
    --
    -- Só existe quando NÃO resta nenhum Volume elegível.
    --
    -- Esse fato será o ponto natural para a Central de Notificações
    -- realizar consolidação por:
    --
    -- condomínio + unidade + destinatário canônico
    --
    -- sem comunicar durante entrada parcial.
    -- =================================================================

    if v_lote_concluido then

      v_event_id_lote :=
        public.fn_encomendas_publicar_evento_v2(

          p_event_type :=
            'ENTRADA_LOTE_CONCLUIDA',

          p_correlation_id :=
            v_pre.correlation_id,

          p_business_id :=
            v_pre.business_id,

          p_condominio_id :=
            v_pre.condominio_id,

          p_origem :=
            'MODULO_PORTARIA',

          p_modulo :=
            'CENTRAL_ENCOMENDAS',

          p_payload :=
            jsonb_build_object(

              'pre_recebimento_id',
                v_pre.id,

              'referencia_lote',
                v_pre.referencia_lote,

              'lote_correlation_id',
                v_pre.correlation_id,

              'entrada_causadora_id',
                v_entrada.id,

              'encomenda_causadora_id',
                v_encomenda.id,

              'volume_causador_id',
                v_volume.id,

              'status_lote',
                v_pre.status,

              'volumes_restantes_lote',
                0,

              'agrupar_notificacoes',
                true,

              'chave_agrupamento',
                'CONDominio_UNIDADE_DESTINATARIO',

              'envio_direto',
                false

            ),

          p_pre_recebimento_id :=
            v_pre.id,

          -- Evento é do LOTE, não de uma Entrada individual.
          p_entrada_id :=
            null,

          p_encomenda_id :=
            null,

          p_transportadora_id :=
            v_pre.transportadora_id,

          p_unidade_id :=
            null,

          p_causation_id :=
            v_event_id_entrada

        );


      perform public.fn_encomendas_registrar_log_v2(

        p_correlation_id :=
          v_pre.correlation_id,

        p_business_id :=
          v_pre.business_id,

        p_condominio_id :=
          v_pre.condominio_id,

        p_acao :=
          'ENTRADA_LOTE_CONCLUIDA',

        p_origem :=
          'MODULO_PORTARIA',

        p_modulo :=
          'CENTRAL_ENCOMENDAS',

        p_resultado :=
          'SUCESSO',

        p_pre_recebimento_id :=
          v_pre.id,

        p_entrada_id :=
          null,

        p_encomenda_id :=
          null,

        p_volume_id :=
          v_volume.id,

        p_transportadora_id :=
          v_pre.transportadora_id,

        p_unidade_id :=
          null,

        p_status_anterior :=
          v_status_lote_anterior,

        p_status_novo :=
          'PROCESSADO',

        p_metadata :=
          jsonb_build_object(

            'entrada_causadora_id',
              v_entrada.id,

            'encomenda_causadora_id',
              v_encomenda.id,

            'event_id_entrada',
              v_event_id_entrada,

            'motivo_operacional',
              'ULTIMO_VOLUME_ELEGIVEL_PROCESSADO',

            'operador_usuario_id',
              v_usuario_id,

            'operador_nivel_id_snapshot',
              v_ctx.nivel_id,

            'operador_contexto',
              case
                when v_ctx.nivel_id = 4
                  then 'RESPONSAVEL_LOGISTICA'
                when v_ctx.nivel_id = 5
                  then 'PORTARIA'
                else 'NAO_CLASSIFICADO'
              end,

            'status_lote_anterior',
              v_status_lote_anterior,

            'agrupar_notificacoes',
              true

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
          v_event_id_lote,

        p_causation_id :=
          v_event_id_entrada

      );

    end if;


    -- =================================================================
    -- 27. RESULTADO FINAL
    -- =================================================================

    v_resultado :=
      jsonb_build_object(

        'ok',
          true,

        'idempotente',
          false,

        'operacao_id',
          v_operacao.id,

        'entrada_id',
          v_entrada.id,

        'volume_id',
          v_volume.id,

        'encomenda_id',
          v_encomenda.id,

        'numero_encomenda',
          v_encomenda.numero_encomenda,

        'numero_encomenda_formatado',
          case

            when v_encomenda.numero_encomenda < 1000
            then
              lpad(
                v_encomenda.numero_encomenda::text,
                3,
                '0'
              )

            else
              to_char(
                v_encomenda.numero_encomenda,
                'FM999G999G999G999G999'
              )

          end,

        'pre_recebimento_id',
          v_pre.id,

        'referencia_lote',
          v_pre.referencia_lote,

        'correlation_id_encomenda',
          v_encomenda.correlation_id,

        'correlation_id_lote',
          v_pre.correlation_id,

        'destinatario_tipo',
          v_encomenda.destinatario_tipo,

        'destinatario_nome',
          v_encomenda.destinatario_nome_snapshot,

        'unidade_id',
          v_encomenda.unidade_id,

        'unidade_oficial_id',
          v_encomenda.unidade_oficial_id,

        'status_encomenda',
          v_encomenda.status,

        'status_volume',
          v_volume.status,

        'status_lote',
          v_pre.status,

        'volumes_restantes_lote',
          v_restantes,

        'lote_concluido',
          v_lote_concluido,

        'operador_nivel_id',
          v_ctx.nivel_id,

        'operador_contexto',
          case
            when v_ctx.nivel_id = 4
              then 'RESPONSAVEL_LOGISTICA'
            when v_ctx.nivel_id = 5
              then 'PORTARIA'
            else 'NAO_CLASSIFICADO'
          end,

        'event_id_entrada',
          v_event_id_entrada,

        'event_id_lote',
          v_event_id_lote,

        'armazenamento_executado',
          false,

        'disponibilizacao_executada',
          false,

        'notificacao_enviada_diretamente',
          false,

        'confirmada_em',
          v_entrada.confirmada_em,

        'confirmada_em_local',
          public.fn_encomendas_data_hora_local_v1(
            v_entrada.confirmada_em,
            v_encomenda.condominio_id
          ),

        'timezone_iana',
          public.fn_encomendas_timezone_condominio_v1(
            v_encomenda.condominio_id
          )

      );


    -- =================================================================
    -- 28. CONCLUIR OPERAÇÃO IDEMPOTENTE
    -- =================================================================

    update
      public.encomendas_operacoes_idempotentes

    set

      status =
        'CONCLUIDA',

      pre_recebimento_id =
        v_pre.id,

      volume_id =
        v_volume.id,

      entrada_id =
        v_entrada.id,

      encomenda_id =
        v_encomenda.id,

      resultado =
        v_resultado,

      concluida_em =
        now(),

      falhou_em =
        null,

      erro_codigo =
        null,

      erro_mensagem =
        null,

      erro_detalhes =
        null

    where id =
          v_operacao.id;


    return
      v_resultado;


  exception
    when others
    then

      get stacked diagnostics

        v_sqlstate =
          returned_sqlstate,

        v_mensagem =
          message_text,

        v_detalhe =
          pg_exception_detail,

        v_hint =
          pg_exception_hint,

        v_contexto =
          pg_exception_context;


      -- ===============================================================
      -- Tudo que ocorreu dentro da subtransação foi revertido.
      -- Registrar a falha na reserva idempotente.
      -- ===============================================================

      update
        public.encomendas_operacoes_idempotentes

      set

        status =
          'FALHA',

        falhou_em =
          now(),

        erro_codigo =
          v_sqlstate,

        erro_mensagem =
          v_mensagem,

        erro_detalhes =
          jsonb_strip_nulls(
            jsonb_build_object(

              'detail',
                v_detalhe,

              'hint',
                v_hint,

              'context',
                v_contexto

            )
          )

      where id =
            v_operacao.id;


      return jsonb_build_object(

        'ok',
          false,

        'operacao_id',
          v_operacao.id,

        'volume_id',
          p_volume_id,

        'chave_idempotencia',
          v_chave,

        'status_operacao',
          'FALHA',

        'erro_codigo',
          v_sqlstate,

        -- A UI deverá humanizar antes de apresentar.
        'erro_mensagem',
          v_mensagem,

        'pode_tentar_novamente',
          true

      );

  end;

end;
$function$;

-- Mantém a RPC acessível ao usuário autenticado e não a expõe ao PUBLIC.
-- ================================================================
-- GATE E2.10-AE
-- Permissões da RPC canônica
--
-- Assinatura confirmada no banco remoto pelo GATE E2.10-AE.1:
-- 18 parâmetros.
-- ================================================================

REVOKE ALL ON FUNCTION public.rpc_encomenda_entrada_confirmar_v1(
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
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rpc_encomenda_entrada_confirmar_v1(
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
) TO authenticated;