import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  obterAlertasPortaria,
  obterInteligenciaPortaria,
  obterResumoDashboardPortaria,
  obterResumoEncomendasPortaria,
} from "../encomendas/encomendasPortaria.service";

import {
  mapearResumoPortaria,
} from "../encomendas/encomendasPortaria.mapper";

export default function useDashboardPortaria({
  perfil,
} = {}) {
  const [
    somenteMeusProcessos,
    setSomenteMeusProcessos,
  ] = useState(false);

  const [resumo, setResumo] = useState(null);
  const [encomendas, setEncomendas] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [inteligencia, setInteligencia] = useState([]);

  const [
    carregandoResumo,
    setCarregandoResumo,
  ] = useState(true);

  const [
    carregandoEncomendas,
    setCarregandoEncomendas,
  ] = useState(true);

  const [
    carregandoAlertas,
    setCarregandoAlertas,
  ] = useState(true);

  const [
    carregandoInteligencia,
    setCarregandoInteligencia,
  ] = useState(true);

  const [atualizando, setAtualizando] =
    useState(false);

  const [erros, setErros] = useState({
    resumo: "",
    encomendas: "",
    alertas: "",
    inteligencia: "",
  });

  /*
   * IMPORTANTE
   *
   * perfil é utilizado aqui apenas para detectar mudança
   * da sessão/contexto autenticado.
   *
   * A autorização dos dados NÃO será resolvida pelo perfil
   * recebido no frontend.
   *
   * Cada service/RPC deverá resolver o usuário autenticado
   * por auth.uid() no Supabase e aplicar vínculo + RLS.
   */

  const identificadorSessao =
    perfil?.usuario_id ||
    perfil?.id ||
    null;

  const carregarResumo =
    useCallback(async () => {
      setCarregandoResumo(true);

      try {
        const resposta =
          await obterResumoDashboardPortaria({
            somenteMeusProcessos,
          });

        setResumo(
          mapearResumoPortaria(
            resposta?.kpis
          )
        );

        setErros((atual) => ({
          ...atual,
          resumo: "",
        }));
      } catch (error) {
        console.error(
          "Erro ao carregar resumo operacional da Portaria:",
          error
        );

        setResumo(null);

        setErros((atual) => ({
          ...atual,
          resumo:
            "Não foi possível carregar o resumo operacional.",
        }));
      } finally {
        setCarregandoResumo(false);
      }
    }, [somenteMeusProcessos]);

  const carregarEncomendas =
    useCallback(async () => {
      setCarregandoEncomendas(true);

      try {
        const resposta =
          await obterResumoEncomendasPortaria({
            somenteMeusProcessos,
          });

        setEncomendas(
          resposta?.dados || null
        );

        setErros((atual) => ({
          ...atual,
          encomendas: "",
        }));
      } catch (error) {
        console.error(
          "Erro ao carregar encomendas da Portaria:",
          error
        );

        setEncomendas(null);

        setErros((atual) => ({
          ...atual,
          encomendas:
            "Não foi possível carregar o resumo de encomendas.",
        }));
      } finally {
        setCarregandoEncomendas(false);
      }
    }, [somenteMeusProcessos]);

  const carregarAlertas =
    useCallback(async () => {
      setCarregandoAlertas(true);

      try {
        const resposta =
          await obterAlertasPortaria({
            somenteMeusProcessos,
          });

        setAlertas(
          Array.isArray(resposta?.itens)
            ? resposta.itens
            : []
        );

        setErros((atual) => ({
          ...atual,
          alertas: "",
        }));
      } catch (error) {
        console.error(
          "Erro ao carregar alertas da Portaria:",
          error
        );

        setAlertas([]);

        setErros((atual) => ({
          ...atual,
          alertas:
            "Não foi possível carregar os alertas operacionais.",
        }));
      } finally {
        setCarregandoAlertas(false);
      }
    }, [somenteMeusProcessos]);

  const carregarInteligencia =
    useCallback(async () => {
      setCarregandoInteligencia(true);

      try {
        const resposta =
          await obterInteligenciaPortaria();

        setInteligencia(
          Array.isArray(resposta?.itens)
            ? resposta.itens
            : []
        );

        setErros((atual) => ({
          ...atual,
          inteligencia: "",
        }));
      } catch (error) {
        console.error(
          "Erro ao carregar inteligência operacional da Portaria:",
          error
        );

        setInteligencia([]);

        setErros((atual) => ({
          ...atual,
          inteligencia:
            "Não foi possível carregar as orientações operacionais.",
        }));
      } finally {
        setCarregandoInteligencia(false);
      }
    }, []);

  const atualizarDashboard =
    useCallback(async () => {
      setAtualizando(true);

      await Promise.allSettled([
        carregarResumo(),
        carregarEncomendas(),
        carregarAlertas(),
        carregarInteligencia(),
      ]);

      setAtualizando(false);
    }, [
      carregarAlertas,
      carregarEncomendas,
      carregarInteligencia,
      carregarResumo,
    ]);

  useEffect(() => {
    if (!identificadorSessao) {
      setCarregandoResumo(false);
      setCarregandoEncomendas(false);
      setCarregandoAlertas(false);
      setCarregandoInteligencia(false);

      return;
    }

    atualizarDashboard();
  }, [
    identificadorSessao,
    atualizarDashboard,
  ]);

  return {
    somenteMeusProcessos,
    setSomenteMeusProcessos,

    resumo,
    encomendas,
    alertas,
    inteligencia,

    carregandoResumo,
    carregandoEncomendas,
    carregandoAlertas,
    carregandoInteligencia,

    atualizando,
    erros,

    atualizarDashboard,
  };
}