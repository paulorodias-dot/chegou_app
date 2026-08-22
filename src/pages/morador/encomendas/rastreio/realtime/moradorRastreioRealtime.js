/*
 * SISTEMA CHEGOU!
 * Módulo Morador — Encomendas > Rastreio
 *
 * Infraestrutura Realtime.
 *
 * Regras:
 * - Broadcast NÃO é fonte autoritativa;
 * - payload recebido serve apenas para invalidação;
 * - estado oficial sempre volta pelo RPC;
 * - canal privado vinculado ao usuário autenticado;
 * - nenhuma leitura direta da tabela operacional.
 */

import { supabase } from "../../../../../services/supabase";

const CHANNEL_PREFIX =
  "morador-rastreios:";

const EVENT_NAME =
  "rastreio_atualizado";

export function buildMoradorRastreiosTopic(
  usuarioId,
) {
  const normalizedUsuarioId =
    String(usuarioId ?? "").trim();

  if (!normalizedUsuarioId) {
    throw new Error(
      "Usuário não identificado para acompanhar os rastreios.",
    );
  }

  return `${CHANNEL_PREFIX}${normalizedUsuarioId}`;
}

export function subscribeMoradorRastreios({
  usuarioId,
  onInvalidate,
  onStatusChange,
  onError,
}) {
  const topic =
    buildMoradorRastreiosTopic(
      usuarioId,
    );

  const channel =
    supabase.channel(topic, {
      config: {
        private: true,

        broadcast: {
          self: false,
        },
      },
    });

  channel.on(
    "broadcast",
    {
      event: EVENT_NAME,
    },
    (message) => {
      const payload =
        message?.payload ?? {};

      onInvalidate?.({
        rastreioAguardadoId:
          payload
            ?.rastreio_aguardado_id ??
          null,

        tipo:
          payload?.tipo ?? null,

        alteracao:
          payload?.alteracao ?? null,

        atualizadoEm:
          payload?.atualizado_em ??
          null,
      });
    },
  );

  channel.subscribe(
    (status, error) => {
      onStatusChange?.(status);

      if (error) {
        onError?.(error);
      }
    },
  );

  return {
    topic,
    channel,

    async unsubscribe() {
      await supabase.removeChannel(
        channel,
      );
    },
  };
}