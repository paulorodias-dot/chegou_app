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
  if (Number(nivelId) === 7) {
    return "Morador Dependente";
  }

  if (Number(nivelId) === 6) {
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
  const montadoRef = useRef(true);

  const [resumo, setResumo] =
    useState(null);

  const [indicadores, setIndicadores] =
    useState(
      INDICADORES_INICIAIS
    );

  const [eventos, setEventos] =
    useState([]);

  const [carregando, setCarregando] =
    useState(true);

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

  const condominioId =
    usuario?.condominio_id || null;

  /*
   * O nome vindo do objeto de sessão é somente
   * fallback de apresentação inicial.
   *
   * Assim que o resumo oficial chega,
   * pessoas.nome_completo passa a prevalecer.
   */

  const nomeFallback =
    usuario?.nome_social ||
    usuario?.nome ||
    usuario?.nome_completo ||
    "";

  const primeiroNome = useMemo(
    () =>
      resolverPrimeiroNome(
        resumo?.nomeMorador ||
          nomeFallback
      ),
    [
      resumo?.nomeMorador,
      nomeFallback,
    ]
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

  const contexto = useMemo(
    () => ({
      /*
       * usuarioId não é autoridade.
       *
       * É enviado apenas para conferência.
       * O service começa em auth.uid().
       */
      usuarioId,

      /*
       * Mesmo princípio:
       * condominioId é contexto solicitado.
       * O service exige vínculo ativo.
       */
      condominioId,
    }),
    [
      usuarioId,
      condominioId,
    ]
  );

  const carregar = useCallback(
    async ({
      modoRecarga = false,
    } = {}) => {
      if (!usuarioId) {
        if (montadoRef.current) {
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

      const resultados =
        await Promise.allSettled([
          carregarResumoOperacionalMorador(
            contexto
          ),

          carregarIndicadoresDashboardMorador(
            contexto
          ),

          carregarAgendaDashboardMorador(
            contexto
          ),
        ]);

      if (!montadoRef.current) {
        return;
      }

      const [
        resultadoResumo,
        resultadoIndicadores,
        resultadoAgenda,
      ] = resultados;

      /*
       * RESUMO
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
       * INDICADORES
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
       * AGENDA
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
    [
      contexto,
      usuarioId,
    ]
  );

  const recarregar = useCallback(
    () =>
      carregar({
        modoRecarga: true,
      }),
    [carregar]
  );

  useEffect(() => {
    montadoRef.current = true;

    carregar();

    return () => {
      montadoRef.current = false;
    };
  }, [carregar]);

  return {
    primeiroNome,

    perfilDescricao,

    resumo,

    indicadores,

    eventos,

    carregando,

    recarregando,

    erroResumo,

    erroIndicadores,

    erroAgenda,

    temErroParcial: Boolean(
      erroResumo ||
        erroIndicadores ||
        erroAgenda
    ),

    recarregar,
  };
}