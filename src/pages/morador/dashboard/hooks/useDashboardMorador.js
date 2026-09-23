import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  carregarAgendaDashboardMorador,
  carregarEncomendasDashboardMorador,
  carregarIndicadoresDashboardMorador,
  carregarResumoOperacionalMorador,
  criarResumoEncomendasDashboardVazio,
} from "../services/dashboardMorador.service";

const INDICADORES_INICIAIS = {
  encomendasAguardando: null,

  rastreiosAtivos: null,

  rastreioResumo: {
    total: 0,
    aguardandoRecebimento: 0,
    localizadoPortaria: 0,
    aguardandoEntrada: 0,
  },

  emprestimosGaragem: null,

  servicosAgendados: null,
};

function criarIndicadoresIniciais() {
  return {
    ...INDICADORES_INICIAIS,

    rastreioResumo: {
      ...INDICADORES_INICIAIS
        .rastreioResumo,
    },
  };
}

function resolverPrimeiroNome(nome) {
  const partes = String(nome || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return partes[0] || "Morador";
}

function resolverPerfilMorador({
  nivelId,
  tipoMorador,
}) {
  const nivel =
    Number(nivelId);

  if (nivel === 7) {
    return "Morador Dependente";
  }

  if (nivel === 6) {
    return "Morador Responsável";
  }

  if (tipoMorador) {
    return "Morador";
  }

  return "Morador";
}

export default function useDashboardMorador({
  usuario,
}) {
  const montadoRef =
    useRef(true);

  const [resumo, setResumo] =
    useState(null);

  const [
    indicadores,
    setIndicadores,
  ] = useState(
    criarIndicadoresIniciais
  );

  const [
    encomendasResumo,
    setEncomendasResumo,
  ] = useState(
    criarResumoEncomendasDashboardVazio
  );

  const [
    eventos,
    setEventos,
  ] = useState([]);

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    carregandoEncomendas,
    setCarregandoEncomendas,
  ] = useState(true);

  const [
    recarregando,
    setRecarregando,
  ] = useState(false);

  const [
    erroResumo,
    setErroResumo,
  ] = useState(null);

  const [
    erroIndicadores,
    setErroIndicadores,
  ] = useState(null);

  const [
    erroEncomendas,
    setErroEncomendas,
  ] = useState(null);

  const [
    erroAgenda,
    setErroAgenda,
  ] = useState(null);

  const usuarioId =
    usuario?.id || null;

  /*
   * Condomínio ativo da sessão/contexto.
   *
   * O backend continua validando se
   * auth.uid() possui vínculo ativo.
   */
  const condominioId =
    usuario?.condominio_id || null;

  const nomeFallback =
    usuario?.nome ||
    usuario?.nome_completo ||
    "Morador";

  const nomeExibicao = useMemo(
    () =>
      resumo?.nomeMorador ||
      nomeFallback ||
      "Morador",
    [
      resumo?.nomeMorador,
      nomeFallback,
    ]
  );

  const primeiroNome = useMemo(
    () =>
      resolverPrimeiroNome(
        nomeExibicao
      ),
    [nomeExibicao]
  );

  const perfilDescricao = useMemo(
    () =>
      resolverPerfilMorador({
        nivelId:
          resumo?.nivelId ??
          usuario?.nivel_id,

        tipoMorador:
          resumo?.tipoMorador,
      }),
    [
      resumo?.nivelId,
      resumo?.tipoMorador,
      usuario?.nivel_id,
    ]
  );

  const carregar = useCallback(
    async ({
      modoRecarga = false,
    } = {}) => {
      if (!usuarioId) {
        if (
          montadoRef.current
        ) {
          setResumo(null);

          setIndicadores(
            criarIndicadoresIniciais()
          );

          setEncomendasResumo(
            criarResumoEncomendasDashboardVazio()
          );

          setEventos([]);

          setErroResumo(null);

          setErroIndicadores(null);

          setErroEncomendas(null);

          setErroAgenda(null);

          setCarregando(false);

          setCarregandoEncomendas(
            false
          );

          setRecarregando(false);
        }

        return;
      }

      if (modoRecarga) {
        setRecarregando(true);
      } else {
        setCarregando(true);
      }

      setCarregandoEncomendas(
        true
      );

      const resultados =
        await Promise.allSettled([
          carregarResumoOperacionalMorador(),

          carregarIndicadoresDashboardMorador({
            condominioId,
          }),

          carregarAgendaDashboardMorador(),

          carregarEncomendasDashboardMorador(),
        ]);

      if (
        !montadoRef.current
      ) {
        return;
      }

      const [
        resultadoResumo,
        resultadoIndicadores,
        resultadoAgenda,
        resultadoEncomendas,
      ] = resultados;

      /* RESUMO */

      if (
        resultadoResumo.status ===
        "fulfilled"
      ) {
        setResumo(
          resultadoResumo.value ||
            null
        );

        setErroResumo(null);
      } else {
        console.error(
          "[Dashboard Morador] Erro ao carregar resumo:",
          resultadoResumo.reason
        );

        setResumo(null);

        setErroResumo(
          resultadoResumo.reason
        );
      }

      /* ENCOMENDAS */

      let proximoResumoEncomendas =
        criarResumoEncomendasDashboardVazio();

      let proximoErroEncomendas =
        null;

      if (
        resultadoEncomendas.status ===
        "fulfilled"
      ) {
        proximoResumoEncomendas =
          resultadoEncomendas.value ||
          criarResumoEncomendasDashboardVazio();
      } else {
        console.error(
          "[Dashboard Morador] Erro ao carregar encomendas:",
          resultadoEncomendas.reason
        );

        proximoErroEncomendas =
          resultadoEncomendas.reason;
      }

      setEncomendasResumo(
        proximoResumoEncomendas
      );

      setErroEncomendas(
        proximoErroEncomendas
      );

      /* INDICADORES */

      if (
        resultadoIndicadores.status ===
        "fulfilled"
      ) {
        setIndicadores({
          ...criarIndicadoresIniciais(),

          ...(resultadoIndicadores.value ||
            {}),

          encomendasAguardando:
            proximoErroEncomendas
              ? null
              : proximoResumoEncomendas
                  .total,
        });

        setErroIndicadores(null);
      } else {
        console.error(
          "[Dashboard Morador] Erro ao carregar indicadores:",
          resultadoIndicadores.reason
        );

        setIndicadores({
          ...criarIndicadoresIniciais(),

          encomendasAguardando:
            proximoErroEncomendas
              ? null
              : proximoResumoEncomendas
                  .total,
        });

        setErroIndicadores(
          resultadoIndicadores.reason
        );
      }

      /* AGENDA */

      if (
        resultadoAgenda.status ===
        "fulfilled"
      ) {
        setEventos(
          Array.isArray(
            resultadoAgenda.value
          )
            ? resultadoAgenda.value
            : []
        );

        setErroAgenda(null);
      } else {
        console.error(
          "[Dashboard Morador] Erro ao carregar agenda:",
          resultadoAgenda.reason
        );

        setEventos([]);

        setErroAgenda(
          resultadoAgenda.reason
        );
      }

      setCarregando(false);

      setCarregandoEncomendas(
        false
      );

      setRecarregando(false);
    },
    [
      usuarioId,
      condominioId,
    ]
  );

  const recarregar =
    useCallback(
      () =>
        carregar({
          modoRecarga: true,
        }),
      [carregar]
    );

  const recarregarEncomendas =
    useCallback(
      async () => {
        if (!usuarioId) {
          return;
        }

        setCarregandoEncomendas(
          true
        );

        try {
          const resultado =
            await carregarEncomendasDashboardMorador();

          if (
            !montadoRef.current
          ) {
            return;
          }

          setEncomendasResumo(
            resultado
          );

          setIndicadores(
            (indicadoresAtuais) => ({
              ...indicadoresAtuais,

              encomendasAguardando:
                resultado.total,
            })
          );

          setErroEncomendas(null);
        } catch (error) {
          console.error(
            "[Dashboard Morador] Erro ao recarregar encomendas:",
            error
          );

          if (
            montadoRef.current
          ) {
            setErroEncomendas(
              error
            );
          }
        } finally {
          if (
            montadoRef.current
          ) {
            setCarregandoEncomendas(
              false
            );
          }
        }
      },
      [usuarioId]
    );

  useEffect(() => {
    montadoRef.current =
      true;

    carregar();

    return () => {
      montadoRef.current =
        false;
    };
  }, [carregar]);

  return {
    primeiroNome,

    nomeExibicao,

    perfilDescricao,

    resumo,

    indicadores,

    encomendasResumo,

    eventos,

    carregando,

    carregandoEncomendas,

    recarregando,

    erroResumo,

    erroIndicadores,

    erroEncomendas,

    erroAgenda,

    temErroParcial:
      Boolean(
        erroResumo ||
        erroIndicadores ||
        erroEncomendas ||
        erroAgenda
      ),

    recarregar,

    recarregarEncomendas,
  };
}