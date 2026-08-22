import { useCallback, useState } from "react";

export function useEntradaEncomendas() {
  const [loading, setLoading] = useState(false);

  /*
   * Fase estrutural.
   *
   * Não existe ainda contrato backend homologado para a fila oficial
   * de Entrada. Por isso:
   *
   * - não consultamos Supabase;
   * - não simulamos registros;
   * - não calculamos KPI;
   * - não inferimos estados operacionais.
   */
  const items = [];
  const error = null;
  const hasContract = false;

  const refresh = useCallback(() => {
    /*
     * Mantido propositalmente neutro até a homologação
     * do contrato oficial Recebimento → Entrada.
     *
     * A função já existe para preservar o contrato da View
     * sem criar acesso fictício a dados.
     */
    setLoading(false);
  }, []);

  return {
    items,
    loading,
    error,
    hasContract,
    refresh,
  };
}

export default useEntradaEncomendas;