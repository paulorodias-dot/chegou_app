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

function resolverPerfilMorador(usuario) {
  const nivelId = Number(
    usuario?.nivel_id
  );

  if (nivelId === 7) {
    return "Morador Dependente";
  }

  if (nivelId === 6) {
    return "Morador Responsável";
  }

  return "Morador";
}

function resolverPrimeiroNome(usuario) {
  const nome =
    usuario?.nome_social ||
    usuario?.nome ||
    usuario?.nome_completo ||
    "";

  const partes = String(nome)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return partes[0] || "Morador";
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

  const businessId =
    usuario?.business_id || null;

  const primeiroNome = useMemo(
    () =>
      resolverPrimeiroNome(usuario),
    [
      usuario?.nome_social,
      usuario?.nome,
      usuario?.nome_completo,
    ]
  );

  const perfilDescricao = useMemo(
    () =>
      resolverPerfilMorador(usuario),
    [usuario?.nivel_id]
  );

  const contexto = useMemo(
    () => ({
      usuarioId,
      condominioId,
      businessId,
    }),
    [
      usuarioId,
      condominioId,
      businessId,
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