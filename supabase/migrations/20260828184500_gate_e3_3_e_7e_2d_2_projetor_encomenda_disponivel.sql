-- ============================================================================
-- SISTEMA CHEGOU!
-- GATE E3.3-E.7E.2D.2
--
-- PROJETOR UNITÁRIO:
-- ENCOMENDA_DISPONIVEL_RETIRADA
-- Outbox -> Central de Notificações -> Inbox/In-App
--
-- ESCOPO V1:
--   - recebe exatamente um event_id;
--   - aceita somente o contrato estrutural V2 da Disponibilização;
--   - valida novamente a cadeia autoritativa no backend;
--   - resolve Morador ou Dependente/Responsável;
--   - cria 1 notificação lógica por evento;
--   - cria Inbox;
--   - cria Delivery IN_APP;
--   - NÃO envia Push;
--   - NÃO envia WhatsApp;
--   - NÃO envia E-mail;
--   - NÃO implementa agregação temporal;
--   - NÃO altera estado operacional da Encomenda;
--   - NÃO marca o Outbox global como processado.
-- ============================================================================

begin;


-- ============================================================================
-- 1. PROJETOR UNITÁRIO
-- ============================================================================

create or replace function
public.fn_central_notificacoes_projetar_encomenda_disponivel_v1(
  p_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_evento public.encomendas_eventos_outbox%rowtype;
  v_encomenda public.encomendas%rowtype;
  v_entrada public.encomendas_entradas%rowtype;

  v_dependente public.dependentes_unidade%rowtype;
  v_responsavel public.morador_unidade_vinculos%rowtype;

  v_usuario_id uuid;
  v_pessoa_id uuid;
  v_morador_vinculo_id uuid;
  v_dependente_id uuid;
  v_responsavel_vinculo_id uuid;

  v_tipo_destinatario text;
  v_origem_resolucao text;

  v_notificacao_id uuid;
  v_item_id uuid;
  v_destinatario_id uuid;
  v_inbox_id uuid;
  v_entrega_id uuid;

  v_codigo text;
  v_chave_notificacao text;
  v_chave_entrega text;

  v_titulo text :=
    'Encomenda disponível para retirada';

  v_resumo text :=
    'Sua encomenda está disponível para retirada.';

  v_conteudo text :=
    'Sua encomenda está disponível para retirada. '
    || 'Acesse Minhas Encomendas no Sistema Chegou! '
    || 'para consultar os detalhes e seguir o fluxo autorizado de retirada.';

begin

  -- ==========================================================================
  -- 2. ENTRADA OBRIGATÓRIA
  -- ==========================================================================

  if p_event_id is null then
    raise exception
      'event_id é obrigatório.'
      using errcode = '22004';
  end if;


  -- ==========================================================================
  -- 3. IDEMPOTÊNCIA — FAST PATH
  --
  -- event_id é UNIQUE em central_notificacoes_itens.
  -- Se já existe, não produz qualquer nova projeção.
  -- ==========================================================================

  select
    i.central_notificacao_id
  into
    v_notificacao_id
  from public.central_notificacoes_itens i
  where i.event_id = p_event_id;

  if found then
    return jsonb_build_object(
      'ok', true,
      'idempotente', true,
      'event_id', p_event_id,
      'central_notificacao_id', v_notificacao_id
    );
  end if;


  -- ==========================================================================
  -- 4. CARREGAR EVENTO DO OUTBOX
  -- ==========================================================================

  select *
  into v_evento
  from public.encomendas_eventos_outbox e
  where e.event_id = p_event_id;

  if not found then
    raise exception
      'Evento de Encomendas não encontrado no Outbox.'
      using errcode = 'P0002';
  end if;


  -- ==========================================================================
  -- 5. CONTRATO ESTRITO DO EVENTO
  --
  -- Não aceitar o contrato histórico V1 sem entrada_id.
  -- ==========================================================================

  if v_evento.event_type
       is distinct from 'ENCOMENDA_DISPONIVEL_RETIRADA'
  then
    raise exception
      'O evento informado não pertence ao contrato ENCOMENDA_DISPONIVEL_RETIRADA.'
      using errcode = '23514';
  end if;

  if v_evento.origem
       is distinct from 'MODULO_PORTARIA'
     or
     v_evento.modulo
       is distinct from 'CENTRAL_ENCOMENDAS'
  then
    raise exception
      'Origem ou módulo do evento não corresponde ao contrato autorizado.'
      using errcode = '23514';
  end if;

  if v_evento.encomenda_id is null
     or v_evento.entrada_id is null
     or v_evento.pre_recebimento_id is null
     or v_evento.business_id is null
     or v_evento.condominio_id is null
  then
    raise exception
      'Evento incompleto para projeção na Central de Notificações.'
      using errcode = '23514';
  end if;


  -- ==========================================================================
  -- 6. ENCOMENDA AUTORITATIVA
  --
  -- Não confiar apenas no payload do Outbox para autorização/roteamento.
  -- ==========================================================================

  select *
  into v_encomenda
  from public.encomendas e
  where e.id = v_evento.encomenda_id;

  if not found then
    raise exception
      'Encomenda do evento não foi encontrada.'
      using errcode = 'P0002';
  end if;

  if v_encomenda.business_id
       is distinct from v_evento.business_id

     or v_encomenda.condominio_id
       is distinct from v_evento.condominio_id

     or v_encomenda.pre_recebimento_id
       is distinct from v_evento.pre_recebimento_id

     or v_encomenda.correlation_id
       is distinct from v_evento.correlation_id
  then
    raise exception
      'A Encomenda não corresponde ao contexto do evento.'
      using errcode = '23514';
  end if;

  if v_encomenda.status
       is distinct from 'DISPONIVEL_RETIRADA'
  then
    raise exception
      'A Encomenda não está disponível para retirada.'
      using errcode = '23514';
  end if;


  -- ==========================================================================
  -- 7. ENTRADA OFICIAL
  -- ==========================================================================

  select *
  into v_entrada
  from public.encomendas_entradas ee
  where ee.id = v_evento.entrada_id;

  if not found then
    raise exception
      'Entrada Oficial do evento não foi encontrada.'
      using errcode = 'P0002';
  end if;

  if v_entrada.encomenda_id
       is distinct from v_encomenda.id

     or v_entrada.business_id
       is distinct from v_evento.business_id

     or v_entrada.condominio_id
       is distinct from v_evento.condominio_id

     or v_entrada.pre_recebimento_id
       is distinct from v_evento.pre_recebimento_id

     or v_entrada.correlation_id
       is distinct from v_evento.correlation_id
  then
    raise exception
      'A Entrada Oficial não corresponde integralmente ao evento.'
      using errcode = '23514';
  end if;


  -- ==========================================================================
  -- 8. RESOLUÇÃO DO DESTINATÁRIO EFETIVO
  --
  -- MORADOR:
  --   utiliza a identidade canônica já associada à Encomenda.
  --
  -- DEPENDENTE:
  --   somente recebe diretamente quando:
  --     - dependente está ATIVO;
  --     - recebe_encomenda = true;
  --     - conta_autorizada = true;
  --     - possui_login = true;
  --     - existe vínculo Auth/usuário ativo no condomínio.
  --
  -- Caso contrário:
  --   comunicação vai ao Morador Responsável canônico.
  -- ==========================================================================

  if v_encomenda.destinatario_tipo = 'MORADOR' then

    if v_encomenda.destinatario_usuario_id is null
       or v_encomenda.destinatario_pessoa_id is null
       or v_encomenda.destinatario_morador_vinculo_id is null
    then
      raise exception
        'Encomenda MORADOR sem identidade nominal canônica completa.'
        using errcode = '23514';
    end if;

    if not exists (
      select 1
      from public.morador_unidade_vinculos muv
      where muv.id =
              v_encomenda.destinatario_morador_vinculo_id
        and muv.pessoa_id =
              v_encomenda.destinatario_pessoa_id
        and muv.condominio_id =
              v_encomenda.condominio_id
        and muv.unidade_id =
              v_encomenda.unidade_id
        and muv.ativo = true
    ) then
      raise exception
        'Vínculo do Morador destinatário não está ativo no contexto da Encomenda.'
        using errcode = '23514';
    end if;

    if not exists (
      select 1
      from public.usuario_condominio_vinculos ucv
      join public.usuarios u
        on u.id = ucv.usuario_id
      where ucv.usuario_id =
              v_encomenda.destinatario_usuario_id
        and ucv.pessoa_id =
              v_encomenda.destinatario_pessoa_id
        and ucv.condominio_id =
              v_encomenda.condominio_id
        and ucv.ativo = true
        and u.ativo = true
    ) then
      raise exception
        'Usuário do Morador destinatário não possui vínculo ativo no condomínio.'
        using errcode = '23514';
    end if;

    v_usuario_id :=
      v_encomenda.destinatario_usuario_id;

    v_pessoa_id :=
      v_encomenda.destinatario_pessoa_id;

    v_morador_vinculo_id :=
      v_encomenda.destinatario_morador_vinculo_id;

    v_dependente_id := null;
    v_responsavel_vinculo_id := null;

    v_tipo_destinatario := 'MORADOR';
    v_origem_resolucao := 'MORADOR_DIRETO';


  elsif v_encomenda.destinatario_tipo = 'DEPENDENTE' then

    if v_encomenda.destinatario_dependente_id is null
       or
       v_encomenda.destinatario_responsavel_vinculo_id is null
    then
      raise exception
        'Encomenda DEPENDENTE sem referências nominais obrigatórias.'
        using errcode = '23514';
    end if;


    -- ------------------------------------------------------------------------
    -- 8.1 Dependente canônico
    -- ------------------------------------------------------------------------

    select *
    into v_dependente
    from public.dependentes_unidade d
    where d.id =
      v_encomenda.destinatario_dependente_id;

    if not found then
      raise exception
        'Dependente nominal da Encomenda não foi encontrado.'
        using errcode = 'P0002';
    end if;

    if v_dependente.business_id
         is distinct from v_encomenda.business_id

       or v_dependente.condominio_id
         is distinct from v_encomenda.condominio_id

       or v_dependente.unidade_id
         is distinct from v_encomenda.unidade_id

       or v_dependente.morador_responsavel_id
         is distinct from
           v_encomenda.destinatario_responsavel_vinculo_id

       or v_dependente.status
         is distinct from 'ATIVO'
    then
      raise exception
        'Dependente nominal não corresponde ao contexto autorizado da Encomenda.'
        using errcode = '23514';
    end if;


    -- ------------------------------------------------------------------------
    -- 8.2 Tentar Dependente como destinatário efetivo
    --
    -- pessoa_id é obrigatório para haver resolução Auth canônica.
    -- ------------------------------------------------------------------------

    v_usuario_id := null;

    if coalesce(v_dependente.recebe_encomenda, false) = true
       and coalesce(v_dependente.conta_autorizada, false) = true
       and coalesce(v_dependente.possui_login, false) = true
       and v_dependente.pessoa_id is not null
    then

      select ucv.usuario_id
      into v_usuario_id
      from public.usuario_condominio_vinculos ucv
      join public.usuarios u
        on u.id = ucv.usuario_id
      where ucv.pessoa_id =
              v_dependente.pessoa_id
        and ucv.condominio_id =
              v_dependente.condominio_id
        and ucv.ativo = true
        and u.ativo = true
      order by ucv.criado_em
      limit 1;

    end if;


    if v_usuario_id is not null then

      v_pessoa_id :=
        v_dependente.pessoa_id;

      v_morador_vinculo_id := null;

      v_dependente_id :=
        v_dependente.id;

      v_responsavel_vinculo_id :=
        v_dependente.morador_responsavel_id;

      v_tipo_destinatario := 'DEPENDENTE';

      v_origem_resolucao :=
        'DEPENDENTE_AUTORIZADO';


    else

      -- ----------------------------------------------------------------------
      -- 8.3 Fallback obrigatório para Morador Responsável
      -- ----------------------------------------------------------------------

      select *
      into v_responsavel
      from public.morador_unidade_vinculos muv
      where muv.id =
        v_dependente.morador_responsavel_id;

      if not found then
        raise exception
          'Morador Responsável do Dependente não foi encontrado.'
          using errcode = 'P0002';
      end if;

      if v_responsavel.condominio_id
           is distinct from v_encomenda.condominio_id

         or v_responsavel.unidade_id
           is distinct from v_encomenda.unidade_id

         or v_responsavel.ativo is distinct from true
      then
        raise exception
          'Morador Responsável não possui vínculo ativo no contexto da Encomenda.'
          using errcode = '23514';
      end if;


      select ucv.usuario_id
      into v_usuario_id
      from public.usuario_condominio_vinculos ucv
      join public.usuarios u
        on u.id = ucv.usuario_id
      where ucv.pessoa_id =
              v_responsavel.pessoa_id
        and ucv.condominio_id =
              v_responsavel.condominio_id
        and ucv.ativo = true
        and u.ativo = true
      order by ucv.criado_em
      limit 1;


      if v_usuario_id is null then
        raise exception
          'Morador Responsável não possui usuário canônico ativo no condomínio.'
          using errcode = '23514';
      end if;


      v_pessoa_id :=
        v_responsavel.pessoa_id;

      v_morador_vinculo_id :=
        v_responsavel.id;

      v_dependente_id :=
        v_dependente.id;

      v_responsavel_vinculo_id :=
        v_responsavel.id;

      v_tipo_destinatario :=
        'MORADOR_RESPONSAVEL';

      v_origem_resolucao :=
        'DEPENDENTE_ROTEADO_RESPONSAVEL';

    end if;


  else

    raise exception
      'Tipo nominal de destinatário ainda não suportado pelo projetor V1: %',
      coalesce(
        v_encomenda.destinatario_tipo,
        'NULL'
      )
      using errcode = '23514';

  end if;


  -- ==========================================================================
  -- 9. CHAVES DETERMINÍSTICAS
  -- ==========================================================================

  v_codigo :=
    'NTF-ENCOM-DISP-'
    || replace(p_event_id::text, '-', '');

  v_chave_notificacao :=
    'ENCOMENDA_DISPONIVEL_RETIRADA:'
    || p_event_id::text;

  v_chave_entrega :=
    v_chave_notificacao
    || ':'
    || v_usuario_id::text
    || ':IN_APP';


  -- ==========================================================================
  -- 10. NOTIFICAÇÃO LÓGICA
  --
  -- Não inclui Token/QR Code.
  -- A rota é navegação; não concede autorização.
  -- ==========================================================================

  insert into public.central_notificacoes (
    codigo,
    chave_idempotencia,

    event_id,
    event_type,
    event_version,

    correlation_id,
    causation_id,

    business_id,
    condominio_id,

    natureza,
    categoria_codigo,
    prioridade,
    classificacao_atencao,

    titulo,
    resumo,
    conteudo,

    icone_codigo,

    origem,
    modulo,

    origem_tipo,
    origem_id,

    rota_destino,
    abrir_em,

    status,
    requer_acao,

    retencao_dias,

    criado_por_agente,

    metadata,
    schema_version
  )
  values (
    v_codigo,
    v_chave_notificacao,

    v_evento.event_id,
    v_evento.event_type,
    v_evento.event_version,

    v_evento.correlation_id,
    v_evento.causation_id,

    v_evento.business_id,
    v_evento.condominio_id,

    'OPERACIONAL',
    'ENCOMENDA_DISPONIVEL_RETIRADA',
    'ALTA',
    'IMPORTANTE',

    v_titulo,
    v_resumo,
    v_conteudo,

    'PACKAGE',

    'MODULO_PORTARIA',
    'CENTRAL_ENCOMENDAS',

    'ENCOMENDA',
    v_encomenda.id,

    '/morador/encomendas',
    'TELA',

    'ATIVA',
    true,

    30,

    'CENTRAL_NOTIFICACOES_PROJECTOR_V1',

    jsonb_build_object(
      'contrato',
        'ENCOMENDA_DISPONIVEL_RETIRADA_V1',

      'pre_recebimento_id',
        v_evento.pre_recebimento_id,

      'entrada_id',
        v_evento.entrada_id,

      'encomenda_id',
        v_encomenda.id,

      'unidade_id',
        v_encomenda.unidade_id,

      'destinatario_tipo_nominal',
        v_encomenda.destinatario_tipo,

      'destinatario_tipo_efetivo',
        v_tipo_destinatario,

      'origem_resolucao',
        v_origem_resolucao,

      'token_incluido',
        false
    ),

    1
  )
  returning id
  into v_notificacao_id;


  -- ==========================================================================
  -- 11. ITEM
  -- ==========================================================================

  insert into public.central_notificacoes_itens (
    central_notificacao_id,

    business_id,
    condominio_id,

    event_id,
    event_type,
    event_version,
    correlation_id,
    causation_id,

    pre_recebimento_id,
    encomenda_id,
    entrada_id,
    unidade_id,

    destinatario_tipo_nominal,
    destinatario_usuario_id_nominal,
    destinatario_pessoa_id_nominal,
    destinatario_morador_vinculo_id_nominal,
    destinatario_dependente_id_nominal,
    destinatario_responsavel_vinculo_id_nominal,

    metadata
  )
  values (
    v_notificacao_id,

    v_evento.business_id,
    v_evento.condominio_id,

    v_evento.event_id,
    v_evento.event_type,
    v_evento.event_version,
    v_evento.correlation_id,
    v_evento.causation_id,

    v_evento.pre_recebimento_id,
    v_encomenda.id,
    v_evento.entrada_id,
    v_encomenda.unidade_id,

    v_encomenda.destinatario_tipo,
    v_encomenda.destinatario_usuario_id,
    v_encomenda.destinatario_pessoa_id,
    v_encomenda.destinatario_morador_vinculo_id,
    v_encomenda.destinatario_dependente_id,
    v_encomenda.destinatario_responsavel_vinculo_id,

    jsonb_build_object(
      'numero_encomenda',
        v_encomenda.numero_encomenda
    )
  )
  returning id
  into v_item_id;


  -- ==========================================================================
  -- 12. DESTINATÁRIO EFETIVO
  -- ==========================================================================

  insert into public.central_notificacoes_destinatarios (
    central_notificacao_id,

    business_id,
    condominio_id,
    unidade_id,

    tipo_destinatario,

    usuario_id,
    pessoa_id,
    morador_vinculo_id,
    dependente_id,
    responsavel_vinculo_id,

    origem_resolucao,

    status,

    metadata
  )
  values (
    v_notificacao_id,

    v_evento.business_id,
    v_evento.condominio_id,
    v_encomenda.unidade_id,

    v_tipo_destinatario,

    v_usuario_id,
    v_pessoa_id,
    v_morador_vinculo_id,
    v_dependente_id,
    v_responsavel_vinculo_id,

    v_origem_resolucao,

    'ATIVO',

    jsonb_build_object(
      'event_id',
        v_evento.event_id,

      'encomenda_id',
        v_encomenda.id
    )
  )
  returning id
  into v_destinatario_id;


  -- ==========================================================================
  -- 13. INBOX
  --
  -- A Inbox é o estado individual In-App.
  -- ==========================================================================

  insert into public.central_notificacoes_inbox (
    central_notificacao_id,
    central_destinatario_id,

    business_id,
    condominio_id,

    usuario_id,

    status
  )
  values (
    v_notificacao_id,
    v_destinatario_id,

    v_evento.business_id,
    v_evento.condominio_id,

    v_usuario_id,

    'ATIVA'
  )
  returning id
  into v_inbox_id;


  -- ==========================================================================
  -- 14. DELIVERY IN_APP
  --
  -- Para Encomendas:
  --   IN_APP não consulta preferência.
  --
  -- Como a persistência na Inbox é a entrega técnica interna nesta fase,
  -- o Delivery já nasce ENTREGUE.
  -- ==========================================================================

  insert into public.central_notificacoes_entregas (
    central_notificacao_id,
    central_destinatario_id,

    business_id,
    condominio_id,

    canal,
    subcanal,

    status,

    regra_preferencia,
    preferencia_resultado,

    template_codigo,
    template_versao,

    chave_idempotencia,

    enfileirada_em,
    processando_em,
    enviada_em,
    entregue_em,

    metadata
  )
  values (
    v_notificacao_id,
    v_destinatario_id,

    v_evento.business_id,
    v_evento.condominio_id,

    'IN_APP',
    null,

    'ENTREGUE',

    'NAO_APLICAVEL',
    'NAO_APLICAVEL',

    'ENCOMENDA_DISPONIVEL_RETIRADA_IN_APP',
    1,

    v_chave_entrega,

    now(),
    now(),
    now(),
    now(),

    jsonb_build_object(
      'inbox_id',
        v_inbox_id,

      'persistencia_interna',
        true,

      'provider_externo',
        false
    )
  )
  returning id
  into v_entrega_id;


  -- ==========================================================================
  -- 15. RESPOSTA
  -- ==========================================================================

  return jsonb_build_object(
    'ok', true,
    'idempotente', false,

    'event_id',
      v_evento.event_id,

    'central_notificacao_id',
      v_notificacao_id,

    'central_item_id',
      v_item_id,

    'central_destinatario_id',
      v_destinatario_id,

    'central_inbox_id',
      v_inbox_id,

    'central_entrega_id',
      v_entrega_id,

    'canal',
      'IN_APP',

    'destinatario_usuario_id',
      v_usuario_id,

    'destinatario_tipo',
      v_tipo_destinatario,

    'origem_resolucao',
      v_origem_resolucao
  );


exception

  -- ==========================================================================
  -- Concorrência:
  --
  -- As UNIQUEs permanecem como última barreira autoritativa.
  -- Caso duas execuções concorrentes tentem projetar o mesmo event_id,
  -- a execução perdedora recupera a projeção vencedora.
  -- ==========================================================================

  when unique_violation then

    select
      i.central_notificacao_id
    into
      v_notificacao_id
    from public.central_notificacoes_itens i
    where i.event_id = p_event_id;

    if found then
      return jsonb_build_object(
        'ok', true,
        'idempotente', true,
        'concorrencia_resolvida', true,
        'event_id', p_event_id,
        'central_notificacao_id', v_notificacao_id
      );
    end if;

    raise;

end;
$function$;


-- ============================================================================
-- 16. SEGURANÇA
--
-- Função interna. Não conceder EXECUTE a frontend.
-- ============================================================================

revoke all on function
public.fn_central_notificacoes_projetar_encomenda_disponivel_v1(uuid)
from public;

revoke all on function
public.fn_central_notificacoes_projetar_encomenda_disponivel_v1(uuid)
from anon;

revoke all on function
public.fn_central_notificacoes_projetar_encomenda_disponivel_v1(uuid)
from authenticated;

grant execute on function
public.fn_central_notificacoes_projetar_encomenda_disponivel_v1(uuid)
to service_role;


comment on function
public.fn_central_notificacoes_projetar_encomenda_disponivel_v1(uuid)
is
'Projetor interno e idempotente do evento ENCOMENDA_DISPONIVEL_RETIRADA do contrato V2 de Encomendas para a nova Central de Notificações. Resolve destinatário efetivo, cria Inbox e Delivery IN_APP. Não altera a Encomenda, não envia canais externos e não marca o Outbox global como processado.';


commit;