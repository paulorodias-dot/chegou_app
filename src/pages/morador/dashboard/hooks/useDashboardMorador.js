import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  carregarAgendaDashboardMorador,
  carregarIndicadoresDashboardMorador,
  carregarResumoOperacionalMorador,
} from "../services/dashboardMorador.service";

const INDICADORES_INICIAIS = {
  encomendasAguardando: null,
  rastreiosAtivos: null,
  emprestimosGaragem: null,
  servicosAgendados: null,
};

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
    INDICADORES_INICIAIS
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
    erroAgenda,
    setErroAgenda,
  ] = useState(null);

  const usuarioId =
    usuario?.id || null;

  /*
   * ========================================================
   * NOME PARA EXIBIÇÃO
   * ========================================================
   *
   * Autoridade principal:
   *
   * RPC
   * → pessoas.nome_social
   * → pessoas.nome_completo
   *
   * O objeto "usuario" abaixo é somente fallback
   * enquanto o resumo oficial ainda está carregando.
   */

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

  /*
   * ========================================================
   * PERFIL
   * ========================================================
   */

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

  /*
   * ========================================================
   * CARREGAMENTO
   * ========================================================
   */

  const carregar = useCallback(
    async ({
      modoRecarga = false,
    } = {}) => {
      /*
       * O App ainda precisa fornecer
       * o usuário funcional carregado.
       *
       * A identidade usada pela RPC,
       * entretanto, é auth.uid().
       */

      if (!usuarioId) {
        if (
          montadoRef.current
        ) {
          setResumo(null);

          setIndicadores(
            INDICADORES_INICIAIS
          );

          setEventos([]);

          setErroResumo(null);

          setErroIndicadores(null);

          setErroAgenda(null);

          setCarregando(false);

          setRecarregando(false);
        }

        return;
      }

      if (modoRecarga) {
        setRecarregando(true);
      } else {
        setCarregando(true);
      }

      /*
       * Cada domínio é carregado isoladamente.
       *
       * Uma eventual falha em Agenda,
       * por exemplo, não derruba o Resumo.
       */

      const resultados =
        await Promise.allSettled([
          carregarResumoOperacionalMorador(),

          carregarIndicadoresDashboardMorador(),

          carregarAgendaDashboardMorador(),
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
      ] = resultados;

      /*
       * ====================================================
       * RESUMO DO MORADOR
       * ====================================================
       */

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

      /*
       * ====================================================
       * INDICADORES
       * ====================================================
       */

      if (
        resultadoIndicadores.status ===
        "fulfilled"
      ) {
        setIndicadores({
          ...INDICADORES_INICIAIS,

          ...(resultadoIndicadores.value ||
            {}),
        });

        setErroIndicadores(null);
      } else {
        console.error(
          "[Dashboard Morador] Erro ao carregar indicadores:",
          resultadoIndicadores.reason
        );

        setIndicadores(
          INDICADORES_INICIAIS
        );

        setErroIndicadores(
          resultadoIndicadores.reason
        );
      }

      /*
       * ====================================================
       * AGENDA
       * ====================================================
       */

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

      setRecarregando(false);
    },
    [usuarioId]
  );

  /*
   * ========================================================
   * RECARGA MANUAL
   * ========================================================
   */

  const recarregar =
    useCallback(
      () =>
        carregar({
          modoRecarga: true,
        }),
      [carregar]
    );

  /*
   * ========================================================
   * PRIMEIRA CARGA
   * ========================================================
   */

  useEffect(() => {
    montadoRef.current =
      true;

    carregar();

    return () => {
      montadoRef.current =
        false;
    };
  }, [carregar]);

  /*
   * ========================================================
   * CONTRATO PÚBLICO DO HOOK
   * ========================================================
   */

  return {
    primeiroNome,

    nomeExibicao,

    perfilDescricao,

    resumo,

    indicadores,

    eventos,

    carregando,

    recarregando,

    erroResumo,

    erroIndicadores,

    erroAgenda,

    temErroParcial:
      Boolean(
        erroResumo ||
        erroIndicadores ||
        erroAgenda
      ),

    recarregar,
  };
}