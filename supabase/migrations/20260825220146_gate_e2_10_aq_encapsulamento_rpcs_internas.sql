-- =====================================================================
-- SISTEMA CHEGOU!
-- GATE E2.10-AQ
--
-- ENCAPSULAMENTO DAS RPCs INTERNAS DA CENTRAL DE ENCOMENDAS
--
-- Objetivo:
-- - preservar os contratos públicos/orquestradores;
-- - impedir chamada direta por authenticated das RPCs internas/legadas;
-- - preservar execução interna por SECURITY DEFINER;
-- - preservar postgres e service_role.
--
-- NÃO remove funções.
-- NÃO remove trigger.
-- NÃO altera lógica operacional.
-- =====================================================================


-- =====================================================================
-- 1. PROMOÇÃO DE VOLUME V1 — LEGADO / NÃO PÚBLICO
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.rpc_encomenda_volume_promover_v1(
  uuid,
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
  text
) FROM authenticated;

REVOKE ALL ON FUNCTION public.rpc_encomenda_volume_promover_v1(
  uuid,
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
  text
) FROM PUBLIC;


-- =====================================================================
-- 2. PROMOÇÃO DE VOLUME V2 — CONTRATO INTERNO DA ENTRADA
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.rpc_encomenda_volume_promover_v2(
  uuid,
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
  text
) FROM authenticated;

REVOKE ALL ON FUNCTION public.rpc_encomenda_volume_promover_v2(
  uuid,
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
  text
) FROM PUBLIC;


-- =====================================================================
-- 3. CONFIRMAÇÃO DE PRÉ-RECEBIMENTO V1 — LEGADO / NÃO PÚBLICO
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.rpc_encomenda_pre_recebimento_confirmar_v1(
  uuid,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) FROM authenticated;

REVOKE ALL ON FUNCTION public.rpc_encomenda_pre_recebimento_confirmar_v1(
  uuid,
  integer,
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


-- =====================================================================
-- 4. CONFIRMAÇÃO DE PRÉ-RECEBIMENTO V2
--    CONTRATO INTERNO DOS PROCESSADORES DE RECEBIMENTO
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.rpc_encomenda_pre_recebimento_confirmar_v2(
  uuid,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) FROM authenticated;

REVOKE ALL ON FUNCTION public.rpc_encomenda_pre_recebimento_confirmar_v2(
  uuid,
  integer,
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


-- =====================================================================
-- 5. GARANTIR CONTRATO PÚBLICO OFICIAL DA ENTRADA
-- =====================================================================

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


-- =====================================================================
-- 6. GARANTIR CONTRATOS PÚBLICOS OFICIAIS DO RECEBIMENTO
-- =====================================================================

REVOKE ALL ON FUNCTION public.rpc_encomenda_pre_recebimento_processar_v1(
  text,
  jsonb,
  text,
  text,
  text,
  text,
  text,
  text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rpc_encomenda_pre_recebimento_processar_v1(
  text,
  jsonb,
  text,
  text,
  text,
  text,
  text,
  text
) TO authenticated;


REVOKE ALL ON FUNCTION public.rpc_encomenda_pre_recebimento_processar_v2(
  text,
  jsonb,
  text,
  text,
  text,
  text,
  text,
  text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rpc_encomenda_pre_recebimento_processar_v2(
  text,
  jsonb,
  text,
  text,
  text,
  text,
  text,
  text
) TO authenticated;


-- =====================================================================
-- FIM — GATE E2.10-AQ
-- =====================================================================