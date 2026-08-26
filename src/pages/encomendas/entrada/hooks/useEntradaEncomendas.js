import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  listarFilaEntrada,
  listarTransportadorasFiltroEntrada,
  obterResumoEntrada,
} from "../services/entradaService";

export function useEntradaEncomendas({
  condominioId,
  filtros = {},
} = {}) {
  const [
    items,
    setItems,
  ] =
    useState([]);

  const [
    resumo,
    setResumo,
  ] =
    useState(null);

  const [
    transportadoras,
    setTransportadoras,
  ] =
    useState([]);

  const [
    total,
    setTotal,
  ] =
    useState(0);

  const [
    timezoneIana,
    setTimezoneIana,
  ] =
    useState(null);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState(null);

  const requisicaoAtualRef =
    useRef(0);

  const condominioAnteriorRef =
    useRef(
      condominioId
    );

  const carregar =
    useCallback(
      async ({
        modoAtualizacao = false,
      } = {}) => {
        const requisicaoId =
          ++requisicaoAtualRef.current;

        if (!condominioId) {
          setItems([]);
          setResumo(null);
          setTransportadoras([]);
          setTotal(0);
          setTimezoneIana(null);
          setLoading(false);
          setRefreshing(false);

          setError(
            "Não foi possível identificar o condomínio atual."
          );

          return;
        }

        if (modoAtualizacao) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        try {
          const [
            resultadoResumo,
            resultadoFila,
            resultadoTransportadoras,
          ] =
            await Promise.all([
              obterResumoEntrada({
                condominioId,
              }),

              listarFilaEntrada({
                condominioId,

                busca:
                  filtros.busca ||
                  null,

                status:
                  filtros.status ||
                  null,

                transportadoraId:
                  filtros
                    .transportadoraId ||
                  null,

                dataInicio:
                  filtros.dataInicio ||
                  null,

                dataFim:
                  filtros.dataFim ||
                  null,

                limite:
                  filtros.limite ||
                  30,

                offset:
                  filtros.offset ||
                  0,
              }),

              listarTransportadorasFiltroEntrada({
                condominioId,

                dataInicio:
                  filtros.dataInicio ||
                  null,

                dataFim:
                  filtros.dataFim ||
                  null,
              }),
            ]);

          if (
            requisicaoId !==
            requisicaoAtualRef.current
          ) {
            return;
          }

          if (
            resultadoFila
              ?.condominioId &&
            resultadoFila
              .condominioId !==
              condominioId
          ) {
            throw new Error(
              "O contexto do condomínio mudou durante a atualização."
            );
          }

          if (
            resultadoResumo
              ?.resumo
              ?.condominioId &&
            resultadoResumo
              .resumo
              .condominioId !==
              condominioId
          ) {
            throw new Error(
              "O contexto do condomínio mudou durante a atualização."
            );
          }

          setItems(
            Array.isArray(
              resultadoFila?.lotes
            )
              ? resultadoFila.lotes
              : []
          );

          setResumo(
            resultadoResumo
              ?.resumo ||
            null
          );

          setTransportadoras(
            Array.isArray(
              resultadoTransportadoras
                ?.transportadoras
            )
              ? resultadoTransportadoras
                  .transportadoras
              : []
          );

          setTotal(
            Number(
              resultadoFila
                ?.total ||
              0
            )
          );

          setTimezoneIana(
            resultadoFila
              ?.timezoneIana ||
            resultadoResumo
              ?.resumo
              ?.timezoneIana ||
            null
          );
        } catch (err) {
          if (
            requisicaoId !==
            requisicaoAtualRef.current
          ) {
            return;
          }

          setItems([]);
          setResumo(null);
          setTransportadoras([]);
          setTotal(0);
          setTimezoneIana(null);

          setError(
            err?.message ||
              "Não foi possível carregar a fila de Entrada."
          );
        } finally {
          if (
            requisicaoId ===
            requisicaoAtualRef.current
          ) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      },
      [
        condominioId,
        filtros.busca,
        filtros.status,
        filtros.transportadoraId,
        filtros.dataInicio,
        filtros.dataFim,
        filtros.limite,
        filtros.offset,
      ]
    );

  useEffect(() => {
    if (
      condominioAnteriorRef.current !==
      condominioId
    ) {
      ++requisicaoAtualRef.current;

      setItems([]);
      setResumo(null);
      setTransportadoras([]);
      setTotal(0);
      setTimezoneIana(null);
      setError(null);

      condominioAnteriorRef.current =
        condominioId;
    }
  }, [condominioId]);

  useEffect(() => {
    carregar();

    return () => {
      ++requisicaoAtualRef.current;
    };
  }, [carregar]);

  const refresh =
    useCallback(() => {
      return carregar({
        modoAtualizacao: true,
      });
    }, [carregar]);

  return {
    items,
    resumo,
    transportadoras,
    total,
    timezoneIana,

    loading,
    refreshing,

    error,

    hasContract:
      Boolean(condominioId),

    refresh,
  };
}

export default useEntradaEncomendas;