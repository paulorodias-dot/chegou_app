import {
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "../../../../../services/supabase";

import {
  subscribeMoradorRastreios,
} from "../realtime/moradorRastreioRealtime";

export default function useMoradorRastreioRealtime({
  enabled = true,
  onInvalidate,
}) {
  const onInvalidateRef =
    useRef(onInvalidate);

  const [status, setStatus] =
    useState("IDLE");

  const [error, setError] =
    useState(null);

  useEffect(() => {
    onInvalidateRef.current =
      onInvalidate;
  }, [onInvalidate]);

  useEffect(() => {
    if (!enabled) {
      setStatus("IDLE");
      setError(null);

      return undefined;
    }

    let active = true;

    let subscription = null;

    async function connect() {
      try {
        setStatus(
          "CONNECTING",
        );

        setError(null);

        const {
          data: sessionData,
          error: sessionError,
        } =
          await supabase.auth
            .getSession();

        if (!active) {
          return;
        }

        if (sessionError) {
          throw sessionError;
        }

        const usuarioId =
          sessionData
            ?.session
            ?.user
            ?.id;

        if (!usuarioId) {
          throw new Error(
            "Sessão do Morador não identificada.",
          );
        }

        subscription =
          subscribeMoradorRastreios({
            usuarioId,

            onInvalidate(
              event,
            ) {
              if (!active) {
                return;
              }

              onInvalidateRef
                .current?.(
                  event,
                );
            },

            onStatusChange(
              nextStatus,
            ) {
              if (!active) {
                return;
              }

              setStatus(
                nextStatus,
              );
            },

            onError(
              realtimeError,
            ) {
              if (!active) {
                return;
              }

              setError(
                realtimeError,
              );
            },
          });
      } catch (
        connectionError
      ) {
        if (!active) {
          return;
        }

        setStatus(
          "CHANNEL_ERROR",
        );

        setError(
          connectionError,
        );
      }
    }

    connect();

    return () => {
      active = false;

      if (subscription) {
        subscription
          .unsubscribe()
          .catch(() => {});
      }
    };
  }, [enabled]);

  return {
    status,
    error,

    connected:
      status ===
      "SUBSCRIBED",
  };
}