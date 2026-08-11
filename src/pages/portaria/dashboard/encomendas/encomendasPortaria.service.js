const ESTADO_AGUARDANDO = Object.freeze({
  status: "aguardando_integracao",
  atualizadoEm: null,
});

/*
 * IMPORTANTE
 *
 * Quando estas funções forem implementadas:
 *
 * - NÃO receber condominio_id da UI como fonte de autorização;
 * - NÃO receber business_id da UI como fonte de autorização;
 * - NÃO confiar em operador_id enviado pelo navegador;
 *
 * O Supabase deverá resolver o usuário por auth.uid()
 * e o backend/RPC deverá determinar o vínculo autorizado.
 */

export async function obterResumoDashboardPortaria({
  somenteMeusProcessos = false,
} = {}) {
  void somenteMeusProcessos;

  return {
    ...ESTADO_AGUARDANDO,
    kpis: null,
  };
}

export async function obterResumoEncomendasPortaria({
  somenteMeusProcessos = false,
} = {}) {
  void somenteMeusProcessos;

  return {
    ...ESTADO_AGUARDANDO,
    dados: null,
  };
}

export async function obterAlertasPortaria({
  somenteMeusProcessos = false,
} = {}) {
  void somenteMeusProcessos;

  return {
    ...ESTADO_AGUARDANDO,
    itens: [],
  };
}

export async function obterInteligenciaPortaria() {
  return {
    ...ESTADO_AGUARDANDO,
    itens: [],
  };
}