import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  acompanharMoradorRetirada,
} from "../services/moradorRetiradas.service";

const INTERVALO_ATUALIZACAO_MS = 5_000;
const JANELA_TENTATIVA_MS = 10 * 60 * 1_000;

function obterRetirada(data) {
  const retirada = data?.retirada;

  if (!retirada?.id) {
    return null;
  }

  return {
    id: retirada.id,

    resultado:
      retirada.resultado || null,

    tipoRetirante:
      retirada.tipo_retirante || null,

    retiranteNome:
      retirada.retirante_nome || null,

    metodoValidacao:
      retirada.metodo_validacao || null,

    iniciadaEm:
      retirada.iniciada_em || null,

    iniciadaEmLocal:
      retirada.iniciada_em_local || null,

    validadaEm:
      retirada.validada_em || null,

    validadaEmLocal:
      retirada.validada_em_local || null,

    validadaPorNome:
      retirada.validada_por_nome || null,

    concluidaEm:
      retirada.concluida_em || null,

    concluidaEmLocal:
      retirada.concluida_em_local || null,

    entreguePorNome:
      retirada.entregue_por_nome || null,

    totalVolumesEntregues:
      Number.isFinite(
        Number(retirada.total_volumes_entregues)
      )
        ? Number(retirada.total_volumes_entregues)
        : 0,
  };
}

function obterInicioTentativaMs(retirada) {
  if (!retirada?.iniciadaEm) {
    return null;
  }

  const inicioMs = Date.parse(
    retirada.iniciadaEm
  );

  return Number.isFinite(inicioMs)
    ? inicioMs
    : null;
}

export default function useMoradorRetiradaAcompanhamento({
  aberto,
  condominioId,
  unidadeId,
  encomendaId,
}) {
  const [acompanhamento, setAcompanhamento] =
    useState(null);

  const [expirouJanelaLocal, setExpirouJanelaLocal] =
    useState(false);

  const [erroAcompanhamento, setErroAcompanhamento] =
    useState(null);

  const timeoutRef = useRef(null);
  const requisicaoEmAndamentoRef = useRef(false);
  const cicloRef = useRef(0);

  const limparAgendamento = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(
        timeoutRef.current
      );

      timeoutRef.current = null;
    }
  }, []);

  const pararAcompanhamento = useCallback(() => {
    cicloRef.current += 1;

    limparAgendamento();

    requisicaoEmAndamentoRef.current = false;
  }, [limparAgendamento]);

  useEffect(() => {
    pararAcompanhamento();

    setAcompanhamento(null);
    setExpirouJanelaLocal(false);
    setErroAcompanhamento(null);

    if (
      !aberto ||
      !condominioId ||
      !unidadeId ||
      !encomendaId
    ) {
      return undefined;
    }

    const cicloAtual = cicloRef.current;

    let ativo = true;

    async function consultar() {
      if (
        !ativo ||
        cicloAtual !== cicloRef.current ||
        requisicaoEmAndamentoRef.current
      ) {
        return;
      }

      requisicaoEmAndamentoRef.current = true;

      try {
        const data =
          await acompanharMoradorRetirada({
            condominioId,
            unidadeId,
            encomendaId,
          });

        if (
          !ativo ||
          cicloAtual !== cicloRef.current
        ) {
          return;
        }

        setErroAcompanhamento(null);

        const retirada =
          obterRetirada(data);

        const proximoAcompanhamento = {
          encomendaId:
            data?.encomenda_id || encomendaId,

          numeroEncomenda:
            data?.numero_encomenda || null,

          statusEncomenda:
            data?.status_encomenda || null,

          retirada,
        };

        setAcompanhamento(
          proximoAcompanhamento
        );

        /*
         * Retirada concluída:
         * o banco já é a fonte oficial.
         * Não há motivo para continuar consultando.
         */
        if (
          retirada?.resultado === "CONCLUIDA"
        ) {
          limparAgendamento();
          return;
        }

        /*
         * A janela dos 10 minutos começa no horário
         * oficial em que a tentativa foi iniciada
         * pela Portaria.
         *
         * VALIDADA continua pertencendo à mesma
         * tentativa e não reinicia a contagem.
         */
        if (
          retirada?.resultado === "INICIADA" ||
          retirada?.resultado === "VALIDADA"
        ) {
          const inicioMs =
            obterInicioTentativaMs(retirada);

          if (inicioMs !== null) {
            const limiteMs =
              inicioMs +
              JANELA_TENTATIVA_MS;

            const restanteMs =
              limiteMs - Date.now();

            if (restanteMs <= 0) {
              setExpirouJanelaLocal(true);
              limparAgendamento();
              return;
            }

            timeoutRef.current =
              window.setTimeout(
                consultar,
                Math.min(
                  INTERVALO_ATUALIZACAO_MS,
                  restanteMs
                )
              );

            return;
          }
        }

        /*
         * Ainda não existe tentativa iniciada.
         * O modal pode continuar aberto, mas os
         * 10 minutos ainda não começaram.
         */
        timeoutRef.current =
          window.setTimeout(
            consultar,
            INTERVALO_ATUALIZACAO_MS
          );
      } catch (error) {
        if (
          !ativo ||
          cicloAtual !== cicloRef.current
        ) {
          return;
        }

        /*
         * Uma falha isolada de consulta não altera
         * a retirada e não invalida a credencial.
         *
         * Mantemos o acompanhamento enquanto
         * o modal continuar aberto.
         */
        setErroAcompanhamento(
          error?.message ||
            "Não foi possível atualizar o andamento da retirada."
        );

        timeoutRef.current =
          window.setTimeout(
            consultar,
            INTERVALO_ATUALIZACAO_MS
          );
      } finally {
        if (
          ativo &&
          cicloAtual === cicloRef.current
        ) {
          requisicaoEmAndamentoRef.current =
            false;
        }
      }
    }

    consultar();

    return () => {
      ativo = false;

      pararAcompanhamento();
    };
  }, [
    aberto,
    condominioId,
    unidadeId,
    encomendaId,
    limparAgendamento,
    pararAcompanhamento,
  ]);

  return {
    acompanhamento,
    expirouJanelaLocal,
    erroAcompanhamento,
  };
}