import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  atualizarMoradorRastreio,
  cancelarMoradorRastreio,
  criarMoradorRastreio,
  listarMoradorRastreios,
  listarMoradorRastreioUnidades,
  listarTransportadorasRastreio,
} from "../services/moradorRastreio.service";

import useMoradorRastreioRealtime from "./useMoradorRastreioRealtime";

export default function useMoradorRastreios({
  condominioId,
  enabled = true,
}) {
  const [rastreios, setRastreios] =
    useState([]);

  const [
    transportadoras,
    setTransportadoras,
  ] = useState([]);

  const [
    unidades,
    setUnidades,
  ] = useState([]);

  const [total, setTotal] =
    useState(0);

  const [loading, setLoading] =
    useState(false);

  const [
    loadingTransportadoras,
    setLoadingTransportadoras,
  ] = useState(false);

  const [
    loadingUnidades,
    setLoadingUnidades,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState(null);

  const mountedRef =
    useRef(true);

  const refreshInFlightRef =
    useRef(false);

  const refreshPendingRef =
    useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /*
   * Mudou o tenant ativo:
   *
   * descartamos imediatamente qualquer estado
   * pertencente ao condomínio anterior.
   *
   * Isso impede mistura visual entre tenants.
   */
  useEffect(() => {
    setRastreios([]);
    setTransportadoras([]);
    setUnidades([]);
    setTotal(0);
    setError(null);
  }, [condominioId]);

  /* ============================================================
     LISTAGEM / REFRESH

     Autoridade:
     - usuário = auth.uid() no backend;
     - tenant = condominioId ativo;
     - unidadeId = null na visão geral.

     Cada rastreio continua individualmente vinculado
     à sua unidade.
     ============================================================ */

  const refresh =
    useCallback(
      async ({
        silent = false,
        unidadeId = null,
        status = null,
      } = {}) => {
        if (
          !enabled ||
          !condominioId
        ) {
          return null;
        }

        if (
          refreshInFlightRef.current
        ) {
          refreshPendingRef.current =
            true;

          return null;
        }

        refreshInFlightRef.current =
          true;

        if (!silent) {
          setLoading(true);
        }

        setError(null);

        try {
          const result =
            await listarMoradorRastreios({
              condominioId,

              /*
               * null:
               * todas as unidades daquele usuário
               * dentro do condomínio ativo.
               */
              unidadeId:
                unidadeId || null,

              status,

              limite: 100,

              offset: 0,
            });

          if (
            mountedRef.current
          ) {
            setRastreios(
              result.itens,
            );

            setTotal(
              result.total,
            );
          }

          return result;
        } catch (refreshError) {
          if (
            mountedRef.current
          ) {
            setError(
              refreshError,
            );
          }

          throw refreshError;
        } finally {
          refreshInFlightRef.current =
            false;

          if (
            mountedRef.current &&
            !silent
          ) {
            setLoading(false);
          }

          /*
           * Caso um Broadcast chegue enquanto
           * a consulta estiver em andamento,
           * repetimos a leitura no final.
           */
          if (
            refreshPendingRef.current
          ) {
            refreshPendingRef.current =
              false;

            refresh({
              silent: true,
            }).catch(() => {});
          }
        }
      },
      [
        condominioId,
        enabled,
      ],
    );

  /* ============================================================
     UNIDADES AUTORIZADAS

     Fonte:
       rpc_morador_rastreio_unidades_listar_v1

     Regra:
       auth.uid()
       +
       condomínio ativo

     Resultado:
       somente unidades residenciais autorizadas
       daquele usuário naquele tenant.
     ============================================================ */

  const carregarUnidades =
    useCallback(
      async () => {
        if (
          !enabled ||
          !condominioId
        ) {
          return [];
        }

        setLoadingUnidades(
          true,
        );

        setError(null);

        try {
          const result =
            await listarMoradorRastreioUnidades({
              condominioId,
            });

          if (
            mountedRef.current
          ) {
            setUnidades(
              result.itens,
            );
          }

          return result.itens;
        } catch (
          unidadesError
        ) {
          if (
            mountedRef.current
          ) {
            setUnidades([]);

            setError(
              unidadesError,
            );
          }

          throw unidadesError;
        } finally {
          if (
            mountedRef.current
          ) {
            setLoadingUnidades(
              false,
            );
          }
        }
      },
      [
        condominioId,
        enabled,
      ],
    );

  /* ============================================================
     BOOTSTRAP

     Rastreios e unidades são carregados de forma independente.

     A ausência de unidade não impede a leitura dos rastreios.
     ============================================================ */

  useEffect(() => {
    if (
      !enabled ||
      !condominioId
    ) {
      setRastreios([]);
      setTransportadoras([]);
      setUnidades([]);
      setTotal(0);
      setError(null);
      setLoading(false);
      setLoadingUnidades(false);

      return;
    }

    refresh().catch(() => {
      /*
       * O erro já está armazenado em "error".
       */
    });

    carregarUnidades().catch(() => {
      /*
       * O erro já está armazenado em "error".
       */
    });
  }, [
    condominioId,
    enabled,
    refresh,
    carregarUnidades,
  ]);

  /* ============================================================
     TRANSPORTADORAS

     A listagem pertence ao tenant ativo.
     Não depende de unidade.
     ============================================================ */

  const carregarTransportadoras =
    useCallback(
      async ({
        busca = null,
      } = {}) => {
        if (
          !enabled ||
          !condominioId
        ) {
          return [];
        }

        setLoadingTransportadoras(
          true,
        );

        setError(null);

        try {
          const result =
            await listarTransportadorasRastreio({
              condominioId,

              busca,

              limite: 100,

              offset: 0,
            });

          if (
            mountedRef.current
          ) {
            setTransportadoras(
              result.itens,
            );
          }

          return result.itens;
        } catch (
          transportadorasError
        ) {
          if (
            mountedRef.current
          ) {
            setError(
              transportadorasError,
            );
          }

          throw transportadorasError;
        } finally {
          if (
            mountedRef.current
          ) {
            setLoadingTransportadoras(
              false,
            );
          }
        }
      },
      [
        condominioId,
        enabled,
      ],
    );

  /* ============================================================
     REALTIME

     Canal:
       privado por auth.uid().

     Broadcast:
       apenas invalida.

     Fonte oficial:
       novo RPC de listagem.
     ============================================================ */

  const realtime =
    useMoradorRastreioRealtime({
      enabled:
        enabled &&
        Boolean(
          condominioId,
        ),

      onInvalidate() {
        refresh({
          silent: true,
        }).catch(() => {});
      },
    });

  /* ============================================================
     CRIAÇÃO

     Identidade:
       auth.uid() no backend.

     Tenant:
       condominioId ativo.

     Unidade:
       deve pertencer à lista autorizada
       daquele usuário naquele condomínio.

     O frontend usa a lista para UX.
     O backend valida novamente.
     ============================================================ */

  const criar =
    useCallback(
      async (payload) => {
        if (!condominioId) {
          throw new Error(
            "Condomínio não identificado.",
          );
        }

        const unidadeId =
          payload?.unidadeId ||
          null;

        if (!unidadeId) {
          throw new Error(
            "Selecione a unidade desta encomenda.",
          );
        }

        /*
         * Validação defensiva de UX.
         *
         * Não substitui a validação do backend.
         */
        const unidadeAutorizada =
          unidades.some(
            (item) =>
              (
                item?.unidade_id ||
                item?.id
              ) === unidadeId,
          );

        if (!unidadeAutorizada) {
          throw new Error(
            "A unidade selecionada não está disponível para este acesso.",
          );
        }

        setSaving(true);
        setError(null);

        try {
          const result =
            await criarMoradorRastreio({
              ...payload,

              condominioId,

              unidadeId,
            });

          await refresh({
            silent: true,
          });

          return result;
        } catch (createError) {
          if (
            mountedRef.current
          ) {
            setError(
              createError,
            );
          }

          throw createError;
        } finally {
          if (
            mountedRef.current
          ) {
            setSaving(false);
          }
        }
      },
      [
        condominioId,
        refresh,
        unidades,
      ],
    );

  /* ============================================================
     EDIÇÃO

     O frontend envia somente o ID do rastreio
     e os campos editáveis.

     O backend valida a propriedade contra auth.uid().
     ============================================================ */

  const atualizar =
    useCallback(
      async (payload) => {
        setSaving(true);
        setError(null);

        try {
          const result =
            await atualizarMoradorRastreio(
              payload,
            );

          await refresh({
            silent: true,
          });

          return result;
        } catch (updateError) {
          if (
            mountedRef.current
          ) {
            setError(
              updateError,
            );
          }

          throw updateError;
        } finally {
          if (
            mountedRef.current
          ) {
            setSaving(false);
          }
        }
      },
      [refresh],
    );

  /* ============================================================
     CANCELAMENTO

     A propriedade do rastreio é validada
     pelo backend contra auth.uid().
     ============================================================ */

  const cancelar =
    useCallback(
      async (payload) => {
        setSaving(true);
        setError(null);

        try {
          const result =
            await cancelarMoradorRastreio(
              payload,
            );

          await refresh({
            silent: true,
          });

          return result;
        } catch (cancelError) {
          if (
            mountedRef.current
          ) {
            setError(
              cancelError,
            );
          }

          throw cancelError;
        } finally {
          if (
            mountedRef.current
          ) {
            setSaving(false);
          }
        }
      },
      [refresh],
    );

  /* ============================================================
     CONTRATO DO HOOK
     ============================================================ */

  return {
    /*
     * Tenant ativo.
     */
    condominioId:
      condominioId || null,

    /*
     * Dados autorizados.
     */
    rastreios,

    transportadoras,

    unidades,

    total,

    /*
     * Estados.
     */
    loading,

    loadingTransportadoras,

    loadingUnidades,

    saving,

    error,

    /*
     * Realtime.
     */
    realtimeStatus:
      realtime.status,

    realtimeConnected:
      realtime.connected,

    realtimeError:
      realtime.error,

    /*
     * Operações.
     */
    refresh,

    carregarTransportadoras,

    carregarUnidades,

    criar,

    atualizar,

    cancelar,
  };
}